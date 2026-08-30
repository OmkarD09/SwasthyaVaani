import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.events import ws_manager
from app.models.intake import IntakeSession, QuestionEvent, Answer, ClinicalStateModel
from app.models.user import Patient, Hospital, Doctor
from app.schemas.intake import (
    IntakeCreateRequest, AnswerSubmitRequest, AnswerSubmitResponse,
    IntakeReviewUpdateRequest, IntakeSubmissionResponse, IntakeSessionDetail
)
from app.schemas.clinical_state import ClinicalState
from app.schemas.question import QuestionDecision
from app.services.clinical_ai.adaptive_engine import evaluate_next_question
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.services.safety.red_flags import evaluate_red_flags
from app.models.safety import RedFlagModel

router = APIRouter(prefix="/intakes", tags=["Patient Intake"])


def generate_token():
    return f"A-{uuid.uuid4().hex[:3].upper()}"


@router.post("", response_model=IntakeSessionDetail)
def create_intake_session(req: IntakeCreateRequest, db: Session = Depends(get_db)):
    """Initialize a new patient pre-consultation clinical intake session."""
    # Ensure patient exists or create anonymous patient profile
    patient_id = req.patient_id
    if not patient_id:
        new_patient = Patient(
            display_name=req.patient_name,
            age=req.patient_age,
            gender=req.patient_gender,
            abha_id=req.abha_id
        )
        db.add(new_patient)
        db.flush()
        patient_id = new_patient.id

    token = generate_token()
    session = IntakeSession(
        token=token,
        patient_id=patient_id,
        hospital_id=req.hospital_id,
        doctor_id=req.doctor_id,
        workflow_type=req.workflow_type,
        language_code=req.language_code,
        interaction_mode=req.interaction_mode,
        status="ACTIVE",
        question_count=0
    )
    db.add(session)
    db.flush()

    # Initialize empty ClinicalState
    init_state = ClinicalState()
    state_record = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json=init_state.model_dump()
    )
    db.add(state_record)
    db.commit()
    db.refresh(session)

    return IntakeSessionDetail(
        id=session.id,
        token=session.token,
        patient_id=patient_id,
        patient_name=req.patient_name,
        patient_age=req.patient_age,
        patient_gender=req.patient_gender,
        hospital_id=session.hospital_id,
        doctor_id=session.doctor_id,
        workflow_type=session.workflow_type,
        language_code=session.language_code,
        interaction_mode=session.interaction_mode,
        status=session.status,
        question_count=session.question_count,
        clinical_state=init_state,
        created_at=session.started_at,
        submitted_at=session.submitted_at
    )


@router.get("/{intake_id}", response_model=IntakeSessionDetail)
def get_intake_session(intake_id: str, db: Session = Depends(get_db)):
    """Retrieve full intake session state and history."""
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")
    
    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    latest_state_model = db.query(ClinicalStateModel).filter(
        ClinicalStateModel.intake_session_id == session.id
    ).order_by(ClinicalStateModel.version.desc()).first()
    
    clinical_state = ClinicalState(**(latest_state_model.state_json if latest_state_model else {}))

    return IntakeSessionDetail(
        id=session.id,
        token=session.token,
        patient_id=session.patient_id,
        patient_name=patient.display_name if patient else "Patient",
        patient_age=patient.age if patient else None,
        patient_gender=patient.gender if patient else None,
        hospital_id=session.hospital_id,
        doctor_id=session.doctor_id,
        workflow_type=session.workflow_type,
        language_code=session.language_code,
        interaction_mode=session.interaction_mode,
        status=session.status,
        question_count=session.question_count,
        clinical_state=clinical_state,
        created_at=session.started_at,
        submitted_at=session.submitted_at
    )


@router.post("/{intake_id}/answers", response_model=AnswerSubmitResponse)
def submit_answer(intake_id: str, req: AnswerSubmitRequest, db: Session = Depends(get_db)):
    """
    Ingest patient answer, update structured ClinicalState, evaluate safety rules,
    and compute next QuestionDecision.
    """
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    # Load current ClinicalState
    latest_state_model = db.query(ClinicalStateModel).filter(
        ClinicalStateModel.intake_session_id == session.id
    ).order_by(ClinicalStateModel.version.desc()).first()
    
    current_state = ClinicalState(**(latest_state_model.state_json if latest_state_model else {}))
    
    # Save the answer record
    answer = Answer(
        question_event_id=req.question_event_id,
        intake_session_id=session.id,
        raw_text=req.raw_text,
        input_mode=req.input_mode,
        language_code=req.language_code,
        audio_duration_seconds=req.audio_duration_seconds
    )
    db.add(answer)
    db.flush()

    # Determine target field from previous question event if available
    target_field = ""
    if req.question_event_id:
        q_event = db.query(QuestionEvent).filter(QuestionEvent.id == req.question_event_id).first()
        if q_event:
            target_field = q_event.target_field

    # Extract structured clinical updates
    updated_state, extracted_facts, has_progress = extract_clinical_facts_from_answer(
        raw_answer=req.raw_text,
        target_field=target_field,
        current_state=current_state
    )

    # Save new ClinicalState version
    new_version = (latest_state_model.version + 1) if latest_state_model else 1
    new_state_model = ClinicalStateModel(
        intake_session_id=session.id,
        version=new_version,
        state_json=updated_state.model_dump()
    )
    db.add(new_state_model)

    # Update session metrics
    session.question_count += 1
    
    # Collect previous questions for deduplication
    past_questions = [
        q.question_text for q in db.query(QuestionEvent).filter(
            QuestionEvent.intake_session_id == session.id
        ).all()
    ]

    # Evaluate Adaptive Next Question Decision
    decision = evaluate_next_question(
        state=updated_state,
        workflow_type=session.workflow_type,
        asked_questions=past_questions,
        consecutive_low_progress=0 if has_progress else 1,
        total_questions_asked=session.question_count,
        language_code=req.language_code
    )

    # If action is ASK, persist QuestionEvent
    if decision.action == "ASK" and decision.question:
        q_event = QuestionEvent(
            intake_session_id=session.id,
            sequence_number=session.question_count + 1,
            question_text=decision.question,
            target_field=decision.target_field or "",
            decision_action="ASK",
            reason=decision.reason
        )
        db.add(q_event)
    elif decision.action == "STOP":
        session.status = "READY_TO_SUBMIT"

    db.commit()

    return AnswerSubmitResponse(
        answer_id=answer.id,
        intake_session_id=session.id,
        extracted_facts=extracted_facts,
        clinical_state=updated_state,
        decision=decision
    )


@router.post("/{intake_id}/review")
def update_patient_review(intake_id: str, req: IntakeReviewUpdateRequest, db: Session = Depends(get_db)):
    """Patient review screen field updates/corrections prior to final submission."""
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    state_model = ClinicalStateModel(
        intake_session_id=session.id,
        version=999,  # Reviewed state
        state_json=req.corrected_state.model_dump()
    )
    db.add(state_model)
    session.status = "READY_TO_SUBMIT"
    db.commit()
    return {"status": "SUCCESS", "message": "Patient review updated"}


@router.post("/{intake_id}/submit", response_model=IntakeSubmissionResponse)
async def submit_intake_to_doctor(intake_id: str, db: Session = Depends(get_db)):
    """
    Transactional submission of patient intake into doctor queue.
    Authoritative state change to SUBMITTED.
    """
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    session.status = "SUBMITTED"
    session.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)

    # Broadcast real-time event to all connected doctor screens
    await ws_manager.broadcast({
        "event": "QUEUE_UPDATED",
        "action": "PATIENT_SUBMITTED",
        "intake_session_id": session.id,
        "token": session.token,
        "doctor_id": session.doctor_id,
        "message": f"New patient #{session.token} submitted to triage queue."
    })

    return IntakeSubmissionResponse(
        intake_session_id=session.id,
        token=session.token,
        status=session.status,
        doctor_id=session.doctor_id,
        submitted_at=session.submitted_at,
        message=f"Intake successfully transferred to Doctor queue with Token #{session.token}"
    )
