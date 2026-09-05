import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.events import ws_manager
from app.models.intake import Answer, ClinicalStateModel, IntakeSession, QuestionEvent
from app.models.safety import RedFlagModel
from app.models.user import Patient
from app.schemas.clinical_state import ClinicalState
from app.schemas.intake import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    IntakeCreateRequest,
    IntakeSessionDetail,
    IntakeSubmissionResponse,
    VoiceAnswerSubmitResponse,
)
from app.services.clinical_ai.adaptive_engine import evaluate_next_question
from app.services.providers.factory import get_llm_service, get_speech_service

router = APIRouter(prefix="/intakes", tags=["Patient Intake"])


def generate_token():
    return f"A-{uuid.uuid4().hex[:6].upper()}"


def normalize_abha_id(val: str | None) -> str | None:
    if not val:
        return None
    raw = re.sub(r"[\s-]", "", str(val).strip())
    if len(raw) == 14 and raw.isdigit():
        return f"{raw[0:2]}-{raw[2:6]}-{raw[6:10]}-{raw[10:14]}"
    cleaned = str(val).strip()
    return cleaned if cleaned else None


def normalize_abha_address(val: str | None) -> str | None:
    if not val:
        return None
    cleaned = str(val).strip().lower()
    return cleaned if cleaned else None


def normalize_phone(val: str | None) -> str | None:
    if not val:
        return None
    digits = re.sub(r"\D", "", str(val).strip())
    if len(digits) == 10:
        return digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        return digits[1:]
    cleaned = str(val).strip()
    return cleaned if cleaned else None


@router.post("", response_model=IntakeSessionDetail)
def create_intake_session(req: IntakeCreateRequest, db: Session = Depends(get_db)):
    """Initialize a new patient pre-consultation clinical intake session."""
    patient: Patient | None = None

    normalized_abha = normalize_abha_id(req.abha_id)
    raw_digits_abha = re.sub(r"[\s-]", "", req.abha_id.strip()) if req.abha_id else None
    normalized_address = normalize_abha_address(req.abha_address)
    normalized_ph = normalize_phone(req.phone)
    dob = req.date_of_birth.strip() if req.date_of_birth and req.date_of_birth.strip() else None
    clean_name = req.patient_name.strip() if req.patient_name and req.patient_name.strip() else "Patient"
    clean_gender = req.patient_gender.strip() if req.patient_gender and req.patient_gender.strip() else None

    # 1. Lookup existing patient by patient_id if provided
    if req.patient_id:
        patient = db.query(Patient).filter(Patient.id == req.patient_id).first()

    # 2. Lookup existing patient by ABHA ID if not found yet (prevent duplicates)
    if not patient and (normalized_abha or raw_digits_abha):
        abha_conditions = []
        if normalized_abha:
            abha_conditions.append(Patient.abha_id == normalized_abha)
        if raw_digits_abha and raw_digits_abha != normalized_abha:
            abha_conditions.append(Patient.abha_id == raw_digits_abha)
        patient = db.query(Patient).filter(or_(*abha_conditions)).first()

    if patient:
        # Update existing demographics without overwriting existing data with empty/null values
        if clean_name and clean_name != "Patient":
            patient.display_name = clean_name
        elif not patient.display_name:
            patient.display_name = clean_name

        if req.patient_age is not None:
            patient.age = req.patient_age

        if clean_gender:
            patient.gender = clean_gender

        if normalized_ph:
            patient.phone = normalized_ph

        if dob:
            patient.date_of_birth = dob

        if normalized_address:
            patient.abha_address = normalized_address

        if normalized_abha and not patient.abha_id:
            patient.abha_id = normalized_abha

        # Safety rule: ABHA QR data is IMPORTED only, NOT ABDM verified.
        # abha_status must NOT become "VERIFIED" merely because QR was scanned.
        if not patient.abha_status:
            patient.abha_status = "UNVERIFIED"

        if req.consent_given:
            patient.consent_recorded = True
    else:
        # Create new patient record
        patient = Patient(
            display_name=clean_name,
            age=req.patient_age,
            gender=clean_gender,
            phone=normalized_ph,
            date_of_birth=dob,
            abha_id=normalized_abha,
            abha_address=normalized_address,
            abha_status="UNVERIFIED",
            verification_timestamp=None,
            consent_recorded=bool(req.consent_given),
        )
        db.add(patient)
        db.flush()

    token = generate_token()
    session = IntakeSession(
        token=token,
        patient_id=patient.id,
        hospital_id=req.hospital_id,
        doctor_id=req.doctor_id,
        workflow_type=req.workflow_type,
        language_code=req.language_code,
        interaction_mode=req.interaction_mode,
        status="ACTIVE",
        question_count=0,
    )
    db.add(session)
    db.flush()

    # Initialize empty ClinicalState
    init_state = ClinicalState()
    state_model = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json=init_state.model_dump(mode="json")
    )
    db.add(state_model)
    db.commit()

    return IntakeSessionDetail(
        id=session.id,
        token=session.token,
        patient_id=session.patient_id,
        patient_name=patient.display_name,
        patient_age=patient.age,
        patient_gender=patient.gender,
        phone=patient.phone,
        date_of_birth=patient.date_of_birth,
        abha_id=patient.abha_id,
        abha_address=patient.abha_address,
        abha_status=patient.abha_status or "UNVERIFIED",
        consent_recorded=bool(patient.consent_recorded),
        hospital_id=session.hospital_id,
        doctor_id=session.doctor_id,
        workflow_type=session.workflow_type,
        language_code=session.language_code,
        interaction_mode=session.interaction_mode,
        status=session.status,
        question_count=session.question_count,
        clinical_state=init_state,
        created_at=session.started_at,
        submitted_at=session.submitted_at,
    )


@router.get("/{intake_id}", response_model=IntakeSessionDetail)
def get_intake_session(intake_id: str, db: Session = Depends(get_db)):
    """Retrieve full intake session state and history."""
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    latest_state_model = (
        db.query(ClinicalStateModel)
        .filter(ClinicalStateModel.intake_session_id == session.id)
        .order_by(ClinicalStateModel.version.desc())
        .first()
    )

    clinical_state = ClinicalState(
        **(latest_state_model.state_json if latest_state_model else {})
    )

    return IntakeSessionDetail(
        id=session.id,
        token=session.token,
        patient_id=session.patient_id,
        patient_name=patient.display_name if patient else "Patient",
        patient_age=patient.age if patient else None,
        patient_gender=patient.gender if patient else None,
        phone=patient.phone if patient else None,
        date_of_birth=patient.date_of_birth if patient else None,
        abha_id=patient.abha_id if patient else None,
        abha_address=patient.abha_address if patient else None,
        abha_status=patient.abha_status if patient else "UNVERIFIED",
        consent_recorded=bool(patient.consent_recorded) if patient else False,
        hospital_id=session.hospital_id,
        doctor_id=session.doctor_id,
        workflow_type=session.workflow_type,
        language_code=session.language_code,
        interaction_mode=session.interaction_mode,
        status=session.status,
        question_count=session.question_count,
        clinical_state=clinical_state,
        created_at=session.started_at,
        submitted_at=session.submitted_at,
    )


async def process_intake_answer_core(
    *,
    session: IntakeSession,
    raw_text: str,
    input_mode: str,
    language_code: str,
    audio_duration_seconds: float | None,
    question_event_id: str | None,
    db: Session,
) -> AnswerSubmitResponse:
    """
    Ingest patient answer, extract structured facts dynamically using LLM (Gemini 2.5 Flash),
    evaluate safety rules, and compute next QuestionDecision.
    """
    # 1. Load current ClinicalState
    latest_state_model = (
        db.query(ClinicalStateModel)
        .filter(ClinicalStateModel.intake_session_id == session.id)
        .order_by(ClinicalStateModel.version.desc())
        .first()
    )

    current_state = ClinicalState(
        **(latest_state_model.state_json if latest_state_model else {})
    )

    question_event = None
    if question_event_id:
        question_event = (
            db.query(QuestionEvent)
            .filter(
                QuestionEvent.id == question_event_id,
                QuestionEvent.intake_session_id == session.id,
            )
            .first()
        )
        if not question_event:
            raise HTTPException(
                status_code=400,
                detail="Question event does not belong to this intake session",
            )
    else:
        question_event = (
            db.query(QuestionEvent)
            .filter(QuestionEvent.intake_session_id == session.id)
            .order_by(QuestionEvent.sequence_number.desc())
            .first()
        )

    # 3. Save the answer record with modality provenance and linked QuestionEvent
    answer = Answer(
        question_event_id=question_event.id if question_event else None,
        intake_session_id=session.id,
        raw_text=raw_text,
        input_mode=input_mode,
        language_code=language_code,
        audio_duration_seconds=audio_duration_seconds,
    )
    db.add(answer)
    db.flush()

    target_field = question_event.target_field if question_event else ""
    # 4. Extract structured clinical updates dynamically via LLM / Rule Provider against resolved target_field
    llm = get_llm_service()
    extraction_res = await llm.extract_clinical_facts(
        raw_text=raw_text,
        current_state=current_state,
        language_code=language_code or "en",
        target_field=target_field or "chief_complaint",
    )

    extracted_facts = extraction_res.extracted_facts
    has_progress = len(extracted_facts) > 0

    # 5. Merge extracted facts into current clinical state
    updated_dict = current_state.model_dump()
    for k, v in extracted_facts.items():
        if v is not None:
            if k == "chief_complaint" and current_state.chief_complaint:
                continue
            if isinstance(v, list) and isinstance(updated_dict.get(k), list):
                updated_dict[k] = [*updated_dict[k]]
                for item in v:
                    if item not in updated_dict[k]:
                        updated_dict[k].append(item)
            elif isinstance(v, dict) and isinstance(updated_dict.get(k), dict):
                updated_dict[k] = {**updated_dict[k], **v}
            else:
                updated_dict[k] = v
    updated_state = ClinicalState(**updated_dict)
    if raw_text and raw_text not in updated_state.raw_transcript_snippets:
        updated_state.raw_transcript_snippets.append(raw_text)
    if not updated_state.chief_complaint and raw_text:
        updated_state.chief_complaint = raw_text.strip()

    # Update session metrics
    session.question_count += 1

    # Collect previous questions for deduplication
    past_questions = [
        q.question_text
        for q in db.query(QuestionEvent)
        .filter(QuestionEvent.intake_session_id == session.id)
        .all()
    ]

    # 6. Evaluate Adaptive Next Question Decision
    decision = await evaluate_next_question(
        state=updated_state,
        workflow_type=session.workflow_type,
        asked_questions=past_questions,
        consecutive_low_progress=0 if has_progress else 1,
        total_questions_asked=session.question_count,
        language_code=language_code or "en",
        db=db,
    )

    # Persist QuestionEvent if action is ASK and return its ID for chaining.
    next_question_event_id = None
    if decision.action == "ASK" and decision.question:
        q_event = QuestionEvent(
            intake_session_id=session.id,
            sequence_number=session.question_count + 1,
            question_text=decision.question,
            target_field=decision.target_field or "",
            decision_action="ASK",
            reason=decision.reason,
        )
        db.add(q_event)
        db.flush()
        next_question_event_id = q_event.id
    elif decision.action in {"STOP", "ESCALATE"}:
        session.status = "READY_TO_SUBMIT"

    # Persist the post-decision state so safety and reasoning updates are not lost.
    new_version = (latest_state_model.version + 1) if latest_state_model else 1
    db.add(
        ClinicalStateModel(
            intake_session_id=session.id,
            version=new_version,
            state_json=updated_state.model_dump(mode="json"),
        )
    )

    decision.question_event_id = next_question_event_id
    db.commit()

    return AnswerSubmitResponse(
        answer_id=answer.id,
        intake_session_id=session.id,
        question_event_id=next_question_event_id,
        extracted_facts=extracted_facts,
        clinical_state=updated_state,
        decision=decision,
        next_question_event_id=next_question_event_id,
    )


@router.post("/{intake_id}/answers", response_model=AnswerSubmitResponse)
async def submit_answer(
    intake_id: str, req: AnswerSubmitRequest, db: Session = Depends(get_db)
):
    """Process a text, voice transcript, or touch answer through one shared engine."""
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    try:
        return await process_intake_answer_core(
            session=session,
            raw_text=req.raw_text,
            input_mode=req.input_mode,
            language_code=req.language_code or "en",
            audio_duration_seconds=req.audio_duration_seconds,
            question_event_id=req.question_event_id,
            db=db,
        )
    except Exception:
        db.rollback()
        raise


@router.post("/{intake_id}/voice-answer", response_model=VoiceAnswerSubmitResponse)
async def submit_voice_answer(
    intake_id: str,
    file: UploadFile = File(...),
    language_code: str | None = Form("hi"),
    question_event_id: str | None = Form(None),
    db: Session = Depends(get_db),
):
    """Transcribe audio, run the shared adaptive engine, and optionally synthesize TTS."""
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file provided")

    speech = get_speech_service()
    transcription = await speech.transcribe_audio(audio_bytes, language_code)
    transcript = transcription.transcript_text.strip()
    if not transcript:
        raise HTTPException(status_code=422, detail="Speech provider returned no transcript")
    detected_language = transcription.detected_language or language_code or "hi"

    try:
        result = await process_intake_answer_core(
            session=session,
            raw_text=transcript,
            input_mode="VOICE",
            language_code=detected_language,
            audio_duration_seconds=None,
            question_event_id=question_event_id,
            db=db,
        )
    except Exception:
        db.rollback()
        raise

    audio_base64 = None
    if result.decision.action == "ASK" and result.decision.question:
        try:
            audio_base64 = await speech.text_to_speech(
                result.decision.question, detected_language
            )
        except Exception:  # noqa: BLE001 - optional TTS must not discard saved intake data
            audio_base64 = None

    return VoiceAnswerSubmitResponse(
        answer_id=result.answer_id,
        intake_session_id=result.intake_session_id,
        question_event_id=result.question_event_id,
        transcript_text=transcript,
        detected_language=detected_language,
        audio_base64=audio_base64,
        extracted_facts=result.extracted_facts,
        clinical_state=result.clinical_state,
        decision=result.decision,
        next_question_event_id=result.next_question_event_id,
    )


@router.post("/{intake_id}/submit", response_model=IntakeSubmissionResponse)
async def submit_intake_for_review(intake_id: str, db: Session = Depends(get_db)):
    """
    Patient signs off on interview draft.
    Pushes case to live clinician WebSocket queue with calculated priority triage badge.
    """
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Intake session not found")

    session.status = "SUBMITTED"
    session.submitted_at = datetime.now(timezone.utc)

    # Load latest clinical state for triage evaluation
    latest_state_model = (
        db.query(ClinicalStateModel)
        .filter(ClinicalStateModel.intake_session_id == session.id)
        .order_by(ClinicalStateModel.version.desc())
        .first()
    )

    current_state = ClinicalState(
        **(latest_state_model.state_json if latest_state_model else {})
    )

    # Calculate priority level
    priority = "NORMAL"
    if current_state.red_flags:
        priority = "URGENT"
        for rf in current_state.red_flags:
            red_flag_entry = RedFlagModel(
                intake_session_id=session.id,
                rule_id=rf.rule_id,
                title=rf.title,
                reason=rf.reason,
                severity=rf.severity,
                evidence_json=rf.evidence_ids,
                status=rf.status,
            )
            db.add(red_flag_entry)

    db.commit()

    # Broadcast to Doctor Queue via WebSocket
    await ws_manager.broadcast(
        {
            "event": "NEW_PATIENT_INTAKE",
            "intake_session_id": session.id,
            "token": session.token,
            "priority": priority,
            "submitted_at": session.submitted_at.isoformat(),
        }
    )

    return IntakeSubmissionResponse(
        intake_session_id=session.id,
        status="SUBMITTED",
        token=session.token,
        doctor_id=session.doctor_id or "doc_001",
        submitted_at=session.submitted_at,
        message="Patient intake successfully submitted to clinician queue.",
    )
