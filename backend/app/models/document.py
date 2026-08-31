import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class DocumentModel(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    intake_session_id = Column(
        String, ForeignKey("intake_sessions.id"), nullable=True, index=True
    )
    file_name = Column(String, nullable=False)
    storage_object_id = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)
    page_count = Column(Integer, nullable=False, default=1)
    document_type = Column(
        String, default="PRESCRIPTION"
    )  # PRESCRIPTION, LAB_REPORT, DISCHARGE_SUMMARY
    status = Column(String, default="PENDING", index=True)
    failure_code = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime, nullable=True)

    extractions = relationship(
        "DocumentExtractionModel",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class DocumentExtractionModel(Base):
    __tablename__ = "document_extractions"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    field_type = Column(String, nullable=False)  # MEDICATION, LAB, DIAGNOSIS
    field_name = Column(String, nullable=False)
    value_json = Column(JSON, nullable=False)
    confidence = Column(Integer, default=0)  # Backward-compatible percentage
    ocr_confidence = Column(Float, nullable=False)
    extraction_confidence = Column(Float, nullable=False)
    source_page = Column(Integer, default=1)
    source_region_json = Column(JSON, nullable=True)
    original_source_text = Column(Text, nullable=False)
    ocr_engine = Column(String, nullable=False)
    ocr_engine_version = Column(String, nullable=False)
    extractor_version = Column(String, nullable=False)
    status = Column(String, default="NEEDS_REVIEW")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("DocumentModel", back_populates="extractions")
