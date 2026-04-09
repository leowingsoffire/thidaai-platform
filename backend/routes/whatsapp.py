from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session
from database import get_db
from models import WhatsAppMessage, Client
from config import get_settings
from services.ai_service import generate_whatsapp_reply

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


@router.post("/webhook")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    from_number = form.get("From", "")
    body = form.get("Body", "")
    message_sid = form.get("MessageSid", "")

    # Find client by phone
    phone_clean = from_number.replace("whatsapp:", "")
    client = db.query(Client).filter(Client.phone == phone_clean).first()

    # Save inbound message
    inbound = WhatsAppMessage(
        phone_number=phone_clean,
        direction="inbound",
        message_body=body,
        message_sid=message_sid,
        client_id=client.id if client else None,
    )
    db.add(inbound)
    db.commit()

    # Generate AI reply
    reply_text = await generate_whatsapp_reply(body, client)

    # Save outbound message
    outbound = WhatsAppMessage(
        phone_number=phone_clean,
        direction="outbound",
        message_body=reply_text,
        client_id=client.id if client else None,
    )
    db.add(outbound)
    db.commit()

    # Return TwiML response
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{reply_text}</Message>
</Response>"""
    return Response(content=twiml, media_type="application/xml")
