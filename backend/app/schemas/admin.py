from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# Dashboard Overview Schemas
# -------------------------------------------------------------

class StatTrend(BaseModel):
    label: str
    value: int
    secondary_value: Optional[int] = None


class ComplaintFrequency(BaseModel):
    complaint: str
    count: int
    category: str


class AdminDashboardStats(BaseModel):
    total_patients: int
    active_patients: int
    new_patients_today: int
    total_doctors: int
    doctors_available_now: int
    appointments_today: int
    completed_consultations: int
    pending_consultations: int
    ai_assessments_today: int
    critical_cases_count: int
    reports_pending_review: int
    intake_volume_trend: List[StatTrend]
    critical_cases_trend: List[StatTrend]
    common_complaints: List[ComplaintFrequency]


# -------------------------------------------------------------
# AI Monitoring Oversight Schemas (Clinical Differentiator)
# -------------------------------------------------------------

class AICaseOversightItem(BaseModel):
    intake_session_id: str
    token: str
    patient_id: str
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    chief_complaint: str
    symptoms: List[str]
    severity_score: int  # 1-10
    suggested_department: str
    red_flags: List[str]
    recommended_handoff: str
    ai_confidence: float
    status: str
    started_at: datetime
    duration_minutes: float
    workflow_type: str


class AIOverrideBreakdown(BaseModel):
    category: str
    total_cases: int
    accepted_count: int
    modified_count: int
    overridden_count: int
    override_rate_pct: float


class AIMonitoringSummary(BaseModel):
    total_assessments: int
    active_conversations: int
    completed_conversations: int
    abandoned_conversations: int
    average_duration_minutes: float
    summary_accepted_pct: float
    summary_modified_pct: float
    summary_overridden_pct: float
    cases: List[AICaseOversightItem]
    override_breakdown: List[AIOverrideBreakdown]
    safety_disclaimer: str = (
        "Clinical Safety Notice: SwasthyaVaani AI provides structured pre-consultation intake support. "
        "The consulting physician remains the sole authoritative clinical decision-maker."
    )


# -------------------------------------------------------------
# Critical / Emergency Cases Schemas
# -------------------------------------------------------------

class EmergencyCaseItem(BaseModel):
    intake_session_id: str
    token: str
    patient_id: str
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    chief_complaint: str
    severity: str  # Critical, High, Medium, Low
    severity_tone: str  # red, amber, yellow, slate
    wait_time_minutes: int
    assigned_department: str
    assigned_doctor_name: Optional[str] = None
    escalation_reason: str
    red_flag_rule: Optional[str] = None
    associated_symptoms: List[str] = []
    status: str
    timestamp: datetime


# -------------------------------------------------------------
# Audit Logs Schemas
# -------------------------------------------------------------

class AuditEventResponse(BaseModel):
    id: str
    timestamp: datetime
    actor_user_id: Optional[str] = None
    actor_role: str
    event_type: str
    resource_type: str
    resource_id: str
    metadata: Optional[Dict[str, Any]] = None


# -------------------------------------------------------------
# Doctor & Department Onboarding Schemas
# -------------------------------------------------------------

class DoctorOnboardingCreate(BaseModel):
    display_name: str = Field(..., min_length=2)
    specialization: str
    department_id: str
    hospital_id: Optional[str] = None
    license_identifier: Optional[str] = None
    contact: Optional[str] = None
    working_hours: Optional[str] = "09:00 AM - 05:00 PM"


class DoctorOnboardingUpdate(BaseModel):
    display_name: Optional[str] = None
    specialization: Optional[str] = None
    department_id: Optional[str] = None
    license_identifier: Optional[str] = None
    contact: Optional[str] = None
    working_hours: Optional[str] = None
    is_active: Optional[bool] = None


class DoctorResponse(BaseModel):
    id: str
    hospital_id: str
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    display_name: str
    specialization: str
    license_identifier: Optional[str] = None
    contact: Optional[str] = None
    working_hours: Optional[str] = None
    is_active: bool
    created_at: datetime


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2)
    code: str = Field(..., min_length=2)
    hospital_id: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    id: str
    hospital_id: str
    name: str
    code: str
    active_doctors_count: int
    patient_cases_count: int
    is_active: bool
    created_at: datetime


# -------------------------------------------------------------
# Staff & RBAC Management Schemas
# -------------------------------------------------------------

class StaffUserCreate(BaseModel):
    email: str
    display_name: str
    role: str = "HOSPITAL_ADMIN"  # SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, RECEPTIONIST, LAB_STAFF
    phone: Optional[str] = None


class StaffUserRoleUpdate(BaseModel):
    role: str
    is_active: Optional[bool] = None


class StaffUserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    display_name: str
    role: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime


class TestCaseSummary(BaseModel):
    id: str
    name: str
    category: str
    status: str  # "PASSED" | "FAILED"
    checks_performed: int
    duration_seconds: float
    friendly_message: str
    error_reference_id: Optional[str] = None


class QATestRunResult(BaseModel):
    total_tests: int
    passed_tests: int
    failed_tests: int
    skipped_tests: int
    execution_duration_seconds: float
    success: bool
    timestamp: datetime
    suites: List[TestCaseSummary] = []
    output_log: Optional[str] = None


class SystemHealthProbe(BaseModel):
    database: Dict[str, Any]
    llm_service: Dict[str, Any]
    speech_service: Dict[str, Any]
    ocr_service: Dict[str, Any]
    abdm_gateway: Dict[str, Any]
    status: str
