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

    # Calculate protection gap
    annual_expenses = float(data.annual_expenses)
    years_of_protection = 10
    total_need = annual_expenses * years_of_protection
    outstanding_debts = float(data.outstanding_debts)
    emergency_fund = annual_expenses / 12 * data.emergency_fund_months
    education_fund = 50000 if data.children_education_needed else 0

    total_coverage_needed = total_need + outstanding_debts + emergency_fund + education_fund
    current_coverage = float(data.current_coverage)
    gap = max(0, total_coverage_needed - current_coverage)

    analysis_data = {
        "total_coverage_needed": total_coverage_needed,
        "current_coverage": current_coverage,
        "protection_gap": gap,
        "breakdown": {
            "income_replacement": total_need,
            "debt_coverage": outstanding_debts,
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
