import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class KnowledgeDocument(Base):
    """Authoritative or approved clinical reference knowledge document."""
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    source = Column(String, nullable=False)  # e.g., "AYUSH National Standard Clinical Protocol"
    source_type = Column(String, nullable=False, default="AYUSH_REFERENCE")  # AYUSH_REFERENCE, CLINICAL_REFERENCE, QUESTION_BANK, WORKFLOW_GUIDANCE
    version = Column(String, default="1.0")
    language = Column(String, default="en")  # en, hi, mr, all
    workflow = Column(String, default="AYUSH")  # AYUSH, GENERAL_CLINICAL, ALL
    status = Column(String, default="ACTIVE")  # ACTIVE, ARCHIVED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    """Semantic chunk belonging to a knowledge document with vector embeddings."""
    __tablename__ = "knowledge_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String, default="en")
    workflow = Column(String, default="AYUSH")
    topic = Column(String, nullable=False)  # e.g., "agni_appetite", "koshtha_bowel", "dosha_vitiation"
    source = Column(String, nullable=False)
    version = Column(String, default="1.0")
    embedding = Column(JSON, nullable=True)  # List[float] embedding array
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("KnowledgeDocument", back_populates="chunks")
