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
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.question_scorer import score_candidate_dimensions

TARGET_SESSION_ID = "7e40dca7-4fa8-45d2-8dde-974c9ff462ba"

def inspect_scoring_and_extraction():
    db = SessionLocal()
    try:
        states = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == TARGET_SESSION_ID).order_by(ClinicalStateModel.version.asc()).all()
        answers = db.query(Answer).filter(Answer.intake_session_id == TARGET_SESSION_ID).order_by(Answer.created_at.asc()).all()
        q_events = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == TARGET_SESSION_ID).order_by(QuestionEvent.sequence_number.asc()).all()

        print(f"Total Answers: {len(answers)}", flush=True)
        print(f"Total QEs: {len(q_events)}", flush=True)
        print(f"Total State Versions: {len(states)}", flush=True)

        for v_idx, sm in enumerate(states):
            st = sm.state_json or {}
            print(f"\n=======================================================", flush=True)
            print(f"--- TURN {v_idx} (State Version {sm.version}) ---", flush=True)
            if v_idx > 0 and v_idx <= len(answers):
                ans = answers[v_idx - 1]
                print(f"Patient Answer #{v_idx}: \"{ans.raw_text}\"", flush=True)

            print(f"Chief Complaint: {st.get('chief_complaint')}", flush=True)
            print(f"Domain: {st.get('domain')}", flush=True)
            print(f"Associated Symptoms: {st.get('associated_symptoms')}", flush=True)
            print(f"Negated Symptoms: {st.get('negated_symptoms')}", flush=True)
            print(f"Resolved Dimensions: {st.get('resolved_dimensions')}", flush=True)
            print(f"Explored Areas: {st.get('explored_areas')}", flush=True)
            print(f"Canonical Dimensions: {json.dumps(st.get('canonical_dimensions', {}), ensure_ascii=False)}", flush=True)

            from app.services.clinical_ai.domain_classifier import classify_clinical_domains
            cs_obj = ClinicalState(**st)
            domains = classify_clinical_domains(cs_obj, "GENERAL_CLINICAL")
            print(f"Classified Domains: {[d.value if hasattr(d, 'value') else str(d) for d in domains]}", flush=True)
            scored = score_candidate_dimensions(domains, cs_obj, [], set(cs_obj.resolved_dimensions))
            print("\nTop 5 Scored Candidates for Next Turn:", flush=True)
            for sc in scored[:5]:
                print(f"  Field: {sc.get('target_field')} | Score: {sc.get('score')} | Priority: {sc.get('priority')} | Reason: {sc.get('reason')}", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    inspect_scoring_and_extraction()
