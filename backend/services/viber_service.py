"""Viber Bot Service — sends messages via Viber REST API."""
import httpx
from typing import Optional
from sqlalchemy.orm import Session
from config import get_settings
from models import User

settings = get_settings()

VIBER_API = "https://chatapi.viber.com/pa"


def _headers() -> dict:
    token = settings.viber_auth_token
    if not token:
        return {}
    return {
        "X-Viber-Auth-Token": token,
        "Content-Type": "application/json",
    }


async def send_message(receiver_id: str, text: str, msg_type: str = "text") -> bool:
    """Send a text message to a Viber user."""
    headers = _headers()
    if not headers:
        return False
    payload = {
        "receiver": receiver_id,
        "min_api_version": 1,
        "sender": {
            "name": settings.viber_bot_name,
            "avatar": "",
        },
        "tracking_data": "greeting",
        "type": msg_type,
        "text": text,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{VIBER_API}/send_message",
                json=payload,
                headers=headers,
            )
            data = resp.json()
            return data.get("status") == 0
    except Exception:
        return False


async def send_greeting(receiver_id: str, name: str, greeting_text: str) -> bool:
    """Send a greeting message to a Viber user."""
    return await send_message(receiver_id, greeting_text)


async def set_webhook(url: str, event_types: Optional[list] = None) -> bool:
    """Register a webhook URL with Viber."""
    headers = _headers()
    if not headers:
        return False
    payload = {
        "url": url,
        "event_types": event_types or ["delivered", "seen", "message", "subscribed", "unsubscribed"],
        "send_name": True,
        "send_photo": False,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{VIBER_API}/set_webhook",
                json=payload,
                headers=headers,
            )
            data = resp.json()
            return data.get("status") == 0
    except Exception:
        return False


def find_user_by_viber_id(db: Session, viber_user_id: str) -> Optional[User]:
    """Find user by their Viber user ID."""
    return db.query(User).filter(User.viber_user_id == str(viber_user_id)).first()


def link_viber(db: Session, user_id: str, viber_user_id: str):
    """Link a Viber user ID to a platform user."""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.viber_user_id = str(viber_user_id)
        db.commit()
