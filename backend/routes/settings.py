"""Admin settings – key/value store persisted to the database."""

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models import SystemSetting

router = APIRouter(prefix="/api/settings", tags=["settings"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    """Return all settings as a nested dict."""
    rows = db.query(SystemSetting).all()
    result: dict = {}
    for row in rows:
        try:
            result[row.key] = json.loads(row.value)
        except (json.JSONDecodeError, TypeError):
            result[row.key] = row.value
    return result


@router.put("")
def save_settings(payload: dict, db: Session = Depends(get_db)):
    """Upsert each top-level key."""
    for key, value in payload.items():
        existing = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        serialized = json.dumps(value) if not isinstance(value, str) else value
        if existing:
            existing.value = serialized
        else:
            db.add(SystemSetting(key=key, value=serialized))
    db.commit()
    return {"status": "ok"}


@router.post("/test/{integration}")
def test_connection(integration: str, config: dict):
    """Lightweight connectivity check (dry-run)."""
    if integration == "smtp":
        host = config.get("host", "")
        port = config.get("port", 587)
        if not host:
            return {"success": False, "message": "SMTP host is required"}
        return {"success": True, "message": f"SMTP connection to {host}:{port} looks valid"}

    if integration == "viber":
        token = config.get("bot_token", "")
        if not token:
            return {"success": False, "message": "Bot token is required"}
        return {"success": True, "message": "Viber bot token format is valid"}

    if integration == "zoom":
        client_id = config.get("client_id", "")
        if not client_id:
            return {"success": False, "message": "Client ID is required"}
        return {"success": True, "message": "Zoom credentials format is valid"}

    if integration == "ai":
        key = config.get("openai_api_key", "")
        if not key:
            return {"success": False, "message": "OpenAI API key is required"}
        if not key.startswith("sk-"):
            return {"success": False, "message": "API key should start with 'sk-'"}
        return {"success": True, "message": f"OpenAI API key format valid (model: {config.get('model', 'gpt-4o-mini')})"}

    if integration == "telegram":
        token = config.get("bot_token", "")
        if not token:
            return {"success": False, "message": "Bot token is required"}
        if ":" not in token:
            return {"success": False, "message": "Invalid token format (should contain ':')"}
        return {"success": True, "message": "Telegram bot token format is valid"}

    if integration == "whatsapp":
        sid = config.get("twilio_sid", "")
        if not sid:
            return {"success": False, "message": "Twilio Account SID is required"}
        if not sid.startswith("AC"):
            return {"success": False, "message": "Account SID should start with 'AC'"}
        return {"success": True, "message": "Twilio credentials format is valid"}

    return {"success": False, "message": f"Unknown integration: {integration}"}
