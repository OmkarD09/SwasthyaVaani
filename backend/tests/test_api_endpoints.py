from fastapi.testclient import TestClient

from app.seed.seed_data import seed_database


def test_health_check_endpoint(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"


def test_full_intake_to_doctor_confirmation_slice(client: TestClient, db, auth_headers):
    seed_database(db)
    doctor_headers = auth_headers("DOCTOR")

    # 1. Start Patient Intake
    intake_payload = {
        "patient_name": "Rohan Test Patient",
        "patient_age": 42,
        "patient_gender": "Male",
        "hospital_id": "hosp_district_01",
        "doctor_id": "doc_001",
        "workflow_type": "GENERAL_CLINICAL",
        "language_code": "en",
        "interaction_mode": "VOICE",
        "consent_given": True
    }
    create_res = client.post("/api/v1/intakes", json=intake_payload)
    assert create_res.status_code == 200
    intake_data = create_res.json()
    intake_id = intake_data["id"]
    token = intake_data["token"]
    assert intake_id is not None
    assert token.startswith("A-")

    # 2. Patient submits chief complaint
    ans1_res = client.post(
        f"/api/v1/intakes/{intake_id}/answers",
        json={
            "raw_text": "I have been having fever and body ache since 3 days.",
            "input_mode": "VOICE",
            "language_code": "en"
        }
    )
    assert ans1_res.status_code == 200
    ans1_data = ans1_res.json()
    assert ans1_data["clinical_state"]["chief_complaint"] is not None
    assert ans1_data["clinical_state"]["duration"] is not None
    assert ans1_data["decision"]["action"] == "ASK"
    assert ans1_data["next_question_event_id"] is not None

    # 3. Patient submits second answer
    ans2_res = client.post(
        f"/api/v1/intakes/{intake_id}/answers",
        json={
                "raw_text": "The discomfort is about 5 out of 10 in severity.",
                "input_mode": "VOICE",
                "language_code": "en",
                "question_event_id": ans1_data["next_question_event_id"],
        }
    )
    assert ans2_res.status_code == 200
    ans2_data = ans2_res.json()
    assert ans2_data["clinical_state"]["severity"] == 5

    # 4. Patient Submits Intake to Doctor Queue
    submit_res = client.post(f"/api/v1/intakes/{intake_id}/submit")
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"

    # 5. Doctor views Queue
    queue_res = client.get("/api/v1/doctor/queue", headers=doctor_headers)
    assert queue_res.status_code == 200
    queue = queue_res.json()
    matched_item = next((item for item in queue if item["intake_session_id"] == intake_id), None)
    assert matched_item is not None
    assert matched_item["token"] == token

    # 6. Doctor loads patient detail
    detail_res = client.get(
        f"/api/v1/doctor/patients/{intake_id}", headers=doctor_headers
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["clinical_state"]["duration"] is not None
    assert detail["review_status"] == "AI_DRAFT"

    # 7. Doctor edits and confirms clinical history
    confirm_res = client.post(
        f"/api/v1/doctor/patients/{intake_id}/confirm",
        headers=doctor_headers,
        json={
            "intake_session_id": intake_id,
            "notes": "Verified fever history and vital signs.",
            "edits": [
                {
                    "field_name": "past_history",
                    "old_value": [],
                    "new_value": ["No prior chronic illnesses"],
                    "reason": "Physician verified with patient"
                }
            ],
            "generate_fhir": True
        }
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "PHYSICIAN_CONFIRMED"
    assert confirm_data["fhir_bundle_id"] is not None

    # 8. Export FHIR R4 Bundle
    fhir_res = client.get(f"/api/v1/fhir/export/{intake_id}")
    assert fhir_res.status_code == 200
    fhir_data = fhir_res.json()
    assert fhir_data["status"] == "VALIDATED"
    assert fhir_data["fhir_bundle"]["resourceType"] == "Bundle"
    assert len(fhir_data["fhir_bundle"]["entry"]) >= 3


def test_doctor_websocket_realtime_broadcast(client: TestClient, db):
    seed_database(db)

    with client.websocket_connect("/api/v1/doctor/ws") as websocket:
        # Check initial connection message
        data = websocket.receive_json()
        assert data["event"] == "CONNECTED"

        # Test ping-pong
        websocket.send_text("ping")
        pong = websocket.receive_json()
        assert pong["event"] == "PONG"
