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

def inspect():
    db = SessionLocal()
    try:
        # Get the top 5 most recent sessions
        sessions = db.query(IntakeSession).order_by(IntakeSession.started_at.desc()).limit(6).all()
        for s in sessions:
            pat = db.query(Patient).filter(Patient.id == s.patient_id).first() if s.patient_id else None
            pname = pat.display_name if pat else 'None'
            print('========================================================================')
            print(f'SESSION: {s.id} | Token: #{s.token} | Patient: {pname} | Mode: {s.interaction_mode} | Lang: {s.language_code}')
            print(f'Status: {s.status} | Workflow: {s.workflow_type} | Started: {s.started_at} | Submitted: {s.submitted_at}')
            
            q_events = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.asc()).all()
            answers = db.query(Answer).filter(Answer.intake_session_id == s.id).order_by(Answer.created_at.asc()).all()
            
            print(f'\n--- QUESTION EVENTS ({len(q_events)}) ---')
            for q in q_events:
                print(f'Seq {q.sequence_number} | ID: {q.id} | Target: {q.target_field} | Action: {q.decision_action} | Created: {q.created_at}')
                print(f'  Text: {q.question_text}')
                print(f'  Reason: {q.reason}')
                
            print(f'\n--- ANSWERS ({len(answers)}) ---')
            for idx, a in enumerate(answers):
                print(f'Ans #{idx+1} | ID: {a.id} | Mode: {a.input_mode} | Lang: {a.language_code} | QE_ID: {a.question_event_id} | Created: {a.created_at}')
                print(f'  Raw: {a.raw_text}')
                print(f'  Normalized: {a.normalized_text}')

            states = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.asc()).all()
            print(f'\n--- CLINICAL STATES ({len(states)}) ---')
            for stm in states:
                st = stm.state_json or {}
                print(f'Version {stm.version} | Created: {stm.created_at}')
                print(f'  CC: {st.get("chief_complaint")} | Domain: {st.get("domain")}')
                print(f'  Symptoms: {st.get("symptoms")}')
                print(f'  Negated: {st.get("negated_symptoms")}')
                print(f'  Resolved: {st.get("resolved_dimensions")}')
                print(f'  Explored: {st.get("explored_areas")}')
                print(f'  Duration: {st.get("duration")} | Severity: {st.get("severity")} | Onset: {st.get("onset")}')
                print(f'  Location: {st.get("location")} | Character: {st.get("character")}')
                print(f'  AYUSH: {st.get("ayush")}')
                print(f'  Canonical: {st.get("canonical_dimensions")}')
    finally:
        db.close()

if __name__ == '__main__':
    inspect()
