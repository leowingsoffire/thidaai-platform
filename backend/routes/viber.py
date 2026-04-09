"""Viber Bot webhook routes — handles incoming messages and account linking."""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User, AIConversation
from services.viber_service import send_message, find_user_by_viber_id, link_viber
from services.auth_service import get_current_user, verify_password

router = APIRouter(prefix="/api/viber", tags=["Viber"])


class ViberLinkInput(BaseModel):
    viber_user_id: str
    username: str
    password: str


@router.post("/webhook")
async def viber_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle incoming Viber webhook events.
    Viber sends: message, subscribed, unsubscribed, seen, delivered, etc.
    """
    body = await request.json()
    event_type = body.get("event", "")

    # Webhook verification — Viber sends a callback event on webhook set
    if event_type == "webhook":
        return {"status": 0, "status_message": "ok"}

    # User subscribes to the bot
    if event_type == "subscribed":
        user_info = body.get("user", {})
        viber_user_id = user_info.get("id", "")
        name = user_info.get("name", "User")
        welcome = (
            f"👋 Welcome to AIA Thida Soe Bot, {name}!\n\n"
            "I can help you with:\n"
            "• Birthday & anniversary greetings\n"
            "• Insurance information\n\n"
            "To link your account, type:\n"
            "link <username> <password>"
        )
        await send_message(viber_user_id, welcome)
        return {"status": 0, "status_message": "ok"}

    # Handle messages
    if event_type == "message":
        sender = body.get("sender", {})
        viber_user_id = sender.get("id", "")
        message_obj = body.get("message", {})
        text = message_obj.get("text", "").strip()

        if not text:
            return {"status": 0, "status_message": "ok"}

        # Save inbound message
        conv = AIConversation(
            channel="viber",
            chat_id=viber_user_id,
            direction="inbound",
            message=text,
        )

        # Link command: link username password
        if text.lower().startswith("link "):
            parts = text.split()
            if len(parts) == 3:
                username, password = parts[1], parts[2]
                user = db.query(User).filter(User.email == username).first()
                if user and verify_password(password, user.hashed_password):
                    link_viber(db, user.id, viber_user_id)
                    conv.user_id = user.id
                    conv.intent = "link_account"
                    conv.action_taken = "account_linked"
                    reply = f"✅ Account linked successfully! Welcome, {user.full_name}."
                else:
                    conv.intent = "link_account"
                    conv.action_taken = "link_failed"
                    reply = "❌ Invalid credentials. Try: link <username> <password>"
            else:
                reply = "Usage: link <username> <password>"
        else:
            # Check if user is linked
            user = find_user_by_viber_id(db, viber_user_id)
            if user:
                conv.user_id = user.id
                # Process through AI command system
                from services.ai_command import AICommandProcessor
                processor = AICommandProcessor(db, user)
                result = await processor.process(text)
                conv.intent = result.get("intent", "general")
                conv.action_taken = result.get("action_taken")
                reply = result.get("reply", "I'm here to help! Ask me anything about insurance.")
            else:
                reply = (
                    "Please link your account first.\n"
                    "Type: link <username> <password>"
                )

        db.add(conv)
        # Save outbound reply
        reply_conv = AIConversation(
            user_id=conv.user_id,
            channel="viber",
            chat_id=viber_user_id,
            direction="outbound",
            message=reply,
            intent=conv.intent,
        )
        db.add(reply_conv)
        db.commit()

        await send_message(viber_user_id, reply)
        return {"status": 0, "status_message": "ok"}

    return {"status": 0, "status_message": "ok"}


@router.post("/link")
def link_viber_account(
    body: ViberLinkInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Link Viber user ID to current authenticated user (from web UI)."""
    link_viber(db, user.id, body.viber_user_id)
    return {"status": "linked", "viber_user_id": body.viber_user_id}


@router.get("/status")
def viber_status(user: User = Depends(get_current_user)):
    """Check Viber integration status."""
    from config import get_settings
    s = get_settings()
    return {
        "configured": bool(s.viber_auth_token),
        "bot_name": s.viber_bot_name,
        "webhook_url": s.viber_webhook_url or None,
        "user_linked": bool(user.viber_user_id),
        "viber_user_id": user.viber_user_id,
    }
