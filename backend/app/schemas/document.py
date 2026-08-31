from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

DocumentStatus = Literal[
    "PENDING",
    "UPLOADED",
    "VALIDATED",
    "PROCESSING",
    "EXTRACTED",
    "NEEDS_REVIEW",
    "APPROVED",
    "CORRECTED",
    "REJECTED",
    "REJECTED_FILE",
    "PROCESSING_FAILED",
]


class DocumentUploadResponse(BaseModel):
    document_id: str
    file_name: str
    file_size: int
    mime_type: str
    storage_path: str
    file_hash: str
    page_count: int
    status: DocumentStatus = "PENDING"
    uploaded_at: datetime


class ExtractedFact(BaseModel):
    field_type: Literal["MEDICATION", "LAB"]
    field_name: str
    proposed_value: Any
    original_source_text: str
    document_id: str
    source_page: int = 1
    bounding_box: list[float] | None = None
    ocr_confidence: float = Field(ge=0.0, le=1.0)
    extraction_confidence: float = Field(ge=0.0, le=1.0)
    engine_name: str
    engine_version: str
    extractor_version: str
    status: Literal["NEEDS_REVIEW"] = "NEEDS_REVIEW"


class DocumentExtractionResult(BaseModel):
    document_id: str
    status: Literal["NEEDS_REVIEW", "PROCESSING_FAILED"]
    extracted_facts: list[ExtractedFact] = Field(default_factory=list)
    raw_ocr_text: str | None = None
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentFieldReviewRequest(BaseModel):
    action: Literal["APPROVED", "CORRECTED", "REJECTED"]
    corrected_value: Any | None = None
    reason: str = Field(min_length=1, max_length=500)


class DocumentFieldReviewRecord(BaseModel):
    extraction_id: str
    reviewer_id: str
    previous_status: Literal["NEEDS_REVIEW"]
    new_status: Literal["APPROVED", "CORRECTED", "REJECTED"]
    original_proposed_value: Any
    corrected_value: Any | None = None
    reason: str
    reviewed_at: datetime
