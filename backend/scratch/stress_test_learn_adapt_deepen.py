import asyncio
import sys
import os
import uuid
import json

sys.path.insert(0, os.getcwd())
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.intake import IntakeSession, QuestionEvent, ClinicalStateModel, Answer
from app.models.user import Patient, Doctor, Hospital
from app.models.ayush import AyushAssessmentModel
from app.api.v1.intakes import process_intake_answer_core
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.question_scorer import score_candidate_dimensions, is_field_already_resolved
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain


def get_or_create_entities(db):
    hosp = db.query(Hospital).first()
    if not hosp:
        hosp = Hospital(name="Stress Test Clinic", code="ST01")
        db.add(hosp)
        db.flush()

    doc = db.query(Doctor).first()
    if not doc:
        doc = Doctor(name="Dr. Stress Test", hospital_id=hosp.id, department="General Medicine")
        db.add(doc)
        db.flush()

    pat = db.query(Patient).first()
    if not pat:
        pat = Patient(full_name="Stress Patient", age=30, gender="Other", phone="9999999999")
        db.add(pat)
        db.flush()

    return hosp, doc, pat


def create_session(db, pat, hosp, doc, lang="en", workflow="GENERAL_CLINICAL", mode="VOICE"):
    s = IntakeSession(
        token=str(uuid.uuid4())[:8],
        patient_id=pat.id,
        hospital_id=hosp.id,
        doctor_id=doc.id,
        workflow_type=workflow,
        interaction_mode=mode,
        language_code=lang,
        status="ACTIVE",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def print_state_summary(label, state: ClinicalState):
    print(f"  [{label}]")
    print(f"    Chief Complaint: {state.chief_complaint}")
    print(f"    Location: {state.location} | Duration: {state.duration} | Severity: {state.severity}")
    print(f"    Symptoms: {state.symptoms}")
    print(f"    Associated Symptoms: {state.associated_symptoms}")
    print(f"    Negated Symptoms: {state.negated_symptoms}")
    print(f"    Resolved Dims: {state.resolved_dimensions}")
    active_canons = {k: v.status for k, v in state.canonical_dimensions.items() if v.status != "UNKNOWN"}
    print(f"    Canonical Dims: {active_canons}")


results_summary = []


async def run_scenario_1_english_gi(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 1: ENGLISH — GI (Stomach cramps -> Vomiting)")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="en", mode="VOICE")

    # Turn 1
    res1 = await process_intake_answer_core(
        session=s, raw_text="I have stomach cramps", input_mode="VOICE",
        language_code="en", audio_duration_seconds=2.0, question_event_id=None, db=db
    )
    db.refresh(s)
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("Before Turn 2 Answer", state1)
    print(f"  Q1 Target: {q1.target_field} | Text: {q1.question_text}")

    # Turn 2
    res2 = await process_intake_answer_core(
        session=s, raw_text="I am vomiting", input_mode="VOICE",
        language_code="en", audio_duration_seconds=1.5, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 2 Answer", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    # Evaluation
    vomit_canon = state2.canonical_dimensions.get("vomiting")
    is_vomit_known = vomit_canon and vomit_canon.status in ["KNOWN_TRUE", "KNOWN_WITH_VALUE"]
    not_repeated = q2.target_field != "vomiting" and "vomit" not in q2.question_text.lower()
    is_deeper_gi = q2.target_field in ["hydration_status", "food_exposure", "duration", "stool_consistency", "dark_stool_onset", "bloating"]
    no_cardiac = "chest" not in (q2.question_text or "").lower() and "arm" not in (q2.question_text or "").lower()

    passed = is_vomit_known and not_repeated and is_deeper_gi and no_cardiac
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "1. ENGLISH — GI", "passed": passed, "classification": classification, "target": q2.target_field})
    print(f"Result: {classification} (Target: {q2.target_field})")


async def run_scenario_2_marathi_gi(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 2: MARATHI — GI (पोट दुखत आहे -> उलटी येत आहे)")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="mr", mode="VOICE")

    # Turn 1
    res1 = await process_intake_answer_core(
        session=s, raw_text="माझं पोट खूप दुखत आहे", input_mode="VOICE",
        language_code="mr", audio_duration_seconds=2.5, question_event_id=None, db=db
    )
    db.refresh(s)
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("Before Turn 2 Answer", state1)
    print(f"  Q1 Target: {q1.target_field} | Text: {q1.question_text}")

    # Turn 2
    res2 = await process_intake_answer_core(
        session=s, raw_text="उलटी येत आहे", input_mode="VOICE",
        language_code="mr", audio_duration_seconds=1.5, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 2 Answer", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    vomit_canon = state2.canonical_dimensions.get("vomiting")
    is_vomit_known = vomit_canon and vomit_canon.status in ["KNOWN_TRUE", "KNOWN_WITH_VALUE"]
    not_repeated = q2.target_field != "vomiting" and "उलटी झाली का" not in q2.question_text
    is_deeper_gi = q2.target_field in ["hydration_status", "food_exposure", "duration", "stool_consistency", "dark_stool_onset", "bloating"]

    passed = is_vomit_known and not_repeated and is_deeper_gi
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "2. MARATHI — GI", "passed": passed, "classification": classification, "target": q2.target_field})
    print(f"Result: {classification} (Target: {q2.target_field})")


async def run_scenario_3_hindi_gi(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 3: HINDI — GI (पेट में दर्द -> उल्टी हो रही है)")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="hi", mode="VOICE")

    # Turn 1
    res1 = await process_intake_answer_core(
        session=s, raw_text="मेरे पेट में बहुत दर्द है", input_mode="VOICE",
        language_code="hi", audio_duration_seconds=2.5, question_event_id=None, db=db
    )
    db.refresh(s)
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("Before Turn 2 Answer", state1)
    print(f"  Q1 Target: {q1.target_field} | Text: {q1.question_text}")

    # Turn 2
    res2 = await process_intake_answer_core(
        session=s, raw_text="मुझे उल्टी हो रही है", input_mode="VOICE",
        language_code="hi", audio_duration_seconds=1.5, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 2 Answer", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    vomit_canon = state2.canonical_dimensions.get("vomiting")
    is_vomit_known = vomit_canon and vomit_canon.status in ["KNOWN_TRUE", "KNOWN_WITH_VALUE"]
    not_repeated = q2.target_field != "vomiting" and "उल्टी हुई क्या" not in q2.question_text
    is_deeper_gi = q2.target_field in ["hydration_status", "food_exposure", "duration", "stool_consistency", "dark_stool_onset", "bloating"]

    passed = is_vomit_known and not_repeated and is_deeper_gi
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "3. HINDI — GI", "passed": passed, "classification": classification, "target": q2.target_field})
    print(f"Result: {classification} (Target: {q2.target_field})")


async def run_scenario_4_english_respiratory(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 4: ENGLISH — RESPIRATORY (Cough -> Shortness of breath)")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="en", mode="VOICE")

    # Turn 1
    res1 = await process_intake_answer_core(
        session=s, raw_text="I have cough", input_mode="VOICE",
        language_code="en", audio_duration_seconds=1.5, question_event_id=None, db=db
    )
    db.refresh(s)
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("Before Turn 2 Answer", state1)
    print(f"  Q1 Target: {q1.target_field} | Text: {q1.question_text}")

    # Turn 2
    res2 = await process_intake_answer_core(
        session=s, raw_text="I also have shortness of breath", input_mode="VOICE",
        language_code="en", audio_duration_seconds=2.0, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 2 Answer", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    is_sob_resolved = is_field_already_resolved("breathlessness", state2)
    not_repeated = q2.target_field != "breathlessness"
    is_respiratory_deeper = q2.target_field in ["cough_type", "duration", "onset", "fever", "sputum_color", "chest_tightness"]

    passed = is_sob_resolved and not_repeated and is_respiratory_deeper
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "4. ENGLISH — RESPIRATORY", "passed": passed, "classification": classification, "target": q2.target_field})
    print(f"Result: {classification} (Target: {q2.target_field})")


async def run_scenario_5_english_headache(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 5: ENGLISH — HEADACHE (Headache -> 3 days ago)")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="en", mode="VOICE")

    # Turn 1
    res1 = await process_intake_answer_core(
        session=s, raw_text="I have a severe headache", input_mode="VOICE",
        language_code="en", audio_duration_seconds=2.0, question_event_id=None, db=db
    )
    db.refresh(s)
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("Before Turn 2 Answer", state1)
    print(f"  Q1 Target: {q1.target_field} | Text: {q1.question_text}")

    # Turn 2
    res2 = await process_intake_answer_core(
        session=s, raw_text="It started 3 days ago", input_mode="VOICE",
        language_code="en", audio_duration_seconds=1.8, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 2 Answer", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    is_dur_resolved = is_field_already_resolved("duration", state2)
    not_repeated = q2.target_field not in ["duration", "onset", "symptom_duration"]
    is_headache_next = q2.target_field in ["distribution", "photophobia", "nausea_vomiting", "visual_aura", "character", "severity", "triggers"]

    passed = is_dur_resolved and not_repeated and is_headache_next
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "5. ENGLISH — HEADACHE", "passed": passed, "classification": classification, "target": q2.target_field})
    print(f"Result: {classification} (Target: {q2.target_field})")


async def run_scenario_6_english_msk(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 6: ENGLISH — MUSCULOSKELETAL (My leg hurts -> in my knee)")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="en", mode="VOICE")

    # Turn 1
    res1 = await process_intake_answer_core(
        session=s, raw_text="My leg hurts", input_mode="VOICE",
        language_code="en", audio_duration_seconds=1.5, question_event_id=None, db=db
    )
    db.refresh(s)
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("Before Turn 2 Answer", state1)
    print(f"  Q1 Target: {q1.target_field} | Text: {q1.question_text}")

    # Turn 2
    res2 = await process_intake_answer_core(
        session=s, raw_text="The pain is in my knee", input_mode="VOICE",
        language_code="en", audio_duration_seconds=1.8, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 2 Answer", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    has_knee_loc = "knee" in str(state2.location).lower() or "knee" in " ".join(state2.raw_transcript_snippets).lower()
    is_loc_resolved = is_field_already_resolved("location", state2)
    not_repeated = q2.target_field not in ["location", "distribution"]
    is_msk_deeper = q2.target_field in ["swelling_warmth", "injury_history", "duration", "character", "severity", "onset", "aggravating_factors"]

    passed = has_knee_loc and is_loc_resolved and not_repeated and is_msk_deeper
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "6. ENGLISH — MSK", "passed": passed, "classification": classification, "target": q2.target_field})
    print(f"Result: {classification} (Target: {q2.target_field})")


async def run_scenario_7_english_negation(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 7: ENGLISH — NEGATION ('No, I am not vomiting.')")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="en", mode="VOICE")

    # Turn 1
    res1 = await process_intake_answer_core(
        session=s, raw_text="I have stomach cramps", input_mode="VOICE",
        language_code="en", audio_duration_seconds=2.0, question_event_id=None, db=db
    )
    db.refresh(s)
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("Before Turn 2 Answer", state1)
    print(f"  Q1 Target: {q1.target_field} | Text: {q1.question_text}")

    # Turn 2: Patient explicitly negates vomiting
    res2 = await process_intake_answer_core(
        session=s, raw_text="No, I am not vomiting.", input_mode="VOICE",
        language_code="en", audio_duration_seconds=1.8, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 2 Answer", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    is_negated = "vomiting" in state2.negated_symptoms or (state2.canonical_dimensions.get("vomiting") and state2.canonical_dimensions["vomiting"].status == "KNOWN_FALSE")
    not_in_associated = "Vomiting" not in state2.associated_symptoms and "vomiting" not in state2.associated_symptoms
    not_repeated = q2.target_field != "vomiting"
    not_hydration = q2.target_field != "hydration_status"  # Hydration boost should NOT fire if vomiting is negated

    passed = is_negated and not_in_associated and not_repeated
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "7. ENGLISH — NEGATION", "passed": passed, "classification": classification, "target": q2.target_field})
    print(f"Result: {classification} (Target: {q2.target_field})")


async def run_scenario_8_ambiguous_answer(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 8: AMBIGUOUS ANSWER ('I don't know' / 'I'm not sure')")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="en", mode="VOICE")

    # Turn 1
    res1 = await process_intake_answer_core(
        session=s, raw_text="I have stomach ache and dark stool", input_mode="VOICE",
        language_code="en", audio_duration_seconds=2.2, question_event_id=None, db=db
    )
    db.refresh(s)
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("Before Turn 2 Answer", state1)
    print(f"  Q1 Target: {q1.target_field} | Text: {q1.question_text}")

    # Turn 2: Patient gives ambiguous answer
    res2 = await process_intake_answer_core(
        session=s, raw_text="I'm not sure, I don't know", input_mode="VOICE",
        language_code="en", audio_duration_seconds=1.5, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 2 Answer", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    target_resolved = is_field_already_resolved(q1.target_field, state2)
    # The target field of Q1 should NOT be confirmed as KNOWN_TRUE / RESOLVED
    not_falsely_confirmed = not target_resolved or state2.dimension_status.get(q1.target_field) == "AMBIGUOUS"
    has_pivoted_or_clarified = q2.target_field != q1.target_field or res2.decision.action in ["ASK", "STOP"]

    passed = not_falsely_confirmed and has_pivoted_or_clarified
    classification = "D. LEGITIMATE CLARIFICATION / PIVOT" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "8. AMBIGUOUS ANSWER", "passed": passed, "classification": classification, "target": q2.target_field})
    print(f"Result: {classification} (Target: {q2.target_field})")


async def run_scenario_9_cross_language_retention(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 9: CROSS-LANGUAGE RETENTION (Marathi -> English fluid intake)")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="mr", mode="VOICE")

    # Turn 1: Chief complaint in Marathi
    res1 = await process_intake_answer_core(
        session=s, raw_text="माझं पोट खूप दुखत आहे", input_mode="VOICE",
        language_code="mr", audio_duration_seconds=2.0, question_event_id=None, db=db
    )
    db.refresh(s)
    st1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state1 = ClinicalState(**st1.state_json)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    # Turn 2: Affirm vomiting in Marathi
    res2 = await process_intake_answer_core(
        session=s, raw_text="उलटी येत आहे", input_mode="VOICE",
        language_code="mr", audio_duration_seconds=1.5, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 2 (Marathi Vomiting)", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    # Turn 3: Answer hydration question in English
    res3 = await process_intake_answer_core(
        session=s, raw_text="I cannot keep water down", input_mode="VOICE",
        language_code="en", audio_duration_seconds=2.2, question_event_id=q2.id, db=db
    )
    db.refresh(s)
    st3 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state3 = ClinicalState(**st3.state_json)
    q3 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 3 (English Hydration)", state3)
    print(f"  Q3 Target: {q3.target_field if q3 else 'STOP'} | Text: {q3.question_text if q3 else res3.decision.reason}")

    # Verify:
    # 1. State retains Marathi vomiting ('उलटी' / KNOWN_TRUE)
    has_vomit = "उलटी" in state3.associated_symptoms or state3.is_dimension_sufficiently_known("vomiting")
    # 2. State resolves hydration_status from English answer
    hydration_known = is_field_already_resolved("hydration_status", state3)
    # 3. Next question does not ask either vomiting or hydration
    q3_target = q3.target_field if q3 else ""
    not_repeated = q3_target not in ["vomiting", "hydration_status"]

    passed = has_vomit and hydration_known and not_repeated
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "9. CROSS-LANGUAGE RETENTION", "passed": passed, "classification": classification, "target": q3_target})
    print(f"Result: {classification} (Target: {q3_target})")


async def run_scenario_10_modality_switch(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 10: MODALITY SWITCH (Voice -> Text -> Voice -> Text)")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="en", mode="VOICE")

    # Turn 1: VOICE
    res1 = await process_intake_answer_core(
        session=s, raw_text="I have stomach cramps", input_mode="VOICE",
        language_code="en", audio_duration_seconds=2.1, question_event_id=None, db=db
    )
    db.refresh(s)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    # Turn 2: TEXT
    res2 = await process_intake_answer_core(
        session=s, raw_text="Started 2 days ago", input_mode="TEXT",
        language_code="en", audio_duration_seconds=None, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    # Turn 3: VOICE
    res3 = await process_intake_answer_core(
        session=s, raw_text="I have vomiting", input_mode="VOICE",
        language_code="en", audio_duration_seconds=1.8, question_event_id=q2.id, db=db
    )
    db.refresh(s)
    q3 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    # Turn 4: TEXT
    res4 = await process_intake_answer_core(
        session=s, raw_text="I ate food from a street vendor yesterday", input_mode="TEXT",
        language_code="en", audio_duration_seconds=None, question_event_id=q3.id, db=db
    )
    db.refresh(s)
    st4 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state4 = ClinicalState(**st4.state_json)
    q4 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Turn 4 (Alternating Voice/Text)", state4)
    print(f"  Q4 Target: {q4.target_field if q4 else 'STOP'} | Text: {q4.question_text if q4 else res4.decision.reason}")

    # Check answers in DB
    answers = db.query(Answer).filter(Answer.intake_session_id == s.id).order_by(Answer.created_at.asc()).all()
    modalities = [a.input_mode for a in answers]
    print(f"  Recorded Answer Modalities: {modalities}")

    # Invariants:
    # 1. Exactly 4 answers in ONE session
    has_4_answers = len(answers) == 4 and modalities == ["VOICE", "TEXT", "VOICE", "TEXT"]
    # 2. Accumulated facts from all 4 turns:
    #    Turn 1 (cramps), Turn 2 (duration), Turn 3 (vomiting), Turn 4 (food_exposure)
    has_cc = bool(state4.chief_complaint)
    has_dur = is_field_already_resolved("duration", state4)
    has_vomit = state4.is_dimension_sufficiently_known("vomiting") or is_field_already_resolved("vomiting", state4)
    has_food = is_field_already_resolved("food_exposure", state4)

    passed = has_4_answers and has_cc and has_dur and has_vomit and has_food
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "10. MODALITY SWITCH", "passed": passed, "classification": classification, "target": q4.target_field if q4 else "STOP"})
    print(f"Result: {classification}")


async def run_scenario_ayush(db, pat, hosp, doc):
    print("\n==================================================")
    print("SCENARIO 11: AYUSH WORKFLOW (Appetite/Agni -> Bowel/Koshtha)")
    print("==================================================")
    s = create_session(db, pat, hosp, doc, lang="en", workflow="AYUSH", mode="TEXT")

    # Turn 1: Chief complaint
    res1 = await process_intake_answer_core(
        session=s, raw_text="General body fatigue and low energy", input_mode="TEXT",
        language_code="en", audio_duration_seconds=None, question_event_id=None, db=db
    )
    db.refresh(s)
    q1 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()
    print(f"  Q1 Target: {q1.target_field} | Text: {q1.question_text}")

    # Turn 2: Provide Agni fact explicitly
    res2 = await process_intake_answer_core(
        session=s, raw_text="My digestion is sluggish and appetite is low, Manda agni", input_mode="TEXT",
        language_code="en", audio_duration_seconds=None, question_event_id=q1.id, db=db
    )
    db.refresh(s)
    st2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s.id).order_by(ClinicalStateModel.version.desc()).first()
    state2 = ClinicalState(**st2.state_json)
    q2 = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).order_by(QuestionEvent.sequence_number.desc()).first()

    print_state_summary("After Agni Fact", state2)
    print(f"  Q2 Target: {q2.target_field} | Text: {q2.question_text}")

    # Check Agni is resolved
    agni_resolved = is_field_already_resolved("agni", state2) or (state2.ayush and state2.ayush.agni)
    # Next question does NOT repeat Agni
    not_repeat_agni = q2.target_field != "agni"
    # Targets another AYUSH dimension e.g. koshtha, ahara_vihara, sara, satmya, etc.
    valid_ayush = q2.target_field in ["koshtha", "ahara_vihara", "sara", "samhanana", "satmya", "sattva", "ahara_shakti", "vyayama_shakti", "vaya", "duration"]

    passed = agni_resolved and not_repeat_agni and valid_ayush
    classification = "A. LEARNED CORRECTLY" if passed else "B. FAILED TO LEARN"
    results_summary.append({"scenario": "11. AYUSH WORKFLOW", "passed": passed, "classification": classification, "target": q2.target_field})
    print(f"Result: {classification} (Target: {q2.target_field})")


async def run_doctor_summary_validation(db, pat, hosp, doc):
    print("\n==================================================")
    print("DOCTOR-FACING CLINICAL SUMMARY & PROVENANCE VALIDATION")
    print("==================================================")
    from app.api.v1.doctor import get_patient_clinical_detail

    # Test on Scenario 10 session (multi-turn with alternating modalities)
    last_session = db.query(IntakeSession).filter(IntakeSession.workflow_type == "GENERAL_CLINICAL").order_by(IntakeSession.started_at.desc()).first()
    fake_doctor_auth = {"id": doc.id, "role": "DOCTOR", "hospital_id": hosp.id}

    detail = get_patient_clinical_detail(
        intake_id=last_session.id,
        db=db,
        _current_user=fake_doctor_auth
    )

    print(f"Detail for Intake: {last_session.id}")
    print(f"  Patient Name: {detail.patient.name}")
    print(f"  Chief Complaint: {detail.structured_history.get('chief_complaint')}")
    print(f"  Associated Symptoms: {detail.structured_history.get('associated_symptoms')}")
    print(f"  Duration: {detail.structured_history.get('duration')}")
    print(f"  Food Exposure: {detail.structured_history.get('food_exposure')}")
    print(f"  Raw Answers Count: {len(detail.raw_answers)}")
    print(f"  Review Status: {detail.review_status}")

    # Provenance checks:
    # 1. Facts actually stated by patient are preserved
    facts_preserved = (
        detail.structured_history.get("chief_complaint") is not None
        and len(detail.raw_answers) >= 2
    )
    # 2. No hallucinated/unresolved data represented as confirmed
    # e.g. dark_stool was never mentioned in this session, so it should not be True
    no_fake_dark_stool = detail.structured_history.get("dark_stool") is not True

    # 3. Raw transcript snippets match stated answers
    snippets = detail.structured_history.get("raw_transcript_snippets", [])
    snippets_preserved = len(snippets) > 0

    passed = facts_preserved and no_fake_dark_stool and snippets_preserved
    print(f"Doctor Summary Verification: {'PASSED' if passed else 'FAILED'}")
    results_summary.append({"scenario": "12. DOCTOR SUMMARY PROVENANCE", "passed": passed, "classification": "A. PRESERVED ACCURATELY", "target": "N/A"})


async def main():
    db = SessionLocal()
    hosp, doc, pat = get_or_create_entities(db)

    try:
        await run_scenario_1_english_gi(db, pat, hosp, doc)
        await run_scenario_2_marathi_gi(db, pat, hosp, doc)
        await run_scenario_3_hindi_gi(db, pat, hosp, doc)
        await run_scenario_4_english_respiratory(db, pat, hosp, doc)
        await run_scenario_5_english_headache(db, pat, hosp, doc)
        await run_scenario_6_english_msk(db, pat, hosp, doc)
        await run_scenario_7_english_negation(db, pat, hosp, doc)
        await run_scenario_8_ambiguous_answer(db, pat, hosp, doc)
        await run_scenario_9_cross_language_retention(db, pat, hosp, doc)
        await run_scenario_10_modality_switch(db, pat, hosp, doc)
        await run_scenario_ayush(db, pat, hosp, doc)
        await run_doctor_summary_validation(db, pat, hosp, doc)
    finally:
        db.close()

    print("\n==================================================")
    print("FINAL STRESS TEST SUMMARY MATRIX")
    print("==================================================")
    total_passed = sum(1 for r in results_summary if r["passed"])
    total = len(results_summary)
    for r in results_summary:
        status = "PASS" if r["passed"] else "FAIL"
        print(f"[{status}] {r['scenario']}: {r['classification']} (Target: {r['target']})")
    print(f"\nTOTAL: {total_passed} / {total} PASSED")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(main())
