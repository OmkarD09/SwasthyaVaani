import pytest
from fastapi.testclient import TestClient
from app.seed.seed_data import seed_database
from app.models.intake import QuestionEvent, ClinicalStateModel, IntakeSession


def test_red_eye_http_conversation_chaining_and_deduplication(client: TestClient, db):
    """
    HTTP Integration Test:
    Turn 1: "red eyes" -> returns Q1 (open_ophthalmic_exploration) + q_event_id_1
    Turn 2: "blurred vision" + q_event_id_1 -> returns Q2 (eye_watering / light_sensitivity) + q_event_id_2
    Turn 3: "10 days" + q_event_id_2 -> stops or asks remaining dimension, NEVER repeating duration/onset/blurred vision
    """
    seed_database(db)

    # 1. Start fresh session
    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Test Red Eye Patient",
        "patient_age": 28,
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert create_res.status_code == 200
    session_id = create_res.json()["id"]

    # Turn 1: Patient reports "red eyes" (First turn, no previous QuestionEvent)
    res_t1 = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "red eyes",
        "input_mode": "TEXT",
        "language_code": "en"
    })
    assert res_t1.status_code == 200
    data_t1 = res_t1.json()
    q_event_id_1 = data_t1.get("question_event_id") or data_t1["decision"].get("question_event_id")
    assert q_event_id_1 is not None, "Backend must return new question_event_id on Turn 1"
    assert data_t1["decision"]["action"] == "ASK"
    target_field_1 = data_t1["decision"]["target_field"]
    assert target_field_1 == "open_ophthalmic_exploration"

    # Verify QuestionEvent 1 persisted in DB
    db_q1 = db.query(QuestionEvent).filter(QuestionEvent.id == q_event_id_1).first()
    assert db_q1 is not None
    assert db_q1.target_field == "open_ophthalmic_exploration"
    assert db_q1.intake_session_id == session_id

    # Turn 2: Patient answers "blurred vision" with q_event_id_1
    res_t2 = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "blurred vision",
        "input_mode": "TEXT",
        "language_code": "en",
        "question_event_id": q_event_id_1
    })
    assert res_t2.status_code == 200
    data_t2 = res_t2.json()
    q_event_id_2 = data_t2.get("question_event_id") or data_t2["decision"].get("question_event_id")
    assert q_event_id_2 is not None
    assert q_event_id_2 != q_event_id_1, "Each turn must produce a unique QuestionEvent ID"

    # Verify Turn 2 did NOT re-ask open_ophthalmic_exploration or blurred_vision
    target_field_2 = data_t2["decision"]["target_field"]
    assert target_field_2 not in ["open_ophthalmic_exploration", "blurred_vision"]

    # Verify post-evaluation ClinicalState persisted in DB contains explored_areas
    latest_state = db.query(ClinicalStateModel).filter(
        ClinicalStateModel.intake_session_id == session_id
    ).order_by(ClinicalStateModel.version.desc()).first()
    assert "open_ophthalmic_exploration" in latest_state.state_json.get("explored_areas", [])

    # Turn 3: Patient answers "10 days" with q_event_id_2
    res_t3 = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "10 days",
        "input_mode": "TEXT",
        "language_code": "en",
        "question_event_id": q_event_id_2
    })
    assert res_t3.status_code == 200
    data_t3 = res_t3.json()

    # Verify state duration is resolved
    assert data_t3["clinical_state"]["duration"] == "10 days"

    # If decision is ASK, verify it is neither duration nor onset nor blurred vision
    if data_t3["decision"]["action"] == "ASK":
        target_field_3 = data_t3["decision"]["target_field"]
        assert target_field_3 not in ["duration", "onset", "how_long", "open_ophthalmic_exploration", "blurred_vision"]
    else:
        assert data_t3["decision"]["action"] == "STOP"


def test_backend_robust_fallback_when_question_event_id_omitted(client: TestClient, db):
    """
    Verify that even if a client completely omits question_event_id,
    the backend automatically resolves target_field from the latest session QuestionEvent,
    avoiding the bug where every answer was treated as chief_complaint.
    """
    seed_database(db)

    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Fallback Test Patient",
        "patient_age": 40,
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    session_id = create_res.json()["id"]

    # Turn 1: "red eyes" without question_event_id -> first turn defaults to chief_complaint
    res_t1 = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "red eyes",
        "input_mode": "TEXT"
    })
    assert res_t1.status_code == 200
    data_t1 = res_t1.json()
    assert data_t1["clinical_state"]["chief_complaint"] == "red eyes"
    q_event_id_1 = data_t1["question_event_id"]

    # Turn 2: "blurred vision" WITHOUT question_event_id -> backend retrieves Q1's target_field
    res_t2 = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "blurred vision",
        "input_mode": "TEXT"
    })
    assert res_t2.status_code == 200
    data_t2 = res_t2.json()
    # Turn 2 target_field should NOT repeat open exploration
    assert data_t2["decision"]["target_field"] != "open_ophthalmic_exploration"
    # Chief complaint should remain "red eyes", not overridden by "blurred vision"
    assert data_t2["clinical_state"]["chief_complaint"] == "red eyes"


def test_gi_http_conversation_state_persistence(client: TestClient, db):
    """
    GI Regression Test across HTTP requests:
    Verifies state persistence across turns, prevents repetitive chief_complaint classification,
    and cleanly progresses through exploration and characterization.
    """
    seed_database(db)

    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "GI Patient",
        "patient_age": 35,
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    session_id = create_res.json()["id"]

    # Turn 1: "Stomach / Acidity"
    r1 = client.post(f"/api/v1/intakes/{session_id}/answers", json={"raw_text": "Stomach / Acidity", "input_mode": "TEXT"})
    assert r1.status_code == 200
    d1 = r1.json()
    q_id_1 = d1["question_event_id"]
    assert d1["clinical_state"]["chief_complaint"] == "Stomach / Acidity"

    # Turn 2: "no" to open exploration
    r2 = client.post(f"/api/v1/intakes/{session_id}/answers", json={"raw_text": "no", "input_mode": "TEXT", "question_event_id": q_id_1})
    assert r2.status_code == 200
    d2 = r2.json()
    q_id_2 = d2["question_event_id"]
    # Open exploration must not be asked again
    assert d2["decision"]["target_field"] != d1["decision"]["target_field"]

    # Turn 3: "vadapav" (food exposure)
    r3 = client.post(f"/api/v1/intakes/{session_id}/answers", json={"raw_text": "vadapav", "input_mode": "TEXT", "question_event_id": q_id_2})
    assert r3.status_code == 200
    d3 = r3.json()
    q_id_3 = d3["question_event_id"]
    assert d3["clinical_state"]["food_exposure"] == "vadapav"

    # Turn 4: "vomiting" (associated symptoms)
    r4 = client.post(f"/api/v1/intakes/{session_id}/answers", json={"raw_text": "vomiting", "input_mode": "TEXT", "question_event_id": q_id_3})
    assert r4.status_code == 200
    d4 = r4.json()
    q_id_4 = d4["question_event_id"]
    assert any("vomit" in s.lower() for s in d4["clinical_state"]["associated_symptoms"])

    # Turn 5: "2 days" (duration)
    r5 = client.post(f"/api/v1/intakes/{session_id}/answers", json={"raw_text": "2 days", "input_mode": "TEXT", "question_event_id": q_id_4})
    assert r5.status_code == 200
    d5 = r5.json()
    assert d5["clinical_state"]["duration"] == "2 days"
