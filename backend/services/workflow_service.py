"""Configurable workflow engine with state machine, SLA tracking, and escalation."""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from models import WorkflowDefinition, WorkflowInstance, WorkflowTask, WorkflowHistory, Notification, gen_uuid


# ============================================================
# Default workflow definitions (seeded on first run)
# ============================================================

DEFAULT_WORKFLOWS = [
    {
        "name": "policy_issuance",
        "description": "End-to-end policy issuance workflow",
        "states": ["draft", "submitted", "under_review", "underwriting", "approved", "rejected", "issued", "completed"],
        "transitions": {
            "draft": ["submitted"],
            "submitted": ["under_review", "rejected"],
            "under_review": ["underwriting", "approved", "rejected"],
            "underwriting": ["approved", "rejected", "under_review"],
            "approved": ["issued"],
            "issued": ["completed"],
            "rejected": ["draft"],
        },
        "sla_hours": {"submitted": 4, "under_review": 24, "underwriting": 48, "approved": 8},
        "escalation_rules": {"under_review": {"after_hours": 24, "escalate_to": "manager"}, "underwriting": {"after_hours": 48, "escalate_to": "manager"}},
    },
    {
        "name": "claim_processing",
        "description": "Insurance claim processing workflow",
        "states": ["submitted", "docs_verification", "fraud_check", "assessment", "approved", "rejected", "payment_processing", "closed"],
        "transitions": {
            "submitted": ["docs_verification"],
            "docs_verification": ["fraud_check", "submitted"],
            "fraud_check": ["assessment", "rejected"],
            "assessment": ["approved", "rejected", "fraud_check"],
            "approved": ["payment_processing"],
            "rejected": ["closed"],
            "payment_processing": ["closed"],
        },
        "sla_hours": {"submitted": 2, "docs_verification": 24, "fraud_check": 48, "assessment": 24, "approved": 8, "payment_processing": 48},
        "escalation_rules": {"assessment": {"after_hours": 24, "escalate_to": "manager"}, "payment_processing": {"after_hours": 48, "escalate_to": "manager"}},
    },
    {
        "name": "underwriting",
        "description": "Underwriting assessment workflow",
        "states": ["pending", "auto_assessment", "manual_review", "docs_requested", "decision_made", "completed"],
        "transitions": {
            "pending": ["auto_assessment"],
            "auto_assessment": ["manual_review", "decision_made"],
            "manual_review": ["docs_requested", "decision_made"],
            "docs_requested": ["manual_review"],
            "decision_made": ["completed"],
        },
        "sla_hours": {"pending": 4, "auto_assessment": 1, "manual_review": 48, "docs_requested": 72},
        "escalation_rules": {"manual_review": {"after_hours": 48, "escalate_to": "manager"}},
    },
]


def seed_workflows(db: Session):
    """Create default workflow definitions if they don't exist."""
    for wf_data in DEFAULT_WORKFLOWS:
        existing = db.query(WorkflowDefinition).filter(WorkflowDefinition.name == wf_data["name"]).first()
        if not existing:
            wf = WorkflowDefinition(**wf_data)
            db.add(wf)
    db.commit()


# ============================================================
# Workflow Operations
# ============================================================

def start_workflow(
    db: Session,
    workflow_name: str,
    entity_type: str,
    entity_id: str,
    started_by: str,
    priority: str = "normal",
    initial_task_title: str = None,
    initial_task_role: str = None,
) -> WorkflowInstance:
    """Start a new workflow instance for an entity."""
    wf_def = db.query(WorkflowDefinition).filter(
        WorkflowDefinition.name == workflow_name, WorkflowDefinition.is_active == True
    ).first()
    if not wf_def:
        raise ValueError(f"Workflow '{workflow_name}' not found or inactive")

    initial_state = wf_def.states[0]
    sla_hours = (wf_def.sla_hours or {}).get(initial_state)

    instance = WorkflowInstance(
        workflow_def_id=wf_def.id,
        entity_type=entity_type,
        entity_id=entity_id,
        current_state=initial_state,
        priority=priority,
        started_by=started_by,
        sla_deadline=datetime.utcnow() + timedelta(hours=sla_hours) if sla_hours else None,
    )
    db.add(instance)
    db.flush()

    # Record initial history
    history = WorkflowHistory(
        workflow_instance_id=instance.id,
        from_state=None,
        to_state=initial_state,
        action="start",
        performed_by=started_by,
    )
    db.add(history)

    # Create initial task if specified
    if initial_task_title:
        task = WorkflowTask(
            workflow_instance_id=instance.id,
            title=initial_task_title,
            assigned_role=initial_task_role or "agent",
            due_date=instance.sla_deadline,
        )
        db.add(task)

    db.commit()
    db.refresh(instance)
    return instance


def transition_workflow(
    db: Session,
    instance_id: str,
    action: str,
    to_state: str,
    performed_by: str,
    comments: str = None,
    create_task_title: str = None,
    create_task_role: str = None,
    create_task_user_id: str = None,
) -> WorkflowInstance:
    """Transition a workflow to a new state with validation."""
    instance = db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
    if not instance:
        raise ValueError("Workflow instance not found")

    wf_def = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == instance.workflow_def_id).first()
    transitions = wf_def.transitions or {}
    allowed = transitions.get(instance.current_state, [])

    if to_state not in allowed:
        raise ValueError(f"Cannot transition from '{instance.current_state}' to '{to_state}'. Allowed: {allowed}")

    from_state = instance.current_state
    instance.current_state = to_state

    # Update SLA
    sla_hours = (wf_def.sla_hours or {}).get(to_state)
    instance.sla_deadline = datetime.utcnow() + timedelta(hours=sla_hours) if sla_hours else None

    # Check if workflow is complete
    if to_state in ("completed", "closed", "issued"):
        instance.completed_at = datetime.utcnow()

    # Cancel pending tasks from previous state
    for task in instance.tasks:
        if task.status in ("pending", "in_progress"):
            task.status = "cancelled"

    # Record history
    history = WorkflowHistory(
        workflow_instance_id=instance.id,
        from_state=from_state,
        to_state=to_state,
        action=action,
        performed_by=performed_by,
        comments=comments,
    )
    db.add(history)

    # Create new task if specified
    if create_task_title:
        task = WorkflowTask(
            workflow_instance_id=instance.id,
            title=create_task_title,
            assigned_to=create_task_user_id,
            assigned_role=create_task_role,
            due_date=instance.sla_deadline,
        )
        db.add(task)

    db.commit()
    db.refresh(instance)
    return instance


def get_my_tasks(db: Session, user_id: str, user_role: str) -> list[WorkflowTask]:
    """Get tasks assigned to a user (by ID or role)."""
    return db.query(WorkflowTask).filter(
        WorkflowTask.status.in_(["pending", "in_progress"]),
        (WorkflowTask.assigned_to == user_id) | (WorkflowTask.assigned_role == user_role),
    ).order_by(WorkflowTask.due_date.asc().nullslast()).all()


def check_sla_breaches(db: Session) -> list[WorkflowInstance]:
    """Find workflow instances that have breached their SLA."""
    now = datetime.utcnow()
    return db.query(WorkflowInstance).filter(
        WorkflowInstance.completed_at.is_(None),
        WorkflowInstance.sla_deadline.isnot(None),
        WorkflowInstance.sla_deadline < now,
        WorkflowInstance.is_escalated == False,
    ).all()


def escalate_breaches(db: Session):
    """Auto-escalate SLA breaches and create notifications."""
    breached = check_sla_breaches(db)
    for instance in breached:
        instance.is_escalated = True
        instance.priority = "urgent"

        # Create escalation notification for managers
        from models import User
        managers = db.query(User).filter(User.role == "manager", User.is_active == True).all()
        for mgr in managers:
            notif = Notification(
                user_id=mgr.id,
                title=f"SLA Breach: {instance.entity_type}",
                message=f"Workflow for {instance.entity_type} #{instance.entity_id} has breached SLA in state '{instance.current_state}'.",
                notification_type="sla_breach",
                link=f"/{instance.entity_type}s/{instance.entity_id}",
            )
            db.add(notif)

        # Record escalation in history
        history = WorkflowHistory(
            workflow_instance_id=instance.id,
            from_state=instance.current_state,
            to_state=instance.current_state,
            action="escalate",
            comments="Auto-escalated due to SLA breach",
        )
        db.add(history)

    db.commit()
    return breached
