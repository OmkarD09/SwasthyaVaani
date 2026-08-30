import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class DocumentModel(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=True, index=True)
    file_name = Column(String, nullable=False)
    storage_object_id = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    document_type = Column(String, default="PRESCRIPTION")  # PRESCRIPTION, LAB_REPORT, DISCHARGE_SUMMARY
    status = Column(String, default="UPLOADED")            # UPLOADED, OCR_COMPLETED, EXTRACTED, FAILED
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime, nullable=True)


class DocumentExtractionModel(Base):
    __tablename__ = "document_extractions"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    field_type = Column(String, nullable=False)  # MEDICATION, LAB, DIAGNOSIS
    field_name = Column(String, nullable=False)
    value_json = Column(JSON, nullable=False)
    confidence = Column(Integer, default=90)
    source_page = Column(Integer, default=1)
    status = Column(String, default="EXTRACTED")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
