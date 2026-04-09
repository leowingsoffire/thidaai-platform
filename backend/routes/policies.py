from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Policy, Client
from schemas import PolicyBase, PolicyResponse, PolicyCreate, PolicyUpdate

router = APIRouter(prefix="/api/policies", tags=["policies"])


@router.get("", response_model=list[PolicyResponse])
def list_policies(client_id: str | None = None, status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Policy)
    if client_id:
        query = query.filter(Policy.client_id == client_id)
    if status:
        query = query.filter(Policy.status == status)
    policies = query.order_by(Policy.start_date.desc()).all()
    result = []
    for p in policies:
        data = PolicyResponse.model_validate(p)
        client = db.query(Client).filter(Client.id == p.client_id).first()
        data.client_name = client.full_name if client else None
        result.append(data)
    return result


@router.post("", response_model=PolicyResponse, status_code=201)
def create_policy(data: PolicyCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    existing = db.query(Policy).filter(Policy.policy_number == data.policy_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Policy number already exists")
    policy = Policy(**data.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    resp = PolicyResponse.model_validate(policy)
    resp.client_name = client.full_name
    return resp


@router.put("/{policy_id}", response_model=PolicyResponse)
def update_policy(policy_id: str, data: PolicyUpdate, db: Session = Depends(get_db)):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(policy, key, value)
    db.commit()
    db.refresh(policy)
    client = db.query(Client).filter(Client.id == policy.client_id).first()
    resp = PolicyResponse.model_validate(policy)
    resp.client_name = client.full_name if client else None
    return resp


@router.delete("/{policy_id}", status_code=204)
def delete_policy(policy_id: str, db: Session = Depends(get_db)):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    db.delete(policy)
    db.commit()
