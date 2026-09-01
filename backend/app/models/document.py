import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
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
    ocr_runs = relationship(
        "DocumentOCRRunModel",
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


class DocumentOCRRunModel(Base):
    """One normalized OCR execution, separate from interpreted clinical facts."""

    __tablename__ = "document_ocr_runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    provider_name = Column(String, nullable=False)
    provider_version = Column(String, nullable=False)
    aggregate_confidence = Column(Float, nullable=False)
    pages_processed = Column(Integer, nullable=False)
    raw_text = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("DocumentModel", back_populates="ocr_runs")
    blocks = relationship(
        "DocumentOCREvidenceModel",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="DocumentOCREvidenceModel.block_index",
    )


class DocumentOCREvidenceModel(Base):
    """Ordered source evidence emitted by OCR; never a confirmed clinical fact."""

    __tablename__ = "document_ocr_evidence"
    __table_args__ = (
        UniqueConstraint("ocr_run_id", "block_index", name="uq_ocr_evidence_run_block"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    ocr_run_id = Column(
        String, ForeignKey("document_ocr_runs.id"), nullable=False, index=True
    )
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    block_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    page_number = Column(Integer, nullable=False, default=1)
    bounding_box_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    run = relationship("DocumentOCRRunModel", back_populates="blocks")


class DocumentCandidateSetModel(Base):
    """One active semantic extraction set for an OCR run/provider/model."""

    __tablename__ = "document_candidate_sets"
    __table_args__ = (
        UniqueConstraint(
            "ocr_run_id",
            "provider_name",
            "model_name",
            name="uq_candidate_set_run_provider_model",
        ),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    ocr_run_id = Column(
        String, ForeignKey("document_ocr_runs.id"), nullable=False, index=True
    )
    provider_name = Column(String, nullable=False)
    model_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    candidates = relationship(
        "DocumentCandidateModel",
        back_populates="candidate_set",
        cascade="all, delete-orphan",
    )


class DocumentCandidateModel(Base):
    """Untrusted structured candidate awaiting physician review."""

    __tablename__ = "document_candidates"

    id = Column(String, primary_key=True, default=generate_uuid)
    candidate_set_id = Column(
        String, ForeignKey("document_candidate_sets.id"), nullable=False, index=True
    )
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    ocr_run_id = Column(
        String, ForeignKey("document_ocr_runs.id"), nullable=False, index=True
    )
    candidate_type = Column(String, nullable=False)
    value_json = Column(JSON, nullable=False)
    extraction_confidence = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="NEEDS_REVIEW")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    candidate_set = relationship("DocumentCandidateSetModel", back_populates="candidates")
    evidence_links = relationship(
        "DocumentCandidateEvidenceLinkModel",
        back_populates="candidate",
        cascade="all, delete-orphan",
    )


class DocumentCandidateEvidenceLinkModel(Base):
    """Relational provenance from a candidate to its supporting OCR blocks."""

    __tablename__ = "document_candidate_evidence_links"

    candidate_id = Column(
        String, ForeignKey("document_candidates.id"), primary_key=True
    )
    evidence_id = Column(
        String, ForeignKey("document_ocr_evidence.id"), primary_key=True
    )

    candidate = relationship("DocumentCandidateModel", back_populates="evidence_links")
