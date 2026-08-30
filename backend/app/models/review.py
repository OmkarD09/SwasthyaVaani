import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class PhysicianReviewModel(Base):
    __tablename__ = "physician_reviews"

    id = Column(String, primary_key=True, default=generate_uuid)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), unique=True, nullable=False, index=True)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False, index=True)
    status = Column(String, default="NOT_REVIEWED")  # NOT_REVIEWED, IN_REVIEW, EDITED, CONFIRMED
    notes = Column(Text, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    intake_session = relationship("IntakeSession", back_populates="physician_review")
    edits = relationship("PhysicianEditModel", back_populates="review", cascade="all, delete-orphan")


class PhysicianEditModel(Base):
    __tablename__ = "physician_edits"

    id = Column(String, primary_key=True, default=generate_uuid)
    physician_review_id = Column(String, ForeignKey("physician_reviews.id"), nullable=False, index=True)
    field_name = Column(String, nullable=False)
    old_value_json = Column(JSON, nullable=True)
    new_value_json = Column(JSON, nullable=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    review = relationship("PhysicianReviewModel", back_populates="edits")


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    actor_user_id = Column(String, nullable=True)
    actor_role = Column(String, default="SYSTEM")
    event_type = Column(String, nullable=False, index=True)  # INTAKE_STARTED, SUBMITTED, CONFIRMED
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
