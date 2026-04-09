from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Client, Proposal
from schemas import ProposalGenerateRequest, ProposalResponse
from services.ai_service import generate_proposal_content
from services.pdf_service import generate_proposal_pdf

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


@router.post("/generate", response_model=ProposalResponse)
async def generate_proposal(data: ProposalGenerateRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    proposal_content = await generate_proposal_content(client, data.products, data.notes)

    proposal = Proposal(
        client_id=data.client_id,
        title=f"Insurance Proposal for {client.full_name}",
        proposal_data=proposal_content,
        status="draft",
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    pdf_path = generate_proposal_pdf(proposal, client)
    proposal.pdf_path = pdf_path
    db.commit()
    db.refresh(proposal)

    return proposal


@router.get("", response_model=list[ProposalResponse])
def list_proposals(client_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Proposal)
    if client_id:
        query = query.filter(Proposal.client_id == client_id)
    return query.order_by(Proposal.created_at.desc()).all()
