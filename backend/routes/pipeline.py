from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import get_db
from models import PipelineDeal, Client, Policy, Activity
from schemas import PipelineDealCreate, PipelineDealUpdate, PipelineDealResponse

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

STAGE_ORDER = ["prospect", "contacted", "needs_analysis", "proposal", "negotiation", "closed_won", "closed_lost"]
STAGE_PROBABILITY = {"prospect": 10, "contacted": 20, "needs_analysis": 40, "proposal": 60, "negotiation": 80, "closed_won": 100, "closed_lost": 0}


@router.get("", response_model=list[PipelineDealResponse])
def list_deals(stage: str | None = None, db: Session = Depends(get_db)):
    query = db.query(PipelineDeal)
    if stage:
        query = query.filter(PipelineDeal.stage == stage)
    else:
        query = query.filter(PipelineDeal.stage != "closed_lost")
    deals = query.order_by(PipelineDeal.updated_at.desc()).all()
    result = []
    for d in deals:
        data = PipelineDealResponse.model_validate(d)
        client = db.query(Client).filter(Client.id == d.client_id).first()
        data.client_name = client.full_name if client else None
        result.append(data)
    return result


@router.post("", response_model=PipelineDealResponse, status_code=201)
def create_deal(data: PipelineDealCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    deal_data = data.model_dump()
    if data.stage in STAGE_PROBABILITY and data.probability == 10:
        deal_data["probability"] = STAGE_PROBABILITY[data.stage]
    deal = PipelineDeal(**deal_data)
    db.add(deal)
    db.commit()
    db.refresh(deal)
    resp = PipelineDealResponse.model_validate(deal)
    resp.client_name = client.full_name
    return resp


@router.put("/{deal_id}", response_model=PipelineDealResponse)
def update_deal(deal_id: str, data: PipelineDealUpdate, db: Session = Depends(get_db)):
    deal = db.query(PipelineDeal).filter(PipelineDeal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    update_data = data.model_dump(exclude_unset=True)
    if "stage" in update_data and update_data["stage"] in STAGE_PROBABILITY:
        if "probability" not in update_data:
            update_data["probability"] = STAGE_PROBABILITY[update_data["stage"]]
    for key, value in update_data.items():
        setattr(deal, key, value)
    db.commit()
    db.refresh(deal)
    client = db.query(Client).filter(Client.id == deal.client_id).first()
    resp = PipelineDealResponse.model_validate(deal)
    resp.client_name = client.full_name if client else None
    return resp


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: str, db: Session = Depends(get_db)):
    deal = db.query(PipelineDeal).filter(PipelineDeal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    db.delete(deal)
    db.commit()


@router.get("/summary")
def pipeline_summary(db: Session = Depends(get_db)):
    stages = {}
    for stage in STAGE_ORDER:
        count = db.query(PipelineDeal).filter(PipelineDeal.stage == stage).count()
        value = db.query(func.coalesce(func.sum(PipelineDeal.expected_premium), 0)).filter(
            PipelineDeal.stage == stage
        ).scalar()
        stages[stage] = {"count": count, "value": float(value)}

    total_value = db.query(func.coalesce(func.sum(PipelineDeal.expected_premium), 0)).filter(
        PipelineDeal.stage.notin_(["closed_won", "closed_lost"])
    ).scalar()
    weighted_value = db.query(
        func.coalesce(func.sum(PipelineDeal.expected_premium * PipelineDeal.probability / 100), 0)
    ).filter(
        PipelineDeal.stage.notin_(["closed_won", "closed_lost"])
    ).scalar()

    return {
        "stages": stages,
        "total_pipeline_value": float(total_value),
        "weighted_pipeline_value": float(weighted_value),
        "total_deals": db.query(PipelineDeal).filter(PipelineDeal.stage.notin_(["closed_won", "closed_lost"])).count(),
    }


@router.get("/ai-insights")
def pipeline_ai_insights(db: Session = Depends(get_db)):
    """AI-powered deal scoring, next-best-actions, and pipeline health analysis."""
    deals = db.query(PipelineDeal).filter(
        PipelineDeal.stage.notin_(["closed_won", "closed_lost"])
    ).all()

    deal_insights = []
    stale_count = 0
    high_value_at_risk = 0
    total_weighted = 0

    for d in deals:
        client = db.query(Client).filter(Client.id == d.client_id).first()
        days_old = (datetime.utcnow() - d.created_at).days if d.created_at else 0
        stage_idx = STAGE_ORDER.index(d.stage) if d.stage in STAGE_ORDER else 0
        stage_progress = stage_idx / max(len(STAGE_ORDER) - 2, 1)

        last_activity = db.query(Activity).filter(
            Activity.client_id == d.client_id
        ).order_by(Activity.created_at.desc()).first() if d.client_id else None
        days_since_activity = (datetime.utcnow() - last_activity.created_at).days if last_activity and last_activity.created_at else 999

        existing_policies = db.query(Policy).filter(
            Policy.client_id == d.client_id, Policy.status == "active"
        ).count() if d.client_id else 0

        # AI Score (0-100)
        score = 50
        score += stage_progress * 20
        score += min(existing_policies * 5, 15)
        if days_old > 60:
            score -= min((days_old - 60) // 10 * 3, 25)
        if days_since_activity > 14:
            score -= min((days_since_activity - 14) // 7 * 5, 20)
        if float(d.expected_premium) > 1_000_000:
            score += 5
        score = max(10, min(100, int(score)))

        is_stale = days_old > 45 and stage_idx < 3
        if is_stale:
            stale_count += 1
        if float(d.expected_premium) > 500_000 and score < 50:
            high_value_at_risk += 1

        weighted_val = float(d.expected_premium) * (d.probability / 100) if d.probability else 0
        total_weighted += weighted_val

        # Next-best-actions
        actions = []
        if days_since_activity > 7:
            actions.append({"action": "follow_up", "label": f"Follow up — no activity for {days_since_activity} days", "priority": "high" if days_since_activity > 14 else "medium"})
        if d.stage == "prospect":
            actions.append({"action": "schedule_meeting", "label": "Schedule discovery meeting", "priority": "high"})
        elif d.stage == "contacted":
            actions.append({"action": "needs_analysis", "label": "Run 4 Pillars needs analysis", "priority": "high"})
        elif d.stage == "needs_analysis":
            actions.append({"action": "send_proposal", "label": "Prepare & send proposal", "priority": "high"})
        elif d.stage == "proposal":
            actions.append({"action": "negotiate", "label": "Review proposal with client", "priority": "high"})
        elif d.stage == "negotiation":
            actions.append({"action": "close", "label": "Push for closing — finalize terms", "priority": "high"})

        if existing_policies == 0 and d.stage not in ("prospect",):
            actions.append({"action": "cross_sell", "label": "First-time client — build trust with smaller plan first", "priority": "medium"})
        elif existing_policies > 0:
            actions.append({"action": "upsell", "label": f"Existing client ({existing_policies} policies) — leverage relationship", "priority": "low"})

        if d.expected_close_date:
            try:
                close_dt = datetime.fromisoformat(str(d.expected_close_date)) if isinstance(d.expected_close_date, str) else d.expected_close_date
                if hasattr(close_dt, 'date'):
                    days_to_close = (close_dt - datetime.utcnow()).days
                else:
                    days_to_close = (datetime.combine(close_dt, datetime.min.time()) - datetime.utcnow()).days
                if days_to_close < 0:
                    actions.append({"action": "overdue", "label": f"Overdue by {abs(days_to_close)} days — re-engage or close", "priority": "high"})
                elif days_to_close < 7:
                    actions.append({"action": "closing_soon", "label": f"Closing in {days_to_close} days — prepare final docs", "priority": "high"})
            except (ValueError, TypeError):
                pass

        deal_insights.append({
            "deal_id": d.id,
            "client_name": client.full_name if client else "Unknown",
            "product_name": d.product_name,
            "stage": d.stage,
            "expected_premium": float(d.expected_premium),
            "ai_score": score,
            "score_label": "Hot" if score >= 75 else "Warm" if score >= 50 else "Cold" if score >= 30 else "At Risk",
            "days_in_pipeline": days_old,
            "days_since_activity": days_since_activity if days_since_activity < 999 else None,
            "existing_policies": existing_policies,
            "next_actions": actions[:3],
            "is_stale": is_stale,
        })

    deal_insights.sort(key=lambda x: x["ai_score"], reverse=True)

    # Pipeline health
    total_deals = len(deals)
    health_score = 100
    if total_deals < 5:
        health_score -= 20
    if stale_count > total_deals * 0.3 and total_deals > 0:
        health_score -= 15
    if high_value_at_risk > 0:
        health_score -= high_value_at_risk * 5
    health_score = max(0, min(100, health_score))

    health_tips = []
    if total_deals < 5:
        health_tips.append("Pipeline needs more deals — aim for 10+ active opportunities")
    if stale_count > 0:
        health_tips.append(f"{stale_count} stale deal(s) need attention or should be closed")
    if high_value_at_risk > 0:
        health_tips.append(f"{high_value_at_risk} high-value deal(s) at risk — prioritize follow-ups")
    stage_counts = {}
    for d in deals:
        stage_counts[d.stage] = stage_counts.get(d.stage, 0) + 1
    early_heavy = sum(stage_counts.get(s, 0) for s in ["prospect", "contacted"]) > total_deals * 0.6
    if early_heavy and total_deals > 3:
        health_tips.append("Pipeline is top-heavy — push early-stage deals forward")
    if not health_tips:
        health_tips.append("Pipeline looks healthy! Keep the momentum going.")

    return {
        "deal_insights": deal_insights,
        "pipeline_health": {
            "score": health_score,
            "label": "Excellent" if health_score >= 80 else "Good" if health_score >= 60 else "Needs Attention" if health_score >= 40 else "Critical",
            "total_deals": total_deals,
            "stale_deals": stale_count,
            "high_value_at_risk": high_value_at_risk,
            "total_weighted_value": round(total_weighted),
            "tips": health_tips,
        },
    }
