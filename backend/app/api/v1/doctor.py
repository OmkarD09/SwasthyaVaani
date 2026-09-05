import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.core.events import ws_manager
from app.core.security import require_doctor
from app.models.document import (
    DocumentCandidateModel,
    DocumentExtractionModel,
    DocumentModel,
)
from app.models.intake import Answer, ClinicalStateModel, IntakeSession, QuestionEvent
from app.models.review import AuditEventModel, PhysicianEditModel, PhysicianReviewModel
from app.models.user import Doctor, Hospital, Patient
from app.schemas.clinical_state import ClinicalState
from app.schemas.doctor import (
    DoctorPatientDetail,
    DoctorQueueItem,
    PhysicianConfirmRequest,
    PhysicianConfirmResponse,
)
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
        pass
    finally:
        ws_manager.disconnect(websocket)


@router.get("/queue", response_model=list[DoctorQueueItem])
def get_doctor_queue(
    doctor_id: str | None = None,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(require_doctor),
):
    """Retrieve prioritized patient queue for doctor workstation with optimized batch queries."""
    t_start = datetime.now(timezone.utc)
    
    query = db.query(IntakeSession).filter(
        IntakeSession.status.in_(["SUBMITTED", "IN_REVIEW", "READY_TO_SUBMIT", "ACTIVE"])
    )
    if doctor_id:
        query = query.filter(IntakeSession.doctor_id == doctor_id)
        
    sessions = query.order_by(IntakeSession.started_at.desc()).all()
    if not sessions:
        return []

    # 1. Batch fetch all patients in single query
    patient_ids = list({s.patient_id for s in sessions if s.patient_id})
    patients_map = {
        p.id: p for p in db.query(Patient).filter(Patient.id.in_(patient_ids)).all()
    } if patient_ids else {}

    # 2. Batch fetch all latest clinical states in single query
    session_ids = [s.id for s in sessions]
    all_states = db.query(ClinicalStateModel).filter(
        ClinicalStateModel.intake_session_id.in_(session_ids)
    ).order_by(ClinicalStateModel.version.desc()).all()
    
    states_map = {}
    for st in all_states:
        if st.intake_session_id not in states_map:
            states_map[st.intake_session_id] = st

    # 3. Batch fetch first answers in single query (only if needed)
    all_answers = db.query(Answer).filter(
        Answer.intake_session_id.in_(session_ids)
    ).order_by(Answer.created_at.asc()).all()
    
    answers_map = {}
    for ans in all_answers:
        if ans.intake_session_id not in answers_map:
            answers_map[ans.intake_session_id] = ans

    now_utc = datetime.now(timezone.utc)
    queue_items: list[DoctorQueueItem] = []

    for s in sessions:
        patient = patients_map.get(s.patient_id)
        latest_state_model = states_map.get(s.id)
        
        state_dict = latest_state_model.state_json if latest_state_model else {}
        chief_complaint = state_dict.get("chief_complaint")
        
        # Fallback to first recorded patient answer if clinical state not finalized
        if not chief_complaint or chief_complaint == "General consultation":
            first_ans = answers_map.get(s.id)
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
            wait_mins = max(0, int((now_utc - submitted_aware).total_seconds() / 60))

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
                submitted_at=timestamp_to_use or now_utc,
                wait_time_minutes=wait_mins,
                abha_id=patient.abha_id if patient else None,
                abha_status=patient.abha_status if patient else None,
            )
        )

    t_elapsed = (datetime.now(timezone.utc) - t_start).total_seconds() * 1000
    print(f"[Performance] Doctor queue API: {t_elapsed:.2f} ms for {len(queue_items)} items")
    return queue_items


@router.get("/patients/{intake_id}", response_model=DoctorPatientDetail)
def get_patient_clinical_detail(
    intake_id: str,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(require_doctor),
):
    """Retrieve full structured history, Ayurveda assessment, and evidence for doctor review (0ms cached/fast DB)."""
    t_start = datetime.now(timezone.utc)
    
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        # Fallback to search by token or patient_id
        session = db.query(IntakeSession).filter(
            (IntakeSession.token == intake_id) | (IntakeSession.patient_id == intake_id)
        ).first()
        
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    patient = db.query(Patient).filter(Patient.id == session.patient_id).first() if session.patient_id else None
    hospital = db.query(Hospital).filter(Hospital.id == session.hospital_id).first() if session.hospital_id else None
    doctor = db.query(Doctor).filter(Doctor.id == session.doctor_id).first() if session.doctor_id else None

    latest_state_model = db.query(ClinicalStateModel).filter(
        ClinicalStateModel.intake_session_id == session.id
    ).order_by(ClinicalStateModel.version.desc()).first()

    state_data = latest_state_model.state_json if (latest_state_model and isinstance(latest_state_model.state_json, dict)) else {}
    try:
        state = ClinicalState(**state_data)
    except Exception as st_err:
        logger.warning(f"Error parsing ClinicalState for session {session.id}: {st_err}")
        state = ClinicalState()

    review = (
        db.query(PhysicianReviewModel)
        .filter(PhysicianReviewModel.intake_session_id == session.id)
        .order_by(PhysicianReviewModel.created_at.desc())
        .first()
    )

    review_status = "PHYSICIAN_CONFIRMED" if (review and review.status == "CONFIRMED") else "AI_DRAFT"

    # Retrieve medical records / attachments uploaded by or for this patient
    docs_query = (
        db.query(DocumentModel)
        .filter(
            (DocumentModel.intake_session_id == session.id)
            | (
                (DocumentModel.patient_id == session.patient_id)
                & (DocumentModel.intake_session_id.is_(None))
            )
        )
        .order_by(DocumentModel.uploaded_at.desc())
        .all()
    )

    doc_list = []
    has_unlinked = False
    all_medical_records = []

    for doc in docs_query:
        if not doc.intake_session_id:
            doc.intake_session_id = session.id
            has_unlinked = True

        extractions = []
        candidates = []
        try:
            extractions = (
                db.query(DocumentExtractionModel)
                .filter(DocumentExtractionModel.document_id == doc.id)
                .order_by(DocumentExtractionModel.created_at.asc())
                .all()
            )
            candidates = (
                db.query(DocumentCandidateModel)
                .filter(DocumentCandidateModel.document_id == doc.id)
                .order_by(DocumentCandidateModel.created_at.asc())
                .all()
            )
        except Exception as query_err:
            logger.warning(f"Error querying extractions/candidates for doc {doc.id}: {query_err}")
            db.rollback()
            extractions = []
            candidates = []

        doc_extractions = []
        if extractions:
            for ext in extractions:
                val = dict(ext.value_json) if isinstance(ext.value_json, dict) else ext.value_json
                if isinstance(val, dict) and "strength_or_dose" in val and "strength" not in val:
                    val["strength"] = val["strength_or_dose"]
                rec = {
                    "id": ext.id,
                    "document_id": doc.id,
                    "document_name": doc.file_name,
                    "document_type": doc.document_type or "PRESCRIPTION",
                    "field_type": ext.field_type,
                    "field_name": ext.field_name,
                    "value": val,
                    "confidence": ext.extraction_confidence or 0.0,
                    "ocr_confidence": ext.ocr_confidence or 0.0,
                    "source_page": ext.source_page or 1,
                    "source_text": ext.original_source_text or "",
                    "status": ext.status or "EXTRACTED",
                }
                doc_extractions.append(rec)
                all_medical_records.append(rec)
        elif candidates:
            for cand in candidates:
                cand_val = dict(cand.value_json) if isinstance(cand.value_json, dict) else {}
                if "strength_or_dose" in cand_val and "strength" not in cand_val:
                    cand_val["strength"] = cand_val["strength_or_dose"]
                cand_name = (
                    cand_val.get("name")
                    or cand_val.get("test_name")
                    or cand.candidate_type
                )
                rec = {
                    "id": cand.id,
                    "document_id": doc.id,
                    "document_name": doc.file_name,
                    "document_type": doc.document_type or "PRESCRIPTION",
                    "field_type": cand.candidate_type,
                    "field_name": str(cand_name),
                    "value": cand_val,
                    "confidence": cand.extraction_confidence or 0.0,
                    "ocr_confidence": 0.9,
                    "source_page": 1,
                    "source_text": str(cand.value_json),
                    "status": cand.status or "EXTRACTED",
                }
                doc_extractions.append(rec)
                all_medical_records.append(rec)

        file_size = doc.file_size or 0
        if file_size < 1024:
            f_size = f"{file_size} B"
        elif file_size < 1024 * 1024:
            f_size = f"{file_size / 1024:.1f} KB"
        else:
            f_size = f"{file_size / (1024 * 1024):.1f} MB"

        uploaded_str = (
            doc.uploaded_at.strftime("%d %b %Y, %H:%M")
            if doc.uploaded_at
            else "Recently"
        )

        doc_list.append(
            {
                "id": doc.id,
                "document_id": doc.id,
                "name": doc.file_name,
                "file_name": doc.file_name,
                "size": f_size,
                "file_size": file_size,
                "mime_type": doc.mime_type,
                "type": (doc.document_type or "document").lower(),
                "document_type": doc.document_type or "PRESCRIPTION",
                "status": doc.status or "PENDING",
                "failure_code": doc.failure_code,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                "uploadedAt": uploaded_str,
                "url": f"/api/v1/documents/{doc.id}/view",
                "storage_url": f"/api/v1/documents/{doc.id}/view",
                "localOnly": False,
                "extractions": doc_extractions,
            }
        )
    if has_unlinked:
        try:
            db.commit()
        except Exception as commit_err:
            logger.warning(f"Error committing unlinked doc update: {commit_err}")
            db.rollback()

    detail = DoctorPatientDetail(
        intake_session_id=session.id,
        token=session.token or "",
        patient_id=session.patient_id or "",
        patient_name=(patient.display_name if patient and patient.display_name else "Patient"),
        patient_age=patient.age if patient else None,
        patient_gender=patient.gender if patient else None,
        phone=patient.phone if patient else None,
        date_of_birth=patient.date_of_birth if patient else None,
        abha_id=patient.abha_id if patient else None,
        abha_address=patient.abha_address if patient else None,
        abha_status=patient.abha_status if patient else "UNVERIFIED",
        consent_recorded=bool(patient.consent_recorded) if patient else False,
        hospital_name=(hospital.name if hospital and hospital.name else "Hospital not recorded"),
        doctor_name=(doctor.display_name if doctor and doctor.display_name else "Clinician not recorded"),
        workflow_type=session.workflow_type or "GENERAL",
        language_code=session.language_code or "en",
        status=session.status or "WAITING",
        review_status=review_status,
        clinical_state=state,
        documents=doc_list,
        medical_records=all_medical_records,
        clinician_notes=review.notes if review else None,
        submitted_at=session.submitted_at or session.started_at or datetime.now(timezone.utc),
    )
    
    t_elapsed = (datetime.now(timezone.utc) - t_start).total_seconds() * 1000
    print(f"[Performance] Clinical detail API for {intake_id}: {t_elapsed:.2f} ms")
    return detail



@router.get("/patients/{intake_id}/conversation")
def get_patient_conversation_timeline(
    intake_id: str,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(require_doctor),
):
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
    for ans in answers:
        matching_q = None
        if ans.question_event_id:
            matching_q = next((q for q in questions if q.id == ans.question_event_id), None)

        q_text = matching_q.question_text if matching_q else "Question event not recorded"
        category = matching_q.target_field if matching_q else "Unlinked patient answer"

        exchanges.append({
            "id": ans.id,
            "questionId": matching_q.id if matching_q else None,
            "questionRecorded": matching_q is not None,
            "category": category.replace("_", " ").title(),
            "questionText": q_text,
            "patientResponse": ans.raw_text,
            "originalPatientText": ans.raw_text,
            "originalLanguage": ans.language_code or "en",
            "inputMode": ans.input_mode.lower() if ans.input_mode else "text",
            "timestamp": ans.created_at.isoformat() if ans.created_at else None,
        })

    return {"intake_session_id": session.id, "exchanges": exchanges}


@router.post("/patients/{intake_id}/confirm", response_model=PhysicianConfirmResponse)
async def confirm_patient_history(
    intake_id: str,
    req: PhysicianConfirmRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_doctor),
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
            doctor_name=doctor.display_name if doctor else "Attending Physician",
            state=state
        )
        fhir_bundle_id = bundle.id

    db.commit()

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
