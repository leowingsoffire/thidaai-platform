from openai import AsyncOpenAI
from config import get_settings

settings = get_settings()
openai_client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

SYSTEM_PROMPT = """You are ThidaAI, an AI assistant for Thida Soe, a top insurance agent at AIA Myanmar.
You help with insurance needs analysis, financial planning, and client communication.
Always be professional, helpful, and provide advice relevant to AIA Myanmar products.
Respond concisely and in a friendly tone."""


async def generate_needs_analysis(client, analysis_data: dict) -> str:
    if not openai_client:
        return _fallback_needs_analysis(analysis_data)

    prompt = f"""Analyze insurance needs for client:
- Name: {client.full_name}
- Age: {client.date_of_birth or 'Unknown'}
- Occupation: {client.occupation or 'Unknown'}
- Monthly Income: {client.monthly_income or 'Unknown'}
- Dependents: {client.dependents}

Analysis Data:
- Total Coverage Needed: {analysis_data['total_coverage_needed']:,.0f}
- Current Coverage: {analysis_data['current_coverage']:,.0f}
- Protection Gap: {analysis_data['protection_gap']:,.0f}

Provide 3-5 specific AIA Myanmar product recommendations with rationale."""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=800,
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception:
        return _fallback_needs_analysis(analysis_data)


def _fallback_needs_analysis(analysis_data: dict) -> str:
    gap = analysis_data["protection_gap"]
    return (
        f"Based on the analysis, there is a protection gap of {gap:,.0f} MMK.\n\n"
        "Recommended AIA Myanmar products:\n"
        "1. AIA Life Protector - Term life coverage for income replacement\n"
        "2. AIA Health Shield - Medical expense coverage\n"
        "3. AIA Education Saver - Children's education fund\n\n"
        "Please consult with Thida Soe for personalized recommendations."
    )


async def generate_proposal_content(client, products: list[str], notes: str | None) -> dict:
    if not openai_client:
        return _fallback_proposal(client, products)

    prompt = f"""Generate a professional insurance proposal for:
- Client: {client.full_name}
- Products: {', '.join(products)}
- Additional Notes: {notes or 'None'}

Return a structured proposal with: executive summary, recommended products with benefits,
premium breakdown, and next steps."""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1000,
            temperature=0.7,
        )
        content = response.choices[0].message.content
        return {
            "summary": content,
            "products": products,
            "client_name": client.full_name,
        }
    except Exception:
        return _fallback_proposal(client, products)


def _fallback_proposal(client, products: list[str]) -> dict:
    return {
        "summary": f"Insurance proposal for {client.full_name} covering: {', '.join(products)}.",
        "products": products,
        "client_name": client.full_name,
    }


async def generate_whatsapp_reply(message: str, client) -> str:
    if not openai_client:
        return (
            "Thank you for contacting AIA Myanmar! "
            "Agent Thida Soe will get back to you shortly. "
            "For urgent inquiries, call +95 9 4318 1662."
        )

    context = ""
    if client:
        context = f"This is an existing client: {client.full_name}. "

    prompt = f"""{context}The client sent this WhatsApp message: "{message}"
Provide a helpful, brief response (max 160 chars for SMS-friendly)."""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=100,
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception:
        return (
            "Thank you for contacting AIA Myanmar! "
            "Agent Thida Soe will get back to you shortly."
        )
