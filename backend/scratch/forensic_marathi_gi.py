import json
import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.core.database import SessionLocal
from app.models.intake import IntakeSession, Answer, QuestionEvent, ClinicalStateModel

db = SessionLocal()
session_id = "13acbe38-4975-4bbf-8ec1-53328731a6cf"

s = db.query(IntakeSession).filter(IntakeSession.id == session_id).first()
print(f"=== INTAKE SESSION: {session_id} ===")
print(f"Status: {s.status}, Language: {s.language_code}, Mode: {s.interaction_mode}")
print(f"Started: {s.started_at}, Questions: {s.question_count}\n")

questions = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == session_id).order_by(QuestionEvent.sequence_number).all()
answers = db.query(Answer).filter(Answer.intake_session_id == session_id).order_by(Answer.created_at).all()
states = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == session_id).order_by(ClinicalStateModel.version).all()

print("==================================================")
print("--- ALL QUESTION EVENTS ---")
print("==================================================")
for q in questions:
    print(f"Seq {q.sequence_number} | ID: {q.id} | Action: {q.decision_action} | Target: {q.target_field}")
    print(f"  Reason: {q.reason}")
    print(f"  Text: {q.question_text}")

print("==================================================")
print("--- ALL ANSWERS WITH EXTRACTED FACTS ---")
print("==================================================")
for idx, a in enumerate(answers):
    print(f"Ans #{idx+1} | ID: {a.id} | Mode: {a.input_mode} | Linked Q-Event: {a.question_event_id}")
    print(f"  Raw Text: {a.raw_text}")

print("==================================================")
print("--- CLINICAL STATES BY VERSION ---")
print("==================================================")
for st in states:
    state_data = st.state_json
    print(f"--- Version {st.version} (Turn) ---")
    print(f"  Chief: {state_data.get('chief_complaint')}")
    print(f"  Location: {state_data.get('location')}")
    print(f"  Symptoms: {state_data.get('symptoms')}")
    print(f"  Associated: {state_data.get('associated_symptoms')}")
    print(f"  Dark Stool: {state_data.get('dark_stool')}")
    print(f"  Blood in Stool: {state_data.get('blood_in_stool')}")
    print(f"  Stool Consistency: {state_data.get('stool_consistency')}")
    print(f"  Resolved Dims: {state_data.get('resolved_dimensions')}")
    print(f"  Asked Dim History: {state_data.get('asked_dimension_history')}")
    print(f"  Canonical Dims:")
    for dim, c_st in state_data.get('canonical_dimensions', {}).items():
        if dim in ['vomiting', 'dark_stool', 'stool_color', 'melena', 'blood_in_stool', 'stool_consistency', 'nausea', 'stool_frequency']:
            print(f"    -> {dim}: status={c_st.get('status')}, val={c_st.get('value')}, char={c_st.get('characterization')}")
    print()

db.close()
