"""Workflow engine API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db
from models import (
    User, WorkflowDefinition, WorkflowInstance, WorkflowTask, WorkflowHistory,
)
from services.auth_service import get_current_user, require_role, log_audit
from services.workflow_service import (
    transition_workflow, get_my_tasks, check_sla_breaches, escalate_breaches,
)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


class WorkflowDefResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    states: list
    transitions: dict
    sla_hours: Optional[dict]
    is_active: bool
    model_config = {"from_attributes": True}


class TransitionRequest(BaseModel):
    to_state: str
    action: str
    comments: Optional[str] = None
    create_task_title: Optional[str] = None
    create_task_role: Optional[str] = None
    create_task_user_id: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    workflow_instance_id: str
    title: str
    description: Optional[str]
    assigned_to: Optional[str]
    assigned_role: Optional[str]
    status: str
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    outcome: Optional[str]
    created_at: datetime
    # enriched fields
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    workflow_state: Optional[str] = None
    is_overdue: bool = False
    model_config = {"from_attributes": True}


class WorkflowInstanceResponse(BaseModel):
    id: str
    workflow_def_id: str
    entity_type: str
    entity_id: str
    current_state: str
    priority: str
    sla_deadline: Optional[datetime]
    is_escalated: bool
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    workflow_name: Optional[str] = None
    history: list[dict] = []
    model_config = {"from_attributes": True}


class HistoryEntry(BaseModel):
    id: str
    from_state: Optional[str]
    to_state: str
    action: str
    comments: Optional[str]
    performed_by: Optional[str]
    performer_name: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class TaskUpdateRequest(BaseModel):
    status: Optional[str] = None
    outcome: Optional[str] = None


# ---- Workflow Definitions ----

@router.get("/definitions", response_model=list[WorkflowDefResponse])
def list_definitions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(WorkflowDefinition).filter(WorkflowDefinition.is_active == True).all()


# ---- My Tasks (work queue) ----

@router.get("/my-tasks", response_model=list[TaskResponse])
def my_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = get_my_tasks(db, user.id, user.role)
    result = []
    now = datetime.utcnow()
    for t in tasks:
        data = TaskResponse.model_validate(t)
        # Enrich with workflow info
        wi = db.query(WorkflowInstance).filter(WorkflowInstance.id == t.workflow_instance_id).first()
        if wi:
            data.entity_type = wi.entity_type
            data.entity_id = wi.entity_id
            data.workflow_state = wi.current_state
        data.is_overdue = t.due_date < now if t.due_date else False
        result.append(data)
    return result


@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, data: TaskUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(WorkflowTask).filter(WorkflowTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if data.status:
        task.status = data.status
        if data.status == "completed":
            task.completed_at = datetime.utcnow()
    if data.outcome:
        task.outcome = data.outcome
    db.commit()
    db.refresh(task)
    return TaskResponse.model_validate(task)


# ---- Workflow Instances ----

@router.get("/instances", response_model=list[WorkflowInstanceResponse])
def list_instances(
    entity_type: str = None,
    state: str = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(WorkflowInstance)
    if entity_type:
        query = query.filter(WorkflowInstance.entity_type == entity_type)
    if state:
        query = query.filter(WorkflowInstance.current_state == state)
    instances = query.order_by(WorkflowInstance.updated_at.desc()).limit(100).all()
    result = []
    for inst in instances:
        data = WorkflowInstanceResponse.model_validate(inst)
        wd = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == inst.workflow_def_id).first()
        data.workflow_name = wd.name if wd else None
        result.append(data)
    return result


@router.get("/instances/{instance_id}", response_model=WorkflowInstanceResponse)
def get_instance(instance_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inst = db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Workflow instance not found")
    data = WorkflowInstanceResponse.model_validate(inst)
    wd = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == inst.workflow_def_id).first()
    data.workflow_name = wd.name if wd else None
    # Include history
    history_entries = []
    for h in inst.history:
        entry = HistoryEntry.model_validate(h)
        if h.performed_by:
            performer = db.query(User).filter(User.id == h.performed_by).first()
            entry.performer_name = performer.full_name if performer else None
        history_entries.append(entry.model_dump())
    data.history = history_entries
    return data


@router.post("/instances/{instance_id}/transition", response_model=WorkflowInstanceResponse)
def do_transition(
    instance_id: str,
    data: TransitionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        instance = transition_workflow(
            db, instance_id, data.action, data.to_state,
            performed_by=user.id,
            comments=data.comments,
            create_task_title=data.create_task_title,
            create_task_role=data.create_task_role,
            create_task_user_id=data.create_task_user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    log_audit(db, user.id, f"workflow_{data.action}", instance.entity_type, instance.entity_id,
              {"from_state": data.action, "to_state": data.to_state, "comments": data.comments})

    resp = WorkflowInstanceResponse.model_validate(instance)
    wd = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == instance.workflow_def_id).first()
    resp.workflow_name = wd.name if wd else None
    return resp


# ---- SLA Management ----

@router.post("/check-sla")
def check_sla(user: User = Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    breached = escalate_breaches(db)
    return {"escalated_count": len(breached), "message": f"{len(breached)} workflow(s) escalated due to SLA breach"}
