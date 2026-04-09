import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "generated_pdfs")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_proposal_pdf(proposal, client) -> str:
    filename = f"proposal_{proposal.id}.pdf"
    filepath = os.path.join(OUTPUT_DIR, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4,
                            topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ProposalTitle", parent=styles["Title"],
        textColor=HexColor("#C8102E"),  # AIA Red
        fontSize=22,
    )
    heading_style = ParagraphStyle(
        "ProposalHeading", parent=styles["Heading2"],
        textColor=HexColor("#C8102E"),
    )

    elements = []

    # Header
    elements.append(Paragraph("AIA Myanmar", title_style))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"Insurance Proposal for {client.full_name}", styles["Heading1"]))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f"Prepared by: Thida Soe | Date: {datetime.now().strftime('%B %d, %Y')}", styles["Normal"]))
    elements.append(Spacer(1, 24))

    # Proposal content
    data = proposal.proposal_data or {}

    if "summary" in data:
        elements.append(Paragraph("Executive Summary", heading_style))
        elements.append(Spacer(1, 6))
        # Split summary into paragraphs
        for para in str(data["summary"]).split("\n"):
            if para.strip():
                elements.append(Paragraph(para.strip(), styles["Normal"]))
                elements.append(Spacer(1, 4))
        elements.append(Spacer(1, 12))

    if "products" in data:
        elements.append(Paragraph("Recommended Products", heading_style))
        elements.append(Spacer(1, 6))
        table_data = [["#", "Product"]]
        for i, product in enumerate(data["products"], 1):
            table_data.append([str(i), product])

        table = Table(table_data, colWidths=[0.5 * inch, 5 * inch])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#C8102E")),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#FFFFFF")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#FFFFFF"), HexColor("#F5F5F5")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 24))

    # Footer
    elements.append(Spacer(1, 36))
    elements.append(Paragraph("Contact Information", heading_style))
    elements.append(Paragraph("Thida Soe | thidasoe@aia.com.mm | +95 9 4318 1662", styles["Normal"]))
    elements.append(Paragraph("AIA Myanmar | www.aia.com.mm", styles["Normal"]))

    doc.build(elements)
    return filepath
