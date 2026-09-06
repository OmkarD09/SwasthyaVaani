import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class AyushAssessmentModel(Base):
    __tablename__ = "ayush_assessments"

    id = Column(String, primary_key=True, default=generate_uuid)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    system = Column(String, default="AYURVEDA", nullable=False)
    status = Column(String, default="INCOMPLETE", nullable=False, index=True)
    assessment_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    intake_session = relationship("IntakeSession", back_populates="ayush_assessment")
