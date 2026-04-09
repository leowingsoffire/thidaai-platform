"""AI Assistant + Approval Queue routes."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import AIConversation, ApprovalRequest
from services.auth_service import get_current_user
from services.ai_command import AICommandProcessor
from models import User

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])
approval_router = APIRouter(prefix="/api/approvals", tags=["Approvals"])


# ---- Schemas ----

class ChatMessage(BaseModel):
    message: str
    channel: str = "web"


class ApprovalAction(BaseModel):
    action: str  # "approve" or "reject"
    reason: Optional[str] = None


# ---- AI Chat ----

@router.post("/chat")
def ai_chat(
    body: ChatMessage,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Process a natural language message and return AI response."""
    processor = AICommandProcessor(db, user)
    result = processor.process(body.message, body.channel)
    return result


@router.get("/conversations")
def get_conversations(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get conversation history for the current user."""
    convos = (
        db.query(AIConversation)
        .filter(AIConversation.user_id == user.id)
        .order_by(AIConversation.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": c.id,
            "direction": c.direction,
            "message": c.message,
            "intent": c.intent,
            "channel": c.channel,
            "action_taken": c.action_taken,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in reversed(convos)
    ]


@router.delete("/conversations")
def clear_conversations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Clear conversation history."""
    db.query(AIConversation).filter(AIConversation.user_id == user.id).delete()
    db.commit()
    return {"message": "Conversation history cleared"}


# ---- Approvals ----

@approval_router.get("")
def list_approvals(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List approval requests for the current user."""
    q = db.query(ApprovalRequest).filter(ApprovalRequest.user_id == user.id)
    if status:
        q = q.filter(ApprovalRequest.status == status)
    approvals = q.order_by(ApprovalRequest.created_at.desc()).limit(50).all()

    # Expire old pending approvals
    now = datetime.utcnow()
    for a in approvals:
        if a.status == "pending" and a.expires_at and a.expires_at < now:
            a.status = "expired"
    db.commit()

    return [
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "action_type": a.action_type,
            "action_data": a.action_data,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "priority": a.priority,
            "status": a.status,
            "ai_confidence": float(a.ai_confidence) if a.ai_confidence else None,
            "channel": a.channel,
            "executed_result": a.executed_result,
            "expires_at": a.expires_at.isoformat() if a.expires_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "approved_at": a.approved_at.isoformat() if a.approved_at else None,
            "rejected_at": a.rejected_at.isoformat() if a.rejected_at else None,
            "rejection_reason": a.rejection_reason,
        }
        for a in approvals
    ]


@approval_router.get("/pending/count")
def pending_approval_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = db.query(ApprovalRequest).filter(
        ApprovalRequest.user_id == user.id,
        ApprovalRequest.status == "pending",
    ).count()
    return {"count": count}


@approval_router.post("/{approval_id}")
def act_on_approval(
    approval_id: str,
    body: ApprovalAction,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Approve or reject a pending approval request."""
    approval = db.query(ApprovalRequest).filter(
        ApprovalRequest.id == approval_id,
        ApprovalRequest.user_id == user.id,
    ).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(status_code=400, detail=f"Approval is already {approval.status}")

    if body.action == "approve":
        processor = AICommandProcessor(db, user)
        result = processor._execute_approval(approval)
        return {"message": result.get("reply", "Approved"), "approval": {"id": approval.id, "status": approval.status}}
    elif body.action == "reject":
        approval.status = "rejected"
        approval.rejected_at = datetime.utcnow()
        approval.rejection_reason = body.reason or "Rejected by user"
        db.commit()
        return {"message": f"Rejected: {approval.title}", "approval": {"id": approval.id, "status": "rejected"}}
    else:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
