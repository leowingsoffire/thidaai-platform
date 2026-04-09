from decimal import Decimal
from math import pow as math_pow
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Client, FinancialPlan
from schemas import (
    RetirementPlanRequest,
    EducationPlanRequest,
    TaxPlanRequest,
    FinancialPlanResponse,
)

router = APIRouter(prefix="/api/planning", tags=["planning"])


@router.post("/retirement", response_model=FinancialPlanResponse)
def retirement_calculator(data: RetirementPlanRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    years_to_retire = data.retirement_age - data.current_age
    retirement_years = 80 - data.retirement_age  # assume life expectancy 80

    monthly_expenses = float(data.monthly_expenses)
    inflation = data.inflation_rate
    return_rate = data.expected_return_rate

    # Future monthly expenses at retirement (inflation-adjusted)
    future_monthly = monthly_expenses * math_pow(1 + inflation, years_to_retire)
    annual_retirement_expense = future_monthly * 12

    # Total corpus needed (present value of annuity at retirement)
    real_rate = (1 + return_rate) / (1 + inflation) - 1
    if real_rate > 0 and retirement_years > 0:
        corpus_needed = annual_retirement_expense * (1 - math_pow(1 + real_rate, -retirement_years)) / real_rate
    else:
        corpus_needed = annual_retirement_expense * retirement_years

    current_savings = float(data.current_savings)
    future_savings = current_savings * math_pow(1 + return_rate, years_to_retire)
    gap = max(0, corpus_needed - future_savings)

    # Monthly SIP needed
    monthly_rate = return_rate / 12
    months = years_to_retire * 12
    if monthly_rate > 0 and months > 0:
        sip_needed = gap * monthly_rate / (math_pow(1 + monthly_rate, months) - 1)
    else:
        sip_needed = gap / max(months, 1)

    result_data = {
        "corpus_needed": round(corpus_needed, 2),
        "future_savings_value": round(future_savings, 2),
        "gap": round(gap, 2),
        "monthly_sip_needed": round(sip_needed, 2),
        "future_monthly_expenses": round(future_monthly, 2),
        "years_to_retire": years_to_retire,
        "retirement_years": retirement_years,
    }

    plan = FinancialPlan(
        client_id=data.client_id,
        plan_type="retirement",
        input_data=data.model_dump(mode="json"),
        result_data=result_data,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/education", response_model=FinancialPlanResponse)
def education_calculator(data: EducationPlanRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    years_until = data.education_start_age - data.child_current_age
    annual_cost = float(data.annual_education_cost)
    inflation = data.inflation_rate
    return_rate = data.expected_return_rate

    # Future cost per year (inflation-adjusted)
    total_education_cost = 0
    yearly_costs = []
    for i in range(data.education_years):
        future_cost = annual_cost * math_pow(1 + inflation, years_until + i)
        total_education_cost += future_cost
        yearly_costs.append(round(future_cost, 2))

    # Present value of total cost
    pv_total = total_education_cost / math_pow(1 + return_rate, years_until) if years_until > 0 else total_education_cost
    current_savings = float(data.current_savings)
    gap = max(0, pv_total - current_savings)

    # Monthly SIP needed
    monthly_rate = return_rate / 12
    months = years_until * 12
    if monthly_rate > 0 and months > 0:
        sip_needed = gap * monthly_rate / (math_pow(1 + monthly_rate, months) - 1)
    else:
        sip_needed = gap / max(months, 1)

    result_data = {
        "total_education_cost": round(total_education_cost, 2),
        "present_value": round(pv_total, 2),
        "current_savings": current_savings,
        "gap": round(gap, 2),
        "monthly_sip_needed": round(sip_needed, 2),
        "yearly_costs": yearly_costs,
        "years_until_start": years_until,
    }

    plan = FinancialPlan(
        client_id=data.client_id,
        plan_type="education",
        input_data=data.model_dump(mode="json"),
        result_data=result_data,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/tax", response_model=FinancialPlanResponse)
def tax_calculator(data: TaxPlanRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    income = float(data.annual_income)
    insurance = float(data.insurance_premiums)
    provident = float(data.provident_fund)
    current_deductions = float(data.current_deductions)

    # Myanmar tax brackets (simplified)
    brackets = [
        (2_000_000, 0.0),
        (5_000_000, 0.05),
        (10_000_000, 0.10),
        (20_000_000, 0.15),
        (30_000_000, 0.20),
        (float("inf"), 0.25),
    ]

    def calc_tax(taxable: float) -> float:
        tax = 0
        prev = 0
        for limit, rate in brackets:
            if taxable <= prev:
                break
            bracket_income = min(taxable, limit) - prev
            tax += bracket_income * rate
            prev = limit
        return tax

    total_deductions = current_deductions + insurance + provident
    # Cap deductions at reasonable limit
    max_deduction = income * 0.3
    effective_deductions = min(total_deductions, max_deduction)

    taxable_without = income - current_deductions
    taxable_with = income - effective_deductions

    tax_without = calc_tax(max(0, taxable_without))
    tax_with = calc_tax(max(0, taxable_with))
    savings = tax_without - tax_with

    # Additional insurance recommendation
    additional_deduction_room = max(0, max_deduction - total_deductions)

    result_data = {
        "annual_income": income,
        "total_deductions": effective_deductions,
        "taxable_income_before": round(taxable_without, 2),
        "taxable_income_after": round(taxable_with, 2),
        "tax_before": round(tax_without, 2),
        "tax_after": round(tax_with, 2),
        "tax_savings": round(savings, 2),
        "additional_deduction_room": round(additional_deduction_room, 2),
    }

    plan = FinancialPlan(
        client_id=data.client_id,
        plan_type="tax",
        input_data=data.model_dump(mode="json"),
        result_data=result_data,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan
