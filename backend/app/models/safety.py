import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class RedFlagModel(Base):
    __tablename__ = "red_flags"

    id = Column(String, primary_key=True, default=generate_uuid)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=False, index=True)
    rule_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    severity = Column(String, default="PRIORITY")
    evidence_json = Column(JSON, nullable=True)
    status = Column(String, default="OPEN")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    intake_session = relationship("IntakeSession", back_populates="red_flags")


class ContradictionModel(Base):
    __tablename__ = "contradictions"

    id = Column(String, primary_key=True, default=generate_uuid)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=False, index=True)
    field_name = Column(String, nullable=False)
    value_a_json = Column(JSON, nullable=False)
    source_a_json = Column(JSON, nullable=False)
    value_b_json = Column(JSON, nullable=False)
    source_b_json = Column(JSON, nullable=False)
    status = Column(String, default="OPEN")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    intake_session = relationship("IntakeSession", back_populates="contradictions")
