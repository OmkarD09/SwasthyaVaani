from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, field_validator

from app.schemas.clinical_state import ClinicalState
from app.schemas.question import QuestionDecision
from app.core.datetime_utils import ensure_utc


class IntakeCreateRequest(BaseModel):
    patient_id: str | None = None
    patient_name: str | None = "Patient"
    patient_age: int | None = None
    patient_gender: str | None = None
    phone: str | None = None
    date_of_birth: str | None = None
    abha_id: str | None = None
    abha_address: str | None = None
    consent_given: bool = False
    consent_language: str | None = None
    consent_timestamp: datetime | str | None = None
    consent_method: str | None = "AUDIO_GUIDED"
    consent_version: str | None = "v1.0"
    hospital_id: str = "hosp_district_01"
    doctor_id: str = "doc_001"
    department_code: str | None = "AUTO"
    workflow_type: Literal["GENERAL_CLINICAL", "AYUSH"] = "GENERAL_CLINICAL"
    language_code: str = "en"
    interaction_mode: Literal["VOICE", "TEXT", "TOUCH", "MIXED"] = "VOICE"
    chief_complaint: str | None = None
    symptoms: list[str] | None = None
    duration: str | None = None
    severity: str | int | None = None
    medical_history: str | None = None
    clinical_state: dict[str, Any] | None = None
    conversation_history: list[dict[str, Any]] | None = None
    submit_now: bool = False


class AnswerSubmitRequest(BaseModel):
    question_event_id: str | None = None
    raw_text: str
    input_mode: Literal["VOICE", "TEXT", "TOUCH"] = "VOICE"
    language_code: str = "en"
    audio_duration_seconds: float | None = None


class AnswerSubmitResponse(BaseModel):
    answer_id: str
    intake_session_id: str
    question_event_id: str | None = None
    extracted_facts: dict[str, Any]
    clinical_state: ClinicalState
    decision: QuestionDecision
    next_question_event_id: str | None = None


class VoiceAnswerSubmitResponse(BaseModel):
    answer_id: str
    intake_session_id: str
    question_event_id: str | None = None
    transcript_text: str
    detected_language: str
    audio_base64: str | None = None
    extracted_facts: dict[str, Any]
    clinical_state: ClinicalState
    decision: QuestionDecision
    next_question_event_id: str | None = None


class IntakeReviewUpdateRequest(BaseModel):
    corrected_state: ClinicalState
    patient_notes: str | None = None


class IntakeAbortRequest(BaseModel):
    reason: Literal["IDLE_TIMEOUT", "USER_CANCELLED", "PRIVACY_PURGE", "OTHER"] | str = "IDLE_TIMEOUT"


class IntakeAbortResponse(BaseModel):
    status: str = "SESSION_PURGED"
    intake_session_id: str
    previous_status: str | None = None
    reason: str
    purged_at: str


class IntakeSubmissionResponse(BaseModel):
    intake_session_id: str
    token: str
    patient_id: str | None = None
    patient_display_id: str | None = None
    display_id: str | None = None
    status: str
    doctor_id: str
    department_id: str | None = None
    department_code: str | None = None
    submitted_at: datetime
    message: str

    @field_validator("submitted_at", mode="before")
    @classmethod
    def validate_utc_timestamps(cls, v):
        return ensure_utc(v)


class IntakeSessionDetail(BaseModel):
    id: str
    token: str
    patient_id: str
    patient_display_id: str | None = None
    display_id: str | None = None
    patient_name: str
    patient_age: int | None = None
    patient_gender: str | None = None
    phone: str | None = None
    date_of_birth: str | None = None
    abha_id: str | None = None
    abha_address: str | None = None
    abha_status: str = "UNVERIFIED"
    consent_recorded: bool = False
    hospital_id: str
    doctor_id: str
    department_id: str | None = None
    department_code: str | None = None
    workflow_type: str
    language_code: str
    interaction_mode: str
    status: str
    question_count: int
    clinical_state: ClinicalState
    created_at: datetime
    submitted_at: datetime | None = None

    @field_validator("created_at", "submitted_at", mode="before")
    @classmethod
    def validate_utc_timestamps(cls, v):
        return ensure_utc(v)
