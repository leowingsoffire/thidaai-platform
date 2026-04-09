"""Notifications and Audit Log endpoints."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Notification, AuditLog, User
from services.auth_service import get_optional_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    notification_type: str
    channel: str
    is_read: bool
    link: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    unread_only: bool = False,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if not user:
        return []
    query = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.order_by(Notification.created_at.desc()).limit(100).all()


@router.get("/count")
def unread_count(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not user:
        return {"count": 0}
    count = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False,
    ).count()
    return {"count": count}


@router.put("/{notification_id}/read")
def mark_read(notification_id: str, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "ok"}


@router.put("/read-all")
def mark_all_read(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not user:
        return {"status": "ok"}
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False,
    ).update({Notification.is_read: True})
    db.commit()
    return {"status": "ok"}


# ---- Audit Log ----

audit_router = APIRouter(prefix="/api/audit", tags=["audit"])


class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    details: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime
    user_name: Optional[str] = None
    model_config = {"from_attributes": True}


@audit_router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if action:
        query = query.filter(AuditLog.action == action)
    logs = query.order_by(AuditLog.created_at.desc()).limit(min(limit, 500)).all()

    result = []
    user_cache = {}
    for log in logs:
        resp = AuditLogResponse.model_validate(log)
        if log.user_id not in user_cache:
            u = db.query(User).filter(User.id == log.user_id).first()
            user_cache[log.user_id] = u.full_name if u else log.user_id
        resp.user_name = user_cache[log.user_id]
        result.append(resp)
    return result
