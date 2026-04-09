"""
AI Command Processor — interprets natural language messages and maps them to system actions.
Supports: client management, policy creation, claims, workflows, activities, pipeline, approvals, status queries.
"""
import re
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import (
    Client, Policy, Claim, Activity, PipelineDeal, Commission,
    ApprovalRequest, AIConversation, Notification, User,
    WorkflowInstance, UnderwritingCase, gen_uuid,
)
from services.auth_service import log_audit


# ============================================================
# INTENT DETECTION
# ============================================================

INTENT_PATTERNS = [
    # --- Status / Dashboard queries ---
    (r"\b(dashboard|summary|overview|status|report|how.?s.*(business|work|day))\b", "get_dashboard"),
    (r"\b(my tasks|pending tasks|task list|work queue|todo)\b", "get_tasks"),
    (r"\b(how many|count|total)\s+(client|customer)", "count_clients"),
    (r"\b(how many|count|total)\s+(polic|policies)", "count_policies"),
    (r"\b(how many|count|total)\s+(claim)", "count_claims"),
    (r"\bapproval.*(queue|pending|list|status)\b", "list_approvals"),
    (r"\bnotification|alert|unread\b", "get_notifications"),

    # --- Client management ---
    (r"\b(add|create|new|register)\s+(client|customer|member)\b", "create_client"),
    (r"\b(find|search|look.?up|get)\s+(client|customer)\b", "search_client"),
    (r"\b(list|show|all)\s+(client|customer)", "list_clients"),
    (r"\b(update|edit|change|modify)\s+(client|customer)\b", "update_client"),

    # --- Policy management ---
    (r"\b(create|new|add|issue)\s+(polic|insurance|coverage)\b", "create_policy"),
    (r"\b(list|show|all)\s+(polic)", "list_policies"),
    (r"\b(renew|renewal)\s+(polic)", "renew_policy"),
    (r"\b(cancel)\s+(polic)", "cancel_policy"),

    # --- Claims ---
    (r"\b(submit|file|create|new|add)\s+(claim)\b", "submit_claim"),
    (r"\b(claim)\s+(status|update|check)\b", "check_claim"),
    (r"\b(approve|accept)\s+(claim)\b", "approve_claim"),
    (r"\b(reject|deny|decline)\s+(claim)\b", "reject_claim"),
    (r"\b(list|show|all|pending)\s+(claim)", "list_claims"),

    # --- Activities / Scheduling ---
    (r"\b(schedule|plan|book|set.?up|arrange)\s+(meeting|call|visit|appointment|follow.?up|activity)\b", "schedule_activity"),
    (r"\b(today|agenda|schedule|calendar|what.*(do|planned))\b", "get_today_agenda"),
    (r"\b(remind|reminder|follow.?up)\b", "create_reminder"),

    # --- Pipeline / Sales ---
    (r"\b(add|create|new)\s+(deal|opportunity|prospect|lead)\b", "create_deal"),
    (r"\b(pipeline|deals|opportunities|sales)\b", "get_pipeline"),
    (r"\b(pipeline|deal).*(insight|score|analys|ai|health)\b", "pipeline_insights"),

    # --- Underwriting ---
    (r"\b(underwriting|risk.*(assess|score|check))\b", "check_underwriting"),

    # --- Financial Planning ---
    (r"\b(retirement|pension)\s+(plan|calc)", "retirement_plan"),
    (r"\b(education)\s+(plan|calc|fund)", "education_plan"),
    (r"\b(tax)\s+(plan|calc|saving)", "tax_plan"),
    (r"\b(cash.?flow|financial.?health|health.?score)\b", "cashflow_health"),

    # --- Corporate ---
    (r"\b(corporate|group|company)\s+(insurance|plan|profile|solution)\b", "corporate_info"),
    (r"\b(employee.?benefit|group.?life|group.?health)\b", "corporate_info"),

    # --- Content & Communication ---
    (r"\b(create|generate|write|draft)\s+(post|content|article)\b", "generate_content"),
    (r"\b(content.?calendar|social.?media|posts?)\b", "list_content"),
    (r"\b(objection|handle|overcome|response.?to)\b", "find_objection"),
    (r"\b(greeting|birthday|anniversary|wish)\b", "check_greetings"),

    # --- Commission ---
    (r"\b(commission|earning|income)\b", "get_commissions"),

    # --- MDRT ---
    (r"\b(mdrt|million.?dollar)\b", "get_mdrt"),

    # --- Workflow ---
    (r"\b(workflow|process)\s+(status|update|check)\b", "check_workflow"),
    (r"\b(escalat|urgent|priority)\b", "escalate"),

    # --- Approvals ---
    (r"\b(approve|yes|confirm|accept|ok|go.?ahead|proceed)\s*#?(\d+)?\b", "approve_action"),
    (r"\b(reject|no|deny|cancel|decline)\s*#?(\d+)?\b", "reject_action"),

    # --- Help ---
    (r"\b(help|commands|what can you|how to|guide)\b", "show_help"),
    (r"\b(hi|hello|hey|good morning|good afternoon|good evening)\b", "greeting"),
]


def detect_intent(text: str) -> tuple[str, dict]:
    """Detect intent and extract entities from a message."""
    text_lower = text.lower().strip()
    entities = {}

    # Extract named entities
    # Name extraction: "named X", "name is X", "client X", "for X"
    name_match = re.search(r"(?:named?|name\s*(?:is)?|client|customer|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", text)
    if name_match:
        entities["name"] = name_match.group(1).strip()

    # Phone number
    phone_match = re.search(r"(\+?\d[\d\s\-]{7,15}\d)", text)
    if phone_match:
        entities["phone"] = phone_match.group(1).strip()

    # Email
    email_match = re.search(r"([\w.+-]+@[\w-]+\.[\w.-]+)", text)
    if email_match:
        entities["email"] = email_match.group(1).strip()

    # Amount / premium
    amount_match = re.search(r"(\d[\d,]*(?:\.\d{1,2})?)\s*(?:MMK|kyat|usd|dollar|\$|premium|amount)", text, re.I)
    if amount_match:
        entities["amount"] = amount_match.group(1).replace(",", "")

    # Date extraction
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", text)
    if date_match:
        entities["date"] = date_match.group(1)
    elif re.search(r"\btomorrow\b", text_lower):
        entities["date"] = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
    elif re.search(r"\btoday\b", text_lower):
        entities["date"] = datetime.utcnow().strftime("%Y-%m-%d")
    elif re.search(r"\bnext week\b", text_lower):
        entities["date"] = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")

    # Time extraction
    time_match = re.search(r"(\d{1,2})[:\.](\d{2})\s*(am|pm)?", text_lower)
    if time_match:
        entities["time"] = f"{time_match.group(1)}:{time_match.group(2)} {time_match.group(3) or ''}".strip()

    # Policy type
    for pt in ["life", "health", "investment", "education", "critical_illness", "cancer_care", "group"]:
        if pt.replace("_", " ") in text_lower or pt.replace("_", "") in text_lower:
            entities["policy_type"] = pt
            break

    # Claim type
    for ct in ["death", "health", "disability", "maturity", "surrender", "accident"]:
        if ct in text_lower:
            entities["claim_type"] = ct
            break

    # Product name extraction
    product_match = re.search(r"(?:product|plan|type)\s*[:=]?\s*(.+?)(?:\s*,|\s*$|\s+(?:premium|amount|for))", text, re.I)
    if product_match:
        entities["product_name"] = product_match.group(1).strip()

    # Approval ID (#123)
    id_match = re.search(r"#(\d+)", text)
    if id_match:
        entities["approval_index"] = int(id_match.group(1))

    # Detect intent from patterns
    for pattern, intent in INTENT_PATTERNS:
        if re.search(pattern, text_lower):
            return intent, entities

    return "unknown", entities


# ============================================================
# COMMAND EXECUTION
# ============================================================

class AICommandProcessor:
    """Processes detected intents and executes or queues actions."""

    # Intents that are safe to auto-execute (read-only or low-risk)
    AUTO_EXECUTE = {
        "get_dashboard", "get_tasks", "count_clients", "count_policies",
        "count_claims", "list_approvals", "get_notifications", "search_client",
        "list_clients", "list_policies", "list_claims", "get_today_agenda",
        "get_pipeline", "get_commissions", "get_mdrt", "check_workflow",
        "check_underwriting", "check_claim", "show_help", "greeting",
        "pipeline_insights", "corporate_info", "list_content", "find_objection",
        "check_greetings", "cashflow_health",
    }

    # Intents that need approval before execution (write operations)
    NEEDS_APPROVAL = {
        "create_client", "create_policy", "submit_claim", "approve_claim",
        "reject_claim", "schedule_activity", "create_deal", "update_client",
        "renew_policy", "cancel_policy", "create_reminder", "escalate",
        "generate_content",
    }

    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user

    def process(self, message: str, channel: str = "web", chat_id: str = None) -> dict:
        """Process a message and return a response."""
        intent, entities = detect_intent(message)

        # Save inbound message
        conv = AIConversation(
            user_id=self.user.id,
            channel=channel,
            chat_id=chat_id,
            direction="inbound",
            message=message,
            intent=intent,
            entities=entities,
        )
        self.db.add(conv)
        self.db.flush()

        # Execute or queue
        if intent in self.AUTO_EXECUTE:
            result = self._execute(intent, entities)
            conv.action_taken = f"auto_executed:{intent}"
        elif intent in self.NEEDS_APPROVAL:
            result = self._queue_for_approval(intent, entities, message, channel)
            conv.action_taken = f"queued_approval:{intent}"
        elif intent == "approve_action":
            result = self._handle_approve(entities)
            conv.action_taken = "approve_action"
        elif intent == "reject_action":
            result = self._handle_reject(entities, message)
            conv.action_taken = "reject_action"
        else:
            result = {
                "reply": (
                    "I'm not sure what you'd like me to do. Here's what I can help with:\n\n"
                    + self._help_text()
                ),
                "intent": "unknown",
            }
            conv.action_taken = "unknown"

        # Save outbound response
        out_conv = AIConversation(
            user_id=self.user.id,
            channel=channel,
            chat_id=chat_id,
            direction="outbound",
            message=result.get("reply", ""),
            intent=intent,
            action_taken=conv.action_taken,
        )
        self.db.add(out_conv)
        self.db.commit()

        result["intent"] = intent
        result["entities"] = entities
        return result

    # ---- Auto-execute handlers ----

    def _execute(self, intent: str, entities: dict) -> dict:
        handler = getattr(self, f"_do_{intent}", None)
        if handler:
            return handler(entities)
        return {"reply": f"Intent '{intent}' recognized but handler not implemented yet."}

    def _do_greeting(self, _) -> dict:
        hour = datetime.utcnow().hour + 6  # rough Myanmar timezone
        if hour < 12:
            greeting = "Good morning"
        elif hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Good evening"
        return {"reply": f"{greeting}! 👋 I'm your AI assistant. How can I help you today? Type 'help' to see what I can do."}

    def _do_show_help(self, _) -> dict:
        return {"reply": self._help_text()}

    def _do_get_dashboard(self, _) -> dict:
        clients_total = self.db.query(Client).count()
        policies_total = self.db.query(Policy).count()
        active_policies = self.db.query(Policy).filter(Policy.status == "active").count()
        pending_claims = self.db.query(Claim).filter(Claim.status.in_(["submitted", "assessment", "fraud_check"])).count()
        total_premium = self.db.query(func.coalesce(func.sum(Policy.premium_amount), 0)).filter(Policy.status == "active").scalar()
        pending_approvals = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.user_id == self.user.id,
            ApprovalRequest.status == "pending",
        ).count()
        pending_tasks = self.db.query(func.count()).select_from(
            self.db.query(WorkflowInstance).filter(WorkflowInstance.completed_at.is_(None)).subquery()
        ).scalar()

        return {"reply": (
            f"📊 **Dashboard Summary**\n"
            f"━━━━━━━━━━━━━━━\n"
            f"👥 Clients: {clients_total}\n"
            f"📋 Policies: {policies_total} ({active_policies} active)\n"
            f"💰 Active Premium: {float(total_premium):,.0f} MMK\n"
            f"⚠️ Pending Claims: {pending_claims}\n"
            f"🔄 Active Workflows: {pending_tasks}\n"
            f"📝 Pending Approvals: {pending_approvals}\n"
            f"\nWhat would you like to do?"
        )}

    def _do_get_tasks(self, _) -> dict:
        from services.workflow_service import get_my_tasks
        tasks = get_my_tasks(self.db, self.user.id, self.user.role)
        if not tasks:
            return {"reply": "✅ No pending tasks. You're all caught up!"}
        lines = ["📋 **Your Tasks**\n"]
        for i, t in enumerate(tasks[:10], 1):
            lines.append(f"{i}. [{t.status}] {t.title}")
        if len(tasks) > 10:
            lines.append(f"\n...and {len(tasks)-10} more")
        return {"reply": "\n".join(lines)}

    def _do_count_clients(self, _) -> dict:
        total = self.db.query(Client).count()
        individual = self.db.query(Client).filter(Client.client_type == "individual").count()
        corporate = self.db.query(Client).filter(Client.client_type == "corporate").count()
        return {"reply": f"👥 Total clients: {total} ({individual} individual, {corporate} corporate)"}

    def _do_count_policies(self, _) -> dict:
        total = self.db.query(Policy).count()
        active = self.db.query(Policy).filter(Policy.status == "active").count()
        draft = self.db.query(Policy).filter(Policy.status == "draft").count()
        return {"reply": f"📋 Total policies: {total} ({active} active, {draft} draft)"}

    def _do_count_claims(self, _) -> dict:
        total = self.db.query(Claim).count()
        pending = self.db.query(Claim).filter(Claim.status.in_(["submitted", "assessment"])).count()
        approved = self.db.query(Claim).filter(Claim.status == "approved").count()
        return {"reply": f"🏥 Total claims: {total} ({pending} pending, {approved} approved)"}

    def _do_list_approvals(self, _) -> dict:
        pending = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.user_id == self.user.id,
            ApprovalRequest.status == "pending",
        ).order_by(ApprovalRequest.created_at.desc()).limit(10).all()
        if not pending:
            return {"reply": "✅ No pending approvals."}
        lines = ["📝 **Pending Approvals**\n"]
        for i, a in enumerate(pending, 1):
            lines.append(f"#{i} [{a.priority}] {a.title}\n   → {a.description or a.action_type}")
        lines.append(f"\nReply 'approve #N' or 'reject #N' to act on them.")
        return {"reply": "\n".join(lines), "approvals": [{"id": a.id, "title": a.title} for a in pending]}

    def _do_get_notifications(self, _) -> dict:
        notifs = self.db.query(Notification).filter(
            Notification.user_id == self.user.id,
            Notification.is_read == False,
        ).order_by(Notification.created_at.desc()).limit(5).all()
        if not notifs:
            return {"reply": "🔔 No unread notifications."}
        lines = ["🔔 **Unread Notifications**\n"]
        for n in notifs:
            lines.append(f"• [{n.notification_type}] {n.title}: {n.message[:80]}")
        return {"reply": "\n".join(lines)}

    def _do_search_client(self, entities) -> dict:
        name = entities.get("name", "")
        if not name:
            return {"reply": "Please provide a client name to search. e.g. 'find client John'"}
        results = self.db.query(Client).filter(Client.full_name.ilike(f"%{name}%")).limit(5).all()
        if not results:
            return {"reply": f"No clients found matching '{name}'."}
        lines = [f"🔍 Found {len(results)} client(s):\n"]
        for c in results:
            lines.append(f"• {c.full_name} | {c.phone or 'no phone'} | {c.client_type} | {len(c.policies)} policies")
        return {"reply": "\n".join(lines)}

    def _do_list_clients(self, _) -> dict:
        clients = self.db.query(Client).order_by(Client.created_at.desc()).limit(10).all()
        if not clients:
            return {"reply": "No clients yet. Say 'add client' to create one."}
        lines = [f"👥 **Recent Clients** ({self.db.query(Client).count()} total)\n"]
        for c in clients:
            policies_count = len(c.policies)
            lines.append(f"• {c.full_name} — {c.phone or 'no phone'} — {policies_count} policies")
        return {"reply": "\n".join(lines)}

    def _do_list_policies(self, _) -> dict:
        policies = self.db.query(Policy).order_by(Policy.created_at.desc()).limit(10).all()
        if not policies:
            return {"reply": "No policies yet."}
        lines = [f"📋 **Recent Policies** ({self.db.query(Policy).count()} total)\n"]
        for p in policies:
            client = self.db.query(Client).filter(Client.id == p.client_id).first()
            cname = client.full_name if client else "?"
            lines.append(f"• {p.policy_number} | {cname} | {p.product_name} | {p.status} | {float(p.premium_amount):,.0f} MMK")
        return {"reply": "\n".join(lines)}

    def _do_list_claims(self, _) -> dict:
        claims = self.db.query(Claim).order_by(Claim.created_at.desc()).limit(10).all()
        if not claims:
            return {"reply": "No claims yet."}
        lines = [f"🏥 **Recent Claims** ({self.db.query(Claim).count()} total)\n"]
        for c in claims:
            flag = "🚩" if c.fraud_flag else ""
            lines.append(f"• {c.claim_number} | {c.claim_type} | {c.status} | {float(c.claim_amount):,.0f} MMK {flag}")
        return {"reply": "\n".join(lines)}

    def _do_get_today_agenda(self, _) -> dict:
        today = datetime.utcnow().date()
        activities = self.db.query(Activity).filter(
            func.date(Activity.scheduled_date) == today,
        ).order_by(Activity.scheduled_date).all()
        pending_approvals = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.user_id == self.user.id,
            ApprovalRequest.status == "pending",
        ).count()
        if not activities and pending_approvals == 0:
            return {"reply": f"📅 No activities scheduled for today ({today}). Enjoy your free day! 🎉"}
        lines = [f"📅 **Today's Agenda** ({today})\n"]
        for a in activities:
            time_str = a.scheduled_date.strftime("%H:%M") if a.scheduled_date else "—"
            lines.append(f"• {time_str} — {a.title} [{a.status}]")
        if pending_approvals:
            lines.append(f"\n📝 {pending_approvals} pending approval(s) waiting for your action.")
        return {"reply": "\n".join(lines)}

    def _do_get_pipeline(self, _) -> dict:
        deals = self.db.query(PipelineDeal).order_by(PipelineDeal.created_at.desc()).limit(10).all()
        if not deals:
            return {"reply": "No deals in pipeline. Say 'add deal' to create one."}
        total_value = float(self.db.query(func.coalesce(func.sum(PipelineDeal.expected_premium), 0)).scalar())
        lines = [f"💼 **Sales Pipeline** (Total: {total_value:,.0f} MMK)\n"]
        for d in deals:
            client = self.db.query(Client).filter(Client.id == d.client_id).first()
            cname = client.full_name if client else "?"
            lines.append(f"• {d.product_name} | {cname} | {d.stage} | {float(d.expected_premium):,.0f} MMK | {d.probability}%")
        return {"reply": "\n".join(lines)}

    def _do_get_commissions(self, _) -> dict:
        total = float(self.db.query(func.coalesce(func.sum(Commission.amount), 0)).scalar())
        pending = float(self.db.query(func.coalesce(func.sum(Commission.amount), 0)).filter(Commission.status == "pending").scalar())
        paid = float(self.db.query(func.coalesce(func.sum(Commission.amount), 0)).filter(Commission.status == "paid").scalar())
        return {"reply": f"💰 **Commissions**\nTotal: {total:,.0f} MMK\nPending: {pending:,.0f} MMK\nPaid: {paid:,.0f} MMK"}

    def _do_get_mdrt(self, _) -> dict:
        from models import MDRTProgress
        mdrt = self.db.query(MDRTProgress).order_by(MDRTProgress.year.desc()).first()
        if not mdrt:
            return {"reply": "No MDRT progress tracked yet."}
        pct = round(float(mdrt.achieved_premium) / float(mdrt.target_premium) * 100, 1) if mdrt.target_premium else 0
        return {"reply": (
            f"🏆 **MDRT Progress {mdrt.year}**\n"
            f"Premium: {float(mdrt.achieved_premium):,.0f} / {float(mdrt.target_premium):,.0f} MMK ({pct}%)\n"
            f"Cases: {mdrt.achieved_cases} / {mdrt.target_cases}"
        )}

    def _do_check_workflow(self, _) -> dict:
        active = self.db.query(WorkflowInstance).filter(WorkflowInstance.completed_at.is_(None)).limit(10).all()
        if not active:
            return {"reply": "No active workflows."}
        lines = ["🔄 **Active Workflows**\n"]
        for w in active:
            defn = w.definition
            lines.append(f"• {defn.name if defn else '?'} | {w.entity_type}/{w.entity_id[:8]}… | State: {w.current_state} | {w.priority}")
        return {"reply": "\n".join(lines)}

    def _do_check_underwriting(self, _) -> dict:
        cases = self.db.query(UnderwritingCase).order_by(UnderwritingCase.created_at.desc()).limit(5).all()
        if not cases:
            return {"reply": "No underwriting cases."}
        lines = ["🔬 **Recent Underwriting Cases**\n"]
        for c in cases:
            policy = self.db.query(Policy).filter(Policy.id == c.policy_id).first()
            pnum = policy.policy_number if policy else "?"
            lines.append(f"• {pnum} | Risk: {c.risk_category} ({c.risk_score}) | Decision: {c.decision or 'pending'}")
        return {"reply": "\n".join(lines)}

    def _do_check_claim(self, entities) -> dict:
        # Check last claim or search by keyword
        claims = self.db.query(Claim).order_by(Claim.created_at.desc()).limit(3).all()
        if not claims:
            return {"reply": "No claims found."}
        lines = ["🏥 **Latest Claims Status**\n"]
        for c in claims:
            lines.append(f"• {c.claim_number} | {c.status} | {float(c.claim_amount):,.0f} MMK")
        return {"reply": "\n".join(lines)}

    def _do_pipeline_insights(self, _) -> dict:
        from models import PipelineDeal, Activity, Policy
        deals = self.db.query(PipelineDeal).filter(
            PipelineDeal.stage.notin_(["closed_won", "closed_lost"])
        ).all()
        if not deals:
            return {"reply": "📊 No active deals in pipeline. Say 'add deal' to create one."}

        hot = []
        stale = []
        for d in deals:
            days_old = (datetime.utcnow() - d.created_at).days if d.created_at else 0
            client = self.db.query(Client).filter(Client.id == d.client_id).first()
            cname = client.full_name if client else "?"
            if days_old > 30:
                stale.append(f"⚠️ {cname} — {d.product_name} ({days_old}d old, {d.stage})")
            else:
                hot.append(f"🔥 {cname} — {d.product_name} ({d.stage}, {float(d.expected_premium):,.0f} MMK)")

        lines = [f"🤖 **AI Pipeline Insights** ({len(deals)} active deals)\n"]
        if hot:
            lines.append("**Hot Deals:**")
            lines.extend(hot[:5])
        if stale:
            lines.append("\n**Stale Deals (need follow-up):**")
            lines.extend(stale[:5])
        total_val = sum(float(d.expected_premium) for d in deals)
        lines.append(f"\n💰 Total pipeline value: {total_val:,.0f} MMK")
        lines.append("\nView full AI analysis at Pipeline → AI Insights tab")
        return {"reply": "\n".join(lines)}

    def _do_corporate_info(self, _) -> dict:
        from models import CorporateProfile
        profiles = self.db.query(CorporateProfile).order_by(CorporateProfile.created_at.desc()).limit(5).all()
        if not profiles:
            return {"reply": "🏢 No corporate profiles yet. Go to Corporate Solutions to analyze a company."}
        lines = ["🏢 **Corporate Profiles**\n"]
        for p in profiles:
            client = self.db.query(Client).filter(Client.id == p.client_id).first()
            lines.append(
                f"• {p.company_name} ({client.full_name if client else '?'}) — "
                f"{p.employee_count} employees — Risk: {p.risk_profile}"
            )
        return {"reply": "\n".join(lines)}

    def _do_list_content(self, _) -> dict:
        from models import ContentPost
        posts = self.db.query(ContentPost).order_by(ContentPost.created_at.desc()).limit(5).all()
        if not posts:
            return {"reply": "📝 No content posts yet. Go to AI Hub to create social media content."}
        lines = ["📝 **Recent Content Posts**\n"]
        for p in posts:
            status_icon = "📅" if p.status == "scheduled" else "📄" if p.status == "draft" else "✅"
            lines.append(f"{status_icon} {p.title} — {p.platform} — {p.status}")
        lines.append("\nGo to AI Hub → Content Calendar for full management")
        return {"reply": "\n".join(lines)}

    def _do_find_objection(self, entities) -> dict:
        from models import ObjectionScript
        scripts = self.db.query(ObjectionScript).order_by(ObjectionScript.effectiveness_rating.desc()).limit(3).all()
        if not scripts:
            return {"reply": "No objection scripts available."}
        lines = ["🎯 **Top Objection Scripts**\n"]
        for s in scripts:
            stars = "⭐" * int(float(s.effectiveness_rating)) if s.effectiveness_rating else ""
            lines.append(f"❓ \"{s.objection}\"\n   → {s.response_en[:120]}...")
            lines.append(f"   {stars} (used {s.times_used}x)\n")
        lines.append("Go to AI Hub → Objection Scripts for full bilingual responses")
        return {"reply": "\n".join(lines)}

    def _do_check_greetings(self, _) -> dict:
        from models import AutoGreeting
        now = datetime.utcnow()
        clients = self.db.query(Client).all()
        upcoming = []
        for c in clients:
            if c.date_of_birth:
                try:
                    dob = c.date_of_birth if isinstance(c.date_of_birth, date) else datetime.fromisoformat(str(c.date_of_birth)).date()
                    next_bday = dob.replace(year=now.year)
                    if next_bday < now.date():
                        next_bday = next_bday.replace(year=now.year + 1)
                    days_until = (next_bday - now.date()).days
                    if days_until <= 30:
                        upcoming.append((c.full_name, days_until))
                except (ValueError, AttributeError):
                    pass
        upcoming.sort(key=lambda x: x[1])

        if not upcoming:
            return {"reply": "🎂 No upcoming birthdays in the next 30 days."}
        lines = ["🎂 **Upcoming Birthdays**\n"]
        for name, days in upcoming[:10]:
            if days == 0:
                lines.append(f"🎉 {name} — TODAY!")
            elif days == 1:
                lines.append(f"🎂 {name} — Tomorrow")
            else:
                lines.append(f"🎂 {name} — in {days} days")
        lines.append("\nGo to AI Hub → Auto-Greetings to send birthday wishes")
        return {"reply": "\n".join(lines)}

    def _do_cashflow_health(self, _) -> dict:
        return {"reply": (
            "💰 **Cash Flow Health Score**\n\n"
            "Calculate your financial health score (0-100) based on:\n"
            "• Savings rate vs income\n"
            "• Insurance allocation\n"
            "• Emergency fund months\n"
            "• Debt-to-asset ratio\n\n"
            "Go to **Planning → Cash Flow Health** tab for the interactive calculator.\n"
            "Grades: A (85+), B (70-84), C (55-69), D (40-54), F (<40)"
        )}

    # ---- Queue for approval handlers ----

    def _queue_for_approval(self, intent: str, entities: dict, original_msg: str, channel: str) -> dict:
        handler = getattr(self, f"_prep_{intent}", None)
        if handler:
            return handler(entities, original_msg, channel)
        return self._generic_approval(intent, entities, original_msg, channel)

    def _prep_create_client(self, entities, msg, channel) -> dict:
        name = entities.get("name")
        phone = entities.get("phone")
        email = entities.get("email")
        if not name:
            return {"reply": "To add a client, please include their name. Example:\n'Add client Aung Min Htet, phone 09123456789, email aung@email.com'"}

        action_data = {"full_name": name, "phone": phone, "email": email, "client_type": "individual"}
        title = f"Create client: {name}"
        desc = f"Name: {name}"
        if phone: desc += f"\nPhone: {phone}"
        if email: desc += f"\nEmail: {email}"

        approval = self._create_approval("create_client", action_data, title, desc, channel, confidence=0.9)
        return {"reply": (
            f"📝 I'll create a new client:\n"
            f"━━━━━━━━━━━━━━━\n"
            f"Name: {name}\n"
            f"Phone: {phone or 'not provided'}\n"
            f"Email: {email or 'not provided'}\n"
            f"━━━━━━━━━━━━━━━\n"
            f"✅ Reply **'approve #{approval['index']}'** to confirm or **'reject #{approval['index']}'** to cancel."
        ), "approval_id": approval["id"]}

    def _prep_create_policy(self, entities, msg, channel) -> dict:
        name = entities.get("name")
        amount = entities.get("amount")
        policy_type = entities.get("policy_type", "life")
        product = entities.get("product_name", f"{policy_type.title()} Insurance")

        if not name:
            return {"reply": "To create a policy, include the client name. Example:\n'Create life policy for Aung Min Htet, premium 50000 MMK'"}

        # Try to find the client
        client = self.db.query(Client).filter(Client.full_name.ilike(f"%{name}%")).first()
        if not client:
            return {"reply": f"Client '{name}' not found. Please add the client first: 'add client {name}'"}

        action_data = {
            "client_id": client.id, "client_name": client.full_name,
            "product_name": product, "policy_type": policy_type,
            "premium_amount": float(amount) if amount else 50000,
            "premium_frequency": "monthly",
            "start_date": datetime.utcnow().strftime("%Y-%m-%d"),
        }
        title = f"Create {policy_type} policy for {client.full_name}"
        desc = f"Client: {client.full_name}\nProduct: {product}\nPremium: {action_data['premium_amount']:,.0f} MMK"

        approval = self._create_approval("create_policy", action_data, title, desc, channel, confidence=0.85, entity_type="client", entity_id=client.id)
        return {"reply": (
            f"📋 I'll create a new policy:\n"
            f"━━━━━━━━━━━━━━━\n"
            f"Client: {client.full_name}\n"
            f"Product: {product}\n"
            f"Type: {policy_type}\n"
            f"Premium: {action_data['premium_amount']:,.0f} MMK/month\n"
            f"━━━━━━━━━━━━━━━\n"
            f"✅ Reply **'approve #{approval['index']}'** to confirm."
        ), "approval_id": approval["id"]}

    def _prep_submit_claim(self, entities, msg, channel) -> dict:
        name = entities.get("name")
        amount = entities.get("amount")
        claim_type = entities.get("claim_type", "health")
        date_str = entities.get("date", datetime.utcnow().strftime("%Y-%m-%d"))

        if not name:
            return {"reply": "To submit a claim, include the client name. Example:\n'Submit health claim for Aung Min Htet, amount 500000 MMK'"}

        client = self.db.query(Client).filter(Client.full_name.ilike(f"%{name}%")).first()
        if not client:
            return {"reply": f"Client '{name}' not found."}

        policy = self.db.query(Policy).filter(Policy.client_id == client.id, Policy.status == "active").first()
        if not policy:
            return {"reply": f"No active policy found for {client.full_name}."}

        action_data = {
            "policy_id": policy.id, "claim_type": claim_type,
            "claim_amount": float(amount) if amount else 100000,
            "incident_date": date_str,
            "incident_description": f"Claim submitted via AI assistant: {msg[:200]}",
        }
        title = f"Submit {claim_type} claim for {client.full_name}"
        desc = f"Client: {client.full_name}\nPolicy: {policy.policy_number}\nType: {claim_type}\nAmount: {action_data['claim_amount']:,.0f} MMK"

        approval = self._create_approval("submit_claim", action_data, title, desc, channel, confidence=0.8, entity_type="policy", entity_id=policy.id)
        return {"reply": (
            f"🏥 I'll submit a claim:\n"
            f"━━━━━━━━━━━━━━━\n"
            f"Client: {client.full_name}\n"
            f"Policy: {policy.policy_number}\n"
            f"Type: {claim_type}\n"
            f"Amount: {action_data['claim_amount']:,.0f} MMK\n"
            f"━━━━━━━━━━━━━━━\n"
            f"✅ Reply **'approve #{approval['index']}'** to confirm."
        ), "approval_id": approval["id"]}

    def _prep_schedule_activity(self, entities, msg, channel) -> dict:
        name = entities.get("name")
        date_str = entities.get("date", (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d"))
        time_str = entities.get("time", "10:00")

        # Detect activity type
        activity_type = "meeting"
        for at in ["call", "visit", "follow_up", "appointment", "presentation"]:
            if at.replace("_", " ") in msg.lower() or at.replace("_", "") in msg.lower():
                activity_type = at
                break

        title = f"{activity_type.replace('_',' ').title()}"
        if name:
            title += f" with {name}"

        client_id = None
        if name:
            client = self.db.query(Client).filter(Client.full_name.ilike(f"%{name}%")).first()
            if client:
                client_id = client.id

        action_data = {
            "activity_type": activity_type, "title": title,
            "scheduled_date": f"{date_str}T{time_str.replace(' ', '')}:00",
            "client_id": client_id,
            "description": msg[:300],
        }
        desc = f"Activity: {title}\nDate: {date_str} {time_str}"
        approval = self._create_approval("schedule_activity", action_data, title, desc, channel, confidence=0.9)
        return {"reply": (
            f"📅 I'll schedule:\n"
            f"━━━━━━━━━━━━━━━\n"
            f"{title}\n"
            f"Date: {date_str} at {time_str}\n"
            f"━━━━━━━━━━━━━━━\n"
            f"✅ Reply **'approve #{approval['index']}'** to confirm."
        ), "approval_id": approval["id"]}

    def _prep_create_deal(self, entities, msg, channel) -> dict:
        name = entities.get("name")
        amount = entities.get("amount")
        product = entities.get("product_name", "Insurance Plan")

        if not name:
            return {"reply": "Include the client name. Example:\n'Add deal for Aung Min Htet, product Life Insurance, premium 100000 MMK'"}

        client = self.db.query(Client).filter(Client.full_name.ilike(f"%{name}%")).first()
        if not client:
            return {"reply": f"Client '{name}' not found. Add them first: 'add client {name}'"}

        action_data = {
            "client_id": client.id, "product_name": product,
            "expected_premium": float(amount) if amount else 50000,
            "stage": "prospect", "probability": 30,
        }
        title = f"New deal: {product} for {client.full_name}"
        desc = f"Client: {client.full_name}\nProduct: {product}\nPremium: {action_data['expected_premium']:,.0f} MMK"
        approval = self._create_approval("create_deal", action_data, title, desc, channel, confidence=0.9, entity_type="client", entity_id=client.id)
        return {"reply": (
            f"💼 I'll create a deal:\n"
            f"━━━━━━━━━━━━━━━\n"
            f"Client: {client.full_name}\n"
            f"Product: {product}\n"
            f"Expected: {action_data['expected_premium']:,.0f} MMK\n"
            f"━━━━━━━━━━━━━━━\n"
            f"✅ Reply **'approve #{approval['index']}'** to confirm."
        ), "approval_id": approval["id"]}

    def _prep_create_reminder(self, entities, msg, channel) -> dict:
        date_str = entities.get("date", (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d"))
        title = re.sub(r"\b(remind|reminder|follow.?up|me|to|about|that)\b", "", msg, flags=re.I).strip()[:150] or "Follow-up reminder"

        action_data = {
            "activity_type": "follow_up", "title": f"Reminder: {title}",
            "scheduled_date": f"{date_str}T09:00:00",
            "description": msg[:300],
        }
        approval = self._create_approval("schedule_activity", action_data, f"Reminder: {title}", f"Date: {date_str}", channel, confidence=0.95)
        return {"reply": (
            f"⏰ I'll set a reminder:\n"
            f"'{title}' on {date_str}\n"
            f"✅ Reply **'approve #{approval['index']}'** to confirm."
        )}

    def _generic_approval(self, intent, entities, msg, channel) -> dict:
        action_data = {"intent": intent, "entities": entities, "original_message": msg}
        title = f"Action: {intent.replace('_', ' ').title()}"
        approval = self._create_approval(intent, action_data, title, msg[:200], channel, confidence=0.7)
        return {"reply": (
            f"📝 I need your approval for: **{title}**\n"
            f"Details: {msg[:150]}\n"
            f"✅ Reply **'approve #{approval['index']}'** or **'reject #{approval['index']}'**"
        )}

    # ---- Approval execution ----

    def _handle_approve(self, entities: dict) -> dict:
        idx = entities.get("approval_index")
        pending = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.user_id == self.user.id,
            ApprovalRequest.status == "pending",
        ).order_by(ApprovalRequest.created_at.desc()).all()

        if not pending:
            return {"reply": "No pending approvals to approve."}

        if idx is not None and 1 <= idx <= len(pending):
            approval = pending[idx - 1]
        elif len(pending) == 1:
            approval = pending[0]
        else:
            return {"reply": f"You have {len(pending)} pending approvals. Please specify which one: 'approve #1', 'approve #2', etc."}

        result = self._execute_approval(approval)
        return result

    def _handle_reject(self, entities: dict, msg: str) -> dict:
        idx = entities.get("approval_index")
        pending = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.user_id == self.user.id,
            ApprovalRequest.status == "pending",
        ).order_by(ApprovalRequest.created_at.desc()).all()

        if not pending:
            return {"reply": "No pending approvals to reject."}

        if idx is not None and 1 <= idx <= len(pending):
            approval = pending[idx - 1]
        elif len(pending) == 1:
            approval = pending[0]
        else:
            return {"reply": f"You have {len(pending)} pending approvals. Please specify: 'reject #1', etc."}

        approval.status = "rejected"
        approval.rejected_at = datetime.utcnow()
        approval.rejection_reason = msg
        self.db.commit()
        return {"reply": f"❌ Rejected: {approval.title}"}

    def _execute_approval(self, approval: ApprovalRequest) -> dict:
        """Execute the approved action."""
        data = approval.action_data
        result_msg = ""

        try:
            if approval.action_type == "create_client":
                client = Client(
                    full_name=data["full_name"],
                    phone=data.get("phone"),
                    email=data.get("email"),
                    client_type=data.get("client_type", "individual"),
                )
                self.db.add(client)
                self.db.flush()
                approval.entity_type = "client"
                approval.entity_id = client.id
                result_msg = f"✅ Client created: {client.full_name} (ID: {client.id[:8]}…)"
                log_audit(self.db, self.user.id, "create", "client", client.id, {"source": "ai_assistant"})

            elif approval.action_type == "create_policy":
                import random
                policy = Policy(
                    client_id=data["client_id"],
                    policy_number=f"POL-{datetime.utcnow().strftime('%Y%m')}-{random.randint(1000,9999)}",
                    product_name=data["product_name"],
                    policy_type=data["policy_type"],
                    premium_amount=Decimal(str(data["premium_amount"])),
                    premium_frequency=data.get("premium_frequency", "monthly"),
                    start_date=datetime.fromisoformat(data["start_date"]).date(),
                    status="draft",
                    created_by=self.user.id,
                )
                self.db.add(policy)
                self.db.flush()
                approval.entity_type = "policy"
                approval.entity_id = policy.id
                result_msg = f"✅ Policy created: {policy.policy_number} for {data.get('client_name', '?')}"
                log_audit(self.db, self.user.id, "create", "policy", policy.id, {"source": "ai_assistant"})

            elif approval.action_type == "submit_claim":
                import random
                claim = Claim(
                    claim_number=f"CLM-{datetime.utcnow().strftime('%Y%m')}-{random.randint(1000,9999)}",
                    policy_id=data["policy_id"],
                    client_id=self.db.query(Policy).filter(Policy.id == data["policy_id"]).first().client_id,
                    claim_type=data["claim_type"],
                    claim_amount=Decimal(str(data["claim_amount"])),
                    incident_date=datetime.fromisoformat(data["incident_date"]).date(),
                    incident_description=data.get("incident_description"),
                    status="submitted",
                    submitted_by=self.user.id,
                )
                self.db.add(claim)
                self.db.flush()
                approval.entity_type = "claim"
                approval.entity_id = claim.id
                result_msg = f"✅ Claim submitted: {claim.claim_number}"
                log_audit(self.db, self.user.id, "create", "claim", claim.id, {"source": "ai_assistant"})

            elif approval.action_type == "schedule_activity":
                activity = Activity(
                    title=data["title"],
                    activity_type=data["activity_type"],
                    scheduled_date=datetime.fromisoformat(data["scheduled_date"]),
                    client_id=data.get("client_id"),
                    description=data.get("description"),
                    status="planned",
                )
                self.db.add(activity)
                self.db.flush()
                approval.entity_type = "activity"
                approval.entity_id = activity.id
                result_msg = f"✅ Activity scheduled: {data['title']}"

            elif approval.action_type == "create_deal":
                deal = PipelineDeal(
                    client_id=data["client_id"],
                    product_name=data["product_name"],
                    expected_premium=Decimal(str(data["expected_premium"])),
                    stage=data.get("stage", "prospect"),
                    probability=data.get("probability", 30),
                )
                self.db.add(deal)
                self.db.flush()
                approval.entity_type = "deal"
                approval.entity_id = deal.id
                result_msg = f"✅ Deal created: {data['product_name']}"

            else:
                result_msg = f"✅ Approved: {approval.title} (auto-execution not available for this type)"

            approval.status = "approved"
            approval.approved_at = datetime.utcnow()
            approval.executed_result = {"message": result_msg}
            self.db.commit()

        except Exception as e:
            self.db.rollback()
            approval.status = "approved"
            approval.approved_at = datetime.utcnow()
            approval.executed_result = {"error": str(e)}
            self.db.commit()
            result_msg = f"⚠️ Approved but execution failed: {str(e)[:100]}"

        return {"reply": result_msg}

    # ---- Helpers ----

    def _create_approval(self, action_type, action_data, title, desc, channel, confidence=0.8, entity_type=None, entity_id=None) -> dict:
        # Get current pending count for index
        pending_count = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.user_id == self.user.id,
            ApprovalRequest.status == "pending",
        ).count()

        approval = ApprovalRequest(
            user_id=self.user.id,
            title=title,
            description=desc,
            action_type=action_type,
            action_data=action_data,
            entity_type=entity_type,
            entity_id=entity_id,
            priority="normal",
            status="pending",
            ai_confidence=confidence,
            channel=channel,
            expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        self.db.add(approval)
        self.db.flush()
        return {"id": approval.id, "index": pending_count + 1}

    def _help_text(self) -> str:
        return (
            "🤖 **AI Assistant Commands**\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "📊 **Dashboard & Status**\n"
            "• 'dashboard' — Business summary\n"
            "• 'my tasks' — Pending workflow tasks\n"
            "• 'today' — Today's agenda\n"
            "• 'approvals' — Pending approval queue\n"
            "• 'notifications' — Unread alerts\n\n"
            "👥 **Clients**\n"
            "• 'add client John Smith, phone 09123456789'\n"
            "• 'find client John'\n"
            "• 'list clients'\n"
            "• 'how many clients'\n\n"
            "📋 **Policies**\n"
            "• 'create life policy for John, premium 50000 MMK'\n"
            "• 'list policies'\n\n"
            "🏥 **Claims**\n"
            "• 'submit health claim for John, 500000 MMK'\n"
            "• 'list claims'\n"
            "• 'claim status'\n\n"
            "📅 **Scheduling**\n"
            "• 'schedule meeting with John tomorrow 2:00pm'\n"
            "• 'remind me to follow up next week'\n\n"
            "💼 **Sales**\n"
            "• 'add deal for John, product Life Plan, 100000 MMK'\n"
            "• 'pipeline'\n"
            "• 'commissions'\n"
            "• 'MDRT progress'\n\n"
            "✅ **Approvals**\n"
            "• 'approve #1' — Approve pending action\n"
            "• 'reject #2' — Reject pending action\n"
        )
