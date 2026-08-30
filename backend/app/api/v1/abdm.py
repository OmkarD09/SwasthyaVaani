import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.intake import IntakeSession, ClinicalStateModel
from app.models.user import Patient, Doctor
from app.models.review import PhysicianReviewModel
from app.schemas.clinical_state import ClinicalState
from app.schemas.abdm import (
    ABHAVerifyRequest, ABHAVerifyResponse,
    ABDMValidationReport, ABDMHIPPushRequest, ABDMHIPPushResponse
)
from app.services.fhir.mapper import map_clinical_state_to_fhir_r4
from app.services.fhir.abdm_validator import validate_nrc_abdm_bundle

router = APIRouter(prefix="/abdm", tags=["ABDM Interoperability (HIP)"])


@router.post("/abha/verify", response_model=ABHAVerifyResponse)
def verify_abha_identity(req: ABHAVerifyRequest):
    """
    Simulates ABDM M2/M3 ABHA Verification & Profile Retrieval.
    Accepts 14-digit ABHA Number or ABHA Address (e.g. name@abdm).
    """
    clean_id = req.abha_id.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="ABHA ID cannot be empty")

    # Demographic mock profile generator for realistic simulation
    is_address = "@" in clean_id
    mock_number = clean_id if not is_address else "91-8472-9102-4820"
    mock_address = clean_id if is_address else f"patient.{clean_id.replace('-', '')[:6]}@abdm"

    return ABHAVerifyResponse(
        status="VERIFIED",
        abha_number=mock_number,
        abha_address=mock_address,
        patient_name="Ananya Sharma",
        gender="F",
        year_of_birth=1992,
        mobile="******4892",
        state="Maharashtra",
        district="Pune",
        message="ABHA identity successfully authenticated via ABDM Gateway"
    )


@router.get("/bundle/{intake_id}")
def get_abdm_compliant_bundle(intake_id: str, db: Session = Depends(get_db)):
    """
    Generates and returns an official NRCES India Core FHIR R4 Bundle
    along with its real-time compliance validation report.
    """
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

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

    fhir_bundle = map_clinical_state_to_fhir_r4(
        intake_session_id=session.id,
        patient_id=session.patient_id,
        patient_name=patient.display_name if patient else "Patient",
        doctor_name=doctor.display_name if doctor else "Attending Physician",
        state=state
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
def validate_external_fhir_bundle(bundle: Dict[str, Any]):
    """
    Validates any FHIR R4 bundle against NRCES India Core (NDHM/ABDM) Document specifications.
    """
    return validate_nrc_abdm_bundle(bundle)


@router.post("/hip/push", response_model=ABDMHIPPushResponse)
def push_record_to_abdm_gateway(req: ABDMHIPPushRequest, db: Session = Depends(get_db)):
    """
    Simulates ABDM Health Information Provider (HIP) record transfer to National Health Gateway.
    """
    session = db.query(IntakeSession).filter(IntakeSession.id == req.intake_session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    tx_id = f"TX-ABDM-{uuid.uuid4().hex[:8].upper()}"
    bundle_id = f"BUNDLE-{session.id[:8].upper()}"

    return ABDMHIPPushResponse(
        transaction_id=tx_id,
        status="TRANSFERRED",
        bundle_id=bundle_id,
        recipient_hip_id="IN-MH-DISTRICT-HOSP-01",
        message=f"Consultation record successfully transmitted to ABDM HIP network with Transaction #{tx_id}"
    )
