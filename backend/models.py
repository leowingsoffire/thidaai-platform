import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, Numeric, Integer, Date, Text, ForeignKey, DateTime, TypeDecorator, Boolean, Float, Index
from sqlalchemy.orm import relationship
from database import Base


class JSONType(TypeDecorator):
    """Platform-agnostic JSON type (works with SQLite and PostgreSQL)."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return None


def gen_uuid():
    return str(uuid.uuid4())


# ============================================================
# AUTH & RBAC
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="agent")  # admin, manager, agent, underwriter, claims_officer
    department = Column(String(100))
    phone = Column(String(50))
    telegram_chat_id = Column(String(100))  # linked Telegram chat for notifications
    viber_user_id = Column(String(100))  # linked Viber user for notifications
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    assigned_tasks = relationship("WorkflowTask", foreign_keys="WorkflowTask.assigned_to", back_populates="assignee")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("idx_audit_entity", "entity_type", "entity_id"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    action = Column(String(50), nullable=False)  # create, update, delete, login, logout, approve, reject, escalate
    entity_type = Column(String(100))  # policy, claim, underwriting, workflow, etc.
    entity_id = Column(String(36))
    details = Column(JSONType)
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


# ============================================================
# WORKFLOW ENGINE
# ============================================================

class WorkflowDefinition(Base):
    """Configurable workflow templates."""
    __tablename__ = "workflow_definitions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), unique=True, nullable=False)  # policy_issuance, claim_processing, underwriting
    description = Column(Text)
    states = Column(JSONType, nullable=False)  # ["draft","submitted","under_review","approved","rejected","completed"]
    transitions = Column(JSONType, nullable=False)  # {"draft":["submitted"], "submitted":["under_review","rejected"], ...}
    sla_hours = Column(JSONType)  # {"submitted":24, "under_review":48, ...}
    escalation_rules = Column(JSONType)  # {"under_review": {"after_hours":48, "escalate_to":"manager"}}
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class WorkflowInstance(Base):
    """A running workflow for a specific entity."""
    __tablename__ = "workflow_instances"
    __table_args__ = (Index("idx_wf_entity", "entity_type", "entity_id"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    workflow_def_id = Column(String(36), ForeignKey("workflow_definitions.id"), nullable=False)
    entity_type = Column(String(100), nullable=False)  # policy, claim, underwriting_case
    entity_id = Column(String(36), nullable=False)
    current_state = Column(String(50), nullable=False)
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    started_by = Column(String(36), ForeignKey("users.id"))
    sla_deadline = Column(DateTime(timezone=True))
    is_escalated = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    definition = relationship("WorkflowDefinition")
    starter = relationship("User", foreign_keys=[started_by])
    tasks = relationship("WorkflowTask", back_populates="workflow_instance", cascade="all, delete-orphan")
    history = relationship("WorkflowHistory", back_populates="workflow_instance", cascade="all, delete-orphan", order_by="WorkflowHistory.created_at")


class WorkflowTask(Base):
    """A task assigned to a user within a workflow."""
    __tablename__ = "workflow_tasks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    workflow_instance_id = Column(String(36), ForeignKey("workflow_instances.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    assigned_to = Column(String(36), ForeignKey("users.id"))
    assigned_role = Column(String(50))  # fallback: assign to any user with this role
    status = Column(String(30), default="pending")  # pending, in_progress, completed, cancelled
    due_date = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    outcome = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    workflow_instance = relationship("WorkflowInstance", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_tasks")


class WorkflowHistory(Base):
    """Immutable audit trail of state transitions."""
    __tablename__ = "workflow_history"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    workflow_instance_id = Column(String(36), ForeignKey("workflow_instances.id"), nullable=False)
    from_state = Column(String(50))
    to_state = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)  # submit, approve, reject, escalate, complete
    performed_by = Column(String(36), ForeignKey("users.id"))
    comments = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    workflow_instance = relationship("WorkflowInstance", back_populates="history")
    performer = relationship("User", foreign_keys=[performed_by])


# ============================================================
# CLIENTS & CORPORATE
# ============================================================

class Client(Base):
    __tablename__ = "clients"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    client_type = Column(String(20), default="individual")  # individual, corporate
    full_name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    date_of_birth = Column(Date)
    gender = Column(String(10))
    occupation = Column(String(255))
    monthly_income = Column(Numeric(15, 2))
    marital_status = Column(String(50))
    dependents = Column(Integer, default=0)
    address = Column(Text)
    notes = Column(Text)
    # Corporate fields
    company_name = Column(String(255))
    industry = Column(String(100))
    company_size = Column(Integer)
    registration_number = Column(String(100))
    contact_person = Column(String(255))
    # Relationship manager
    assigned_agent_id = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    policies = relationship("Policy", back_populates="client", cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="client", cascade="all, delete-orphan")
    needs_analyses = relationship("NeedsAnalysis", back_populates="client", cascade="all, delete-orphan")
    financial_plans = relationship("FinancialPlan", back_populates="client", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="client", cascade="all, delete-orphan")
    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id])


# ============================================================
# POLICY MANAGEMENT
# ============================================================

class Policy(Base):
    __tablename__ = "policies"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    policy_number = Column(String(100), unique=True, nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    policy_type = Column(String(100), nullable=False)  # life, health, investment, education, critical_illness, cancer_care, group
    premium_amount = Column(Numeric(15, 2), nullable=False)
    sum_assured = Column(Numeric(15, 2))
    premium_frequency = Column(String(50), default="monthly")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    status = Column(String(50), default="draft")  # draft, pending_uw, active, lapsed, cancelled, matured, claimed
    version = Column(Integer, default=1)
    # Underwriting
    underwriting_status = Column(String(50))  # pending, approved, rejected, referred
    risk_score = Column(Float)
    # Documents
    kyc_documents = Column(JSONType)  # [{"name":"ID.pdf","path":"/files/...","uploaded_at":"..."}]
    medical_documents = Column(JSONType)
    financial_documents = Column(JSONType)
    # Workflow
    workflow_instance_id = Column(String(36))
    created_by = Column(String(36), ForeignKey("users.id"))
    approved_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="policies")
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])


# ============================================================
# UNDERWRITING
# ============================================================

class UnderwritingCase(Base):
    __tablename__ = "underwriting_cases"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    policy_id = Column(String(36), ForeignKey("policies.id"), nullable=False)
    assigned_underwriter_id = Column(String(36), ForeignKey("users.id"))
    risk_category = Column(String(50))  # standard, substandard, preferred, declined
    risk_score = Column(Float)
    risk_factors = Column(JSONType)  # [{"factor":"age","score":2,"notes":"..."}]
    decision = Column(String(50))  # pending, approved, approved_with_loading, rejected, deferred, referred
    decision_notes = Column(Text)
    loading_percentage = Column(Float, default=0)  # extra premium loading %
    exclusions = Column(JSONType)  # specific exclusions applied
    additional_docs_requested = Column(JSONType)  # [{"doc_type":"medical_report","status":"pending"}]
    auto_decision = Column(JSONType)  # automated scoring result
    workflow_instance_id = Column(String(36))
    decided_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    policy = relationship("Policy", backref="underwriting_cases")
    underwriter = relationship("User", foreign_keys=[assigned_underwriter_id])


# ============================================================
# CLAIMS MANAGEMENT
# ============================================================

class Claim(Base):
    __tablename__ = "claims"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    claim_number = Column(String(100), unique=True, nullable=False, index=True)
    policy_id = Column(String(36), ForeignKey("policies.id"), nullable=False)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    claim_type = Column(String(50), nullable=False)  # death, health, disability, maturity, surrender, accident
    claim_amount = Column(Numeric(15, 2), nullable=False)
    approved_amount = Column(Numeric(15, 2))
    incident_date = Column(Date, nullable=False)
    incident_description = Column(Text)
    status = Column(String(50), default="submitted")  # submitted, docs_verification, fraud_check, assessment, approved, rejected, payment_processing, closed
    # Fraud detection
    fraud_flag = Column(Boolean, default=False)
    fraud_score = Column(Float)
    fraud_notes = Column(Text)
    # Documents
    supporting_documents = Column(JSONType)  # [{"name":"hospital_bill.pdf","path":"/files/...","verified":false}]
    documents_verified = Column(Boolean, default=False)
    # Assessment
    assessor_id = Column(String(36), ForeignKey("users.id"))
    assessment_notes = Column(Text)
    # Payment
    payment_method = Column(String(50))
    payment_reference = Column(String(255))
    payment_date = Column(Date)
    # Workflow
    workflow_instance_id = Column(String(36))
    submitted_by = Column(String(36), ForeignKey("users.id"))
    approved_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    policy = relationship("Policy", backref="claims")
    client = relationship("Client", back_populates="claims")
    assessor = relationship("User", foreign_keys=[assessor_id])
    submitter = relationship("User", foreign_keys=[submitted_by])
    claim_approver = relationship("User", foreign_keys=[approved_by])


# ============================================================
# NOTIFICATIONS
# ============================================================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="info")  # info, warning, action_required, sla_breach
    channel = Column(String(30), default="in_app")  # in_app, email, sms
    is_read = Column(Boolean, default=False)
    link = Column(String(500))  # deep link to relevant page
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


# ============================================================
# EXISTING MODELS (preserved)
# ============================================================

class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    title = Column(String(255), nullable=False)
    proposal_data = Column(JSONType, default={})
    pdf_path = Column(String(500))
    status = Column(String(50), default="draft")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="proposals")


class NeedsAnalysis(Base):
    __tablename__ = "needs_analyses"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    analysis_data = Column(JSONType, default={})
    ai_recommendations = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    client = relationship("Client", back_populates="needs_analyses")


class MDRTProgress(Base):
    __tablename__ = "mdrt_progress"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    year = Column(Integer, nullable=False)
    target_premium = Column(Numeric(15, 2), nullable=False)
    achieved_premium = Column(Numeric(15, 2), default=0)
    target_cases = Column(Integer, default=0)
    achieved_cases = Column(Integer, default=0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class FinancialPlan(Base):
    __tablename__ = "financial_plans"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    plan_type = Column(String(50), nullable=False)
    input_data = Column(JSONType, default={})
    result_data = Column(JSONType, default={})
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    client = relationship("Client", back_populates="financial_plans")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"))
    activity_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    scheduled_date = Column(DateTime(timezone=True))
    completed_date = Column(DateTime(timezone=True))
    status = Column(String(30), default="planned")
    outcome = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    client = relationship("Client", backref="activities")


class Commission(Base):
    __tablename__ = "commissions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    policy_id = Column(String(36), ForeignKey("policies.id"))
    commission_type = Column(String(50), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    period = Column(String(20))
    status = Column(String(30), default="pending")
    paid_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    policy = relationship("Policy", backref="commissions")


class PipelineDeal(Base):
    __tablename__ = "pipeline_deals"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    product_name = Column(String(255), nullable=False)
    expected_premium = Column(Numeric(15, 2), nullable=False)
    stage = Column(String(50), default="prospect")
    probability = Column(Integer, default=10)
    expected_close_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", backref="deals")


class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    phone_number = Column(String(50), nullable=False)
    direction = Column(String(10), nullable=False)
    message_body = Column(Text, nullable=False)
    message_sid = Column(String(255))
    client_id = Column(String(36), ForeignKey("clients.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# ============================================================
# AI ASSISTANT & MESSAGING
# ============================================================

class AIConversation(Base):
    """Chat messages between user and AI assistant via any channel."""
    __tablename__ = "ai_conversations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    channel = Column(String(30), nullable=False, default="web")  # web, telegram, viber
    chat_id = Column(String(100))  # external chat id (telegram chat_id, viber user_id)
    direction = Column(String(10), nullable=False)  # inbound, outbound
    message = Column(Text, nullable=False)
    intent = Column(String(100))  # detected intent
    entities = Column(JSONType)  # extracted entities
    action_taken = Column(String(100))  # what the AI did
    approval_id = Column(String(36), ForeignKey("approval_requests.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", backref="ai_conversations")


class ApprovalRequest(Base):
    """AI-generated actions awaiting human approval."""
    __tablename__ = "approval_requests"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    action_type = Column(String(100), nullable=False)  # create_client, create_policy, approve_claim, transition_workflow, schedule_activity, submit_claim, create_deal
    action_data = Column(JSONType, nullable=False)  # full payload to execute
    entity_type = Column(String(100))  # client, policy, claim, etc.
    entity_id = Column(String(36))  # existing entity id if applicable
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    status = Column(String(30), default="pending")  # pending, approved, rejected, auto_executed, expired
    ai_confidence = Column(Float)  # 0.0-1.0 confidence score
    channel = Column(String(30))  # which channel originated this
    approved_at = Column(DateTime(timezone=True))
    rejected_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)
    executed_result = Column(JSONType)  # result after execution
    expires_at = Column(DateTime(timezone=True))  # auto-expire if not acted on
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="approval_requests")
    conversations = relationship("AIConversation", backref="approval_request")


# ============================================================
# CORPORATE SOLUTIONS
# ============================================================

class CorporateProfile(Base):
    """Company profiles for group/corporate insurance."""
    __tablename__ = "corporate_profiles"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    company_name = Column(String(255), nullable=False)
    industry = Column(String(100))
    employee_count = Column(Integer, default=0)
    avg_employee_age = Column(Float)
    annual_revenue = Column(Numeric(15, 2))
    existing_benefits = Column(JSONType)  # {"medical":true,"life":true,"dental":false,...}
    risk_profile = Column(String(50))  # low, medium, high
    analysis_result = Column(JSONType)  # AI-generated analysis
    group_plans = Column(JSONType)  # recommended group plans
    hr_contact_name = Column(String(255))
    hr_contact_email = Column(String(255))
    hr_contact_phone = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", backref="corporate_profiles")


# ============================================================
# CONTENT CALENDAR / SOCIAL MEDIA
# ============================================================

class ContentPost(Base):
    """Social media content calendar entries."""
    __tablename__ = "content_posts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    platform = Column(String(50), nullable=False)  # facebook, viber, telegram, linkedin, instagram
    post_type = Column(String(50), default="educational")  # educational, testimonial, product, motivational, event
    scheduled_date = Column(DateTime(timezone=True))
    status = Column(String(30), default="draft")  # draft, scheduled, published
    hashtags = Column(Text)
    image_prompt = Column(Text)  # AI image generation prompt
    language = Column(String(10), default="en")  # en, my (Myanmar)
    engagement_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    
# ============================================================
# OBJECTION SCRIPTS
# ============================================================

class ObjectionScript(Base):
    """Pre-built objection handling scripts."""
    __tablename__ = "objection_scripts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    objection = Column(String(500), nullable=False)
    category = Column(String(100))  # price, trust, timing, need, competitor
    response_en = Column(Text, nullable=False)
    response_my = Column(Text)  # Myanmar language
    tips = Column(Text)
    effectiveness_rating = Column(Float, default=0)
    times_used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# ============================================================
# AUTO-GREETING
# ============================================================

class AutoGreeting(Base):
    """Birthday and anniversary auto-greeting records."""
    __tablename__ = "auto_greetings"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    greeting_type = Column(String(50), nullable=False)  # birthday, policy_anniversary, new_year, thingyan
    message = Column(Text, nullable=False)
    channel = Column(String(30), default="viber")  # viber, telegram, sms, whatsapp
    sent_at = Column(DateTime(timezone=True))
    status = Column(String(30), default="pending")  # pending, sent, failed
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    client = relationship("Client", backref="auto_greetings")


# ============================================================
# DOCUMENT ATTACHMENTS
# ============================================================

class DocumentAttachment(Base):
    """File attachments linked to any entity (policy, claim, client, underwriting, corporate)."""
    __tablename__ = "document_attachments"
    __table_args__ = (Index("idx_doc_entity", "entity_type", "entity_id"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    entity_type = Column(String(50), nullable=False)  # policy, claim, client, underwriting, corporate
    entity_id = Column(String(36), nullable=False)
    file_name = Column(String(500), nullable=False)
    original_name = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)  # bytes
    content_type = Column(String(200), default="application/octet-stream")
    category = Column(String(100))  # kyc, medical, financial, supporting, contract, proposal, photo, other
    notes = Column(Text)
    uploaded_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    uploader = relationship("User", foreign_keys=[uploaded_by])
