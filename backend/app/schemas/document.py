from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from app.schemas.clinical_state import Provenance


class DocumentUploadResponse(BaseModel):
    document_id: str
    file_name: str
    file_size: int
    mime_type: str
    storage_url: Optional[str] = None
    status: Literal["UPLOADED", "OCR_PROCESSING", "EXTRACTED", "FAILED"] = "UPLOADED"
    uploaded_at: datetime


class ExtractedFact(BaseModel):
    field_type: Literal["MEDICATION", "LAB", "DIAGNOSIS", "DATE", "PROCEDURE"]
    field_name: str
    value: Any
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    source_page: int = 1
    source_region: Optional[Dict[str, Any]] = None
    status: Literal["EXTRACTED", "NEEDS_REVIEW", "CONFIRMED"] = "EXTRACTED"


class DocumentExtractionResult(BaseModel):
    document_id: str
    status: Literal["EXTRACTED", "NEEDS_REVIEW", "FAILED"]
    extracted_facts: List[ExtractedFact] = Field(default_factory=list)
    raw_ocr_text: Optional[str] = None
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
