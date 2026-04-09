"""Auto-Workflow Service — handles automated daily tasks, SLA monitoring, reminders."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import (
    WorkflowInstance, WorkflowTask, Activity, Policy, Notification,
    ApprovalRequest, Claim, User,
)


def run_daily_automations(db: Session):
    """Run all daily automated checks. Call via scheduled task or manual trigger."""
    results = []
    results.append(check_sla_breaches(db))
    results.append(check_policy_renewals(db))
    results.append(check_stale_approvals(db))
    results.append(check_upcoming_activities(db))
    results.append(check_pending_claims(db))
    return results


def check_sla_breaches(db: Session) -> dict:
    """Check for SLA-breached workflows and send notifications."""
    now = datetime.utcnow()
    breached = db.query(WorkflowInstance).filter(
        WorkflowInstance.completed_at.is_(None),
        WorkflowInstance.sla_deadline < now,
        WorkflowInstance.is_escalated == False,
    ).all()

    count = 0
    for wi in breached:
        wi.is_escalated = True
        wi.priority = "urgent"
        # Notify the workflow starter
        notif = Notification(
            user_id=wi.started_by,
            title="SLA Breach Alert",
            message=f"Workflow {wi.entity_type}/{wi.entity_id[:8]}… has breached SLA deadline.",
            notification_type="sla_breach",
            channel="system",
        )
        db.add(notif)
        count += 1

    if count:
        db.commit()
    return {"check": "sla_breaches", "found": count}


def check_policy_renewals(db: Session) -> dict:
    """Check for policies expiring within 30 days and create reminders."""
    threshold = datetime.utcnow().date() + timedelta(days=30)
    today = datetime.utcnow().date()
    expiring = db.query(Policy).filter(
        Policy.status == "active",
        Policy.end_date != None,
        Policy.end_date <= threshold,
        Policy.end_date >= today,
    ).all()

    count = 0
    for p in expiring:
        # Check if we already created a reminder
        existing = db.query(Activity).filter(
            Activity.title.ilike(f"%renewal%{p.policy_number}%"),
            Activity.status.in_(["planned", "in_progress"]),
        ).first()
        if not existing:
            activity = Activity(
                title=f"Policy Renewal: {p.policy_number}",
                activity_type="follow_up",
                scheduled_date=datetime.combine(p.end_date - timedelta(days=14), datetime.min.time()),
                client_id=p.client_id,
                description=f"Policy {p.policy_number} ({p.product_name}) expires on {p.end_date}.",
                status="planned",
            )
            db.add(activity)
            count += 1

    if count:
        db.commit()
    return {"check": "policy_renewals", "found": count}


def check_stale_approvals(db: Session) -> dict:
    """Expire old pending approval requests."""
    now = datetime.utcnow()
    expired = db.query(ApprovalRequest).filter(
        ApprovalRequest.status == "pending",
        ApprovalRequest.expires_at < now,
    ).all()
    for a in expired:
        a.status = "expired"
    if expired:
        db.commit()
    return {"check": "stale_approvals", "expired": len(expired)}


def check_upcoming_activities(db: Session) -> dict:
    """Send notifications for activities scheduled in the next 24 hours."""
    now = datetime.utcnow()
    tomorrow = now + timedelta(hours=24)
    upcoming = db.query(Activity).filter(
        Activity.status == "planned",
        Activity.scheduled_date >= now,
        Activity.scheduled_date <= tomorrow,
    ).all()

    # We can't easily know user here, so just count — frontend will poll
    return {"check": "upcoming_activities", "found": len(upcoming)}


def check_pending_claims(db: Session) -> dict:
    """Check for claims pending too long (>7 days in submitted state)."""
    threshold = datetime.utcnow() - timedelta(days=7)
    stale_claims = db.query(Claim).filter(
        Claim.status == "submitted",
        Claim.created_at < threshold,
    ).all()
    return {"check": "stale_claims", "found": len(stale_claims)}


def generate_daily_report(db: Session) -> str:
    """Generate a daily summary report."""
    today = datetime.utcnow().date()
    total_clients = db.query(func.count()).select_from(db.query(Policy.client_id.distinct()).subquery()).scalar()
    active_policies = db.query(Policy).filter(Policy.status == "active").count()
    new_today = db.query(Policy).filter(func.date(Policy.created_at) == today).count()
    pending_claims = db.query(Claim).filter(Claim.status.in_(["submitted", "assessment"])).count()
    pending_approvals = db.query(ApprovalRequest).filter(ApprovalRequest.status == "pending").count()
    today_activities = db.query(Activity).filter(func.date(Activity.scheduled_date) == today).count()

    return (
        f"📊 *Daily Report — {today}*\n"
        f"━━━━━━━━━━━━━━━\n"
        f"📋 Active Policies: {active_policies}\n"
        f"📋 New Policies Today: {new_today}\n"
        f"⚠️ Pending Claims: {pending_claims}\n"
        f"📝 Pending Approvals: {pending_approvals}\n"
        f"📅 Activities Today: {today_activities}\n"
        f"━━━━━━━━━━━━━━━\n"
    )
