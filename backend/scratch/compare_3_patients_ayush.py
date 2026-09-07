import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.user import Patient, Doctor, Hospital
from app.models.intake import IntakeSession, QuestionEvent, Answer, ClinicalStateModel
from app.models.ayush import AyushAssessmentModel
from app.schemas.clinical_state import ClinicalState
from app.schemas.ayush import AyushAssessment, ayush_state_to_assessment
from app.services.clinical_ai.question_scorer import score_candidate_dimensions
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
import asyncio
from app.api.v1.intakes import process_intake_answer_core
from app.api.v1.doctor import get_patient_clinical_detail

def run_3_patients_investigation():
    db = SessionLocal()
    try:
        # Check existing test doctor & hospital
        doctor = db.query(Doctor).first()
        hospital = db.query(Hospital).first()
        if not doctor or not hospital:
            print("No doctor or hospital found!")
            return

        print("\n=======================================================")
        print("OBSERVATION 4: 3 FRESH PATIENTS WITH DIFFERENT COMPLAINTS")
        print("=======================================================")

        cases = [
            {
                "name": "Patient A (GI Complaint)",
                "age": 34,
                "complaint": "Severe stomach cramping and loose motions since yesterday morning",
                "answers": [
                    ("open_gi_exploration", "Watery stools 4-5 times, mild fever, no blood"),
                    ("symptom_duration", "Started 2 days ago after eating outside")
                ]
            },
            {
                "name": "Patient B (Headache / Neurological)",
                "age": 28,
                "complaint": "Severe throbbing headache on right temple with extreme light sensitivity",
                "answers": [
                    ("open_headache_exploration", "Nausea is present, bright light hurts my eyes"),
                    ("symptom_duration", "Since last night, lasting about 12 hours")
                ]
            },
            {
                "name": "Patient C (Musculoskeletal / Joint)",
                "age": 58,
                "complaint": "Severe knee joint pain with swelling and stiffness when standing up",
                "answers": [
                    ("open_msk_exploration", "Both knees are stiff in the morning, clicking sound when walking"),
                    ("symptom_duration", "Persistent for the past 3 months, getting worse")
                ]
            }
        ]

        results = []

        for case in cases:
            print(f"\n--- Running: {case['name']} ---")
            # Create fresh patient
            patient = Patient(
                display_name=case["name"],
                age=case["age"],
                gender="OTHER",
                phone="9876543210"
            )
            db.add(patient)
            db.flush()

            # Create Intake Session
            token = f"TEST-{patient.id[:6].upper()}"
            session = IntakeSession(
                token=token,
                patient_id=patient.id,
                hospital_id=hospital.id,
                doctor_id=doctor.id,
                workflow_type="GENERAL_CLINICAL",
                language_code="en",
                status="ACTIVE"
            )
            db.add(session)
            db.flush()

            # Turn 1: Initial complaint
            asyncio.run(process_intake_answer_core(
                session=session,
                raw_text=case["complaint"],
                input_mode="text",
                language_code="en",
                audio_duration_seconds=None,
                question_event_id=None,
                db=db
            ))

            # Subsequent answers
            for target_f, ans_t in case["answers"]:
                q_ev = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == session.id).order_by(QuestionEvent.sequence_number.desc()).first()
                asyncio.run(process_intake_answer_core(
                    session=session,
                    raw_text=ans_t,
                    input_mode="text",
                    language_code="en",
                    audio_duration_seconds=None,
                    question_event_id=q_ev.id if q_ev else None,
                    db=db
                ))

            # Now fetch the backend API response via get_doctor_patient_detail
            # (We simulate current_user as a doctor dict)
            doctor_user = {"sub": doctor.id, "role": "DOCTOR"}
            api_detail = get_patient_clinical_detail(intake_id=session.id, db=db, _current_user=doctor_user)
            
            # Inspect raw DB models
            state_model = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == session.id).order_by(ClinicalStateModel.version.desc()).first()
            ayush_model = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()

            ayush_api = api_detail.ayush_assessment
            raw_state_ayush = api_detail.clinical_state.ayush if api_detail.clinical_state else None

            print(f"Token: {session.token}")
            print(f"DB AyushAssessmentModel exists: {ayush_model is not None}")
            if ayush_model:
                print(f"DB assessment_json: {json.dumps(ayush_model.assessment_json, indent=2)}")
            
            print(f"API ayush_assessment field: {ayush_api.model_dump() if ayush_api else None}")
            print(f"API clinical_state.ayush: {raw_state_ayush.model_dump() if raw_state_ayush else None}")

            # Collect comparison data
            results.append({
                "patient": case["name"],
                "token": session.token,
                "api_doshas": ayush_api.doshas if ayush_api else None,
                "api_prakriti": ayush_api.prakriti.value if (ayush_api and ayush_api.prakriti) else None,
                "api_vikriti": ayush_api.vikriti.value if (ayush_api and ayush_api.vikriti) else None,
                "api_agni": ayush_api.agni.value if (ayush_api and ayush_api.agni) else None,
                "api_koshtha": ayush_api.koshtha.value if (ayush_api and ayush_api.koshtha) else None,
                "api_vaya": ayush_api.vaya.value if (ayush_api and ayush_api.vaya) else None,
                "frontend_displayed_doshas": (ayush_api.doshas if ayush_api and ayush_api.doshas else [33, 33, 34]),
                "frontend_displayed_prakriti": (ayush_api.prakriti.value if (ayush_api and ayush_api.prakriti and ayush_api.prakriti.value) else "Vata-Pitta"),
                "frontend_displayed_vikriti": (ayush_api.vikriti.value if (ayush_api and ayush_api.vikriti and ayush_api.vikriti.value) else "Vata Dushti"),
                "frontend_displayed_agni": (ayush_api.agni.value if (ayush_api and ayush_api.agni and ayush_api.agni.value) else "Samagni (Normal)"),
                "frontend_displayed_koshtha": (ayush_api.koshtha.value if (ayush_api and ayush_api.koshtha and ayush_api.koshtha.value) else "Madhyam (Regular)"),
            })

        print("\n=======================================================")
        print("COMPARISON SUMMARY ACROSS PATIENTS A, B, C")
        print("=======================================================")
        for r in results:
            print(f"\n{r['patient']}:")
            print(f"  Raw API Payload: doshas={r['api_doshas']}, prakriti={r['api_prakriti']}, vikriti={r['api_vikriti']}, agni={r['api_agni']}, koshtha={r['api_koshtha']}, vaya={r['api_vaya']}")
            print(f"  Frontend Display: doshas={r['frontend_displayed_doshas']}, prakriti='{r['frontend_displayed_prakriti']}', vikriti='{r['frontend_displayed_vikriti']}', agni='{r['frontend_displayed_agni']}', koshtha='{r['frontend_displayed_koshtha']}'")

    finally:
        db.close()

def run_observation_5_investigation():
    print("\n=======================================================")
    print("OBSERVATION 5: BLOOD-IN-STOOL AT QUESTION 8 INVESTIGATION")
    print("=======================================================")
    db = SessionLocal()
    try:
        session_id = "2fde5943-6bce-49d0-b684-30d88d56bd68"
        session = db.query(IntakeSession).filter(IntakeSession.id == session_id).first()
        if not session:
            print(f"Session {session_id} not found!")
            return

        questions = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == session_id).order_by(QuestionEvent.sequence_number.asc()).all()
        answers = db.query(Answer).filter(Answer.intake_session_id == session_id).order_by(Answer.created_at.asc()).all()
        
        # Load state after Turn 7 (before Q8 was asked)
        states = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == session_id).order_by(ClinicalStateModel.version.asc()).all()
        print(f"Found {len(states)} state versions for dizziness session.")
        
        # Turn 7 corresponds to version 7
        st7_model = next((s for s in states if s.version == 7), states[-1])
        st7 = ClinicalState(**st7_model.state_json)

        print(f"\nState at Turn 7 (version {st7_model.version}):")
        print(f"  chief_complaint: {st7.chief_complaint}")
        print(f"  symptoms: {st7.symptoms}")
        print(f"  associated_symptoms: {st7.associated_symptoms}")
        print(f"  canonical_dimensions: {list(st7.canonical_dimensions.keys())}")
        print(f"  explored_areas: {st7.explored_areas}")
        print(f"  raw_transcript_snippets: {st7.raw_transcript_snippets}")

        # Classify domains
        domains = classify_clinical_domains(st7)
        print(f"  Classified domains: {domains}")

        # Asked targets up to Turn 7
        asked_targets = {q.target_field for q in questions if q.sequence_number <= 7 and q.target_field}
        asked_texts = [q.question_text for q in questions if q.sequence_number <= 7]
        print(f"  Asked targets up to Turn 7: {asked_targets}")

        # Run candidate scoring
        candidates = score_candidate_dimensions(
            domains=domains,
            state=st7,
            asked_questions=asked_texts,
            asked_target_fields=asked_targets
        )

        print("\nTop 10 Scored Question Candidates at Turn 7:")
        for idx, c in enumerate(candidates[:10]):
            print(f"  #{idx+1}: field={c['field_name']:<22} score={c['score']:<5} mode={c['reasoning_mode']:<18} domain={c['domain']:<15} canon={c['canonical_dimension']}")

        # Specifically inspect blood_in_stool candidate
        bis_c = next((c for c in candidates if c['field_name'] == 'blood_in_stool'), None)
        print(f"\nDetail for 'blood_in_stool' candidate:")
        print(f"  {bis_c}")

    finally:
        db.close()

if __name__ == "__main__":
    # run_3_patients_investigation()  # Already completed
    run_observation_5_investigation()
