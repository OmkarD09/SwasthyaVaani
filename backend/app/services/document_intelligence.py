import hashlib
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.schemas.document import ExtractedFact
from app.services.providers.base import OCRExtractionResult


class DocumentValidationError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


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

    if file_bytes.startswith(b"%PDF-"):
        actual_mime, extension = "application/pdf", ".pdf"
        page_count = len(re.findall(rb"/Type\s*/Page\b", file_bytes))
        if page_count < 1:
            raise DocumentValidationError(
                "INVALID_PDF", "PDF structure contains no pages"
            )
    elif file_bytes.startswith(b"\x89PNG\r\n\x1a\n") and b"IHDR" in file_bytes[:32]:
        actual_mime, extension, page_count = "image/png", ".png", 1
    elif file_bytes.startswith(b"\xff\xd8\xff") and file_bytes.endswith(b"\xff\xd9"):
        actual_mime, extension, page_count = "image/jpeg", ".jpg", 1
    else:
        raise DocumentValidationError(
            "UNSUPPORTED_FILE", "File content is not a supported PDF, PNG, or JPEG"
        )

    if actual_mime not in settings.DOCUMENT_ALLOWED_MIME_TYPES:
        raise DocumentValidationError(
            "UNSUPPORTED_MIME", "Detected file type is not permitted"
        )
    if declared_mime_type and declared_mime_type.lower() != actual_mime:
        raise DocumentValidationError(
            "MIME_MISMATCH", "Declared MIME type does not match file content"
        )
    if page_count > settings.DOCUMENT_MAX_PAGE_COUNT:
        raise DocumentValidationError(
            "TOO_MANY_PAGES", "Document exceeds the configured page-count limit"
        )

    return ValidatedDocument(
        mime_type=actual_mime,
        extension=extension,
        page_count=page_count,
        sha256=hashlib.sha256(file_bytes).hexdigest(),
    )


def create_storage_key(document_type: str, extension: str) -> str:
    category = document_type.lower()
    if category not in {"prescription", "lab_report", "discharge_summary"}:
        raise DocumentValidationError(
            "INVALID_DOCUMENT_TYPE", "Unsupported document type"
        )
    year = datetime.now(timezone.utc).year
    return f"{category}/{year}/{uuid.uuid4()}{extension}"


def store_private_file(file_bytes: bytes, storage_key: str) -> Path:
    root = Path(settings.DOCUMENT_STORAGE_DIR).resolve()
    target = (root / storage_key).resolve()
    if root != target and root not in target.parents:
        raise DocumentValidationError(
            "UNSAFE_STORAGE_PATH", "Generated storage path escaped the private root"
        )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(file_bytes)
    return target


def load_private_file(storage_key: str) -> bytes:
    root = Path(settings.DOCUMENT_STORAGE_DIR).resolve()
    target = (root / storage_key).resolve()
    if root != target and root not in target.parents:
        raise DocumentValidationError(
            "UNSAFE_STORAGE_PATH", "Stored path escaped the private root"
        )
    return target.read_bytes()


def build_proposed_facts(
    document_id: str, ocr: OCRExtractionResult
) -> list[ExtractedFact]:
    facts: list[ExtractedFact] = []
    groups = (("MEDICATION", "medications"), ("LAB", "lab_observations"))
    for field_type, group_name in groups:
        for item in ocr.extracted_fields.get(group_name, []):
            metadata_keys = {"confidence", "source_text", "page", "bounding_box"}
            proposed: dict[str, Any] = {
                key: value for key, value in item.items() if key not in metadata_keys
            }
            field_name = (
                proposed.get("medicine_name") or proposed.get("test_name") or group_name
            )
            facts.append(
                ExtractedFact(
                    field_type=field_type,
                    field_name=str(field_name),
                    proposed_value=proposed,
                    original_source_text=str(item.get("source_text", "")),
                    document_id=document_id,
                    source_page=int(item.get("page", 1)),
                    bounding_box=item.get("bounding_box"),
                    ocr_confidence=float(item.get("confidence", ocr.confidence_score)),
                    extraction_confidence=float(
                        item.get("confidence", ocr.confidence_score)
                    ),
                    engine_name=ocr.provider_name,
                    engine_version=ocr.provider_version,
                    extractor_version="deterministic-medical-extractor/1.0",
                    status="NEEDS_REVIEW",
                )
            )
    return facts
