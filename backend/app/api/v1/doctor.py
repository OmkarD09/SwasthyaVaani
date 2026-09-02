from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_doctor, get_current_user
from app.core.events import ws_manager
from app.models.intake import IntakeSession, ClinicalStateModel, Answer, QuestionEvent
from app.models.user import Patient, Hospital, Doctor
from app.models.review import PhysicianReviewModel, PhysicianEditModel, AuditEventModel
from app.schemas.doctor import (
    DoctorQueueItem, DoctorPatientDetail, PhysicianConfirmRequest, PhysicianConfirmResponse
)
from app.schemas.clinical_state import ClinicalState
from app.services.fhir.mapper import map_clinical_state_to_fhir_r4

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])


@router.websocket("/ws")
async def doctor_queue_websocket(websocket: WebSocket):
    """Real-time WebSocket connection for live doctor triage queue updates."""
    await ws_manager.connect(websocket)
    try:
        # Send initial connected greeting
        await websocket.send_json({"event": "CONNECTED", "message": "Subscribed to SwasthyaVaani triage queue events"})
        while True:
            # Keep connection alive, listen for client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "PONG"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@router.get("/queue", response_model=List[DoctorQueueItem])
def get_doctor_queue(doctor_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve prioritized patient queue for doctor workstation."""
    query = db.query(IntakeSession).filter(
        IntakeSession.status.in_(["SUBMITTED", "IN_REVIEW", "READY_TO_SUBMIT", "ACTIVE"])
    )
    if doctor_id:
        query = query.filter(IntakeSession.doctor_id == doctor_id)
        
    sessions = query.order_by(IntakeSession.started_at.desc()).all()
    queue_items: List[DoctorQueueItem] = []

    for s in sessions:
        patient = db.query(Patient).filter(Patient.id == s.patient_id).first()
        latest_state_model = db.query(ClinicalStateModel).filter(
            ClinicalStateModel.intake_session_id == s.id
        ).order_by(ClinicalStateModel.version.desc()).first()
        
        state_dict = latest_state_model.state_json if latest_state_model else {}
        chief_complaint = state_dict.get("chief_complaint")
        
        # Fallback to first recorded patient answer if clinical state not finalized
        if not chief_complaint or chief_complaint == "General consultation":
            first_ans = db.query(Answer).filter(Answer.intake_session_id == s.id).order_by(Answer.created_at.asc()).first()
            if first_ans and first_ans.raw_text:
                chief_complaint = first_ans.raw_text
            else:
                chief_complaint = "General consultation"

        red_flags = state_dict.get("red_flags", [])
        has_red_flags = len(red_flags) > 0

        # Calculate wait time
        wait_mins = 0
        timestamp_to_use = s.submitted_at or s.started_at
        if timestamp_to_use:
            submitted_aware = timestamp_to_use
            if submitted_aware.tzinfo is None:
                submitted_aware = submitted_aware.replace(tzinfo=timezone.utc)
            wait_mins = max(0, int((datetime.now(timezone.utc) - submitted_aware).total_seconds() / 60))

        priority = "Priority" if has_red_flags else "Routine"
        status_tone = "red" if has_red_flags else "teal" if s.status == "SUBMITTED" else "amber"
        queue_status = "PRIORITY_REVIEW" if has_red_flags else "HISTORY_READY" if s.status in ["SUBMITTED", "READY_TO_SUBMIT"] else "WAITING"

        queue_items.append(
            DoctorQueueItem(
                intake_session_id=s.id,
                token=s.token,
                patient_id=s.patient_id,
                patient_name=patient.display_name if patient else "Patient",
                patient_age=patient.age if patient else None,
                patient_gender=patient.gender if patient else None,
                chief_complaint=chief_complaint,
                language_code=s.language_code,
                workflow_type=s.workflow_type,
                status=queue_status,
                status_tone=status_tone,
                priority=priority,
                has_red_flags=has_red_flags,
                submitted_at=timestamp_to_use or datetime.now(timezone.utc),
                wait_time_minutes=wait_mins
            )
        )

    return queue_items


@router.get("/patients/{intake_id}", response_model=DoctorPatientDetail)
def get_patient_clinical_detail(intake_id: str, db: Session = Depends(get_db)):
    """Retrieve full structured history, Ayurveda assessment, and evidence for doctor review."""
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    hospital = db.query(Hospital).filter(Hospital.id == session.hospital_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == session.doctor_id).first()

    latest_state_model = db.query(ClinicalStateModel).filter(
        ClinicalStateModel.intake_session_id == session.id
    ).order_by(ClinicalStateModel.version.desc()).first()

    state_data = latest_state_model.state_json if (latest_state_model and isinstance(latest_state_model.state_json, dict)) else {}
    state = ClinicalState(**state_data)
    review = db.query(PhysicianReviewModel).filter(PhysicianReviewModel.intake_session_id == session.id).first()

    review_status = "PHYSICIAN_CONFIRMED" if (review and review.status == "CONFIRMED") else "AI_DRAFT"

    return DoctorPatientDetail(
        intake_session_id=session.id,
        token=session.token,
        patient_id=session.patient_id,
        patient_name=patient.display_name if patient else "Patient",
        patient_age=patient.age if patient else None,
        patient_gender=patient.gender if patient else None,
        hospital_name=hospital.name if hospital else "District Hospital",
        doctor_name=doctor.display_name if doctor else "Attending Physician",
        workflow_type=session.workflow_type,
        language_code=session.language_code,
        status=session.status,
        review_status=review_status,
        clinical_state=state,
        clinician_notes=review.notes if review else None,
        submitted_at=session.submitted_at or session.started_at
    )


@router.get("/patients/{intake_id}/conversation")
def get_patient_conversation_timeline(intake_id: str, db: Session = Depends(get_db)):
    """Retrieve the full chronological interview trajectory stored in the database."""
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    questions = db.query(QuestionEvent).filter(
        QuestionEvent.intake_session_id == session.id
    ).order_by(QuestionEvent.sequence_number.asc()).all()

    answers = db.query(Answer).filter(
        Answer.intake_session_id == session.id
    ).order_by(Answer.created_at.asc()).all()

    exchanges = []
    for idx, ans in enumerate(answers):
        matching_q = None
        if ans.question_event_id:
            matching_q = next((q for q in questions if q.id == ans.question_event_id), None)
        if not matching_q and idx < len(questions):
            matching_q = questions[idx]

        q_text = matching_q.question_text if matching_q else (
            "What main symptom or health concern brings you in today?" if idx == 0 else "Could you provide more details about this?"
        )
        category = matching_q.target_field if matching_q else "Clinical Intake"

        exchanges.append({
            "id": ans.id,
            "category": category.replace("_", " ").title(),
            "questionText": q_text,
            "patientResponse": ans.raw_text,
            "originalPatientText": ans.raw_text,
            "originalLanguage": ans.language_code or "en",
            "inputMode": ans.input_mode.lower() if ans.input_mode else "text",
            "timestamp": ans.created_at.strftime("%I:%M %p") if ans.created_at else "Today"
        })

    return {"intake_session_id": session.id, "exchanges": exchanges}


@router.post("/patients/{intake_id}/confirm", response_model=PhysicianConfirmResponse)
async def confirm_patient_history(
    intake_id: str,
    req: PhysicianConfirmRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Explicit Physician Confirmation of structured clinical history.
    Produces audit log entry and optional FHIR R4 Bundle.
    """
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == session.doctor_id).first()

    # Load latest state
    latest_state_model = db.query(ClinicalStateModel).filter(
        ClinicalStateModel.intake_session_id == session.id
    ).order_by(ClinicalStateModel.version.desc()).first()
    state_data = latest_state_model.state_json if (latest_state_model and isinstance(latest_state_model.state_json, dict)) else {}
    state = ClinicalState(**state_data)

    # Persist or update PhysicianReview
    review = db.query(PhysicianReviewModel).filter(PhysicianReviewModel.intake_session_id == session.id).first()
    if not review:
        review = PhysicianReviewModel(
            intake_session_id=session.id,
            doctor_id=session.doctor_id,
            status="CONFIRMED",
            notes=req.notes,
            confirmed_at=datetime.now(timezone.utc)
        )
        db.add(review)
    else:
        review.status = "CONFIRMED"
        review.notes = req.notes
        review.confirmed_at = datetime.now(timezone.utc)
    db.flush()

    # Record any edits
    for edit in req.edits:
        edit_model = PhysicianEditModel(
            physician_review_id=review.id,
            field_name=edit.field_name,
            old_value_json={"value": edit.old_value},
            new_value_json={"value": edit.new_value},
            reason=edit.reason
        )
        db.add(edit_model)

    # Log Audit Event
    audit = AuditEventModel(
        actor_user_id=current_user.get("sub", "doctor_user"),
        actor_role="DOCTOR",
        event_type="PHYSICIAN_CONFIRMED",
        resource_type="IntakeSession",
        resource_id=session.id,
        metadata_json={"token": session.token, "doctor_id": session.doctor_id}
    )
    db.add(audit)

    # Generate FHIR R4 Bundle if requested
    fhir_bundle_id = None
    if req.generate_fhir:
        bundle = map_clinical_state_to_fhir_r4(
            intake_session_id=session.id,
            patient_id=session.patient_id,
            patient_name=patient.display_name if patient else "Patient",
            doctor_name=doctor.display_name if doctor else "Dr. Ananya Rao",
            state=state
        )
        fhir_bundle_id = bundle.id

    db.commit()

    # Broadcast real-time update to all connected doctor screens
    await ws_manager.broadcast({
        "event": "QUEUE_UPDATED",
        "action": "CONFIRMED",
        "intake_session_id": session.id,
        "token": session.token,
        "message": f"Patient #{session.token} confirmed by physician."
    })

    return PhysicianConfirmResponse(
        intake_session_id=session.id,
        review_id=review.id,
        confirmed_at=review.confirmed_at or datetime.now(timezone.utc),
        status="PHYSICIAN_CONFIRMED",
        fhir_bundle_id=fhir_bundle_id,
        message=f"Clinical history confirmed by physician. FHIR Bundle generated: {fhir_bundle_id or 'N/A'}"
    )
