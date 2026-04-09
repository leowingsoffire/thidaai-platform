"""Auto-Greetings routes — birthday, anniversary, holiday greetings."""
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import AutoGreeting, Client, Policy, gen_uuid, User
from services.auth_service import get_current_user
from services import viber_service, telegram_service

router = APIRouter(prefix="/api/greetings", tags=["Auto Greetings"])


class GreetingInput(BaseModel):
    client_id: str
    greeting_type: str = "birthday"
    message: str = ""
    channel: str = "viber"


GREETING_TEMPLATES = {
    "birthday": {
        "en": "🎂 Happy Birthday, {name}! Wishing you a wonderful year ahead. As your insurance advisor, I'm here whenever you need me. — Thida Soe, AIA",
        "my": "🎂 {name} မွေးနေ့မှာ ပျော်ရွှင်ပါစေ! နှစ်သစ်မှာ ကျန်းမာပျော်ရွှင်ပါစေ။ သင့်ရဲ့ အာမခံ အကြံပေးအနေနဲ့ အမြဲရှိနေပါမယ်။ — သီဒါစိုး, AIA",
    },
    "policy_anniversary": {
        "en": "🎉 Happy Policy Anniversary, {name}! Thank you for trusting AIA for {years} year(s). Let's review your coverage to ensure it still meets your growing needs. — Thida Soe",
        "my": "🎉 {name} Policy Anniversary ပျော်ရွှင်ပါစေ! AIA ကို {years} နှစ် ယုံကြည်အပ်နှံတဲ့အတွက် ကျေးဇူးတင်ပါတယ်။ — သီဒါစိုး",
    },
    "new_year": {
        "en": "🎊 Happy New Year, {name}! May the new year bring health, happiness, and prosperity to you and your family. Let's make this year your best-protected year yet! — Thida Soe, AIA",
        "my": "🎊 {name} နှစ်သစ်မှာ ပျော်ရွှင်ပါစေ! ကျန်းမာရေး၊ ပျော်ရွှင်မှု နှင့် ချမ်းသာမှု ပြည့်ဝပါစေ။ — သီဒါစိုး, AIA",
    },
    "thingyan": {
        "en": "🎉 Happy Thingyan, {name}! May the New Year Water Festival wash away all worries and bring fresh blessings. Stay protected, stay happy! — Thida Soe, AIA",
        "my": "🎉 {name} သင်္ကြန်မင်္ဂလာပါ! နှစ်သစ်မှာ ကောင်းချီးမင်္ဂလာ အပြည့်အဝ ရရှိပါစေ။ — သီဒါစိုး, AIA",
    },
}


@router.get("/templates")
def get_greeting_templates(user: User = Depends(get_current_user)):
    return GREETING_TEMPLATES


@router.post("/send")
async def create_greeting(body: GreetingInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(404, "Client not found")

    message = body.message
    if not message:
        tmpl = GREETING_TEMPLATES.get(body.greeting_type, {}).get("en", "")
        message = tmpl.format(name=client.name, years=1)

    # Attempt to dispatch via the selected channel
    dispatch_status = "sent"
    dispatch_note = ""

    if body.channel == "viber":
        # Try to send via Viber using client phone or user's viber_user_id
        receiver_id = getattr(user, "viber_user_id", None)
        if receiver_id:
            sent = await viber_service.send_message(receiver_id, message)
            if not sent:
                dispatch_status = "pending"
                dispatch_note = "Viber send failed — token not configured or receiver not subscribed"
        else:
            dispatch_status = "pending"
            dispatch_note = "No Viber user ID linked — greeting saved for manual send"

    elif body.channel == "telegram":
        chat_id = getattr(user, "telegram_chat_id", None)
        if chat_id:
            sent = await telegram_service.send_message(chat_id, message)
            if not sent:
                dispatch_status = "pending"
                dispatch_note = "Telegram send failed — token not configured"
        else:
            dispatch_status = "pending"
            dispatch_note = "No Telegram chat ID linked — greeting saved for manual send"
    else:
        # Other channels (sms, whatsapp) — save as pending
        dispatch_status = "pending"
        dispatch_note = f"Channel '{body.channel}' dispatch not yet configured"

    greeting = AutoGreeting(
        client_id=body.client_id,
        greeting_type=body.greeting_type,
        message=message,
        channel=body.channel,
        status=dispatch_status,
        sent_at=datetime.utcnow() if dispatch_status == "sent" else None,
    )
    db.add(greeting)
    db.commit()
    db.refresh(greeting)

    return {
        "id": greeting.id, "client_name": client.name,
        "greeting_type": greeting.greeting_type, "status": greeting.status,
        "message": greeting.message, "channel": greeting.channel,
        "note": dispatch_note,
    }


@router.get("/history")
def greeting_history(
    client_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(AutoGreeting)
    if client_id:
        q = q.filter(AutoGreeting.client_id == client_id)
    greetings = q.order_by(AutoGreeting.created_at.desc()).limit(100).all()
    result = []
    for g in greetings:
        client = db.query(Client).filter(Client.id == g.client_id).first()
        result.append({
            "id": g.id, "client_id": g.client_id,
            "client_name": client.name if client else "Unknown",
            "greeting_type": g.greeting_type, "message": g.message,
            "channel": g.channel, "status": g.status,
            "sent_at": g.sent_at.isoformat() if g.sent_at else None,
            "created_at": g.created_at.isoformat() if g.created_at else None,
        })
    return result


@router.get("/upcoming")
def upcoming_greetings(
    days: int = 30,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Find clients with upcoming birthdays/anniversaries."""
    now = datetime.utcnow()
    clients = db.query(Client).all()
    upcoming = []

    for c in clients:
        # Birthday check
        if c.date_of_birth:
            try:
                dob = c.date_of_birth if isinstance(c.date_of_birth, datetime) else datetime.fromisoformat(str(c.date_of_birth))
                next_bday = dob.replace(year=now.year)
                if next_bday < now:
                    next_bday = next_bday.replace(year=now.year + 1)
                if (next_bday - now).days <= days:
                    upcoming.append({
                        "client_id": c.id, "client_name": c.name,
                        "event_type": "birthday",
                        "event_date": next_bday.strftime("%Y-%m-%d"),
                        "days_until": (next_bday - now).days,
                        "phone": c.phone, "email": c.email,
                    })
            except (ValueError, AttributeError):
                pass

    # Policy anniversaries
    policies = db.query(Policy).all()
    for p in policies:
        if p.start_date:
            try:
                start = p.start_date if isinstance(p.start_date, datetime) else datetime.fromisoformat(str(p.start_date))
                next_ann = start.replace(year=now.year)
                if next_ann < now:
                    next_ann = next_ann.replace(year=now.year + 1)
                if (next_ann - now).days <= days:
                    client = db.query(Client).filter(Client.id == p.client_id).first()
                    upcoming.append({
                        "client_id": p.client_id,
                        "client_name": client.name if client else "Unknown",
                        "event_type": "policy_anniversary",
                        "event_date": next_ann.strftime("%Y-%m-%d"),
                        "days_until": (next_ann - now).days,
                        "policy_number": p.policy_number,
                        "years": now.year - start.year,
                    })
            except (ValueError, AttributeError):
                pass

    upcoming.sort(key=lambda x: x["days_until"])
    return upcoming[:50]
