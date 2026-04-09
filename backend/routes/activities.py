from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Activity, Client
from schemas import ActivityCreate, ActivityUpdate, ActivityResponse

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("", response_model=list[ActivityResponse])
def list_activities(
    status: str | None = None,
    activity_type: str | None = None,
    days: int = 30,
    db: Session = Depends(get_db),
):
    query = db.query(Activity)
    if status:
        query = query.filter(Activity.status == status)
    if activity_type:
        query = query.filter(Activity.activity_type == activity_type)
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = query.filter(Activity.created_at >= cutoff)
    activities = query.order_by(Activity.scheduled_date.desc().nullsfirst()).all()
    result = []
    for a in activities:
        data = ActivityResponse.model_validate(a)
        if a.client_id:
            client = db.query(Client).filter(Client.id == a.client_id).first()
            data.client_name = client.full_name if client else None
        result.append(data)
    return result


@router.post("", response_model=ActivityResponse, status_code=201)
def create_activity(data: ActivityCreate, db: Session = Depends(get_db)):
    if data.client_id:
        client = db.query(Client).filter(Client.id == data.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    activity = Activity(**data.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    resp = ActivityResponse.model_validate(activity)
    if activity.client_id:
        client = db.query(Client).filter(Client.id == activity.client_id).first()
        resp.client_name = client.full_name if client else None
    return resp


@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(activity_id: str, data: ActivityUpdate, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == "completed" and not activity.completed_date:
        activity.completed_date = datetime.utcnow()
    for key, value in update_data.items():
        setattr(activity, key, value)
    db.commit()
    db.refresh(activity)
    resp = ActivityResponse.model_validate(activity)
    if activity.client_id:
        client = db.query(Client).filter(Client.id == activity.client_id).first()
        resp.client_name = client.full_name if client else None
    return resp


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: str, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(activity)
    db.commit()


@router.get("/stats")
def activity_stats(db: Session = Depends(get_db)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())

    today_count = db.query(Activity).filter(
        Activity.scheduled_date >= today,
        Activity.scheduled_date < today + timedelta(days=1),
    ).count()
    week_count = db.query(Activity).filter(
        Activity.scheduled_date >= week_start,
        Activity.scheduled_date < week_start + timedelta(days=7),
    ).count()
    completed_this_month = db.query(Activity).filter(
        Activity.status == "completed",
        Activity.completed_date >= today.replace(day=1),
    ).count()

    # Activity type breakdown
    type_counts = {}
    for atype in ["call", "meeting", "follow_up", "presentation", "referral"]:
        type_counts[atype] = db.query(Activity).filter(
            Activity.activity_type == atype,
            Activity.created_at >= today.replace(day=1),
        ).count()

    return {
        "today": today_count,
        "this_week": week_count,
        "completed_this_month": completed_this_month,
        "by_type": type_counts,
    }
