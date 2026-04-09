from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


# --- Client Schemas ---
class ClientBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    monthly_income: Optional[Decimal] = None
    marital_status: Optional[str] = None
    dependents: int = 0
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    monthly_income: Optional[Decimal] = None
    marital_status: Optional[str] = None
    dependents: Optional[int] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Policy Schemas ---
class PolicyBase(BaseModel):
    policy_number: str
    product_name: str
    policy_type: str
    premium_amount: Decimal
    sum_assured: Optional[Decimal] = None
    premium_frequency: str = "monthly"
    start_date: date
    end_date: Optional[date] = None
    status: str = "active"


class PolicyResponse(PolicyBase):
    id: str
    client_id: str
    created_at: datetime
    client_name: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Needs Analysis Schemas ---
class NeedsAnalysisRequest(BaseModel):
    client_id: str
    current_coverage: Decimal = Decimal("0")
    annual_expenses: Decimal
    outstanding_debts: Decimal = Decimal("0")
    emergency_fund_months: int = 6
    children_education_needed: bool = False
    retirement_age: int = 60


class NeedsAnalysisResponse(BaseModel):
    id: str
    client_id: str
    analysis_data: dict
    ai_recommendations: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Proposal Schemas ---
class ProposalGenerateRequest(BaseModel):
    client_id: str
    products: list[str]
    notes: Optional[str] = None


class ProposalResponse(BaseModel):
    id: str
    client_id: str
    title: str
    proposal_data: dict
    pdf_path: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- MDRT Schemas ---
class MDRTProgressRequest(BaseModel):
    year: int
    target_premium: Optional[Decimal] = None
    target_cases: Optional[int] = None


class MDRTProgressResponse(BaseModel):
    id: str
    year: int
    target_premium: Decimal
    achieved_premium: Decimal
    target_cases: int
    achieved_cases: int
    progress_percentage: float
    cases_percentage: float
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Financial Planning Schemas ---
class RetirementPlanRequest(BaseModel):
    client_id: str
    current_age: int
    retirement_age: int = 60
    monthly_expenses: Decimal
    current_savings: Decimal = Decimal("0")
    expected_return_rate: float = 0.06
    inflation_rate: float = 0.05


class EducationPlanRequest(BaseModel):
    client_id: str
    child_current_age: int
    education_start_age: int = 18
    annual_education_cost: Decimal
    education_years: int = 4
    current_savings: Decimal = Decimal("0")
    expected_return_rate: float = 0.06
    inflation_rate: float = 0.05


class TaxPlanRequest(BaseModel):
    client_id: str
    annual_income: Decimal
    current_deductions: Decimal = Decimal("0")
    insurance_premiums: Decimal = Decimal("0")
    provident_fund: Decimal = Decimal("0")


class FinancialPlanResponse(BaseModel):
    id: str
    client_id: str
    plan_type: str
    input_data: dict
    result_data: dict
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Activity Schemas ---
class ActivityCreate(BaseModel):
    client_id: Optional[str] = None
    activity_type: str  # call, meeting, follow_up, presentation, referral
    title: str
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    status: str = "planned"


class ActivityUpdate(BaseModel):
    status: Optional[str] = None
    outcome: Optional[str] = None
    completed_date: Optional[datetime] = None


class ActivityResponse(BaseModel):
    id: str
    client_id: Optional[str] = None
    activity_type: str
    title: str
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    status: str
    outcome: Optional[str] = None
    created_at: datetime
    client_name: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Commission Schemas ---
class CommissionCreate(BaseModel):
    policy_id: str
    commission_type: str  # first_year, renewal, bonus, override
    amount: Decimal
    period: Optional[str] = None
    status: str = "pending"
    notes: Optional[str] = None


class CommissionResponse(BaseModel):
    id: str
    policy_id: Optional[str] = None
    commission_type: str
    amount: Decimal
    period: Optional[str] = None
    status: str
    paid_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    policy_number: Optional[str] = None
    client_name: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Pipeline Schemas ---
class PipelineDealCreate(BaseModel):
    client_id: str
    product_name: str
    expected_premium: Decimal
    stage: str = "prospect"
    probability: int = 10
    expected_close_date: Optional[date] = None
    notes: Optional[str] = None


class PipelineDealUpdate(BaseModel):
    stage: Optional[str] = None
    probability: Optional[int] = None
    expected_close_date: Optional[date] = None
    notes: Optional[str] = None
    expected_premium: Optional[Decimal] = None


class PipelineDealResponse(BaseModel):
    id: str
    client_id: str
    product_name: str
    expected_premium: Decimal
    stage: str
    probability: int
    expected_close_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    client_name: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Dashboard Schemas ---
class DashboardStats(BaseModel):
    total_clients: int
    total_policies: int
    active_policies: int
    total_premium: Decimal
    monthly_premium: Decimal
    total_commission_earned: Decimal
    pending_commission: Decimal
    pipeline_value: Decimal
    pipeline_deals: int
    activities_today: int
    activities_this_week: int
    mdrt_progress_pct: float
    mdrt_cases_pct: float

    model_config = {"from_attributes": True}


# --- Policy Management Schemas ---
class PolicyCreate(PolicyBase):
    client_id: str


class PolicyUpdate(BaseModel):
    status: Optional[str] = None
    premium_amount: Optional[Decimal] = None
    end_date: Optional[date] = None
