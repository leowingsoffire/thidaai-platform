"""Content Calendar & Objection Scripts routes."""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import ContentPost, ObjectionScript, gen_uuid, User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/content", tags=["Content & Objections"])


class ContentInput(BaseModel):
    title: str
    content: str = ""
    platform: str = "facebook"
    post_type: str = "educational"
    scheduled_date: Optional[str] = None
    hashtags: str = ""
    image_prompt: str = ""
    language: str = "en"


class ObjectionInput(BaseModel):
    objection: str
    category: str = "price"
    response_en: str = ""
    response_my: str = ""
    tips: str = ""


# ---- Seed objection scripts ----
DEFAULT_OBJECTIONS = [
    {
        "objection": "Insurance is too expensive",
        "category": "price",
        "response_en": "I understand your concern about cost. Let me show you how AIA's flexible plans start from as low as 15,000 MMK/month — less than a coffee per day. The real question is: can you afford NOT to have protection when the unexpected happens?",
        "response_my": "ကုန်ကျစရိတ်အတွက် စိုးရိမ်တာ နားလည်ပါတယ်။ AIA ရဲ့ လိုက်လျောညီထွေ plan တွေက တစ်လ ၁၅,၀၀၀ ကျပ်ကနေ စတယ် — တစ်ရက် ကော်ဖီတစ်ခွက်စာတောင် မရှိပါဘူး။",
        "tips": "Use the retirement gap calculator to show real numbers. Ask: 'If something happens tomorrow, how would your family manage?'",
        "effectiveness_rating": 4.5,
    },
    {
        "objection": "I need to think about it",
        "category": "timing",
        "response_en": "Absolutely, this is an important decision. But consider this — every day without coverage is a day of risk. Health conditions found later could mean higher premiums or exclusions. Can we schedule a follow-up call next Tuesday to discuss your questions?",
        "response_my": "ဟုတ်ကဲ့ ဒါ အရေးကြီးတဲ့ ဆုံးဖြတ်ချက်ပါ။ ဒါပေမယ့် အာမခံမရှိတဲ့ နေ့တိုင်းဟာ အန္တရာယ်ရှိတဲ့ နေ့ဖြစ်ပါတယ်။ နောက်မှ ကျန်းမာရေး ပြဿနာတွေ့ရင် ပရီမီယံ ပိုများလာနိုင်ပါတယ်။",
        "tips": "Create urgency without pressure. Book a specific callback time. Send a retirement gap analysis email.",
        "effectiveness_rating": 4.2,
    },
    {
        "objection": "I already have insurance",
        "category": "competitor",
        "response_en": "That's great! Having existing coverage shows you understand the importance of protection. Let me do a free coverage review — many clients find gaps they didn't know about, especially for critical illness and income protection. No obligation at all.",
        "response_my": "ကောင်းပါတယ်! အာမခံရှိပြီးသားဆိုတာ အကာအကွယ်ရဲ့ အရေးပါမှုကို နားလည်တယ်ဆိုတာ ပြပါတယ်။ အခမဲ့ coverage review လုပ်ပေးရမလား — အများစုက မသိလိုက်တဲ့ gap တွေ ရှိတတ်ပါတယ်။",
        "tips": "Position as a 'free review'. Focus on gaps, not replacement. Use the 4 Pillars framework to show missing areas.",
        "effectiveness_rating": 4.7,
    },
    {
        "objection": "I'm too young for insurance",
        "category": "need",
        "response_en": "Actually, being young is the BEST time to get insurance! Your premiums will be the lowest they'll ever be, and you'll lock in your health status. A 25-year-old pays about 40% less than a 35-year-old for the same coverage.",
        "response_my": "အမှန်တကယ်တော့ ငယ်ရွယ်ချိန်ဟာ အာမခံဝယ်ဖို့ အကောင်းဆုံး အချိန်ပါ! ပရီမီယံက အနိမ့်ဆုံးဖြစ်ပြီး ကျန်းမာရေး status ကိုလည်း lock ထားနိုင်မှာပါ။",
        "tips": "Show premium comparison by age. Use compound interest examples for investment-linked plans.",
        "effectiveness_rating": 4.3,
    },
    {
        "objection": "I don't trust insurance companies",
        "category": "trust",
        "response_en": "I completely understand — trust must be earned. AIA has been serving Asia for over 100 years, with a claims settlement ratio of 97%. We've paid out millions in claims right here in Myanmar. Let me share some real testimonials from clients who've had claims settled.",
        "response_my": "နားလည်ပါတယ် — ယုံကြည်မှုက ရယူရတာပါ။ AIA က အာရှမှာ နှစ် ၁၀၀ ကျော် ဝန်ဆောင်မှုပေးခဲ့ပြီး claim settlement ratio က ၉၇% ပါ။ မြန်မာနိုင်ငံမှာလည်း claim သန်းပေါင်းများစွာ ပေးအပ်ခဲ့ပါတယ်။",
        "tips": "Share claim stories (with permission). Show AIA's AAA rating. Offer to connect with existing satisfied clients.",
        "effectiveness_rating": 4.6,
    },
    {
        "objection": "My company provides insurance",
        "category": "competitor",
        "response_en": "Company insurance is a wonderful benefit! However, it typically covers you only while employed there. What happens if you change jobs, or retire? Personal coverage gives you lifelong protection that moves with you. Let's look at the gaps.",
        "response_my": "ကုမ္ပဏီ အာမခံက ကောင်းတဲ့ အကျိုးခံစားခွင့်ပါ! ဒါပေမယ့် အဲဒီမှာ အလုပ်လုပ်နေစဉ်ပဲ cover ပါတယ်။ အလုပ်ပြောင်းရင် သို့မဟုတ် အငြိမ်းစားယူရင် ဘာဖြစ်မလဲ?",
        "tips": "Show the gap between group coverage and actual needs. Focus on portability and retirement.",
        "effectiveness_rating": 4.4,
    },
]

# ---- Content templates ----
CONTENT_TEMPLATES = {
    "educational": {
        "facebook": {
            "en": [
                {"title": "Why Life Insurance Matters", "content": "Did you know? 70% of Myanmar families would face financial hardship within 6 months of losing a breadwinner. Life insurance isn't just a policy — it's a promise to your family. 💙\n\n#AIA #LifeInsurance #ProtectYourFamily #Myanmar"},
                {"title": "Understanding Critical Illness Coverage", "content": "Critical illness can strike at any age. AIA's CI coverage provides a lump sum benefit so you can focus on recovery, not bills.\n\n#CriticalIllness #AIA #HealthProtection"},
                {"title": "4 Pillars of Financial Well-Being", "content": "Live Well 🏠 Think Well 🧠 Feel Well 💚 Plan Well 📊\n\nAIA's holistic approach ensures you and your family are protected in every aspect of life.\n\n#AIA #4Pillars #FinancialWellbeing"},
            ],
            "my": [
                {"title": "ဘဝအာမခံ ဘာကြောင့် အရေးကြီးသလဲ", "content": "သိပါသလား? မြန်မာမိသားစု ၇၀% က ဝင်ငွေရှာသူ ဆုံးရှုံးပြီး ၆ လအတွင်း ငွေကြေးအခက်အခဲ ရင်ဆိုင်ရပါတယ်။ ဘဝအာမခံက မိသားစုအတွက် ကတိစကားပါ။ 💙"},
            ],
        },
        "linkedin": {
            "en": [
                {"title": "Corporate Wellness ROI", "content": "Companies investing in employee wellness programs see 3x ROI through reduced absenteeism and improved productivity. At AIA, we design group insurance solutions that put employee well-being first.\n\n#CorporateWellness #EmployeeBenefits #AIA #HR"},
            ],
        },
    },
    "motivational": {
        "facebook": {
            "en": [
                {"title": "Your Future Self Will Thank You", "content": "Today's small investment = Tomorrow's big protection. Start building your safety net today with AIA. 🌟\n\n#AIA #InsuranceAgent #MDRT #Motivation"},
                {"title": "MDRT Journey", "content": "Every policy sold is a family protected. Every conversation is an opportunity to make a difference. Keep pushing towards MDRT! 🏆\n\n#MDRT #AIA #InsuranceLife"},
            ],
        },
    },
    "testimonial": {
        "facebook": {
            "en": [
                {"title": "Client Success Story", "content": "A client once told me: 'When my husband was diagnosed with cancer, I thought we'd lose everything. The AIA critical illness payout covered all treatment costs. You gave us hope when we needed it most.'\n\nThis is why I do what I do. 💙\n\n#AIA #RealStories #InsuranceMatters"},
            ],
        },
    },
}


@router.post("/posts")
def create_post(body: ContentInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = ContentPost(
        title=body.title,
        content=body.content,
        platform=body.platform,
        post_type=body.post_type,
        scheduled_date=datetime.fromisoformat(body.scheduled_date) if body.scheduled_date else None,
        hashtags=body.hashtags,
        image_prompt=body.image_prompt,
        language=body.language,
        status="scheduled" if body.scheduled_date else "draft",
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"id": post.id, "title": post.title, "status": post.status}


@router.get("/posts")
def list_posts(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(ContentPost)
    if status:
        q = q.filter(ContentPost.status == status)
    if platform:
        q = q.filter(ContentPost.platform == platform)
    posts = q.order_by(ContentPost.created_at.desc()).all()
    return [
        {
            "id": p.id, "title": p.title, "content": p.content, "platform": p.platform,
            "post_type": p.post_type, "scheduled_date": p.scheduled_date.isoformat() if p.scheduled_date else None,
            "status": p.status, "hashtags": p.hashtags, "language": p.language,
            "engagement_score": float(p.engagement_score) if p.engagement_score else 0,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in posts
    ]


@router.put("/posts/{post_id}")
def update_post(post_id: str, body: ContentInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    post.title = body.title
    post.content = body.content
    post.platform = body.platform
    post.post_type = body.post_type
    post.hashtags = body.hashtags
    post.language = body.language
    if body.scheduled_date:
        post.scheduled_date = datetime.fromisoformat(body.scheduled_date)
        post.status = "scheduled"
    db.commit()
    return {"id": post.id, "status": post.status}


@router.delete("/posts/{post_id}")
def delete_post(post_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    db.delete(post)
    db.commit()
    return {"deleted": True}


@router.get("/templates")
def get_templates(
    post_type: Optional[str] = None,
    platform: Optional[str] = None,
    language: str = "en",
    user: User = Depends(get_current_user),
):
    """Get pre-built content templates."""
    results = []
    for pt, platforms in CONTENT_TEMPLATES.items():
        if post_type and pt != post_type:
            continue
        for plat, langs in platforms.items():
            if platform and plat != platform:
                continue
            templates = langs.get(language, langs.get("en", []))
            for t in templates:
                results.append({**t, "post_type": pt, "platform": plat, "language": language})
    return results


@router.get("/calendar")
def get_calendar(
    days: int = 30,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get content calendar for next N days."""
    now = datetime.utcnow()
    end = now + timedelta(days=days)
    posts = db.query(ContentPost).filter(
        ContentPost.scheduled_date.between(now, end)
    ).order_by(ContentPost.scheduled_date).all()

    calendar = {}
    for p in posts:
        date_str = p.scheduled_date.strftime("%Y-%m-%d") if p.scheduled_date else "unscheduled"
        if date_str not in calendar:
            calendar[date_str] = []
        calendar[date_str].append({
            "id": p.id, "title": p.title, "platform": p.platform,
            "post_type": p.post_type, "status": p.status,
        })

    return {"calendar": calendar, "total_scheduled": len(posts)}


# ---- Objection Scripts ----

@router.get("/objections")
def list_objections(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(ObjectionScript)
    if category:
        q = q.filter(ObjectionScript.category == category)
    scripts = q.order_by(ObjectionScript.effectiveness_rating.desc()).all()
    return [
        {
            "id": s.id, "objection": s.objection, "category": s.category,
            "response_en": s.response_en, "response_my": s.response_my,
            "tips": s.tips, "effectiveness_rating": float(s.effectiveness_rating) if s.effectiveness_rating else 0,
            "times_used": s.times_used,
        }
        for s in scripts
    ]


@router.post("/objections")
def create_objection(body: ObjectionInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    script = ObjectionScript(
        objection=body.objection,
        category=body.category,
        response_en=body.response_en,
        response_my=body.response_my,
        tips=body.tips,
    )
    db.add(script)
    db.commit()
    db.refresh(script)
    return {"id": script.id, "objection": script.objection}


@router.put("/objections/{script_id}/used")
def mark_used(script_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    script = db.query(ObjectionScript).filter(ObjectionScript.id == script_id).first()
    if not script:
        raise HTTPException(404, "Script not found")
    script.times_used = (script.times_used or 0) + 1
    db.commit()
    return {"times_used": script.times_used}


def seed_objections(db: Session):
    """Seed default objection scripts if none exist."""
    if db.query(ObjectionScript).count() == 0:
        for obj in DEFAULT_OBJECTIONS:
            db.add(ObjectionScript(**obj))
        db.commit()


class AIContentGenInput(BaseModel):
    topic: str = "insurance awareness"
    platform: str = "facebook"
    post_type: str = "educational"
    language: str = "en"
    tone: str = "professional"  # professional, casual, motivational, urgent


# ---- AI content topics for different types & tones ----
_AI_CONTENT_DB = {
    ("educational", "professional", "en"): [
        {"title": "Understanding Income Protection", "content": "As a breadwinner, your ability to earn is your greatest asset. If illness or accident stopped your income, could your family maintain their lifestyle?\n\nIncome protection insurance replaces up to 75% of your monthly salary if you can't work. It's not a luxury — it's smart planning.\n\n📊 Key facts:\n• Average recovery from critical illness: 6-12 months\n• Most families run out of savings within 3 months\n• AIA Income Protector provides affordable coverage from 20,000 MMK/month\n\nProtect what matters most. #AIA #IncomeProtection #FinancialPlanning"},
        {"title": "The Power of Starting Early", "content": "A 25-year-old paying 30,000 MMK/month for life insurance gets double the coverage of a 40-year-old paying the same amount.\n\nWhy? Lower risk = lower premiums = more protection per kyat.\n\n⏰ Time is literally money in insurance. Every year you wait:\n• Premiums increase 5-8% annually\n• Health conditions may emerge\n• Your family remains unprotected\n\nStart today - your future self will thank you.\n\n#AIA #LifeInsurance #StartEarly #Myanmar"},
        {"title": "Health Insurance: Your Shield Against Uncertainty", "content": "Medical costs in Myanmar have risen 12% year-over-year. A single hospital stay can cost 500,000 - 5,000,000 MMK.\n\nAIA Health Shield covers:\n✅ Hospitalization & surgery\n✅ Outpatient care\n✅ Specialist consultations\n✅ Emergency treatment\n\nDon't let a health crisis become a financial crisis.\n\n#AIA #HealthInsurance #ProtectYourHealth"},
    ],
    ("educational", "professional", "my"): [
        {"title": "ဝင်ငွေ အကာအကွယ် နားလည်ခြင်း", "content": "ဝင်ငွေရှာသူတစ်ယောက်အနေနဲ့ သင့်ရဲ့ ဝင်ငွေရှာနိုင်စွမ်းက သင့်ရဲ့ အကြီးဆုံး ပိုင်ဆိုင်မှုပါ။ နေမကောင်းဖြစ်ရင် သင့်မိသားစုက ဘယ်လိုရပ်တည်မလဲ?\n\nAIA Income Protector - လစဉ် ၂၀,၀၀၀ ကျပ်ကနေ လုံခြုံမှုရယူနိုင်ပါပြီ။\n\n#AIA #FinancialPlanning #Myanmar"},
    ],
    ("motivational", "professional", "en"): [
        {"title": "Every Policy is a Family Protected", "content": "Behind every policy number is a family's peace of mind. 💙\n\nToday I completed my 50th policy this year. Each one represents:\n• A parent who won't worry about medical bills\n• A child whose education is secured\n• A family whose future is protected\n\nThis isn't just a job. It's a mission.\n\n🏆 Tracking towards MDRT 2026!\n\n#MDRT #AIA #InsuranceAgent #Motivation #ProtectFamilies"},
        {"title": "The MDRT Mindset", "content": "MDRT isn't just about hitting numbers. It's about the discipline of:\n\n📞 Making one more call\n🤝 Building genuine relationships\n📚 Continuous learning\n💪 Showing up every single day\n\nThe clients you help today become the referrals of tomorrow.\n\nKeep going! 🏆\n\n#MDRT #AIA #AgentLife #Discipline"},
    ],
    ("testimonial", "professional", "en"): [
        {"title": "When Insurance Saved Everything", "content": "Last month, a client's husband was diagnosed with cancer. The treatment cost: 15,000,000 MMK.\n\nBecause she had AIA Critical Illness coverage (premium: just 45,000 MMK/month), she received a lump-sum payment within 14 days.\n\nHer words: 'You didn't just sell me a policy. You gave my family hope.'\n\nThis is why we do what we do. 💙\n\n(Shared with client's permission)\n\n#AIA #RealStories #CriticalIllness #InsuranceMatters"},
    ],
    ("educational", "casual", "en"): [
        {"title": "Insurance Made Simple", "content": "Think of insurance like an umbrella ☂️\n\nYou don't buy it when it's already raining — you buy it while the sun is shining.\n\nDM me to learn about AIA's affordable plans starting from just 500 kyats/day! Yes, less than your morning tea. ☕\n\n#AIA #InsuranceSimplified #Myanmar"},
    ],
    ("educational", "urgent", "en"): [
        {"title": "Don't Wait Until It's Too Late", "content": "⚠️ IMPORTANT: Health insurance premiums increase with every birthday. If you've been 'thinking about it,' now is the time.\n\nFact: Clients who delayed just 1 year paid an average of 8% more for the same coverage.\n\nLock in today's rates now. Your health status today is your best negotiating tool.\n\nMessage me for a free coverage review.\n\n#AIA #ActNow #HealthInsurance #DontWait"},
    ],
}


@router.post("/ai-generate")
def ai_generate_content(
    body: AIContentGenInput,
    user: User = Depends(get_current_user),
):
    """AI-powered content generation for social media posts."""
    key = (body.post_type, body.tone, body.language)
    fallback_key = (body.post_type, "professional", "en")

    templates = _AI_CONTENT_DB.get(key) or _AI_CONTENT_DB.get(fallback_key) or []

    if not templates:
        # Generate a basic post
        platform_tips = {
            "facebook": "Use emojis, ask questions, include hashtags. 150-300 words ideal.",
            "linkedin": "Professional tone, data-driven, industry insights. 200-400 words.",
            "viber": "Short, personal, call-to-action focused. Under 100 words.",
            "instagram": "Visual-first, storytelling, emoji-rich. 100-200 words.",
            "twitter": "Concise, punchy, trending hashtags. Under 280 characters.",
        }
        templates = [{
            "title": f"AI Generated: {body.topic.title()}",
            "content": f"📝 Content about {body.topic} for {body.platform}.\n\nTip: {platform_tips.get(body.platform, 'Keep it engaging and relevant.')}\n\n#AIA #{body.topic.replace(' ', '')} #Insurance",
        }]

    import random
    selected = random.choice(templates)

    # Platform-specific adjustments
    hashtags = "#AIA #Insurance #Myanmar"
    if body.platform == "linkedin":
        hashtags = "#AIA #CorporateInsurance #EmployeeBenefits #Myanmar"
    elif body.platform == "viber":
        hashtags = ""

    # Build enhanced version
    best_posting_times = {
        "facebook": "9:00 AM, 1:00 PM, or 7:00 PM MMT",
        "linkedin": "8:00 AM or 12:00 PM MMT (weekdays)",
        "viber": "10:00 AM or 6:00 PM MMT",
        "instagram": "11:00 AM, 2:00 PM, or 8:00 PM MMT",
        "twitter": "9:00 AM or 5:00 PM MMT",
    }

    return {
        "generated_title": selected["title"],
        "generated_content": selected["content"],
        "platform": body.platform,
        "post_type": body.post_type,
        "language": body.language,
        "tone": body.tone,
        "suggested_hashtags": hashtags,
        "best_posting_time": best_posting_times.get(body.platform, "9:00 AM MMT"),
        "tips": [
            f"Best time to post on {body.platform}: {best_posting_times.get(body.platform, '9 AM')}",
            "Include a call-to-action (DM, call, link)",
            "Add a relevant image or infographic for 2x engagement",
            "Reply to all comments within 1 hour for algorithm boost",
        ],
    }
