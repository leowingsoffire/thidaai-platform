"""Telegram Bot Service — sends messages, processes webhooks, links users."""
import httpx
from typing import Optional
from sqlalchemy.orm import Session
from config import get_settings
from models import User

settings = get_settings()

TELEGRAM_API = "https://api.telegram.org/bot{token}"


def _api_url(method: str) -> str:
    token = settings.telegram_bot_token
    if not token:
        return ""
    return f"{TELEGRAM_API.format(token=token)}/{method}"


async def send_message(chat_id: str, text: str, parse_mode: str = "Markdown") -> bool:
    """Send a message to a Telegram user."""
    url = _api_url("sendMessage")
    if not url:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": parse_mode,
            })
            return resp.status_code == 200
    except Exception:
        return False


async def send_approval_request(chat_id: str, approval_index: int, title: str, description: str) -> bool:
    """Send an approval request with inline keyboard buttons."""
    url = _api_url("sendMessage")
    if not url:
        return False
    text = (
        f"📝 *Approval Required #{approval_index}*\n\n"
        f"*{title}*\n"
        f"{description}\n\n"
        f"Reply: `approve #{approval_index}` or `reject #{approval_index}`"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown",
            })
            return resp.status_code == 200
    except Exception:
        return False


def find_user_by_chat_id(db: Session, chat_id: str) -> Optional[User]:
    """Find user by their Telegram chat ID."""
    return db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()


def link_telegram(db: Session, user_id: str, chat_id: str):
    """Link a Telegram chat ID to a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.telegram_chat_id = str(chat_id)
        db.commit()
