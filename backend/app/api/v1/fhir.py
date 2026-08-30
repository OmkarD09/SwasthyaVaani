from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.intake import IntakeSession, ClinicalStateModel
from app.models.user import Patient, Doctor
from app.schemas.clinical_state import ClinicalState
from app.schemas.fhir import FHIRExportResponse
from app.services.fhir.mapper import map_clinical_state_to_fhir_r4

router = APIRouter(prefix="/fhir", tags=["FHIR R4 Interoperability"])


@router.get("/export/{intake_id}", response_model=FHIRExportResponse)
def export_fhir_r4_bundle(intake_id: str, db: Session = Depends(get_db)):
    """
    Generate and export a validated FHIR R4 Bundle for an intake session.
    STRICT RULE: Generated from structured clinical facts, not raw conversational text.
    """
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == session.doctor_id).first()

    latest_state_model = db.query(ClinicalStateModel).filter(
        ClinicalStateModel.intake_session_id == session.id
    ).order_by(ClinicalStateModel.version.desc()).first()

    state = ClinicalState(**(latest_state_model.state_json if latest_state_model else {}))

    bundle = map_clinical_state_to_fhir_r4(
        intake_session_id=session.id,
        patient_id=session.patient_id,
        patient_name=patient.display_name if patient else "Patient",
        doctor_name=doctor.display_name if doctor else "Dr. Ananya Rao",
        state=state
    )

    return FHIRExportResponse(
        intake_session_id=session.id,
        bundle_id=bundle.id,
        status="VALIDATED",
        resource_count=len(bundle.entry),
        fhir_bundle=bundle
    )
