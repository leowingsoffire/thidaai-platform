from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from config import get_settings
from database import Base, engine, SessionLocal
from routes import (
    clients, analysis, proposals, mdrt, planning, whatsapp,
    policies, activities, commissions, pipeline, dashboard,
)
from routes.auth import router as auth_router
from routes.workflow import router as workflow_router
from routes.underwriting import router as underwriting_router
from routes.claims import router as claims_router
from routes.notifications import router as notifications_router, audit_router
from routes.ai_assistant import router as ai_router, approval_router
from routes.telegram import router as telegram_router
from routes.viber import router as viber_router
from routes.corporate import router as corporate_router
from routes.content import router as content_router
from routes.content import seed_objections
from routes.greetings import router as greetings_router
from routes.documents import router as documents_router
from services.workflow_service import seed_workflows
from services.auth_service import hash_password
from models import User

settings = get_settings()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Assistant – AI Power Workflow System",
    description="Enterprise insurance workflow system – AI Power Workflow System",
    version="2.0.0",
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount generated PDFs
pdf_dir = os.path.join(os.path.dirname(__file__), "generated_pdfs")
os.makedirs(pdf_dir, exist_ok=True)
app.mount("/files", StaticFiles(directory=pdf_dir), name="files")

# Mount uploads directory
upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(upload_dir, exist_ok=True)


# ---- Startup: seed workflows & default admin ----

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_workflows(db)
        seed_objections(db)
        # Create default admin if no users exist
        if db.query(User).count() == 0:
            admin = User(
                email="tdadmin",
                full_name="System Administrator",
                hashed_password=hash_password("admin123"),
                role="admin",
                department="IT",
                is_active=True,
            )
            agent = User(
                email="tdagent",
                full_name="Agent User",
                hashed_password=hash_password("agent123"),
                role="agent",
                department="Financial Services",
                is_active=True,
            )
            db.add_all([admin, agent])
            db.commit()
            print("[STARTUP] Created default users: tdadmin, tdagent")
        print("[STARTUP] Workflow definitions seeded")
    finally:
        db.close()


# ---- Register ALL routers ----

# Enterprise modules
app.include_router(auth_router)
app.include_router(workflow_router)
app.include_router(underwriting_router)
app.include_router(claims_router)
app.include_router(notifications_router)
app.include_router(audit_router)
app.include_router(ai_router)
app.include_router(approval_router)
app.include_router(telegram_router)
app.include_router(viber_router)
app.include_router(corporate_router)
app.include_router(content_router)
app.include_router(greetings_router)
app.include_router(documents_router)

# CRM / existing modules
app.include_router(dashboard.router)
app.include_router(clients.router)
app.include_router(policies.router)
app.include_router(analysis.router)
app.include_router(proposals.router)
app.include_router(mdrt.router)
app.include_router(planning.router)
app.include_router(activities.router)
app.include_router(commissions.router)
app.include_router(pipeline.router)
app.include_router(whatsapp.router)


@app.get("/")
def root():
    return {
        "message": "AI Assistant – AI Power Workflow System",
        "version": "2.0.1",
        "docs": "/docs",
        "modules": [
            "auth", "workflows", "underwriting", "claims",
            "notifications", "audit", "clients", "policies",
            "dashboard", "activities", "commissions", "pipeline",
            "ai_assistant", "approvals", "telegram", "viber",
            "corporate", "content", "greetings",
        ],
    }


@app.get("/health")
def health():
    return {"status": "healthy", "version": "2.0.1"}
