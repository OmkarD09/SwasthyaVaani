from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.document import DocumentExtractionModel, DocumentModel
from app.schemas.document import DocumentExtractionResult, DocumentUploadResponse
from app.services.document_intelligence import (
    DocumentValidationError,
    build_proposed_facts,
    create_storage_key,
    load_private_file,
    store_private_file,
    validate_document,
)
from app.services.providers.base import AbstractOCRProvider
from app.services.providers.factory import get_ocr_service

router = APIRouter(prefix="/documents", tags=["Medical Documents & OCR"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=202)
async def upload_medical_document(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    intake_session_id: str | None = Form(None),
    document_type: str = Form("PRESCRIPTION"),
    db: Session = Depends(get_db),
):
    """Validate and store a document under a generated private object key."""
    file_bytes = await file.read(settings.DOCUMENT_MAX_FILE_SIZE_BYTES + 1)
    try:
        validated = validate_document(file_bytes, file.content_type)
        storage_key = create_storage_key(document_type, validated.extension)
    except DocumentValidationError as exc:
        raise HTTPException(
            status_code=400, detail={"code": exc.code, "message": str(exc)}
        ) from exc

    duplicate = None
    if intake_session_id:
        duplicate = (
            db.query(DocumentModel)
            .filter(
                DocumentModel.intake_session_id == intake_session_id,
                DocumentModel.sha256 == validated.sha256,
            )
            .first()
        )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail={"code": "DUPLICATE_DOCUMENT", "document_id": duplicate.id},
        )

    stored_path: Path | None = None
    try:
        stored_path = store_private_file(file_bytes, storage_key)
        doc = DocumentModel(
            patient_id=patient_id,
            intake_session_id=intake_session_id,
            file_name=Path(file.filename or f"document{validated.extension}").name,
            storage_object_id=storage_key,
            mime_type=validated.mime_type,
            file_size=len(file_bytes),
            sha256=validated.sha256,
            page_count=validated.page_count,
            document_type=document_type.upper(),
            status="PENDING",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        if stored_path and stored_path.exists():
            stored_path.unlink()
        raise

    return DocumentUploadResponse(
        document_id=doc.id,
        file_name=doc.file_name,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        storage_path=doc.storage_object_id,
        file_hash=doc.sha256,
        page_count=doc.page_count,
        status=doc.status,
        uploaded_at=doc.uploaded_at,
    )


@router.get("/{document_id}/status")
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    """Return processing state without exposing a public document URL."""
    doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    extraction_count = (
        db.query(DocumentExtractionModel)
        .filter(DocumentExtractionModel.document_id == doc.id)
        .count()
    )
    return {
        "document_id": doc.id,
        "status": doc.status,
        "file_name": doc.file_name,
        "document_type": doc.document_type,
        "extraction_count": extraction_count,
        "uploaded_at": doc.uploaded_at,
        "processed_at": doc.processed_at,
    }


@router.post("/{document_id}/process", response_model=DocumentExtractionResult)
async def process_document_ocr(
    document_id: str,
    db: Session = Depends(get_db),
    ocr: AbstractOCRProvider = Depends(get_ocr_service),
):
    """Create untrusted, provenance-bearing proposals that require human review."""
    doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status == "NEEDS_REVIEW":
        raise HTTPException(
            status_code=409, detail="Document has already been processed"
        )

    doc.status = "PROCESSING"
    db.commit()
    try:
        file_bytes = load_private_file(doc.storage_object_id)
        result = await ocr.process_document(file_bytes, doc.file_name, doc.mime_type)
        facts = build_proposed_facts(doc.id, result)
        for fact in facts:
            db.add(
                DocumentExtractionModel(
                    document_id=doc.id,
                    field_type=fact.field_type,
                    field_name=fact.field_name,
                    value_json=fact.proposed_value,
                    confidence=round(fact.extraction_confidence * 100),
                    ocr_confidence=fact.ocr_confidence,
                    extraction_confidence=fact.extraction_confidence,
                    source_page=fact.source_page,
                    source_region_json={"bounding_box": fact.bounding_box}
                    if fact.bounding_box
                    else None,
                    original_source_text=fact.original_source_text,
                    ocr_engine=fact.engine_name,
                    ocr_engine_version=fact.engine_version,
                    extractor_version=fact.extractor_version,
                    status="NEEDS_REVIEW",
                )
            )
        doc.status = "NEEDS_REVIEW"
        doc.processed_at = datetime.now(timezone.utc)
        db.commit()
        return DocumentExtractionResult(
            document_id=doc.id,
            status="NEEDS_REVIEW",
            extracted_facts=facts,
            raw_ocr_text=result.raw_text,
        )
    except Exception as exc:
        db.rollback()
        doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
        if doc:
            doc.status = "PROCESSING_FAILED"
            doc.failure_code = type(exc).__name__
            doc.processed_at = datetime.now(timezone.utc)
            db.commit()
        raise HTTPException(
            status_code=502,
            detail={
                "code": "DOCUMENT_PROCESSING_FAILED",
                "message": "Document processing failed safely",
            },
        ) from exc
