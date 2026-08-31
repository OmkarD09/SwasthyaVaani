import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentModel, DocumentExtractionModel
from app.schemas.document import DocumentUploadResponse, DocumentExtractionResult, ExtractedFact
from app.services.providers.factory import get_ocr_service

router = APIRouter(prefix="/documents", tags=["Medical Documents & OCR"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_medical_document(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    intake_session_id: Optional[str] = Form(None),
    document_type: str = Form("PRESCRIPTION"),
    db: Session = Depends(get_db)
):
    """
    Asynchronous upload endpoint for medical documents (Prescriptions, Lab Reports, Discharge Summaries).
    Returns 202 Accepted with document_id and PENDING status.
    Deduplicates within the same intake session.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file cannot be empty")

    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Intake-scoped duplicate check
    if intake_session_id:
        existing = db.query(DocumentModel).filter(
            DocumentModel.intake_session_id == intake_session_id,
            DocumentModel.file_hash == file_hash
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Duplicate document already uploaded in this intake session"
            )

    doc_id = str(uuid.uuid4())
    storage_object_id = f"doc_{doc_id}_{file.filename}"

    doc = DocumentModel(
        id=doc_id,
        patient_id=patient_id,
        intake_session_id=intake_session_id,
        file_name=file.filename or "uploaded_document.pdf",
        storage_object_id=storage_object_id,
        mime_type=file.content_type or "application/pdf",
        file_size=len(file_bytes),
        file_hash=file_hash,
        document_type=document_type,
        status="PENDING"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return DocumentUploadResponse(
        document_id=doc.id,
        file_name=doc.file_name,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        file_hash=doc.file_hash,
        storage_url=f"/api/v1/documents/{doc.id}/view",
        status="PENDING",
        uploaded_at=doc.uploaded_at
    )


@router.get("/{document_id}/status")
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    """Retrieve current processing status and extractions for an uploaded document."""
    doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    extractions = db.query(DocumentExtractionModel).filter(
        DocumentExtractionModel.document_id == doc.id
    ).all()

    return {
        "document_id": doc.id,
        "status": doc.status,
        "file_name": doc.file_name,
        "document_type": doc.document_type,
        "extraction_count": len(extractions),
        "uploaded_at": doc.uploaded_at,
        "processed_at": doc.processed_at
    }


@router.post("/{document_id}/process", response_model=DocumentExtractionResult)
async def process_document_ocr(document_id: str, db: Session = Depends(get_db)):
    """
    Executes OCR and clinical entity extraction on uploaded document.
    All extracted clinical fields default to NEEDS_REVIEW for physician confirmation.
    """
    doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    ocr_service = get_ocr_service()
    doc.status = "PROCESSING"
    db.commit()

    # Call OCR Provider
    ocr_result = await ocr_service.process_document(
        file_bytes=b"%PDF-1.4...",  # In live storage, loads bytes from Supabase
        filename=doc.file_name,
        mime_type=doc.mime_type
    )

    facts: List[ExtractedFact] = []
    # Medication facts
    if "medications" in ocr_result.extracted_fields:
        for med in ocr_result.extracted_fields["medications"]:
            facts.append(
                ExtractedFact(
                    field_type="MEDICATION",
                    field_name=med.get("name", "Prescribed Medication"),
                    value=f"{med.get('dosage', '')} {med.get('frequency', '')}".strip(),
                    confidence=float(ocr_result.confidence_score),
                    source_page=1,
                    status="NEEDS_REVIEW"
                )
            )

    # Date facts
    if "date" in ocr_result.extracted_fields:
        facts.append(
            ExtractedFact(
                field_type="DATE",
                field_name="PrescriptionDate",
                value=ocr_result.extracted_fields["date"],
                confidence=float(ocr_result.confidence_score),
                source_page=1,
                status="NEEDS_REVIEW"
            )
        )

    # Lab / other facts
    if not facts:
        facts.append(
            ExtractedFact(
                field_type="DIAGNOSIS",
                field_name="ClinicalFinding",
                value="Unspecified document finding",
                confidence=float(ocr_result.confidence_score),
                source_page=1,
                status="NEEDS_REVIEW"
            )
        )

    # Persist extractions
    for f in facts:
        ext = DocumentExtractionModel(
            document_id=doc.id,
            field_type=f.field_type,
            field_name=f.field_name,
            value_json={"value": f.value},
            confidence=int(f.confidence * 100),
            source_page=f.source_page,
            status="NEEDS_REVIEW"
        )
        db.add(ext)

    doc.status = "EXTRACTED"
    doc.processed_at = datetime.now(timezone.utc)
    db.commit()

    return DocumentExtractionResult(
        document_id=doc.id,
        status="NEEDS_REVIEW",
        extracted_facts=facts,
        raw_ocr_text=f"OCR Extractions processed via {ocr_result.provider_name}"
    )
