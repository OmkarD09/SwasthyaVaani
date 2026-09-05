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
    abha_id: Optional[str] = None
    abha_status: Optional[str] = None
    documents_count: Optional[int] = 0


class DoctorPatientDetail(BaseModel):
    intake_session_id: str
    token: Optional[str] = ""
    patient_id: Optional[str] = ""
    patient_name: Optional[str] = "Patient"
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    abha_id: Optional[str] = None
    abha_address: Optional[str] = None
    abha_status: Optional[str] = "UNVERIFIED"
    consent_recorded: bool = False
    hospital_name: Optional[str] = "Hospital not recorded"
    doctor_name: Optional[str] = "Clinician not recorded"
    workflow_type: Optional[str] = "GENERAL"
    language_code: Optional[str] = "en"
    status: Optional[str] = "WAITING"
    review_status: Literal["AI_DRAFT", "NEEDS_VERIFICATION", "PHYSICIAN_CONFIRMED"] = "AI_DRAFT"
    clinical_state: ClinicalState
    documents: List[Dict[str, Any]] = Field(default_factory=list)
    medical_records: List[Dict[str, Any]] = Field(default_factory=list)
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    clinician_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None


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
