import os
import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.intake import IntakeSession, QuestionEvent, Answer, ClinicalStateModel
from app.models.ayush import AyushAssessmentModel
from app.models.user import Patient

def run_investigation():
    db = SessionLocal()
    try:
        print("=== SEARCHING FOR PATIENT 'Omkar' or QUEUE 'BE900E' ===", flush=True)
        token_sessions = db.query(IntakeSession).filter(IntakeSession.token.ilike('%BE900E%')).all()
        omkar_patients = db.query(Patient).filter(Patient.display_name.ilike('%Omkar%')).all()
        omkar_pids = [p.id for p in omkar_patients]
        pat_sessions = db.query(IntakeSession).filter(IntakeSession.patient_id.in_(omkar_pids)).all() if omkar_pids else []

        matched_dict = {}
        for s in token_sessions + pat_sessions:
            matched_dict[s.id] = s

        print(f"Found {len(matched_dict)} matching sessions:", flush=True)
        target_session_id = None
        for s_id, s in matched_dict.items():
            pat = db.query(Patient).filter(Patient.id == s.patient_id).first() if s.patient_id else None
            p_name = pat.display_name if pat else "Unknown"
            print(f"  Session ID: {s.id} | token: {s.token} | patient: {p_name} | workflow: {s.workflow_type} | status: {s.status} | started: {s.started_at}", flush=True)
            if "BE900E" in str(s.token).upper() or "test 8" in p_name.lower():
                target_session_id = s.id

        if not target_session_id and matched_dict:
            sorted_s = sorted(matched_dict.values(), key=lambda x: x.started_at or 0, reverse=True)
            target_session_id = sorted_s[0].id

        if not target_session_id:
            print("Could not find session with token BE900E or Omkar test 8, checking latest 5 sessions:", flush=True)
            for s in db.query(IntakeSession).order_by(IntakeSession.started_at.desc()).limit(5).all():
                pat = db.query(Patient).filter(Patient.id == s.patient_id).first() if s.patient_id else None
                print(f"  Recent ID: {s.id} | token: {s.token} | pat: {pat.display_name if pat else 'None'} | status: {s.status}", flush=True)
            return

        print(f"\n=======================================================", flush=True)
        print(f"DEEP FORENSIC REPORT FOR TARGET SESSION: {target_session_id}", flush=True)
        print(f"=======================================================", flush=True)
        s = db.query(IntakeSession).filter(IntakeSession.id == target_session_id).first()
        pat = db.query(Patient).filter(Patient.id == s.patient_id).first() if s.patient_id else None

        print("\n--- PART A: INTAKE SESSION RECORD ---", flush=True)
        print(f"Session ID: {s.id}", flush=True)
        print(f"Token: {s.token}", flush=True)
        print(f"Workflow Type: {s.workflow_type}", flush=True)
        print(f"Status: {s.status}", flush=True)
        print(f"Interaction Mode: {s.interaction_mode}", flush=True)
        print(f"Language Code: {s.language_code}", flush=True)
        print(f"Question Count: {s.question_count}", flush=True)
        print(f"Started At: {s.started_at}", flush=True)
        print(f"Submitted At: {s.submitted_at}", flush=True)
        print(f"Completed At: {s.completed_at}", flush=True)
        print(f"Review Status: {s.review_status}", flush=True)
        if pat:
            print(f"Patient: ID={pat.id} | Name={pat.display_name} | Age={pat.age} | Gender={pat.gender}", flush=True)

        ayush_record = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == target_session_id).first()
        print("\nAyushAssessmentModel in DB:", flush=True)
        if ayush_record:
            print(f"  ID: {ayush_record.id}", flush=True)
            print(f"  Status: {ayush_record.status}", flush=True)
            print(f"  System: {ayush_record.system}", flush=True)
            print(f"  Prakriti: {ayush_record.primary_dosha}", flush=True)
            print(f"  Assessment JSON: {json.dumps(ayush_record.assessment_json, indent=2, ensure_ascii=False)}", flush=True)
        else:
            print("  NO RECORD in ayush_assessments table for this intake_session_id!", flush=True)

        print("\n--- PART B & E: QUESTION EVENTS & ANSWERS TIMELINE ---", flush=True)
        questions = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == target_session_id).order_by(QuestionEvent.sequence_number.asc()).all()
        answers = db.query(Answer).filter(Answer.intake_session_id == target_session_id).order_by(Answer.created_at.asc()).all()

        print(f"Total QuestionEvents: {len(questions)}", flush=True)
        for q in questions:
            print(f"\n  QE #{q.sequence_number} (ID: {q.id}):", flush=True)
            print(f"    target_field: {q.target_field}", flush=True)
            print(f"    question_text: {q.question_text}", flush=True)
            print(f"    decision_action: {q.decision_action}", flush=True)
            print(f"    reason: {q.reason}", flush=True)
            print(f"    created_at: {q.created_at}", flush=True)

        print(f"\nTotal Answers: {len(answers)}", flush=True)
        for idx, a in enumerate(answers):
            matching_q = next((q for q in questions if q.id == a.question_event_id), None)
            print(f"\n  Answer #{idx+1} (ID: {a.id}):", flush=True)
            print(f"    question_event_id: {a.question_event_id}", flush=True)
            print(f"    matching_qe_seq: {matching_q.sequence_number if matching_q else 'None'} | target_field: {matching_q.target_field if matching_q else 'None'}", flush=True)
            print(f"    raw_text: {a.raw_text}", flush=True)
            print(f"    input_mode: {a.input_mode}", flush=True)
            print(f"    created_at: {a.created_at}", flush=True)

        print("\n--- PART F: CLINICAL STATE VERSIONS ---", flush=True)
        states = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == target_session_id).order_by(ClinicalStateModel.version.asc()).all()
        print(f"Total ClinicalState versions: {len(states)}", flush=True)
        for st_model in states:
            st = st_model.state_json or {}
            print(f"\n>> Version {st_model.version} (Created: {st_model.created_at}):", flush=True)
            print(f"   chief_complaint: {st.get('chief_complaint')}", flush=True)
            print(f"   domain: {st.get('domain')}", flush=True)
            print(f"   symptoms: {st.get('symptoms')}", flush=True)
            print(f"   associated_symptoms: {st.get('associated_symptoms')}", flush=True)
            print(f"   negated_symptoms: {st.get('negated_symptoms')}", flush=True)
            print(f"   resolved_dimensions: {st.get('resolved_dimensions')}", flush=True)
            print(f"   explored_areas: {st.get('explored_areas')}", flush=True)
            print(f"   canonical_dimensions: {json.dumps(st.get('canonical_dimensions', {}), indent=2, ensure_ascii=False)}", flush=True)
            print(f"   ayush in state: {json.dumps(st.get('ayush'), ensure_ascii=False)}", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    run_investigation()
