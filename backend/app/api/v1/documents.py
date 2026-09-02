from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.document import (
    DocumentCandidateEvidenceLinkModel,
    DocumentCandidateModel,
    DocumentCandidateSetModel,
    DocumentExtractionModel,
    DocumentModel,
    DocumentOCREvidenceModel,
    DocumentOCRRunModel,
)
from app.schemas.document import (
    DocumentExtractionResult,
    DocumentReviewCandidate,
    DocumentUploadResponse,
    ExtractedFact,
    ReviewEvidenceBlock,
)
from app.services.document_extraction import (
    DocumentCandidateValidationError,
    build_document_extraction_input,
    extract_and_persist_candidates,
    get_configured_document_extractor,
)
from app.services.document_intelligence import (
    DocumentValidationError,
    build_proposed_facts,
    create_storage_key,
    load_private_file,
    replace_ocr_evidence,
    store_private_file,
    validate_document,
)
from app.services.providers.base import AbstractOCRProvider
from app.services.providers.factory import get_ocr_service

router = APIRouter(prefix="/documents", tags=["Medical Documents & OCR"])


def _load_review_candidates(
    db: Session,
    document_id: str,
    ocr_run_id: str,
) -> list[DocumentReviewCandidate]:
    """Load review data exclusively from persisted candidates and OCR evidence."""
    candidates = (
        db.query(DocumentCandidateModel)
        .filter_by(document_id=document_id, ocr_run_id=ocr_run_id)
        .order_by(DocumentCandidateModel.created_at, DocumentCandidateModel.id)
        .all()
    )
    review_candidates = []
    for candidate in candidates:
        linked_evidence = (
            db.query(DocumentOCREvidenceModel)
            .join(
                DocumentCandidateEvidenceLinkModel,
                DocumentCandidateEvidenceLinkModel.evidence_id
                == DocumentOCREvidenceModel.id,
            )
            .filter(
                DocumentCandidateEvidenceLinkModel.candidate_id == candidate.id,
                DocumentOCREvidenceModel.document_id == document_id,
                DocumentOCREvidenceModel.ocr_run_id == ocr_run_id,
            )
            .order_by(DocumentOCREvidenceModel.block_index)
            .all()
        )
        link_count = (
            db.query(DocumentCandidateEvidenceLinkModel)
            .filter_by(candidate_id=candidate.id)
            .count()
        )
        if not linked_evidence or len(linked_evidence) != link_count:
            raise DocumentCandidateValidationError(
                "Candidate evidence linkage crossed its document or OCR run"
            )
        review_candidates.append(
            DocumentReviewCandidate(
                candidate_id=candidate.id,
                candidate_type=candidate.candidate_type,
                value=candidate.value_json,
                status=candidate.status,
                extraction_confidence=candidate.extraction_confidence,
                document_id=candidate.document_id,
                evidence=[
                    ReviewEvidenceBlock(
                        evidence_id=evidence.id,
                        source_text=evidence.text,
                        page=evidence.page_number,
                        bounding_box=evidence.bounding_box_json,
                        ocr_confidence=evidence.confidence,
                        provider_name=evidence.run.provider_name,
                        provider_version=evidence.run.provider_version,
                    )
                    for evidence in linked_evidence
                ],
            )
        )
    return review_candidates


def _review_candidates_as_extracted_facts(
    db: Session,
    candidates: list[DocumentReviewCandidate],
) -> list[ExtractedFact]:
    """Build the legacy response view from persisted, untrusted review rows."""
    facts = []
    for candidate in candidates:
        if candidate.candidate_type not in {"MEDICATION", "LAB"}:
            continue
        candidate_row = db.query(DocumentCandidateModel).filter_by(
            id=candidate.candidate_id
        ).one()
        candidate_set = db.query(DocumentCandidateSetModel).filter_by(
            id=candidate_row.candidate_set_id
        ).one()
        first_evidence = candidate.evidence[0]
        field_name = (
            candidate.value.get("name")
            or candidate.value.get("test_name")
            or candidate.candidate_type
        )
        facts.append(
            ExtractedFact(
                field_type=candidate.candidate_type,
                field_name=str(field_name),
                proposed_value=candidate.value,
                original_source_text="\n".join(
                    evidence.source_text for evidence in candidate.evidence
                ),
                document_id=candidate.document_id,
                source_page=first_evidence.page,
                bounding_box=first_evidence.bounding_box,
                ocr_confidence=min(
                    evidence.ocr_confidence for evidence in candidate.evidence
                ),
                extraction_confidence=candidate.extraction_confidence,
                engine_name=first_evidence.provider_name,
                engine_version=first_evidence.provider_version,
                extractor_version=(
                    f"{candidate_set.provider_name}/{candidate_set.model_name}"
                ),
                status="NEEDS_REVIEW",
            )
        )
    return facts


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
    latest_ocr_run = (
        db.query(DocumentOCRRunModel)
        .filter_by(document_id=doc.id)
        .order_by(DocumentOCRRunModel.created_at.desc())
        .first()
    )
    review_candidates = (
        _load_review_candidates(db, doc.id, latest_ocr_run.id)
        if latest_ocr_run
        else []
    )
    return {
        "document_id": doc.id,
        "status": doc.status,
        "file_name": doc.file_name,
        "document_type": doc.document_type,
        "extraction_count": extraction_count,
        "review_candidate_count": len(review_candidates),
        "review_candidates": review_candidates,
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
        ocr_run = replace_ocr_evidence(db, doc, result)
        db.commit()

        extraction_input = build_document_extraction_input(db, doc, ocr_run)
        extractor = get_configured_document_extractor()
        await extract_and_persist_candidates(db, extractor, extraction_input)
        db.flush()

        review_candidates = _load_review_candidates(db, doc.id, ocr_run.id)

        facts = _review_candidates_as_extracted_facts(db, review_candidates)
        if not facts and not review_candidates:
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
            review_candidates=review_candidates,
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
