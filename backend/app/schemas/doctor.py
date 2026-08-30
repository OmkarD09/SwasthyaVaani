from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from app.schemas.clinical_state import ClinicalState, RedFlag, Contradiction, Medication, Investigation


class DoctorQueueItem(BaseModel):
    intake_session_id: str
    token: str
    patient_id: str
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    chief_complaint: str
    language_code: str
    workflow_type: str
    status: Literal["WAITING", "HISTORY_READY", "PRIORITY_REVIEW", "IN_REVIEW", "CONFIRMED"]
    status_tone: Literal["teal", "amber", "red"] = "amber"
    priority: Literal["Priority", "Routine"] = "Routine"
    has_red_flags: bool = False
    submitted_at: datetime
    wait_time_minutes: int = 0


class DoctorPatientDetail(BaseModel):
    intake_session_id: str
    token: str
    patient_id: str
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    hospital_name: str
    doctor_name: str
    workflow_type: str
    language_code: str
    status: str
    review_status: Literal["AI_DRAFT", "NEEDS_VERIFICATION", "PHYSICIAN_CONFIRMED"] = "AI_DRAFT"
    clinical_state: ClinicalState
    documents: List[Dict[str, Any]] = Field(default_factory=list)
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    clinician_notes: Optional[str] = None
    submitted_at: datetime


class PhysicianEditPayload(BaseModel):
    field_name: str
    old_value: Any
    new_value: Any
    reason: Optional[str] = None


class PhysicianConfirmRequest(BaseModel):
    intake_session_id: Optional[str] = None
    notes: Optional[str] = None
    edits: List[PhysicianEditPayload] = Field(default_factory=list)
    generate_fhir: bool = True


class PhysicianConfirmResponse(BaseModel):
    intake_session_id: str
    review_id: str
    confirmed_at: datetime
    status: str = "PHYSICIAN_CONFIRMED"
    fhir_bundle_id: Optional[str] = None
    message: str
