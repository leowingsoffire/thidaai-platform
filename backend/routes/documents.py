"""Document attachment endpoints — upload, list, download, delete files for any entity."""
import os
import uuid
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import DocumentAttachment, User
from services.auth_service import get_current_user, log_audit

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 20 MB limit
MAX_FILE_SIZE = 20 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
    ".txt", ".rtf", ".odt",
}

SAFE_FILENAME_RE = re.compile(r"[^\w\s\-\.]", re.UNICODE)


def _safe_filename(name: str) -> str:
    """Sanitize filename to prevent path traversal."""
    name = os.path.basename(name)
    name = SAFE_FILENAME_RE.sub("_", name)
    return name[:200] if name else "unnamed"


def _get_ext(filename: str) -> str:
    _, ext = os.path.splitext(filename)
    return ext.lower()


@router.post("")
async def upload_document(
    entity_type: str = Form(...),
    entity_id: str = Form(...),
    category: str = Form("other"),
    notes: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a file attachment to an entity."""
    # Validate entity_type
    if entity_type not in ("policy", "claim", "client", "underwriting", "corporate"):
        raise HTTPException(400, "Invalid entity_type")

    # Validate extension
    ext = _get_ext(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    # Read file and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Max {MAX_FILE_SIZE // (1024*1024)} MB")

    # Generate safe storage name
    safe_original = _safe_filename(file.filename or "upload")
    storage_name = f"{uuid.uuid4().hex}_{safe_original}"

    # Store in entity-type sub-folder
    entity_dir = os.path.join(UPLOAD_DIR, entity_type)
    os.makedirs(entity_dir, exist_ok=True)
    file_path = os.path.join(entity_dir, storage_name)

    with open(file_path, "wb") as f:
        f.write(content)

    doc = DocumentAttachment(
        entity_type=entity_type,
        entity_id=entity_id,
        file_name=storage_name,
        original_name=safe_original,
        file_size=len(content),
        content_type=file.content_type or "application/octet-stream",
        category=category,
        notes=notes or None,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_audit(db, current_user.id, "upload", "document", doc.id, {
        "entity_type": entity_type, "entity_id": entity_id,
        "file": safe_original, "size": len(content),
    })

    return {
        "id": doc.id,
        "entity_type": doc.entity_type,
        "entity_id": doc.entity_id,
        "file_name": doc.file_name,
        "original_name": doc.original_name,
        "file_size": doc.file_size,
        "content_type": doc.content_type,
        "category": doc.category,
        "notes": doc.notes,
        "uploaded_by": current_user.full_name,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@router.get("")
def list_documents(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all documents for an entity."""
    docs = (
        db.query(DocumentAttachment)
        .filter(DocumentAttachment.entity_type == entity_type, DocumentAttachment.entity_id == entity_id)
        .order_by(DocumentAttachment.created_at.desc())
        .all()
    )
    result = []
    for d in docs:
        uploader = db.query(User).filter(User.id == d.uploaded_by).first() if d.uploaded_by else None
        result.append({
            "id": d.id,
            "entity_type": d.entity_type,
            "entity_id": d.entity_id,
            "file_name": d.file_name,
            "original_name": d.original_name,
            "file_size": d.file_size,
            "content_type": d.content_type,
            "category": d.category,
            "notes": d.notes,
            "uploaded_by": uploader.full_name if uploader else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return result


@router.get("/{doc_id}/download")
def download_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a document by ID."""
    doc = db.query(DocumentAttachment).filter(DocumentAttachment.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    file_path = os.path.join(UPLOAD_DIR, doc.entity_type, doc.file_name)
    if not os.path.isfile(file_path):
        raise HTTPException(404, "File not found on disk")

    # Prevent path traversal
    real_path = os.path.realpath(file_path)
    real_upload = os.path.realpath(UPLOAD_DIR)
    if not real_path.startswith(real_upload):
        raise HTTPException(403, "Access denied")

    return FileResponse(
        path=file_path,
        filename=doc.original_name,
        media_type=doc.content_type,
    )


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document attachment."""
    doc = db.query(DocumentAttachment).filter(DocumentAttachment.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Remove file from disk
    file_path = os.path.join(UPLOAD_DIR, doc.entity_type, doc.file_name)
    real_path = os.path.realpath(file_path)
    real_upload = os.path.realpath(UPLOAD_DIR)
    if real_path.startswith(real_upload) and os.path.isfile(real_path):
        os.remove(real_path)

    log_audit(db, current_user.id, "delete", "document", doc.id, {
        "entity_type": doc.entity_type, "entity_id": doc.entity_id,
        "file": doc.original_name,
    })

    db.delete(doc)
    db.commit()
