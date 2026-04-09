"""Underwriting module with risk assessment and decision support."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import UnderwritingCase, Policy, Client, User
from services.auth_service import get_current_user, get_optional_user, require_role, log_audit
from services.workflow_service import start_workflow, transition_workflow

router = APIRouter(prefix="/api/underwriting", tags=["underwriting"])


# ---- Risk scoring engine ----

def calculate_risk_score(client: Client, policy: Policy) -> dict:
    """Automated risk scoring based on client profile and policy details."""
    score = 0
    factors = []

    # Age factor
    if client.date_of_birth:
        age = (datetime.utcnow().date() - client.date_of_birth).days // 365
        if age < 25:
            factors.append({"factor": "age", "value": age, "score": 1, "notes": "Young age - lower risk"})
            score += 1
        elif age < 45:
            factors.append({"factor": "age", "value": age, "score": 2, "notes": "Prime age"})
            score += 2
        elif age < 60:
            factors.append({"factor": "age", "value": age, "score": 4, "notes": "Higher age risk"})
            score += 4
        else:
            factors.append({"factor": "age", "value": age, "score": 6, "notes": "Senior age - elevated risk"})
            score += 6

    # Sum assured to income ratio
    if client.monthly_income and policy.sum_assured:
        annual_income = float(client.monthly_income) * 12
        ratio = float(policy.sum_assured) / annual_income if annual_income > 0 else 999
        if ratio <= 10:
            factors.append({"factor": "sa_income_ratio", "value": round(ratio, 1), "score": 1, "notes": "Within normal range"})
            score += 1
        elif ratio <= 20:
            factors.append({"factor": "sa_income_ratio", "value": round(ratio, 1), "score": 3, "notes": "Elevated coverage ratio"})
            score += 3
        else:
            factors.append({"factor": "sa_income_ratio", "value": round(ratio, 1), "score": 5, "notes": "Very high coverage ratio - review needed"})
            score += 5

    # Premium amount
    premium = float(policy.premium_amount)
    if premium > 10_000_000:
        factors.append({"factor": "premium", "value": premium, "score": 3, "notes": "High premium - additional review"})
        score += 3
    elif premium > 5_000_000:
        factors.append({"factor": "premium", "value": premium, "score": 2, "notes": "Moderate premium"})
        score += 2
    else:
        factors.append({"factor": "premium", "value": premium, "score": 1, "notes": "Standard premium"})
        score += 1

    # Policy type factor
    type_scores = {"life": 3, "health": 2, "critical_illness": 4, "cancer_care": 3, "education": 1, "investment": 1, "group": 2}
    type_score = type_scores.get(policy.policy_type, 2)
    factors.append({"factor": "policy_type", "value": policy.policy_type, "score": type_score, "notes": f"{policy.policy_type} risk category"})
    score += type_score

    # Determine risk category
    if score <= 5:
        category = "preferred"
        decision = "approved"
    elif score <= 10:
        category = "standard"
        decision = "approved"
    elif score <= 15:
        category = "substandard"
        decision = "approved_with_loading"
    else:
        category = "declined"
        decision = "referred"

    return {
        "score": score,
        "category": category,
        "auto_decision": decision,
        "factors": factors,
        "loading_percentage": 25 if category == "substandard" else 50 if category == "declined" else 0,
    }


class UWCaseResponse(BaseModel):
    id: str
    policy_id: str
    assigned_underwriter_id: Optional[str]
    risk_category: Optional[str]
    risk_score: Optional[float]
    risk_factors: Optional[list]
    decision: Optional[str]
    decision_notes: Optional[str]
    loading_percentage: float
    exclusions: Optional[list]
    additional_docs_requested: Optional[list]
    auto_decision: Optional[dict]
    workflow_instance_id: Optional[str]
    decided_at: Optional[datetime]
    created_at: datetime
    # Enriched
    policy_number: Optional[str] = None
    client_name: Optional[str] = None
    product_name: Optional[str] = None
    underwriter_name: Optional[str] = None
    model_config = {"from_attributes": True}


class UWCreateRequest(BaseModel):
    policy_id: str


class UWDecisionRequest(BaseModel):
    decision: str  # approved, approved_with_loading, rejected, deferred, referred
    decision_notes: Optional[str] = None
    loading_percentage: float = 0
    exclusions: Optional[list] = None


class UWDocRequest(BaseModel):
    doc_type: str
    notes: Optional[str] = None


def enrich_case(case: UnderwritingCase, db: Session) -> UWCaseResponse:
    data = UWCaseResponse.model_validate(case)
    policy = db.query(Policy).filter(Policy.id == case.policy_id).first()
    if policy:
        data.policy_number = policy.policy_number
        data.product_name = policy.product_name
        client = db.query(Client).filter(Client.id == policy.client_id).first()
        data.client_name = client.full_name if client else None
    if case.assigned_underwriter_id:
        uw = db.query(User).filter(User.id == case.assigned_underwriter_id).first()
        data.underwriter_name = uw.full_name if uw else None
    return data


@router.get("", response_model=list[UWCaseResponse])
def list_cases(decision: str = None, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    query = db.query(UnderwritingCase)
    if decision:
        query = query.filter(UnderwritingCase.decision == decision)
    cases = query.order_by(UnderwritingCase.created_at.desc()).limit(100).all()
    return [enrich_case(c, db) for c in cases]


@router.post("", response_model=UWCaseResponse, status_code=201)
def create_case(data: UWCreateRequest, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    policy = db.query(Policy).filter(Policy.id == data.policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    client = db.query(Client).filter(Client.id == policy.client_id).first()

    # Auto risk assessment
    risk = calculate_risk_score(client, policy)

    case = UnderwritingCase(
        policy_id=data.policy_id,
        risk_category=risk["category"],
        risk_score=risk["score"],
        risk_factors=risk["factors"],
        auto_decision=risk,
        loading_percentage=risk["loading_percentage"],
        decision="pending",
    )
    db.add(case)
    db.flush()  # Ensure case.id is generated before starting workflow

    # Update policy underwriting status
    policy.underwriting_status = "pending"
    policy.risk_score = risk["score"]
    policy.status = "pending_uw"

    # Start workflow
    user_id = user.id if user else "system"
    try:
        wf = start_workflow(
            db, "underwriting", "underwriting_case", case.id,
            started_by=user_id,
            initial_task_title=f"Review underwriting for {policy.policy_number}",
            initial_task_role="underwriter",
        )
        case.workflow_instance_id = wf.id
    except (ValueError, Exception):
        pass  # Workflow not seeded yet, continue without

    db.commit()
    db.refresh(case)
    return enrich_case(case, db)


@router.get("/{case_id}", response_model=UWCaseResponse)
def get_case(case_id: str, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    case = db.query(UnderwritingCase).filter(UnderwritingCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Underwriting case not found")
    return enrich_case(case, db)


@router.post("/{case_id}/decision", response_model=UWCaseResponse)
def make_decision(case_id: str, data: UWDecisionRequest, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    case = db.query(UnderwritingCase).filter(UnderwritingCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Underwriting case not found")

    case.decision = data.decision
    case.decision_notes = data.decision_notes
    case.loading_percentage = data.loading_percentage
    case.exclusions = data.exclusions
    case.decided_at = datetime.utcnow()
    if user:
        case.assigned_underwriter_id = user.id

    # Update policy status
    policy = db.query(Policy).filter(Policy.id == case.policy_id).first()
    if policy:
        if data.decision in ("approved", "approved_with_loading"):
            policy.underwriting_status = "approved"
            policy.status = "active"
        elif data.decision == "rejected":
            policy.underwriting_status = "rejected"
            policy.status = "cancelled"
        else:
            policy.underwriting_status = data.decision

    # Transition workflow
    if case.workflow_instance_id:
        try:
            transition_workflow(
                db, case.workflow_instance_id, data.decision, "decision_made",
                performed_by=user.id if user else "system",
                comments=data.decision_notes,
            )
        except (ValueError, Exception):
            pass

    db.commit()
    db.refresh(case)

    if user:
        log_audit(db, user.id, "underwriting_decision", "underwriting_case", case_id,
                  {"decision": data.decision, "loading": data.loading_percentage})

    return enrich_case(case, db)


@router.post("/{case_id}/request-docs", response_model=UWCaseResponse)
def request_documents(case_id: str, data: UWDocRequest, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    case = db.query(UnderwritingCase).filter(UnderwritingCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Underwriting case not found")

    docs = case.additional_docs_requested or []
    docs.append({"doc_type": data.doc_type, "notes": data.notes, "status": "pending", "requested_at": datetime.utcnow().isoformat()})
    case.additional_docs_requested = docs
    db.commit()
    db.refresh(case)
    return enrich_case(case, db)


@router.get("/{case_id}/ai-analysis")
def ai_risk_analysis(case_id: str, user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    """AI-generated risk narrative, recommendations, and similar case comparisons."""
    case = db.query(UnderwritingCase).filter(UnderwritingCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    policy = db.query(Policy).filter(Policy.id == case.policy_id).first()
    client = db.query(Client).filter(Client.id == policy.client_id).first() if policy else None

    factors = case.risk_factors or []
    score = case.risk_score or 0
    category = case.risk_category or "unknown"

    # Generate AI narrative
    narrative_parts = []
    narrative_parts.append(f"This is a {category}-risk case with a composite score of {score}.")

    for f in factors:
        fname = f.get("factor", "")
        if fname == "age":
            narrative_parts.append(f"The applicant's age ({f.get('value')}) contributes a risk weight of {f.get('score')}. {f.get('notes', '')}")
        elif fname == "sa_income_ratio":
            ratio = f.get("value", 0)
            if ratio > 15:
                narrative_parts.append(f"The sum assured to income ratio of {ratio}x is elevated and warrants additional review for potential over-insurance.")
            else:
                narrative_parts.append(f"The coverage ratio of {ratio}x is within acceptable limits.")
        elif fname == "premium":
            narrative_parts.append(f"Premium of {float(f.get('value', 0)):,.0f} MMK — {f.get('notes', '')}.")
        elif fname == "policy_type":
            narrative_parts.append(f"Product type: {f.get('value')} — inherent risk category: {f.get('notes', '')}.")

    # AI recommendations
    recommendations = []
    if category == "preferred":
        recommendations.append({"type": "approve", "text": "Low risk profile — recommend straight-through approval", "confidence": 95})
        recommendations.append({"type": "info", "text": "No additional documentation required", "confidence": 90})
    elif category == "standard":
        recommendations.append({"type": "approve", "text": "Standard risk — approve at standard rates", "confidence": 85})
        recommendations.append({"type": "info", "text": "Consider requesting medical questionnaire for comprehensive coverage", "confidence": 70})
    elif category == "substandard":
        recommendations.append({"type": "loading", "text": f"Recommend approval with {case.loading_percentage or 25}% premium loading", "confidence": 75})
        recommendations.append({"type": "docs", "text": "Request full medical examination report", "confidence": 80})
        recommendations.append({"type": "exclusion", "text": "Consider specific exclusions based on risk factors", "confidence": 65})
    else:
        recommendations.append({"type": "refer", "text": "High risk — refer to senior underwriter for manual review", "confidence": 60})
        recommendations.append({"type": "docs", "text": "Full medical + financial documentation required", "confidence": 85})

    # Similar cases comparison
    similar = db.query(UnderwritingCase).filter(
        UnderwritingCase.id != case_id,
        UnderwritingCase.risk_category == category,
        UnderwritingCase.decision.isnot(None),
    ).order_by(UnderwritingCase.created_at.desc()).limit(5).all()

    similar_cases = []
    for s in similar:
        sp = db.query(Policy).filter(Policy.id == s.policy_id).first()
        similar_cases.append({
            "risk_score": s.risk_score,
            "decision": s.decision,
            "loading": s.loading_percentage,
            "product": sp.product_name if sp else "Unknown",
        })

    # Decision statistics
    total_same_cat = db.query(UnderwritingCase).filter(UnderwritingCase.risk_category == category).count()
    approved_same = db.query(UnderwritingCase).filter(
        UnderwritingCase.risk_category == category,
        UnderwritingCase.decision.in_(["approved", "approved_with_loading"]),
    ).count()
    approval_rate = round(approved_same / total_same_cat * 100) if total_same_cat > 0 else 0

    return {
        "case_id": case_id,
        "risk_category": category,
        "risk_score": score,
        "narrative": " ".join(narrative_parts),
        "recommendations": recommendations,
        "similar_cases": similar_cases,
        "category_stats": {
            "total_cases": total_same_cat,
            "approval_rate": approval_rate,
            "avg_loading": round(
                db.query(func.avg(UnderwritingCase.loading_percentage)).filter(
                    UnderwritingCase.risk_category == category,
                    UnderwritingCase.loading_percentage > 0,
                ).scalar() or 0
            ),
        },
        "client_name": client.full_name if client else None,
        "product_name": policy.product_name if policy else None,
    }
