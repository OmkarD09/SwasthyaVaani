from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from app.schemas.fhir import FHIRBundle


class ABHAVerifyRequest(BaseModel):
    abha_id: str = Field(..., description="14-digit ABHA number or ABHA address (e.g. 91-1234-5678-9012 or patient@abdm)")
    auth_method: Literal["OTP", "DEMOGRAPHICS", "MOCK"] = "MOCK"


class ABHAVerifyResponse(BaseModel):
    status: Literal["VERIFIED", "FAILED", "PENDING_OTP"]
    abha_number: str
    abha_address: str
    patient_name: str
    gender: str
    year_of_birth: int
    mobile: str
    state: str
    district: str
    verification_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str


class ABDMValidationIssue(BaseModel):
    severity: Literal["error", "warning", "information"]
    code: str
    location: str
    details: str


class ABDMValidationReport(BaseModel):
    is_valid: bool
    bundle_id: str
    profile: str = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"
    total_resources: int
    resource_breakdown: Dict[str, int]
    issues: List[ABDMValidationIssue] = Field(default_factory=list)
    validated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ABDMHIPPushRequest(BaseModel):
    intake_session_id: str
    consent_id: str = "CONSENT-ABDM-2026-001"
    destination_gateway_url: Optional[str] = None


class ABDMHIPPushResponse(BaseModel):
    transaction_id: str
    status: Literal["QUEUED", "TRANSFERRED", "FAILED"] = "TRANSFERRED"
    bundle_id: str
    recipient_hip_id: str = "IN-MH-DISTRICT-HOSP-01"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str
