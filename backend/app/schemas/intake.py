from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

from app.schemas.clinical_state import ClinicalState
from app.schemas.question import QuestionDecision


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
    hospital_id: str = "hosp_district_01"
    doctor_id: str = "doc_001"
    workflow_type: Literal["GENERAL_CLINICAL", "AYUSH"] = "GENERAL_CLINICAL"
    language_code: str = "en"
    interaction_mode: Literal["VOICE", "TEXT", "TOUCH", "MIXED"] = "VOICE"


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


class IntakeSubmissionResponse(BaseModel):
    intake_session_id: str
    token: str
    status: str
    doctor_id: str
    submitted_at: datetime
    message: str


class IntakeSessionDetail(BaseModel):
    id: str
    token: str
    patient_id: str
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
    workflow_type: str
    language_code: str
    interaction_mode: str
    status: str
    question_count: int
    clinical_state: ClinicalState
    created_at: datetime
    submitted_at: datetime | None = None
