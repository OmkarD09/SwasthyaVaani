from fastapi.testclient import TestClient

from app.models.intake import Answer
from app.seed.seed_data import seed_database


def _create_intake(client: TestClient, name: str) -> str:
    response = client.post(
        "/api/v1/intakes",
        json={
            "patient_name": name,
            "hospital_id": "hosp_district_01",
            "doctor_id": "doc_001",
            "interaction_mode": "TEXT",
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_next_question_event_is_returned_linked_and_session_scoped(
    client: TestClient, db, auth_headers
):
    seed_database(db)
    first_intake_id = _create_intake(client, "Question Contract One")
    second_intake_id = _create_intake(client, "Question Contract Two")

    first_answer = client.post(
        f"/api/v1/intakes/{first_intake_id}/answers",
        json={"raw_text": "I have a headache", "input_mode": "TEXT"},
    )
    assert first_answer.status_code == 200
    question_event_id = first_answer.json()["next_question_event_id"]
    assert question_event_id

    linked_answer = client.post(
        f"/api/v1/intakes/{first_intake_id}/answers",
        json={
            "raw_text": "It started yesterday",
            "input_mode": "TEXT",
            "question_event_id": question_event_id,
        },
    )
    assert linked_answer.status_code == 200
    persisted = db.query(Answer).filter(Answer.id == linked_answer.json()["answer_id"]).one()
    assert persisted.question_event_id == question_event_id

    timeline = client.get(
        f"/api/v1/doctor/patients/{first_intake_id}/conversation",
        headers=auth_headers("DOCTOR"),
    )
    assert timeline.status_code == 200
    linked_exchange = next(
        item
        for item in timeline.json()["exchanges"]
        if item["id"] == linked_answer.json()["answer_id"]
    )
    assert linked_exchange["questionId"] == question_event_id
    assert linked_exchange["questionRecorded"] is True

    cross_session = client.post(
        f"/api/v1/intakes/{second_intake_id}/answers",
        json={
            "raw_text": "This must not be persisted",
            "input_mode": "TEXT",
            "question_event_id": question_event_id,
        },
    )
    assert cross_session.status_code == 400
    assert (
        db.query(Answer)
        .filter(Answer.intake_session_id == second_intake_id)
        .count()
        == 0
    )
