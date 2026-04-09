"""Corporate Solutions routes — company analysis, group insurance calculator, HR benefits comparison."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import CorporateProfile, Client, Policy, gen_uuid
from services.auth_service import get_current_user
from models import User

router = APIRouter(prefix="/api/corporate", tags=["Corporate Solutions"])


class CompanyProfileInput(BaseModel):
    client_id: str
    company_name: str
    industry: str = ""
    employee_count: int = 10
    avg_employee_age: float = 35
    annual_revenue: float = 0
    existing_benefits: dict = {}
    hr_contact_name: str = ""
    hr_contact_email: str = ""
    hr_contact_phone: str = ""


class GroupCalcInput(BaseModel):
    employee_count: int = 10
    avg_employee_age: float = 35
    plan_type: str = "basic"  # basic, standard, premium, comprehensive
    include_life: bool = True
    include_health: bool = True
    include_dental: bool = False
    include_disability: bool = False
    sum_assured_per_employee: float = 10_000_000


class BenefitsCompareInput(BaseModel):
    employee_count: int = 10
    current_provider: str = ""
    current_cost_per_employee: float = 0
    current_benefits: dict = {}


# ---- Industry risk factors for analysis ----
INDUSTRY_RISK = {
    "technology": 0.8, "finance": 0.85, "manufacturing": 1.2, "construction": 1.5,
    "healthcare": 1.0, "education": 0.75, "agriculture": 1.3, "mining": 1.8,
    "retail": 0.9, "hospitality": 1.0, "logistics": 1.1, "oil_gas": 1.6,
    "telecommunications": 0.85, "government": 0.7, "real_estate": 0.9,
}

PLAN_RATES = {
    "basic":         {"life_rate": 0.003, "health_rate": 0.02, "dental_rate": 0, "disability_rate": 0},
    "standard":      {"life_rate": 0.004, "health_rate": 0.03, "dental_rate": 0.005, "disability_rate": 0.002},
    "premium":       {"life_rate": 0.005, "health_rate": 0.04, "dental_rate": 0.008, "disability_rate": 0.003},
    "comprehensive": {"life_rate": 0.006, "health_rate": 0.05, "dental_rate": 0.01, "disability_rate": 0.004},
}


@router.post("/profile")
def create_or_update_profile(
    body: CompanyProfileInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create or update a corporate profile with AI analysis."""
    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Run analysis
    risk_factor = INDUSTRY_RISK.get(body.industry.lower(), 1.0)
    age_factor = 1.0 + max(0, (body.avg_employee_age - 35)) * 0.02
    size_discount = 1.0 - min(body.employee_count / 1000, 0.3)  # up to 30% volume discount

    risk_profile = "low" if risk_factor * age_factor < 1.0 else "medium" if risk_factor * age_factor < 1.3 else "high"

    # Generate recommended plans
    base_premium_per_head = 50_000 * risk_factor * age_factor * size_discount
    plans = []
    for plan_name, rates in PLAN_RATES.items():
        annual_cost = base_premium_per_head * body.employee_count
        if plan_name == "standard": annual_cost *= 1.4
        elif plan_name == "premium": annual_cost *= 1.8
        elif plan_name == "comprehensive": annual_cost *= 2.3
        plans.append({
            "plan_name": plan_name,
            "annual_cost_per_employee": round(annual_cost / body.employee_count),
            "total_annual_cost": round(annual_cost),
            "monthly_cost": round(annual_cost / 12),
            "includes": {
                "life": True,
                "health": True,
                "dental": plan_name in ("standard", "premium", "comprehensive"),
                "disability": plan_name in ("premium", "comprehensive"),
                "maternity": plan_name == "comprehensive",
                "wellness": plan_name in ("premium", "comprehensive"),
            },
        })

    analysis = {
        "risk_factor": round(risk_factor, 2),
        "age_factor": round(age_factor, 2),
        "volume_discount": round((1 - size_discount) * 100, 1),
        "risk_profile": risk_profile,
        "recommended_plan": "standard" if risk_profile == "low" else "premium" if risk_profile == "medium" else "comprehensive",
        "key_risks": _get_industry_risks(body.industry),
        "recommendations": [
            f"Based on {body.employee_count} employees with average age {body.avg_employee_age}",
            f"Industry risk level: {risk_profile} ({body.industry})",
            f"Volume discount: {round((1-size_discount)*100,1)}% applied",
            "Consider adding dental coverage for employee retention" if not body.existing_benefits.get("dental") else "Dental already covered",
            "Group critical illness rider recommended for high-risk industries" if risk_profile == "high" else "Standard coverage sufficient",
        ],
    }

    # Upsert profile
    profile = db.query(CorporateProfile).filter(CorporateProfile.client_id == body.client_id).first()
    if not profile:
        profile = CorporateProfile(client_id=body.client_id)
        db.add(profile)

    profile.company_name = body.company_name
    profile.industry = body.industry
    profile.employee_count = body.employee_count
    profile.avg_employee_age = body.avg_employee_age
    profile.annual_revenue = body.annual_revenue
    profile.existing_benefits = body.existing_benefits
    profile.risk_profile = risk_profile
    profile.analysis_result = analysis
    profile.group_plans = plans
    profile.hr_contact_name = body.hr_contact_name
    profile.hr_contact_email = body.hr_contact_email
    profile.hr_contact_phone = body.hr_contact_phone

    db.commit()
    db.refresh(profile)

    return {
        "profile_id": profile.id,
        "company_name": profile.company_name,
        "risk_profile": risk_profile,
        "analysis": analysis,
        "recommended_plans": plans,
    }


@router.get("/profiles")
def list_profiles(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profiles = db.query(CorporateProfile).order_by(CorporateProfile.created_at.desc()).all()
    return [
        {
            "id": p.id, "company_name": p.company_name, "industry": p.industry,
            "employee_count": p.employee_count, "risk_profile": p.risk_profile,
            "group_plans": p.group_plans, "analysis_result": p.analysis_result,
            "client_id": p.client_id, "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in profiles
    ]


@router.get("/profile/{client_id}")
def get_profile(client_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = db.query(CorporateProfile).filter(CorporateProfile.client_id == client_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No corporate profile for this client")
    return {
        "id": profile.id, "company_name": profile.company_name, "industry": profile.industry,
        "employee_count": profile.employee_count, "avg_employee_age": profile.avg_employee_age,
        "annual_revenue": float(profile.annual_revenue) if profile.annual_revenue else 0,
        "existing_benefits": profile.existing_benefits, "risk_profile": profile.risk_profile,
        "analysis_result": profile.analysis_result, "group_plans": profile.group_plans,
        "hr_contact_name": profile.hr_contact_name, "hr_contact_email": profile.hr_contact_email,
        "hr_contact_phone": profile.hr_contact_phone,
        "client_id": profile.client_id, "created_at": profile.created_at.isoformat() if profile.created_at else None,
    }


@router.post("/group-calculate")
def group_insurance_calc(
    body: GroupCalcInput,
    user: User = Depends(get_current_user),
):
    """Calculate group insurance premiums."""
    rates = PLAN_RATES.get(body.plan_type, PLAN_RATES["basic"])
    age_factor = 1.0 + max(0, (body.avg_employee_age - 30)) * 0.015
    sa = body.sum_assured_per_employee

    life_premium = sa * rates["life_rate"] * age_factor if body.include_life else 0
    health_premium = sa * rates["health_rate"] * age_factor if body.include_health else 0
    dental_premium = sa * rates["dental_rate"] * age_factor if body.include_dental else 0
    disability_premium = sa * rates["disability_rate"] * age_factor if body.include_disability else 0

    per_employee = life_premium + health_premium + dental_premium + disability_premium
    total_annual = per_employee * body.employee_count
    volume_discount = min(body.employee_count / 500, 0.25)
    discounted_total = total_annual * (1 - volume_discount)

    return {
        "plan_type": body.plan_type,
        "employee_count": body.employee_count,
        "per_employee_annual": round(per_employee),
        "total_annual": round(total_annual),
        "volume_discount_pct": round(volume_discount * 100, 1),
        "discounted_total": round(discounted_total),
        "monthly_total": round(discounted_total / 12),
        "breakdown": {
            "life": round(life_premium * body.employee_count),
            "health": round(health_premium * body.employee_count),
            "dental": round(dental_premium * body.employee_count),
            "disability": round(disability_premium * body.employee_count),
        },
        "sum_assured_per_employee": sa,
    }


@router.post("/benefits-compare")
def benefits_compare(
    body: BenefitsCompareInput,
    user: User = Depends(get_current_user),
):
    """Compare current benefits with AIA plans."""
    current_total = body.current_cost_per_employee * body.employee_count * 12

    comparisons = []
    for plan_name in ["basic", "standard", "premium", "comprehensive"]:
        rates = PLAN_RATES[plan_name]
        age_factor = 1.0
        sa = 10_000_000
        per_emp = sa * (rates["life_rate"] + rates["health_rate"] + rates["dental_rate"] + rates["disability_rate"]) * age_factor
        total = per_emp * body.employee_count
        savings = current_total - total if current_total > 0 else 0

        comparisons.append({
            "plan": plan_name,
            "annual_per_employee": round(per_emp),
            "total_annual": round(total),
            "vs_current_savings": round(savings),
            "savings_pct": round(savings / current_total * 100, 1) if current_total > 0 else 0,
            "features": {
                "life": True,
                "health": True,
                "dental": plan_name != "basic",
                "disability": plan_name in ("premium", "comprehensive"),
                "maternity": plan_name == "comprehensive",
                "wellness_program": plan_name in ("premium", "comprehensive"),
                "telemedicine": plan_name != "basic",
                "annual_checkup": True,
            },
        })

    return {
        "current_annual_total": round(current_total),
        "current_per_employee": round(body.current_cost_per_employee),
        "comparisons": comparisons,
        "recommendation": "premium" if current_total > 0 else "standard",
    }


def _get_industry_risks(industry: str) -> list:
    risks = {
        "construction": ["Workplace accidents", "Height-related injuries", "Equipment hazards"],
        "manufacturing": ["Machine injuries", "Chemical exposure", "Repetitive strain"],
        "mining": ["Cave-in risks", "Respiratory disease", "Equipment accidents"],
        "oil_gas": ["Explosion hazard", "Chemical exposure", "Remote location risks"],
        "agriculture": ["Equipment accidents", "Chemical exposure", "Weather-related risks"],
        "logistics": ["Traffic accidents", "Loading injuries", "Fatigue-related incidents"],
        "healthcare": ["Needle-stick injuries", "Infectious disease exposure", "Burnout"],
        "technology": ["Ergonomic issues", "Screen fatigue", "Sedentary lifestyle"],
    }
    return risks.get(industry.lower(), ["General workplace risks", "Standard employee health considerations"])
