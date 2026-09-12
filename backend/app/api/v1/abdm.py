import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.ayush import AyushAssessmentModel
from app.models.intake import ClinicalStateModel, IntakeSession
from app.models.review import AuditEventModel, PhysicianReviewModel
from app.models.user import Doctor, Patient
from app.schemas.abdm import (
    ABDMAuthConfirmRequest,
    ABDMAuthConfirmResponse,
    ABDMAuthInitRequest,
    ABDMAuthInitResponse,
    ABDMGatewayStatusResponse,
    ABDMHIPPushRequest,
    ABDMHIPPushResponse,
    ABDMValidationReport,
    ABHAVerifyRequest,
    ABHAVerifyResponse,
)
from app.schemas.ayush import AyushAssessment
from app.schemas.clinical_state import ClinicalState
from app.services.abdm.gateway_factory import get_abdm_gateway
from app.services.fhir.abdm_validator import validate_nrc_abdm_bundle
from app.services.fhir.mapper import map_clinical_state_to_fhir_r4

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/abdm", tags=["ABDM Interoperability (HIP)"])


@router.get("/gateway/status", response_model=ABDMGatewayStatusResponse)
async def get_gateway_status():
    """
    Returns the active ABDM Gateway status, mode (sandbox vs simulation),
    ping latency, and facility credentials.
    """
    gateway = get_abdm_gateway()
    health = await gateway.check_gateway_health()
    return ABDMGatewayStatusResponse(
        status=health.get("status", "ONLINE"),
        gateway_mode=health.get("gateway_mode", settings.ABDM_GATEWAY_MODE),
        base_url=health.get("base_url", settings.ABDM_GATEWAY_BASE_URL),
        is_authenticated=health.get("is_authenticated", True),
        active_facility_id=health.get("active_facility_id", settings.ABDM_FACILITY_ID),
        hip_id=health.get("hip_id", settings.ABDM_HIP_ID),
        ping_latency_ms=health.get("ping_latency_ms", 1.0),
        message=health.get("error"),
    )


@router.post("/abha/auth/init", response_model=ABDMAuthInitResponse)
async def initiate_abha_authentication(req: ABDMAuthInitRequest):
    """
    Initiates 2-step ABHA authentication by requesting an OTP.
    Dispatched via active ABDM Gateway Adapter (Live Sandbox vs High-Availability Simulator).
    """
    clean_id = req.abha_id.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="ABHA ID cannot be empty.")
    gateway = get_abdm_gateway()
    res = await gateway.init_auth(clean_id, req.auth_mode)
    return ABDMAuthInitResponse(**res)


@router.post("/abha/auth/confirm", response_model=ABDMAuthConfirmResponse)
async def confirm_abha_authentication(req: ABDMAuthConfirmRequest):
    """
    Confirms 6-digit OTP and returns verified demographic profile.
    Dispatched via active ABDM Gateway Adapter.
    """
    if not req.txn_id or not req.otp:
        raise HTTPException(status_code=400, detail="Transaction ID and OTP are required.")
    gateway = get_abdm_gateway()
    res = await gateway.confirm_auth(req.txn_id.strip(), req.otp.strip())
    if res.get("status") == "FAILED":
        raise HTTPException(status_code=400, detail=res.get("message", "OTP verification failed."))
    return ABDMAuthConfirmResponse(**res)


@router.post("/abha/verify", response_model=ABHAVerifyResponse)
async def verify_abha_identity(req: ABHAVerifyRequest):
    """
    Direct ABHA Verification & Profile Retrieval via active gateway.
    Accepts 14-digit ABHA Number or ABHA Address (e.g. name@abdm).
    """
    clean_id = req.abha_id.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="ABHA ID cannot be empty")

    gateway = get_abdm_gateway()
    res = await gateway.verify_abha(clean_id)
    return ABHAVerifyResponse(**res)


@router.get("/bundle/{intake_id}")
def get_abdm_compliant_bundle(intake_id: str, preview: bool = False, db: Session = Depends(get_db)):
    """
    Generates and returns an official NRCES India Core FHIR R4 Bundle
    along with its real-time compliance validation report.
    Supports preview=True for pre-confirmation inspection in Doctor Workstation.
    """
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    if not preview:
        review = db.query(PhysicianReviewModel).filter(PhysicianReviewModel.intake_session_id == intake_id).first()
        if not review or review.status != "CONFIRMED":
            raise HTTPException(
                status_code=400,
                detail="Clinical history must be confirmed by attending physician before ABDM FHIR export."
            )

    clinical_state_record = (
        db.query(ClinicalStateModel)
        .filter(ClinicalStateModel.intake_session_id == intake_id)
        .order_by(ClinicalStateModel.version.desc())
        .first()
    )
    if not clinical_state_record:
        raise HTTPException(status_code=404, detail="Clinical state not found")

    state = ClinicalState(**clinical_state_record.state_json)
    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == session.doctor_id).first()

    ayush_assessment = None
    ayush_record = (
        db.query(AyushAssessmentModel)
        .filter(AyushAssessmentModel.intake_session_id == session.id)
        .first()
    )
    if ayush_record and ayush_record.assessment_json:
        try:
            ayush_assessment = AyushAssessment(**ayush_record.assessment_json)
        except Exception:
            ayush_assessment = None

    fhir_bundle = map_clinical_state_to_fhir_r4(
        intake_session_id=session.id,
        patient_id=session.patient_id,
        patient_name=patient.display_name if patient else "Patient",
        doctor_name=doctor.display_name if doctor else "Attending Physician",
        state=state,
        ayush_assessment=ayush_assessment,
    )

    bundle_dict = fhir_bundle.model_dump()
    validation_report = validate_nrc_abdm_bundle(bundle_dict)

    return {
        "status": "VALIDATED" if validation_report.is_valid else "VALIDATION_WARNINGS",
        "intake_session_id": session.id,
        "token": session.token,
        "validation_report": validation_report,
        "fhir_bundle": bundle_dict
    }


@router.post("/validate", response_model=ABDMValidationReport)
def validate_external_fhir_bundle(bundle: dict[str, Any]):
    """
    Validates any FHIR R4 bundle against NRCES India Core (NDHM/ABDM) Document specifications.
    """
    return validate_nrc_abdm_bundle(bundle)


@router.post("/hip/push", response_model=ABDMHIPPushResponse)
async def push_record_to_abdm_gateway(req: ABDMHIPPushRequest, db: Session = Depends(get_db)):
    """
    Validates generated FHIR R4 Bundle and dispatches transfer via the ABDM Gateway Adapter (M2 compliance).
    Records an immutable audit event in audit_events upon transfer.
    """
    session = db.query(IntakeSession).filter(IntakeSession.id == req.intake_session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    clinical_state_record = (
        db.query(ClinicalStateModel)
        .filter(ClinicalStateModel.intake_session_id == session.id)
        .order_by(ClinicalStateModel.version.desc())
        .first()
    )
    if not clinical_state_record:
        raise HTTPException(status_code=404, detail="Clinical state not found")

    state = ClinicalState(**clinical_state_record.state_json)
    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == session.doctor_id).first()

    ayush_assessment = None
    ayush_record = (
        db.query(AyushAssessmentModel)
        .filter(AyushAssessmentModel.intake_session_id == session.id)
        .first()
    )
    if ayush_record and ayush_record.assessment_json:
        try:
            ayush_assessment = AyushAssessment(**ayush_record.assessment_json)
        except Exception:
            ayush_assessment = None

    fhir_bundle = map_clinical_state_to_fhir_r4(
        intake_session_id=session.id,
        patient_id=session.patient_id,
        patient_name=patient.display_name if patient else "Patient",
        doctor_name=doctor.display_name if doctor else "Attending Physician",
        state=state,
        ayush_assessment=ayush_assessment,
    )
    bundle_dict = fhir_bundle.model_dump()

    # Validate against NRCES India Core profile
    validation_report = validate_nrc_abdm_bundle(bundle_dict)
    if not validation_report.is_valid:
        error_details = [i.details for i in validation_report.issues if i.severity == "error"]
        raise HTTPException(
            status_code=422,
            detail=f"FHIR R4 Bundle failed NRCES ABDM validation: {'; '.join(error_details)}"
        )

    gateway = get_abdm_gateway()
    care_context_id = f"CARE-CTX-{session.token or session.id[:8].upper()}"
    push_result = await gateway.push_hip_health_data(bundle_dict, care_context_id)

    # Record immutable audit log entry
    audit_event = AuditEventModel(
        actor_role="PHYSICIAN",
        event_type="ABDM_HIP_PUSH_SUCCESS",
        resource_type="intake_session",
        resource_id=session.id,
        metadata_json={
            "transaction_id": push_result.get("transaction_id"),
            "bundle_id": push_result.get("bundle_id"),
            "care_context_id": care_context_id,
            "gateway_mode": push_result.get("gateway_mode"),
            "status": push_result.get("status"),
            "total_resources": validation_report.total_resources,
            "pushed_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    db.add(audit_event)
    db.commit()

    return ABDMHIPPushResponse(
        transaction_id=push_result.get("transaction_id", f"TX-ABDM-{uuid.uuid4().hex[:8].upper()}"),
        status=push_result.get("status", "TRANSFERRED"),
        bundle_id=push_result.get("bundle_id", f"BUNDLE-{session.id[:8].upper()}"),
        recipient_hip_id=push_result.get("recipient_hip_id", settings.ABDM_HIP_ID),
        facility_id=push_result.get("facility_id", settings.ABDM_FACILITY_ID),
        transfer_id=push_result.get("transfer_id"),
        gateway_mode=push_result.get("gateway_mode", "simulation"),
        message=push_result.get(
            "message",
            f"Consultation record successfully transmitted to ABDM HIP network with Transaction #{push_result.get('transaction_id')}"
        ),
    )
