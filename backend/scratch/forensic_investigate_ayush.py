import os
import sys
import json
from pathlib import Path

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.intake import IntakeSession, QuestionEvent, Answer, ClinicalStateModel
from app.models.ayush import AyushAssessmentModel
from app.models.user import Patient
from app.schemas.clinical_state import ClinicalState
from app.schemas.ayush import AyushAssessment
from app.services.clinical_ai.question_scorer import score_candidate_dimensions

def inspect_recent_sessions():
    db = SessionLocal()
    try:
        print("=== RECENT INTAKE SESSIONS ===")
        sessions = db.query(IntakeSession).order_by(IntakeSession.started_at.desc()).limit(15).all()
        for s in sessions:
            answers = db.query(Answer).filter(Answer.intake_session_id == s.id).order_by(Answer.created_at.asc()).all()
            ans_snippets = [a.raw_text[:30] for a in answers[:3]]
            print(f"Session {s.id} | token={s.token} | status={s.status} | workflow={s.workflow_type} | ans_count={len(answers)} | snippets={ans_snippets}")
            
            # Check if any answer contains "चक्कर"
            has_chakkar = any("चक्कर" in (a.raw_text or "") for a in answers)
            if has_chakkar:
                print(f"  --> FOUND DIZZINESS/CHAKKAR SESSION: {s.id}")
                inspect_session_detail(db, s.id)
    finally:
        db.close()

def inspect_session_detail(db, session_id):
    print(f"\n--- DEEP FORENSIC DUMP FOR SESSION {session_id} ---")
    session = db.query(IntakeSession).filter(IntakeSession.id == session_id).first()
    patient = db.query(Patient).filter(Patient.id == session.patient_id).first() if session.patient_id else None
    
    print(f"Patient ID: {session.patient_id} | Age: {patient.age if patient else 'None'}")
    
    # Questions & Answers
    questions = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == session_id).order_by(QuestionEvent.sequence_number.asc()).all()
    answers = db.query(Answer).filter(Answer.intake_session_id == session_id).order_by(Answer.created_at.asc()).all()
    
    print("\nConversation Timeline:")
    for idx, ans in enumerate(answers):
        matching_q = next((q for q in questions if q.id == ans.question_event_id), None)
        q_target = matching_q.target_field if matching_q else "UNKNOWN"
        q_text = matching_q.question_text if matching_q else "NO_Q_RECORDED"
        print(f"  Q{idx+1} [{q_target}]: {q_text}")
        print(f"  A{idx+1}: {ans.raw_text}")
    
    # Check if there is an unresolved Q after last answer
    if len(questions) > len(answers):
        last_q = questions[-1]
        print(f"  Follow-up Q{len(questions)} [{last_q.target_field}]: {last_q.question_text}")

    # ClinicalStateModel
    latest_state_model = (
        db.query(ClinicalStateModel)
        .filter(ClinicalStateModel.intake_session_id == session_id)
        .order_by(ClinicalStateModel.version.desc())
        .first()
    )
    if latest_state_model:
        st = latest_state_model.state_json or {}
        print("\nClinicalState state_json:")
        print(f"  chief_complaint: {st.get('chief_complaint')}")
        print(f"  symptoms: {st.get('symptoms')}")
        print(f"  associated_symptoms: {st.get('associated_symptoms')}")
        print(f"  negated_symptoms: {st.get('negated_symptoms')}")
        print(f"  canonical_dimensions: {json.dumps(st.get('canonical_dimensions', {}), indent=2)}")
        print(f"  ayush field in ClinicalState: {json.dumps(st.get('ayush'), indent=2)}")
    else:
        print("\nNo ClinicalStateModel found!")

    # AyushAssessmentModel
    ayush_record = (
        db.query(AyushAssessmentModel)
        .filter(AyushAssessmentModel.intake_session_id == session_id)
        .first()
    )
    if ayush_record:
        print("\nAyushAssessmentModel in DB:")
        print(f"  status: {ayush_record.status}")
        print(f"  system: {ayush_record.system}")
        print(f"  assessment_json: {json.dumps(ayush_record.assessment_json, indent=2)}")
    else:
        print("\nNo AyushAssessmentModel record found in DB for this session!")

if __name__ == "__main__":
    inspect_recent_sessions()
