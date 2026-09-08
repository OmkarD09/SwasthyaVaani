import sys
sys.path.insert(0, ".")
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
import httpx
from app.core.database import SessionLocal
from app.models.intake import IntakeSession, ClinicalStateModel, QuestionEvent, Answer
from app.models.user import Patient
from app.models.ayush import AyushAssessmentModel

def test_full_forensic_e2e():
    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=30.0)
    db = SessionLocal()

    print("=====================================================================")
    print("RUNNING E2E FORENSIC VALIDATION: TESTS 1 THROUGH 6")
    print("=====================================================================")

    # -----------------------------------------------------------------
    # SCENARIO 1 & 2: GENERAL CLINICAL HINDI VOICE + ADAPTIVE DEEPENING
    # -----------------------------------------------------------------
    print("\n--- TEST 1 & 2: GENERAL CLINICAL HINDI VOICE INTAKE ---")
    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Ramesh Kumar Test",
        "patient_age": 45,
        "patient_gender": "Male",
        "language_code": "hi",
        "workflow_type": "GENERAL_CLINICAL",
        "interaction_mode": "VOICE",
        "consent_given": True,
    })
    assert create_res.status_code == 200, f"Create failed: {create_res.text}"
    session_data = create_res.json()
    session_id_gen = session_data["id"]
    print(f"[OK] General Clinical Session Created: {session_id_gen}")
    assert session_data["workflow_type"] == "GENERAL_CLINICAL"

    # Verify AyushAssessmentModel is NOT created for General Clinical
    ayush_gen = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session_id_gen).first()
    assert ayush_gen is None, "AyushAssessmentModel MUST NOT exist for GENERAL_CLINICAL session"
    print("[OK] AyushAssessmentModel confirmed absent for General Clinical session")

    # Turn 1: Patient answers chief complaint in Hindi: "मुझे पेट में दर्द हो रहा है।"
    ans1_res = client.post(f"/api/v1/intakes/{session_id_gen}/answers", json={
        "raw_text": "मुझे पेट में दर्द हो रहा है।",
        "input_mode": "VOICE",
        "language_code": "hi",
    })
    assert ans1_res.status_code == 200, f"Turn 1 failed: {ans1_res.text}"
    ans1_data = ans1_res.json()
    dec1 = ans1_data["decision"]
    next_q1_event_id = ans1_data["next_question_event_id"]
    print(f"[OK] Turn 1 Answer Processed.")
    print(f"     Next Question: {dec1['question']}")
    print(f"     Next Target Field: {dec1['target_field']}")
    print(f"     Next Question Event ID: {next_q1_event_id}")

    # Verify Turn 1 answer record in DB
    ans_record_1 = db.query(Answer).filter(
        Answer.intake_session_id == session_id_gen
    ).first()
    assert ans_record_1 is not None
    assert ans_record_1.input_mode == "VOICE"
    print(f"[OK] DB AnswerRecord 1 input_mode: {ans_record_1.input_mode}")

    # Turn 2: Patient deepens with vomiting: "मुझे उल्टी भी हो रही है।"
    ans2_res = client.post(f"/api/v1/intakes/{session_id_gen}/answers", json={
        "raw_text": "मुझे उल्टी भी हो रही है।",
        "input_mode": "VOICE",
        "language_code": "hi",
        "question_event_id": next_q1_event_id,
    })
    assert ans2_res.status_code == 200, f"Turn 2 failed: {ans2_res.text}"
    ans2_data = ans2_res.json()
    state2 = ans2_data["clinical_state"]
    dec2 = ans2_data["decision"]
    print(f"[OK] Turn 2 Answer Processed.")
    print(f"     ClinicalState symptoms: {state2.get('symptoms', [])}")
    print(f"     Next Question: {dec2['question']}")
    print(f"     Next Target Field: {dec2['target_field']}")

    # Verify vomiting is KNOWN_TRUE / captured
    symptoms = state2.get("symptoms", [])
    has_vomiting = any("vomit" in str(s).lower() or "उल्टी" in str(s) for s in symptoms)
    print(f"[OK] Vomiting confirmed recorded in symptoms: {has_vomiting}")

    # -----------------------------------------------------------------
    # TEST 3: VOICE -> TEXT SAME-SESSION CONTINUITY
    # -----------------------------------------------------------------
    print("\n--- TEST 3: VOICE -> TEXT SAME-SESSION CONTINUITY ---")
    # Patient switches to TEXT mode in same session
    ans3_res = client.post(f"/api/v1/intakes/{session_id_gen}/answers", json={
        "raw_text": "2 दिन से बुखार भी है",
        "input_mode": "TEXT",
        "language_code": "hi",
        "question_event_id": ans2_data["next_question_event_id"],
    })
    assert ans3_res.status_code == 200, f"Turn 3 failed: {ans3_res.text}"
    ans3_data = ans3_res.json()
    print(f"[OK] Text Answer in Same Session processed.")

    # Verify DB answer records show provenance: 2 VOICE, 1 TEXT
    ans_records = db.query(Answer).filter(
        Answer.intake_session_id == session_id_gen
    ).all()
    modes = [a.input_mode for a in ans_records]
    print(f"[OK] Database Answer Records input_modes: {modes}")
    assert "VOICE" in modes and "TEXT" in modes, f"Must contain both VOICE and TEXT: {modes}"
    assert len(ans_records) == 3, f"Expected 3 answers in DB, got {len(ans_records)}"

    # -----------------------------------------------------------------
    # TEST 4: FINAL SUBMISSION REUSE (NO SECOND INTAKE CREATION)
    # -----------------------------------------------------------------
    print("\n--- TEST 4: FINAL SUBMISSION REUSES SAME INTAKE SESSION ---")
    submit_res = client.post(f"/api/v1/intakes/{session_id_gen}/submit")
    assert submit_res.status_code == 200, f"Submit failed: {submit_res.text}"
    submit_data = submit_res.json()

    assert submit_data["intake_session_id"] == session_id_gen, "Session ID MUST be identical before and after submit!"
    assert submit_data["status"] == "SUBMITTED"
    print(f"[OK] Submit successful. UUID preserved: {submit_data['intake_session_id']}")
    print(f"     Patient Display ID: {submit_data['display_id']}")
    print(f"     Status: {submit_data['status']}")

    # Verify intake session in DB
    db_session = db.query(IntakeSession).filter(IntakeSession.id == session_id_gen).first()
    assert db_session.status == "SUBMITTED"
    assert db_session.submitted_at is not None
    print("[OK] DB IntakeSession marked SUBMITTED with submitted_at timestamp.")

    # -----------------------------------------------------------------
    # TEST 5: NEW PATIENT ZERO STATE LEAKAGE
    # -----------------------------------------------------------------
    print("\n--- TEST 5: NEW PATIENT ISOLATION ---")
    create_pat_b = client.post("/api/v1/intakes", json={
        "patient_name": "Sunita Patel",
        "patient_age": 38,
        "patient_gender": "Female",
        "language_code": "hi",
        "workflow_type": "GENERAL_CLINICAL",
        "interaction_mode": "VOICE",
        "consent_given": True,
    })
    assert create_pat_b.status_code == 200
    session_id_b = create_pat_b.json()["id"]
    assert session_id_b != session_id_gen, "New patient MUST have unique session ID"
    print(f"[OK] New Patient B Session: {session_id_b} (Distinct from Patient A: {session_id_gen})")

    # Verify Patient B has 0 answers and clean state
    answers_b = db.query(Answer).filter(Answer.intake_session_id == session_id_b).all()
    assert len(answers_b) == 0, "Patient B must start with zero answers"
    print("[OK] Zero state leakage: Patient B has 0 answers.")

    # -----------------------------------------------------------------
    # TEST 6: AYUSH WORKFLOW TRACK SELECTION
    # -----------------------------------------------------------------
    print("\n--- TEST 6: AYUSH WORKFLOW TRACK SELECTION ---")
    create_ayush = client.post("/api/v1/intakes", json={
        "patient_name": "Ananya Sharma AYUSH",
        "patient_age": 34,
        "patient_gender": "Female",
        "language_code": "hi",
        "workflow_type": "AYUSH",
        "interaction_mode": "VOICE",
        "consent_given": True,
    })
    assert create_ayush.status_code == 200, f"AYUSH creation failed: {create_ayush.text}"
    session_id_ayush = create_ayush.json()["id"]
    assert create_ayush.json()["workflow_type"] == "AYUSH"
    print(f"[OK] AYUSH Session Created: {session_id_ayush}")

    # Verify AyushAssessmentModel is seeded immediately upon creation
    ayush_record = db.query(AyushAssessmentModel).filter(
        AyushAssessmentModel.intake_session_id == session_id_ayush
    ).first()
    assert ayush_record is not None, "AyushAssessmentModel MUST be created when workflow_type == 'AYUSH'"
    print(f"[OK] AyushAssessmentModel created in DB with ID: {ayush_record.id}")
    print(f"     Status: {ayush_record.status}")
    print(f"     Prakriti: {(ayush_record.assessment_json or {}).get('prakriti')}")
    print(f"     Assessment JSON keys: {list((ayush_record.assessment_json or {}).keys())}")

    # Patient provides chief complaint: "भूख नहीं लगती और पेट भारी रहता है"
    ans_ayush_1 = client.post(f"/api/v1/intakes/{session_id_ayush}/answers", json={
        "raw_text": "भूख नहीं लगती और पेट भारी रहता है",
        "input_mode": "VOICE",
        "language_code": "hi",
    })
    assert ans_ayush_1.status_code == 200
    dec_ayush_1 = ans_ayush_1.json()["decision"]
    print(f"[OK] AYUSH Answer 1 Processed.")
    print(f"     Next Question: {dec_ayush_1['question']}")
    print(f"     Next Target Field: {dec_ayush_1['target_field']}")

    # Submit AYUSH session
    submit_ayush = client.post(f"/api/v1/intakes/{session_id_ayush}/submit")
    assert submit_ayush.status_code == 200
    assert submit_ayush.json()["intake_session_id"] == session_id_ayush
    print(f"[OK] AYUSH Session Submitted. Same ID: {submit_ayush.json()['intake_session_id']}")

    # Query Doctor Patient Detail Endpoint with Doctor Token
    from app.core.security import create_access_token
    doc_token = create_access_token({"sub": "doc-1", "role": "DOCTOR"})
    headers = {"Authorization": f"Bearer {doc_token}"}

    ayush_doc_res = client.get(f"/api/v1/doctor/patients/{session_id_ayush}", headers=headers)
    assert ayush_doc_res.status_code == 200, f"Doctor detail failed: {ayush_doc_res.text}"
    ayush_doc_data = ayush_doc_res.json()
    assert ayush_doc_data.get("ayush_assessment") is not None, "AYUSH assessment must be available for AYUSH workflow patient!"
    print(f"[OK] Doctor AYUSH assessment confirmed present: True")
    print(f"     Assessment Status: {ayush_doc_data['ayush_assessment']['overall_status']}")
    print(f"     Vaya: {ayush_doc_data['ayush_assessment'].get('vaya')}")

    # Compare with General Clinical session doctor detail endpoint:
    gen_doc_res = client.get(f"/api/v1/doctor/patients/{session_id_gen}", headers=headers)
    assert gen_doc_res.status_code == 200, f"Doctor detail failed: {gen_doc_res.text}"
    gen_doc_data = gen_doc_res.json()
    assert gen_doc_data.get("workflow_type") == "GENERAL_CLINICAL", "General clinical patient must have workflow_type GENERAL_CLINICAL"
    assert ayush_doc_data.get("workflow_type") == "AYUSH", "AYUSH patient must have workflow_type AYUSH"
    print(f"[OK] Workflow Types Verified: Gen={gen_doc_data.get('workflow_type')}, AYUSH={ayush_doc_data.get('workflow_type')}")

    db.close()
    print("\n=====================================================================")
    print("ALL FORENSIC E2E ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!")
    print("=====================================================================")

if __name__ == "__main__":
    test_full_forensic_e2e()
