import hashlib
import re
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import (
    DocumentCandidateEvidenceLinkModel,
    DocumentCandidateModel,
    DocumentCandidateSetModel,
    DocumentModel,
    DocumentOCREvidenceModel,
    DocumentOCRRunModel,
)
from app.schemas.document import (
    DocumentCandidateExtractionResult,
    DocumentExtractionInput,
    ExtractedFact,
)
from app.services.providers.base import OCRExtractionResult


class DocumentValidationError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class AbstractDocumentExtractor(ABC):
    """Future boundary for rules or Gemini; it consumes persisted OCR evidence."""

    @abstractmethod
    async def extract_candidates(
        self, extraction_input: DocumentExtractionInput
    ) -> DocumentCandidateExtractionResult:
        """Return untrusted, schema-validated candidates requiring review."""


@dataclass(frozen=True)
class ValidatedDocument:
    mime_type: str
    extension: str
    page_count: int
    sha256: str


def validate_document(
    file_bytes: bytes, declared_mime_type: str | None
) -> ValidatedDocument:
    if not file_bytes:
        raise DocumentValidationError("EMPTY_FILE", "The uploaded file is empty")
    if len(file_bytes) > settings.DOCUMENT_MAX_FILE_SIZE_BYTES:
        raise DocumentValidationError(
            "FILE_TOO_LARGE", "The uploaded file exceeds the configured size limit"
        )

    sha256 = hashlib.sha256(file_bytes).hexdigest()
    if file_bytes.startswith(b"%PDF-"):
        mime_type = "application/pdf"
        extension = ".pdf"
        page_count = max(len(re.findall(rb"/Type\s*/Page\b", file_bytes)), 1)
    elif file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        mime_type = "image/png"
        extension = ".png"
        page_count = 1
    elif file_bytes.startswith(b"\xff\xd8\xff"):
        mime_type = "image/jpeg"
        extension = ".jpg"
        page_count = 1
    else:
        raise DocumentValidationError(
            "UNSUPPORTED_FILE", "The supplied document content is not supported"
        )

    if declared_mime_type and declared_mime_type != mime_type:
        raise DocumentValidationError(
            "MIME_MISMATCH", "The declared MIME type does not match the file bytes"
        )

    if (
        mime_type not in settings.DOCUMENT_ALLOWED_MIME_TYPES
        or extension not in [".pdf", ".png", ".jpg", ".jpeg"]
    ):
        raise DocumentValidationError(
            "UNSUPPORTED_FILE", "The document format is not configured for intake"
        )

    if page_count > settings.DOCUMENT_MAX_PAGE_COUNT:
        raise DocumentValidationError(
            "TOO_MANY_PAGES", "The uploaded document exceeds the maximum page limit"
        )

    return ValidatedDocument(
        mime_type=mime_type,
        extension=extension,
        page_count=page_count,
        sha256=sha256,
    )


def create_storage_key(document_type: str, extension: str) -> str:
    category = "lab-report" if document_type.upper() == "LAB_REPORT" else "prescription"
    year = datetime.now(timezone.utc).year
    return f"{category}/{year}/{uuid.uuid4().hex}{extension}"


def store_private_file(file_bytes: bytes, storage_key: str) -> Path:
    destination = Path(settings.DOCUMENT_STORAGE_DIR) / storage_key
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(file_bytes)
    return destination


def load_private_file(storage_key: str) -> bytes:
    target = Path(settings.DOCUMENT_STORAGE_DIR) / storage_key
    return target.read_bytes()


def replace_ocr_evidence(
    db: Session, document: DocumentModel, result: OCRExtractionResult
) -> DocumentOCRRunModel:
    candidate_ids = [
        candidate_id
        for (candidate_id,) in db.query(DocumentCandidateModel.id)
        .filter(DocumentCandidateModel.document_id == document.id)
        .all()
    ]
    if candidate_ids:
        db.query(DocumentCandidateEvidenceLinkModel).filter(
            DocumentCandidateEvidenceLinkModel.candidate_id.in_(candidate_ids)
        ).delete(synchronize_session=False)
        db.query(DocumentCandidateModel).filter(
            DocumentCandidateModel.id.in_(candidate_ids)
        ).delete(synchronize_session=False)

    db.query(DocumentCandidateSetModel).filter_by(document_id=document.id).delete(synchronize_session=False)
    db.query(DocumentOCREvidenceModel).filter_by(document_id=document.id).delete(synchronize_session=False)
    db.query(DocumentOCRRunModel).filter_by(document_id=document.id).delete(synchronize_session=False)
    db.flush()

    run = DocumentOCRRunModel(
        document_id=document.id,
        provider_name=result.provider_name,
        provider_version=result.provider_version,
        raw_text=result.raw_text or "",
        aggregate_confidence=result.confidence_score,
        pages_processed=result.pages_processed or 1,
    )
    db.add(run)
    db.flush()

    for index, block in enumerate(result.text_blocks):
        db.add(
            DocumentOCREvidenceModel(
                document_id=document.id,
                ocr_run_id=run.id,
                block_index=index,
                text=block["text"],
                confidence=block["confidence"],
                page_number=block["page"],
                bounding_box_json=block["bounding_box"],
            )
        )
    db.flush()
    return run


def build_proposed_facts(
    document_id: str, result: OCRExtractionResult
) -> list[ExtractedFact]:
    facts: list[ExtractedFact] = []
    medications = result.extracted_fields.get("medications", [])
    for med in medications:
        facts.append(
            ExtractedFact(
                document_id=document_id,
                field_type="MEDICATION",
                field_name="medication",
                proposed_value=med,
                ocr_confidence=med.get("confidence", result.confidence_score),
                extraction_confidence=med.get("confidence", result.confidence_score),
                source_page=med.get("page", 1),
                original_source_text=med.get("source_text", med.get("name", "")),
                bounding_box=med.get("bounding_box"),
                engine_name=result.provider_name,
                engine_version=result.provider_version,
                extractor_version="1.0",
                status="NEEDS_REVIEW",
            )
        )
    labs = result.extracted_fields.get("lab_observations", [])
    for lab in labs:
        facts.append(
            ExtractedFact(
                document_id=document_id,
                field_type="LAB_RESULT",
                field_name="lab_observation",
                proposed_value=lab,
                ocr_confidence=lab.get("confidence", result.confidence_score),
                extraction_confidence=lab.get("confidence", result.confidence_score),
                source_page=lab.get("page", 1),
                original_source_text=lab.get("source_text", lab.get("test_name", "")),
                bounding_box=lab.get("bounding_box"),
                engine_name=result.provider_name,
                engine_version=result.provider_version,
                extractor_version="1.0",
                status="NEEDS_REVIEW",
            )
        )
    return facts
