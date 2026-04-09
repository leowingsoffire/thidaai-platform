from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import MDRTProgress, Policy
from schemas import MDRTProgressRequest, MDRTProgressResponse

router = APIRouter(prefix="/api/mdrt", tags=["mdrt"])

# MDRT 2024 qualification thresholds (USD equivalent)
MDRT_PREMIUM_THRESHOLD = Decimal("15000")
MDRT_CASES_THRESHOLD = 20


@router.post("/progress", response_model=MDRTProgressResponse)
def calculate_mdrt_progress(data: MDRTProgressRequest, db: Session = Depends(get_db)):
    year = data.year
    target_premium = data.target_premium or MDRT_PREMIUM_THRESHOLD
    target_cases = data.target_cases or MDRT_CASES_THRESHOLD

    # Calculate achieved from policies written this year
    year_start = datetime(year, 1, 1)
    year_end = datetime(year, 12, 31)

    result = db.query(
        func.coalesce(func.sum(Policy.premium_amount), 0).label("total_premium"),
        func.count(Policy.id).label("total_cases"),
    ).filter(
        Policy.start_date >= year_start.date(),
        Policy.start_date <= year_end.date(),
        Policy.status == "active",
    ).first()

    achieved_premium = result.total_premium
    achieved_cases = result.total_cases

    # Upsert progress record
    progress = db.query(MDRTProgress).filter(MDRTProgress.year == year).first()
    if progress:
        progress.target_premium = target_premium
        progress.achieved_premium = achieved_premium
        progress.target_cases = target_cases
        progress.achieved_cases = achieved_cases
    else:
        progress = MDRTProgress(
            year=year,
            target_premium=target_premium,
            achieved_premium=achieved_premium,
            target_cases=target_cases,
            achieved_cases=achieved_cases,
        )
        db.add(progress)

    db.commit()
    db.refresh(progress)

    prog_pct = float(achieved_premium / target_premium * 100) if target_premium else 0
    cases_pct = float(achieved_cases / target_cases * 100) if target_cases else 0

    return MDRTProgressResponse(
        id=progress.id,
        year=progress.year,
        target_premium=progress.target_premium,
        achieved_premium=progress.achieved_premium,
        target_cases=progress.target_cases,
        achieved_cases=progress.achieved_cases,
        progress_percentage=round(prog_pct, 1),
        cases_percentage=round(cases_pct, 1),
        notes=progress.notes,
    )
