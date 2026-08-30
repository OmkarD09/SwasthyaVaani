from datetime import datetime
from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.clinical_state import ClinicalState
from app.schemas.question import QuestionDecision


class IntakeCreateRequest(BaseModel):
    patient_id: Optional[str] = None
    patient_name: str = "Demo Patient"
    patient_age: Optional[int] = 35
    patient_gender: Optional[str] = "Other"
    hospital_id: str = "hosp_district_01"
    doctor_id: str = "doc_001"
    workflow_type: Literal["GENERAL_CLINICAL", "AYUSH"] = "GENERAL_CLINICAL"
    language_code: str = "en"
    interaction_mode: Literal["VOICE", "TEXT", "TOUCH", "MIXED"] = "VOICE"
    consent_given: bool = True
    abha_id: Optional[str] = None


class AnswerSubmitRequest(BaseModel):
    question_event_id: Optional[str] = None
    raw_text: str
    input_mode: Literal["VOICE", "TEXT", "TOUCH"] = "VOICE"
    language_code: str = "en"
    audio_duration_seconds: Optional[float] = None


class AnswerSubmitResponse(BaseModel):
    answer_id: str
    intake_session_id: str
    extracted_facts: Dict[str, Any]
    clinical_state: ClinicalState
    decision: QuestionDecision


class IntakeReviewUpdateRequest(BaseModel):
    corrected_state: ClinicalState
    patient_notes: Optional[str] = None


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
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    hospital_id: str
    doctor_id: str
    workflow_type: str
    language_code: str
    interaction_mode: str
    status: str
    question_count: int
    clinical_state: ClinicalState
    created_at: datetime
    submitted_at: Optional[datetime] = None
