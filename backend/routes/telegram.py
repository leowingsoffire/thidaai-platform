"""Telegram webhook route — receives messages from Telegram Bot API."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from database import get_db
from services.telegram_service import find_user_by_chat_id, send_message
from services.ai_command import AICommandProcessor

router = APIRouter(prefix="/api/telegram", tags=["Telegram"])


@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle incoming Telegram messages."""
    data = await request.json()
    message = data.get("message", {})
    chat_id = str(message.get("chat", {}).get("id", ""))
    text = message.get("text", "").strip()

    if not chat_id or not text:
        return {"ok": True}

    # Handle /start command — tell user to link account
    if text.startswith("/start"):
        await send_message(
            chat_id,
            "👋 Welcome to AI Assistant!\n\n"
            "To link your account, use the web app or send:\n"
            "`/link your_username your_password`\n\n"
            "Once linked, just send me messages and I'll handle your work!",
        )
        return {"ok": True}

    # Handle /link command
    if text.startswith("/link"):
        parts = text.split()
        if len(parts) >= 3:
            from services.auth_service import verify_password
            from models import User
            email = parts[1]
            password = parts[2]
            user = db.query(User).filter(User.email == email, User.is_active == True).first()
            if user and verify_password(password, user.hashed_password):
                user.telegram_chat_id = chat_id
                db.commit()
                await send_message(chat_id, f"✅ Linked! Welcome {user.full_name}. You can now send me commands.")
            else:
                await send_message(chat_id, "❌ Invalid credentials. Try: `/link username password`")
        else:
            await send_message(chat_id, "Usage: `/link username password`")
        return {"ok": True}

    # Find user by chat_id
    user = find_user_by_chat_id(db, chat_id)
    if not user:
        await send_message(
            chat_id,
            "❓ I don't recognize you yet. Please link your account first:\n"
            "`/link your_username your_password`"
        )
        return {"ok": True}

    # Process the message through AI
    processor = AICommandProcessor(db, user)
    result = processor.process(text, channel="telegram", chat_id=chat_id)

    # Send reply back
    reply = result.get("reply", "Done!")
    # Convert markdown bold ** to Telegram format *
    reply_tg = reply.replace("**", "*")
    await send_message(chat_id, reply_tg)

    return {"ok": True}
