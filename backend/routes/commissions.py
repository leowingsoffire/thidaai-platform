from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Commission, Policy, Client
from schemas import CommissionCreate, CommissionResponse

router = APIRouter(prefix="/api/commissions", tags=["commissions"])


@router.get("", response_model=list[CommissionResponse])
def list_commissions(status: str | None = None, period: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Commission)
    if status:
        query = query.filter(Commission.status == status)
    if period:
        query = query.filter(Commission.period == period)
    commissions = query.order_by(Commission.created_at.desc()).all()
    result = []
    for c in commissions:
        data = CommissionResponse.model_validate(c)
        if c.policy_id:
            policy = db.query(Policy).filter(Policy.id == c.policy_id).first()
            if policy:
                data.policy_number = policy.policy_number
                client = db.query(Client).filter(Client.id == policy.client_id).first()
                data.client_name = client.full_name if client else None
        result.append(data)
    return result


@router.post("", response_model=CommissionResponse, status_code=201)
def create_commission(data: CommissionCreate, db: Session = Depends(get_db)):
    if data.policy_id:
        policy = db.query(Policy).filter(Policy.id == data.policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
    commission = Commission(**data.model_dump())
    db.add(commission)
    db.commit()
    db.refresh(commission)
    resp = CommissionResponse.model_validate(commission)
    if commission.policy_id:
        policy = db.query(Policy).filter(Policy.id == commission.policy_id).first()
        if policy:
            resp.policy_number = policy.policy_number
            client = db.query(Client).filter(Client.id == policy.client_id).first()
            resp.client_name = client.full_name if client else None
    return resp


@router.get("/summary")
def commission_summary(db: Session = Depends(get_db)):
    total_earned = db.query(func.coalesce(func.sum(Commission.amount), 0)).filter(
        Commission.status == "paid"
    ).scalar()
    total_pending = db.query(func.coalesce(func.sum(Commission.amount), 0)).filter(
        Commission.status == "pending"
    ).scalar()

    # By type
    by_type = {}
    for ctype in ["first_year", "renewal", "bonus", "override"]:
        amount = db.query(func.coalesce(func.sum(Commission.amount), 0)).filter(
            Commission.commission_type == ctype,
            Commission.status.in_(["paid", "pending"]),
        ).scalar()
        by_type[ctype] = float(amount)

    return {
        "total_earned": float(total_earned),
        "total_pending": float(total_pending),
        "total": float(total_earned) + float(total_pending),
        "by_type": by_type,
    }
