from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Client, NeedsAnalysis
from schemas import NeedsAnalysisRequest, NeedsAnalysisResponse
from services.ai_service import generate_needs_analysis

router = APIRouter(prefix="/api/clients", tags=["analysis"])


@router.post("/analyze", response_model=NeedsAnalysisResponse)
async def analyze_client_needs(data: NeedsAnalysisRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Derive financial needs from demographic data
    monthly_income = float(data.monthly_income)
    annual_income = monthly_income * 12
    dependents = data.dependents
    age = data.age
    years_to_retirement = max(1, 60 - age)

    # Income replacement: 10x annual income (industry standard)
    income_replacement = annual_income * 10
    # Emergency fund: 6 months of income
    emergency_fund = monthly_income * 6
    # Education fund: per dependent child
    education_fund = dependents * 25000000 if dependents > 0 else 0
    # Debt estimate: 2x annual income for married, 1x for single
    estimated_debts = annual_income * (2 if data.marital_status == 'married' else 1)

    total_coverage_needed = income_replacement + emergency_fund + education_fund + estimated_debts

    # Estimate current coverage from existing active policies
    from models import Policy
    active_policies = db.query(Policy).filter(
        Policy.client_id == data.client_id, Policy.status == 'active'
    ).all()
    current_coverage = sum(float(p.sum_assured or 0) for p in active_policies)
    gap = max(0, total_coverage_needed - current_coverage)

    analysis_data = {
        "total_coverage_needed": total_coverage_needed,
        "recommended_coverage": total_coverage_needed,
        "current_coverage": current_coverage,
        "protection_gap": gap,
        "breakdown": {
            "income_replacement": income_replacement,
            "debt_coverage": estimated_debts,
            "emergency_fund": emergency_fund,
            "education_fund": education_fund,
        },
    }

    # AI recommendations
    ai_text = await generate_needs_analysis(client, analysis_data)

    record = NeedsAnalysis(
        client_id=data.client_id,
        analysis_data=analysis_data,
        ai_recommendations=ai_text,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
