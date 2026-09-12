from datetime import datetime, timezone
from typing import Any, Literal
from pydantic import BaseModel, Field


class ABHAVerifyRequest(BaseModel):
    abha_id: str = Field(
        ...,
        description="14-digit ABHA number or ABHA address (e.g. 91-1234-5678-9012 or patient@abdm)",
    )
    auth_method: Literal["OTP", "DEMOGRAPHICS", "MOCK", "MOBILE_OTP"] = "MOCK"


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
    gateway_mode: str = "simulation"
    message: str


class ABDMGatewayStatusResponse(BaseModel):
    status: str = "ONLINE"
    gateway_mode: Literal["sandbox", "simulation"] | str
    base_url: str
    is_authenticated: bool
    active_facility_id: str
    hip_id: str
    ping_latency_ms: float
    message: str | None = None


class ABDMAuthInitRequest(BaseModel):
    abha_id: str = Field(..., description="14-digit ABHA number or ABHA address")
    auth_mode: Literal["MOBILE_OTP", "DEMO", "AADHAAR_OTP"] = "MOBILE_OTP"


class ABDMAuthInitResponse(BaseModel):
    txn_id: str
    status: Literal["OTP_SENT", "FAILED"] = "OTP_SENT"
    auth_mode: str = "MOBILE_OTP"
    gateway_mode: str = "simulation"
    masked_mobile: str | None = None
    message: str


class ABDMAuthConfirmRequest(BaseModel):
    txn_id: str
    otp: str = Field(..., description="6-digit OTP code")


class ABDMAuthConfirmResponse(BaseModel):
    status: Literal["VERIFIED", "FAILED"]
    abha_number: str = ""
    abha_address: str = ""
    patient_name: str = ""
    gender: str = ""
    year_of_birth: int = 1990
    mobile: str = ""
    state: str = ""
    district: str = ""
    auth_mode: str = "MOBILE_OTP"
    verification_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    gateway_mode: str = "simulation"
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
    resource_breakdown: dict[str, int]
    issues: list[ABDMValidationIssue] = Field(default_factory=list)
    validated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ABDMHIPPushRequest(BaseModel):
    intake_session_id: str
    consent_id: str = "CONSENT-ABDM-2026-001"
    destination_gateway_url: str | None = None


class ABDMHIPPushResponse(BaseModel):
    transaction_id: str
    status: Literal["QUEUED", "TRANSFERRED", "FAILED"] = "TRANSFERRED"
    bundle_id: str
    recipient_hip_id: str = "SWASTHYA_VAANI_HIP_01"
    facility_id: str | None = None
    transfer_id: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    gateway_mode: str = "simulation"
    message: str
