"""Claims management module with full lifecycle: submit → verify → fraud check → assess → approve/reject → pay → close."""
import random
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from database import get_db
from models import Claim, Policy, Client, User, Notification, gen_uuid
from services.auth_service import get_current_user, get_optional_user, log_audit
from services.workflow_service import start_workflow, transition_workflow

router = APIRouter(prefix="/api/claims", tags=["claims"])


# ---- Fraud detection heuristics ----

def fraud_check(claim: Claim, policy: Policy, client: Client) -> dict:
    """Simple fraud scoring heuristic. In production, use ML model."""
    score = 0.0
    flags = []

    # Check claim amount vs sum assured
    if policy.sum_assured and claim.claim_amount:
        ratio = float(claim.claim_amount) / float(policy.sum_assured)
        if ratio > 0.9:
            score += 30
            flags.append("Claim amount exceeds 90% of sum assured")

    # Check policy age (claims within first 2 years are riskier)
    if policy.start_date:
        policy_age_days = (datetime.utcnow().date() - policy.start_date).days
        if policy_age_days < 365:
            score += 25
            flags.append(f"Policy less than 1 year old ({policy_age_days} days)")
        elif policy_age_days < 730:
            score += 15
            flags.append(f"Policy less than 2 years old")

    # Check incident date proximity to policy start
    if claim.incident_date and policy.start_date:
        gap = (claim.incident_date - policy.start_date).days
        if gap < 90:
            score += 20
            flags.append(f"Incident within 90 days of policy start")

    # Multiple claims check would go here (needs DB query)

    is_flagged = score >= 40

    return {
        "score": round(score, 1),
        "is_flagged": is_flagged,
        "flags": flags,
        "recommendation": "Manual review required" if is_flagged else "Low risk - proceed with assessment",
    }


# ---- Pydantic models ----

class ClaimCreateRequest(BaseModel):
    policy_id: str
    claim_type: str  # death, health, disability, maturity, surrender, accident
    claim_amount: Decimal
    incident_date: str  # ISO date
    incident_description: Optional[str] = None


class ClaimUpdateRequest(BaseModel):
    status: Optional[str] = None
    approved_amount: Optional[Decimal] = None
    assessment_notes: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None


class ClaimResponse(BaseModel):
    id: str
    claim_number: str
    policy_id: str
    client_id: str
    claim_type: str
    claim_amount: Decimal
    approved_amount: Optional[Decimal]
    incident_date: Optional[date] = None
    incident_description: Optional[str] = None
    status: str
    fraud_flag: bool
    fraud_score: Optional[float]
    fraud_notes: Optional[str]
    supporting_documents: Optional[list]
    documents_verified: bool
    assessor_id: Optional[str]
    assessment_notes: Optional[str]
    payment_method: Optional[str]
    payment_reference: Optional[str]
    payment_date: Optional[date] = None
    workflow_instance_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Enriched
    policy_number: Optional[str] = None
    client_name: Optional[str] = None
    product_name: Optional[str] = None
    assessor_name: Optional[str] = None
    model_config = {"from_attributes": True}


def enrich_claim(claim: Claim, db: Session) -> ClaimResponse:
    data = ClaimResponse.model_validate(claim)
    policy = db.query(Policy).filter(Policy.id == claim.policy_id).first()
    if policy:
        data.policy_number = policy.policy_number
        data.product_name = policy.product_name
    client = db.query(Client).filter(Client.id == claim.client_id).first()
    if client:
        data.client_name = client.full_name
    if claim.assessor_id:
        assessor = db.query(User).filter(User.id == claim.assessor_id).first()
        data.assessor_name = assessor.full_name if assessor else None
    return data


def gen_claim_number() -> str:
    now = datetime.utcnow()
    rand = random.randint(1000, 9999)
    return f"CLM-{now.strftime('%Y%m')}-{rand}"


# ---- Routes ----

@router.get("", response_model=list[ClaimResponse])
def list_claims(
    status: Optional[str] = None,
    claim_type: Optional[str] = None,
    client_id: Optional[str] = None,
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = db.query(Claim)
    if status:
        query = query.filter(Claim.status == status)
    if claim_type:
        query = query.filter(Claim.claim_type == claim_type)
    if client_id:
        query = query.filter(Claim.client_id == client_id)
    claims = query.order_by(Claim.created_at.desc()).limit(200).all()
    return [enrich_claim(c, db) for c in claims]


@router.get("/stats")
def claim_stats(user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    total = db.query(Claim).count()
    pending = db.query(Claim).filter(Claim.status.in_(["submitted", "docs_verification", "fraud_check", "assessment"])).count()
    approved = db.query(Claim).filter(Claim.status == "approved").count()
    rejected = db.query(Claim).filter(Claim.status == "rejected").count()
    closed = db.query(Claim).filter(Claim.status == "closed").count()
    flagged = db.query(Claim).filter(Claim.fraud_flag == True).count()

    total_claimed = db.query(func.coalesce(func.sum(Claim.claim_amount), 0)).scalar()
    total_approved = db.query(func.coalesce(func.sum(Claim.approved_amount), 0)).scalar()

    by_type = {}
    for ct in ["death", "health", "disability", "maturity", "surrender", "accident"]:
        by_type[ct] = db.query(Claim).filter(Claim.claim_type == ct).count()

    return {
        "total": total, "pending": pending, "approved": approved,
        "rejected": rejected, "closed": closed, "flagged": flagged,
        "total_claimed": float(total_claimed), "total_approved": float(total_approved),
        "by_type": by_type,
    }


@router.post("", response_model=ClaimResponse, status_code=201)
def submit_claim(data: ClaimCreateRequest, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    policy = db.query(Policy).filter(Policy.id == data.policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.status not in ("active", "claimed"):
        raise HTTPException(status_code=400, detail=f"Cannot claim against policy with status '{policy.status}'")

    client = db.query(Client).filter(Client.id == policy.client_id).first()

    claim = Claim(
        claim_number=gen_claim_number(),
        policy_id=data.policy_id,
        client_id=policy.client_id,
        claim_type=data.claim_type,
        claim_amount=data.claim_amount,
        incident_date=datetime.fromisoformat(data.incident_date).date(),
        incident_description=data.incident_description,
        status="submitted",
        submitted_by=user.id if user else None,
    )
    db.add(claim)
    db.flush()

    # Run fraud check
    fraud_result = fraud_check(claim, policy, client)
    claim.fraud_score = fraud_result["score"]
    claim.fraud_flag = fraud_result["is_flagged"]
    claim.fraud_notes = "; ".join(fraud_result["flags"]) if fraud_result["flags"] else None

    # Update policy status
    policy.status = "claimed"

    # Start claim workflow
    user_id = user.id if user else "system"
    try:
        wf = start_workflow(
            db, "claim_processing", "claim", claim.id,
            started_by=user_id,
            priority="high" if claim.fraud_flag else "normal",
            initial_task_title=f"Verify documents for claim {claim.claim_number}",
            initial_task_role="claims_officer",
        )
        claim.workflow_instance_id = wf.id
    except (ValueError, Exception):
        pass

    db.commit()
    db.refresh(claim)

    if user:
        log_audit(db, user.id, "create", "claim", claim.id, {"claim_number": claim.claim_number, "amount": float(data.claim_amount)})

    return enrich_claim(claim, db)


@router.get("/{claim_id}", response_model=ClaimResponse)
def get_claim(claim_id: str, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return enrich_claim(claim, db)


@router.put("/{claim_id}", response_model=ClaimResponse)
def update_claim(claim_id: str, data: ClaimUpdateRequest, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    old_status = claim.status
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(claim, key, value)

    if user and data.assessment_notes:
        claim.assessor_id = user.id

    # Handle payment
    if data.status == "payment_processing" and data.payment_method:
        claim.payment_date = datetime.utcnow().date()

    if data.status == "closed" and not claim.approved_amount and data.approved_amount:
        claim.approved_amount = data.approved_amount

    # Transition workflow if status changed
    if data.status and data.status != old_status and claim.workflow_instance_id:
        action_map = {
            "docs_verification": "verify_docs",
            "fraud_check": "fraud_check",
            "assessment": "assess",
            "approved": "approve",
            "rejected": "reject",
            "payment_processing": "process_payment",
            "closed": "close",
        }
        action = action_map.get(data.status, data.status)
        try:
            transition_workflow(
                db, claim.workflow_instance_id, action, data.status,
                performed_by=user.id if user else "system",
                comments=data.assessment_notes,
            )
        except (ValueError, Exception):
            pass

    db.commit()
    db.refresh(claim)

    if user:
        log_audit(db, user.id, "update", "claim", claim_id, update_data)

    return enrich_claim(claim, db)


@router.post("/{claim_id}/verify-docs", response_model=ClaimResponse)
def verify_documents(claim_id: str, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.documents_verified = True
    claim.status = "fraud_check"
    db.commit()
    db.refresh(claim)
    return enrich_claim(claim, db)


@router.post("/{claim_id}/approve", response_model=ClaimResponse)
def approve_claim(claim_id: str, approved_amount: Decimal = None, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = "approved"
    claim.approved_amount = approved_amount or claim.claim_amount
    if user:
        claim.approved_by = user.id

    # Notify submitter
    if claim.submitted_by:
        notif = Notification(
            user_id=claim.submitted_by,
            title=f"Claim {claim.claim_number} Approved",
            message=f"Claim has been approved for {claim.approved_amount} MMK.",
            notification_type="info",
            link=f"/claims/{claim.id}",
        )
        db.add(notif)

    db.commit()
    db.refresh(claim)
    return enrich_claim(claim, db)


@router.post("/{claim_id}/reject", response_model=ClaimResponse)
def reject_claim(claim_id: str, reason: str = "Insufficient documentation", user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = "rejected"
    claim.assessment_notes = reason
    if user:
        claim.approved_by = user.id
    db.commit()
    db.refresh(claim)
    return enrich_claim(claim, db)
