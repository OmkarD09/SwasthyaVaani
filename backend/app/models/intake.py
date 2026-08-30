import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Float, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class IntakeSession(Base):
    __tablename__ = "intake_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    token = Column(String, unique=True, nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False, index=True)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False, index=True)
    workflow_type = Column(String, default="GENERAL_CLINICAL")
    interaction_mode = Column(String, default="VOICE")
    language_code = Column(String, default="en")
    
    # Status Machine: NOT_STARTED, ACTIVE, NEEDS_REVIEW, READY_TO_SUBMIT, SUBMITTED, LIMITED_HISTORY, PATIENT_ABORTED
    status = Column(String, default="ACTIVE", index=True)
    current_question_index = Column(Integer, default=0)
    question_count = Column(Integer, default=0)
    
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    submitted_at = Column(DateTime, nullable=True, index=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    questions = relationship("QuestionEvent", back_populates="intake_session", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="intake_session", cascade="all, delete-orphan")
    clinical_states = relationship("ClinicalStateModel", back_populates="intake_session", cascade="all, delete-orphan")
    red_flags = relationship("RedFlagModel", back_populates="intake_session", cascade="all, delete-orphan")
    contradictions = relationship("ContradictionModel", back_populates="intake_session", cascade="all, delete-orphan")
    physician_review = relationship("PhysicianReviewModel", back_populates="intake_session", uselist=False)


class QuestionEvent(Base):
    __tablename__ = "question_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)
    question_text = Column(String, nullable=False)
    target_field = Column(String, nullable=False)
    decision_action = Column(String, default="ASK")  # ASK, STOP, ESCALATE
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    intake_session = relationship("IntakeSession", back_populates="questions")
    answer = relationship("Answer", back_populates="question_event", uselist=False)


class Answer(Base):
    __tablename__ = "answers"

    id = Column(String, primary_key=True, default=generate_uuid)
    question_event_id = Column(String, ForeignKey("question_events.id"), nullable=True)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=False, index=True)
    raw_text = Column(Text, nullable=False)
    normalized_text = Column(Text, nullable=True)
    input_mode = Column(String, default="VOICE")
    language_code = Column(String, default="en")
    audio_duration_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    intake_session = relationship("IntakeSession", back_populates="answers")
    question_event = relationship("QuestionEvent", back_populates="answer")


class ClinicalStateModel(Base):
    __tablename__ = "clinical_states"

    id = Column(String, primary_key=True, default=generate_uuid)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=False, index=True)
    version = Column(Integer, default=1)
    state_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    intake_session = relationship("IntakeSession", back_populates="clinical_states")
