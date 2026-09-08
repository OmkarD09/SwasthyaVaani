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

TARGET_SESSION_ID = "7e40dca7-4fa8-45d2-8dde-974c9ff462ba"

def dump_target():
    db = SessionLocal()
    try:
        s = db.query(IntakeSession).filter(IntakeSession.id == TARGET_SESSION_ID).first()
        if not s:
            print(f"Session {TARGET_SESSION_ID} NOT FOUND in database!", flush=True)
            return
        pat = db.query(Patient).filter(Patient.id == s.patient_id).first() if s.patient_id else None

        print("==================================================================", flush=True)
        print("TARGET SESSION FORENSIC INSPECTION DUMP", flush=True)
        print("==================================================================", flush=True)
        print(f"Session ID: {s.id}", flush=True)
        print(f"Queue/Token: #{s.token}", flush=True)
        print(f"Patient Name: {pat.display_name if pat else 'None'}", flush=True)
        print(f"Patient Age: {pat.age if pat else 'None'}", flush=True)
        print(f"Patient Gender: {pat.gender if pat else 'None'}", flush=True)
        print(f"Workflow Type: {s.workflow_type}", flush=True)
        print(f"Interaction Mode: {s.interaction_mode}", flush=True)
        print(f"Language Code: {s.language_code}", flush=True)
        print(f"Status: {s.status}", flush=True)
        print(f"Review Status: {s.review_status}", flush=True)
        print(f"Question Count: {s.question_count}", flush=True)
        print(f"Current Question Index: {s.current_question_index}", flush=True)
        print(f"Started At: {s.started_at}", flush=True)
        print(f"Submitted At: {s.submitted_at}", flush=True)
        print(f"Completed At: {s.completed_at}", flush=True)

        print("\n--- AYUSH ASSESSMENT RECORD IN DB ---", flush=True)
        ayush = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == TARGET_SESSION_ID).first()
        if ayush:
            print(f"Ayush Record Found: ID={ayush.id}", flush=True)
            print(f"Status: {ayush.status}", flush=True)
            print(f"System: {ayush.system}", flush=True)
            print(f"Assessment JSON keys: {list((ayush.assessment_json or {}).keys())}", flush=True)
            print(f"Assessment JSON: {json.dumps(ayush.assessment_json, indent=2, ensure_ascii=False)}", flush=True)
        else:
            print("NO AyushAssessmentModel record exists for this session in 'ayush_assessments' table.", flush=True)

        print("\n--- QUESTION EVENTS (ORDERED BY SEQUENCE NUMBER) ---", flush=True)
        q_events = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == TARGET_SESSION_ID).order_by(QuestionEvent.sequence_number.asc()).all()
        print(f"Total QuestionEvents count: {len(q_events)}", flush=True)
        for q in q_events:
            print(f"\n[QuestionEvent sequence_number={q.sequence_number}]", flush=True)
            print(f"  ID: {q.id}", flush=True)
            print(f"  target_field: {q.target_field}", flush=True)
            print(f"  question_text: {q.question_text}", flush=True)
            print(f"  decision_action: {q.decision_action}", flush=True)
            print(f"  reason: {q.reason}", flush=True)
            print(f"  created_at: {q.created_at}", flush=True)

        print("\n--- ANSWERS (ORDERED BY CREATED_AT) ---", flush=True)
        answers = db.query(Answer).filter(Answer.intake_session_id == TARGET_SESSION_ID).order_by(Answer.created_at.asc()).all()
        print(f"Total Answers count: {len(answers)}", flush=True)
        for idx, a in enumerate(answers):
            matching_q = next((q for q in q_events if q.id == a.question_event_id), None)
            print(f"\n[Answer idx={idx+1}]", flush=True)
            print(f"  ID: {a.id}", flush=True)
            print(f"  question_event_id: {a.question_event_id}", flush=True)
            print(f"  matching_qe_seq: {matching_q.sequence_number if matching_q else 'NONE'}", flush=True)
            print(f"  matching_qe_target_field: {matching_q.target_field if matching_q else 'NONE'}", flush=True)
            print(f"  matching_qe_question_text: {matching_q.question_text if matching_q else 'NONE'}", flush=True)
            print(f"  raw_text: {a.raw_text}", flush=True)
            print(f"  input_mode: {a.input_mode}", flush=True)
            print(f"  created_at: {a.created_at}", flush=True)

        print("\n--- CLINICAL STATE VERSIONS ---", flush=True)
        states = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == TARGET_SESSION_ID).order_by(ClinicalStateModel.version.asc()).all()
        print(f"Total ClinicalState versions: {len(states)}", flush=True)
        for st_model in states:
            st = st_model.state_json or {}
            print(f"\n=======================================================", flush=True)
            print(f"ClinicalState Version {st_model.version} (Created: {st_model.created_at}):", flush=True)
            print(f"  chief_complaint: {st.get('chief_complaint')}", flush=True)
            print(f"  domain: {st.get('domain')}", flush=True)
            print(f"  symptoms: {st.get('symptoms')}", flush=True)
            print(f"  associated_symptoms: {st.get('associated_symptoms')}", flush=True)
            print(f"  negated_symptoms: {st.get('negated_symptoms')}", flush=True)
            print(f"  resolved_dimensions: {st.get('resolved_dimensions')}", flush=True)
            print(f"  explored_areas: {st.get('explored_areas')}", flush=True)
            print(f"  duration: {st.get('duration')}", flush=True)
            print(f"  onset: {st.get('onset')}", flush=True)
            print(f"  severity: {st.get('severity')}", flush=True)
            print(f"  character: {st.get('character')}", flush=True)
            print(f"  location: {st.get('location')}", flush=True)
            print(f"  canonical_dimensions: {json.dumps(st.get('canonical_dimensions', {}), indent=2, ensure_ascii=False)}", flush=True)
            print(f"  ayush: {json.dumps(st.get('ayush'), ensure_ascii=False)}", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    dump_target()
