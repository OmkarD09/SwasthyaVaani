import asyncio
import sys
import os
import uuid
sys.path.insert(0, os.getcwd())
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.intake import IntakeSession, QuestionEvent, ClinicalStateModel
from app.models.user import Patient, Doctor, Hospital
from app.api.v1.intakes import process_intake_answer_core
from app.schemas.clinical_state import ClinicalState


async def run_manual_validation():
    db = SessionLocal()
    print("==================================================")
    print("RUNNING MANUAL VALIDATION: FRESH MARATHI GI INTAKE")
    print("==================================================")

    # 1. Setup minimal seed models if needed
    hosp = db.query(Hospital).first()
    if not hosp:
        hosp = Hospital(name="City Hospital", code="CH01")
        db.add(hosp)
        db.flush()

    doc = db.query(Doctor).first()
    if not doc:
        doc = Doctor(name="Dr. Deshmukh", hospital_id=hosp.id, department="General Medicine")
        db.add(doc)
        db.flush()

    pat = db.query(Patient).first()
    if not pat:
        pat = Patient(full_name="Ramesh Patil", age=35, gender="Male", phone="9876543210")
        db.add(pat)
        db.flush()

    # 2. Create a fresh intake session
    session = IntakeSession(
        token=str(uuid.uuid4())[:8],
        patient_id=pat.id,
        hospital_id=hosp.id,
        doctor_id=doc.id,
        workflow_type="GENERAL_CLINICAL",
        interaction_mode="VOICE",
        language_code="mr",
        status="ACTIVE",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    print(f"\n[SESSION CREATED] ID: {session.id}, Lang: {session.language_code}, Mode: {session.interaction_mode}")

    # ==========================================================
    # TURN 1: Patient provides Chief Complaint
    # ==========================================================
    ans1_text = "माझं पोट खूप दुखत आहे"
    print(f"\n--- TURN 1: Patient Speaks ---")
    print(f"Patient Answer: \"{ans1_text}\"")

    res1 = await process_intake_answer_core(
        session=session,
        raw_text=ans1_text,
        input_mode="VOICE",
        language_code="mr",
        audio_duration_seconds=3.2,
        question_event_id=None,
        db=db,
    )
    db.refresh(session)

    # Inspect state after Turn 1
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == session.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == session.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print(f"State V{st1.version} Chief Complaint: {state1.chief_complaint}")
    print(f"Next Question (Seq {q1.sequence_number if q1 else 'None'}):")
    print(f"  Target: {q1.target_field if q1 else 'None'}")
    print(f"  Text: {q1.question_text if q1 else res1.next_question}")

    # ==========================================================
    # TURN 2: Patient affirms Vomiting
    # ==========================================================
    ans2_text = "उलटी येत आहे"
    print(f"\n--- TURN 2: Patient Speaks ---")
    print(f"Patient Answer: \"{ans2_text}\"")

    res2 = await process_intake_answer_core(
        session=session,
        raw_text=ans2_text,
        input_mode="VOICE",
        language_code="mr",
        audio_duration_seconds=2.1,
        question_event_id=q1.id if q1 else None,
        db=db,
    )
    db.refresh(session)

    # Inspect state after Turn 2
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == session.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == session.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print(f"\nState V{st2.version} Verification:")
    print(f"  Associated Symptoms: {state2.associated_symptoms}")
    vomit_canon = state2.canonical_dimensions.get("vomiting")
    print(f"  Canonical Dimensions['vomiting']: {vomit_canon.model_dump() if vomit_canon else 'MISSING'}")
    print(f"  Resolved Dimensions: {state2.resolved_dimensions}")

    print(f"\nAI Decision after learning vomiting:")
    print(f"  Decision Action: {res2.decision.action}")
    print(f"  Target Field: {q2.target_field if q2 else res2.decision.target_field}")
    print(f"  Question Text: {q2.question_text if q2 else res2.decision.question}")

    # ==========================================================
    # CRITICAL VALIDATION CHECKS
    # ==========================================================
    target_f = q2.target_field if q2 else res2.decision.target_field
    q_text = q2.question_text if q2 else (res2.decision.question or "")

    print("\n==================================================")
    print("VERIFICATION CHECKLIST:")
    print("==================================================")

    # Check 1: Vomiting is learned as KNOWN_TRUE
    check1 = vomit_canon is not None and vomit_canon.status in ["KNOWN_TRUE", "KNOWN_WITH_VALUE"]
    print(f"1. Vomiting learned as TRUE: {'PASSED' if check1 else 'FAILED'} (status={vomit_canon.status if vomit_canon else 'None'})")

    # Check 2: Exact binary vomiting question is NOT asked again
    check2 = target_f != "vomiting" and "उलटी झाली का" not in q_text and "उलट्या किंवा मळमळ होत आहे का" not in q_text
    print(f"2. Duplicate binary vomiting question eliminated: {'PASSED' if check2 else 'FAILED'}")

    # Check 3: Next question targets a useful unresolved/deeper GI dimension
    valid_gi_dims = ["hydration_status", "food_exposure", "duration", "stool_consistency", "stool_frequency", "dark_stool_onset", "bloating", "blood_in_stool", "meal_relationship"]
    check3 = target_f in valid_gi_dims
    print(f"3. Next question targets useful/deeper GI dimension ({target_f}): {'PASSED' if check3 else 'FAILED'}")

    # Check 4: No regression to unrelated domains (eye, msk, cardiac, etc.)
    unrelated_dims = ["blurred_vision", "eye_watering", "cough_type", "radiation_to_chest", "itching_pruritus", "rash_location"]
    check4 = target_f not in unrelated_dims
    print(f"4. No regression to unrelated domains: {'PASSED' if check4 else 'FAILED'}")

    db.close()

    all_passed = check1 and check2 and check3 and check4
    print("==================================================")
    print(f"MANUAL VALIDATION OVERALL RESULT: {'SUCCESS' if all_passed else 'FAILURE'}")
    print("==================================================")
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(run_manual_validation())
    sys.exit(0 if success else 1)
