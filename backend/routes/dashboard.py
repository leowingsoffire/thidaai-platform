from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Client, Policy, Commission, PipelineDeal, Activity, MDRTProgress, AutoGreeting, ApprovalRequest, ContentPost

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today.replace(day=1)
    year = today.year

    # Client stats
    total_clients = db.query(Client).count()
    new_clients_month = db.query(Client).filter(Client.created_at >= month_start).count()

    # Policy stats
    total_policies = db.query(Policy).count()
    active_policies = db.query(Policy).filter(Policy.status == "active").count()
    total_premium = float(db.query(func.coalesce(func.sum(Policy.premium_amount), 0)).filter(
        Policy.status == "active"
    ).scalar())

    # This month's new policies
    new_policies_month = db.query(Policy).filter(Policy.created_at >= month_start).count()
    monthly_premium = float(db.query(func.coalesce(func.sum(Policy.premium_amount), 0)).filter(
        Policy.created_at >= month_start
    ).scalar())

    # Commission stats
    total_earned = float(db.query(func.coalesce(func.sum(Commission.amount), 0)).filter(
        Commission.status == "paid"
    ).scalar())
    pending_commission = float(db.query(func.coalesce(func.sum(Commission.amount), 0)).filter(
        Commission.status == "pending"
    ).scalar())

    # Pipeline stats
    pipeline_value = float(db.query(func.coalesce(func.sum(PipelineDeal.expected_premium), 0)).filter(
        PipelineDeal.stage.notin_(["closed_won", "closed_lost"])
    ).scalar())
    pipeline_deals = db.query(PipelineDeal).filter(
        PipelineDeal.stage.notin_(["closed_won", "closed_lost"])
    ).count()

    # Activity stats
    activities_today = db.query(Activity).filter(
        Activity.scheduled_date >= today,
        Activity.scheduled_date < today + timedelta(days=1),
    ).count()
    activities_week = db.query(Activity).filter(
        Activity.scheduled_date >= today - timedelta(days=today.weekday()),
        Activity.scheduled_date < today - timedelta(days=today.weekday()) + timedelta(days=7),
    ).count()
    activities_completed = db.query(Activity).filter(
        Activity.status == "completed",
        Activity.completed_date >= month_start,
    ).count()

    # MDRT progress
    mdrt = db.query(MDRTProgress).filter(MDRTProgress.year == year).first()
    mdrt_progress_pct = 0.0
    mdrt_cases_pct = 0.0
    mdrt_data = None
    if mdrt:
        mdrt_progress_pct = float(mdrt.achieved_premium / mdrt.target_premium * 100) if mdrt.target_premium else 0
        mdrt_cases_pct = float(mdrt.achieved_cases / mdrt.target_cases * 100) if mdrt.target_cases else 0
        mdrt_data = {
            "target_premium": float(mdrt.target_premium),
            "achieved_premium": float(mdrt.achieved_premium),
            "target_cases": mdrt.target_cases,
            "achieved_cases": mdrt.achieved_cases,
        }

    # Recent activities
    recent_activities = db.query(Activity).order_by(Activity.created_at.desc()).limit(5).all()
    activities_list = []
    for a in recent_activities:
        client_name = None
        if a.client_id:
            c = db.query(Client).filter(Client.id == a.client_id).first()
            client_name = c.full_name if c else None
        activities_list.append({
            "id": a.id,
            "title": a.title,
            "activity_type": a.activity_type,
            "status": a.status,
            "client_name": client_name,
            "scheduled_date": a.scheduled_date.isoformat() if a.scheduled_date else None,
        })

    # Product type breakdown (policies by type)
    product_breakdown = {}
    for ptype in ["life", "health", "investment", "education", "critical_illness", "cancer_care"]:
        count = db.query(Policy).filter(Policy.policy_type == ptype, Policy.status == "active").count()
        premium = float(db.query(func.coalesce(func.sum(Policy.premium_amount), 0)).filter(
            Policy.policy_type == ptype, Policy.status == "active"
        ).scalar())
        product_breakdown[ptype] = {"count": count, "premium": premium}

    return {
        "total_clients": total_clients,
        "new_clients_month": new_clients_month,
        "total_policies": total_policies,
        "active_policies": active_policies,
        "total_premium": total_premium,
        "new_policies_month": new_policies_month,
        "monthly_premium": monthly_premium,
        "total_earned": total_earned,
        "pending_commission": pending_commission,
        "pipeline_value": pipeline_value,
        "pipeline_deals": pipeline_deals,
        "activities_today": activities_today,
        "activities_week": activities_week,
        "activities_completed": activities_completed,
        "mdrt_progress_pct": round(mdrt_progress_pct, 1),
        "mdrt_cases_pct": round(mdrt_cases_pct, 1),
        "mdrt_data": mdrt_data,
        "recent_activities": activities_list,
        "product_breakdown": product_breakdown,
        # ---- NEW: AI Recommendations ----
        "ai_recommendations": _generate_ai_recommendations(
            total_clients, active_policies, pipeline_deals, pipeline_value,
            mdrt_progress_pct, activities_today, total_premium, monthly_premium,
        ),
        # ---- NEW: Revenue tracker (6 months) ----
        "revenue_tracker": _revenue_tracker(db),
        # ---- NEW: Daily client pipeline ----
        "daily_pipeline": _daily_pipeline(db),
        # ---- NEW: Pending counts ----
        "pending_approvals": db.query(ApprovalRequest).filter(ApprovalRequest.status == "pending").count(),
        "upcoming_greetings": _upcoming_greeting_count(db),
        "scheduled_content": db.query(ContentPost).filter(ContentPost.status == "scheduled").count(),
    }


def _generate_ai_recommendations(
    clients, policies, deals, pipeline_val,
    mdrt_pct, activities_today, total_premium, monthly_premium,
):
    recs = []
    if mdrt_pct < 50:
        recs.append({
            "type": "mdrt", "priority": "high", "icon": "trophy",
            "title": "MDRT Gap Alert",
            "description": f"You're at {mdrt_pct}% of MDRT target. Focus on high-value prospects this week.",
            "action": "View MDRT Tracker",
        })
    if activities_today == 0:
        recs.append({
            "type": "activity", "priority": "medium", "icon": "calendar",
            "title": "Schedule Today's Activities",
            "description": "No activities scheduled for today. Book at least 3 client meetings.",
            "action": "Open Calendar",
        })
    if deals < 3:
        recs.append({
            "type": "pipeline", "priority": "medium", "icon": "target",
            "title": "Build Your Pipeline",
            "description": f"Only {deals} active deals. Target 10+ deals for consistent income.",
            "action": "View Pipeline",
        })
    if clients < 20:
        recs.append({
            "type": "prospecting", "priority": "high", "icon": "users",
            "title": "Grow Client Base",
            "description": f"You have {clients} clients. Ask existing clients for 2 referrals each.",
            "action": "View Clients",
        })
    # Always add an educational tip
    recs.append({
        "type": "tip", "priority": "low", "icon": "lightbulb",
        "title": "Daily Tip: 4 Pillars Approach",
        "description": "Use AIA's Live Well, Think Well, Feel Well, Plan Well framework in every client meeting for holistic coverage.",
        "action": "Learn More",
    })
    return recs[:5]


def _revenue_tracker(db: Session):
    """Monthly revenue for last 6 months."""
    now = datetime.utcnow()
    months = []
    for i in range(5, -1, -1):
        m = now.replace(day=1) - timedelta(days=i * 30)
        m_start = m.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if m.month == 12:
            m_end = m_start.replace(year=m.year + 1, month=1)
        else:
            m_end = m_start.replace(month=m.month + 1)
        premium = float(db.query(func.coalesce(func.sum(Policy.premium_amount), 0)).filter(
            Policy.created_at >= m_start, Policy.created_at < m_end,
        ).scalar())
        commission = float(db.query(func.coalesce(func.sum(Commission.amount), 0)).filter(
            Commission.created_at >= m_start, Commission.created_at < m_end,
        ).scalar())
        months.append({
            "month": m_start.strftime("%b %Y"),
            "premium": premium,
            "commission": commission,
        })
    return months


def _daily_pipeline(db: Session):
    """Active pipeline deals grouped by stage."""
    stages = ["lead", "contacted", "proposal_sent", "negotiation", "closing"]
    pipeline = []
    for stage in stages:
        deals = db.query(PipelineDeal).filter(PipelineDeal.stage == stage).all()
        deal_list = []
        for d in deals[:5]:
            client = db.query(Client).filter(Client.id == d.client_id).first() if d.client_id else None
            deal_list.append({
                "id": d.id, "client_name": client.name if client else "Unknown",
                "expected_premium": float(d.expected_premium) if d.expected_premium else 0,
                "probability": float(d.probability) if d.probability else 0,
            })
        pipeline.append({"stage": stage, "count": len(deals), "deals": deal_list})
    return pipeline


def _upcoming_greeting_count(db: Session):
    """Count clients with upcoming birthdays in next 7 days."""
    now = datetime.utcnow()
    clients = db.query(Client).all()
    count = 0
    for c in clients:
        if c.date_of_birth:
            try:
                dob = c.date_of_birth if isinstance(c.date_of_birth, datetime) else datetime.fromisoformat(str(c.date_of_birth))
                next_bday = dob.replace(year=now.year)
                if next_bday < now:
                    next_bday = next_bday.replace(year=now.year + 1)
                if (next_bday - now).days <= 7:
                    count += 1
            except (ValueError, AttributeError):
                pass
    return count
