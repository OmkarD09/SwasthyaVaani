import pytest
from app.models.intake import IntakeSession
from app.models.review import AuditEventModel


def test_kiosk_idle_timeout_abort(client, db):
    """
    Verifies that calling the abort endpoint on an active session with IDLE_TIMEOUT:
    1. Returns HTTP 200 with SESSION_PURGED status.
    2. Updates IntakeSession status to ABANDONED in DB.
    3. Writes an immutable DPDP audit event with SESSION_PURGED_PRIVACY.
    """
    # 1. Create active intake session
    create_res = client.post(
        "/api/v1/intakes",
        json={
            "patient_name": "Test Patient",
            "patient_age": 45,
            "patient_gender": "Male",
            "consent_given": True,
            "consent_language": "en",
            "department_code": "DEPT_GEN_MED",
        },
    )
    assert create_res.status_code == 200
    intake_id = create_res.json()["id"]

    # 2. Call abort with IDLE_TIMEOUT
    abort_res = client.post(
        f"/api/v1/intakes/{intake_id}/abort",
        json={"reason": "IDLE_TIMEOUT"},
    )
    assert abort_res.status_code == 200
    data = abort_res.json()
    assert data["status"] == "SESSION_PURGED"
    assert data["intake_session_id"] == intake_id
    assert data["reason"] == "IDLE_TIMEOUT"
    assert "purged_at" in data

    # 3. Verify session in DB is ABANDONED
    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    assert session is not None
    assert session.status == "ABANDONED"

    # 4. Verify DPDP audit event
    audit = (
        db.query(AuditEventModel)
        .filter(
            AuditEventModel.resource_id == intake_id,
            AuditEventModel.event_type == "SESSION_PURGED_PRIVACY",
        )
        .first()
    )
    assert audit is not None
    assert audit.actor_role == "PATIENT_KIOSK"
    assert audit.metadata_json["reason"] == "IDLE_TIMEOUT"


def test_kiosk_user_cancelled_abort(client, db):
    """
    Verifies session abort when patient explicitly cancels or resets kiosk.
    """
    create_res = client.post(
        "/api/v1/intakes",
        json={
            "patient_name": "Cancel Test",
            "patient_age": 30,
            "consent_given": True,
        },
    )
    assert create_res.status_code == 200
    intake_id = create_res.json()["id"]

    abort_res = client.post(
        f"/api/v1/intakes/{intake_id}/abort",
        json={"reason": "USER_CANCELLED"},
    )
    assert abort_res.status_code == 200
    data = abort_res.json()
    assert data["reason"] == "USER_CANCELLED"

    session = db.query(IntakeSession).filter(IntakeSession.id == intake_id).first()
    assert session.status == "ABANDONED"


def test_aborted_session_excluded_from_doctor_queue(client, db, auth_headers):
    """
    Verifies that ABANDONED intake sessions are excluded from the doctor queue
    to prevent orphaned / incomplete kiosk data leakage.
    """
    # Create and submit Patient 1
    p1_res = client.post(
        "/api/v1/intakes",
        json={
            "patient_name": "Submitted Patient",
            "patient_age": 50,
            "consent_given": True,
        },
    )
    assert p1_res.status_code == 200
    p1_id = p1_res.json()["id"]

    submit_res = client.post(f"/api/v1/intakes/{p1_id}/submit")
    assert submit_res.status_code == 200

    # Create and abort Patient 2
    p2_res = client.post(
        "/api/v1/intakes",
        json={
            "patient_name": "Abandoned Patient",
            "patient_age": 28,
            "consent_given": True,
        },
    )
    assert p2_res.status_code == 200
    p2_id = p2_res.json()["id"]

    abort_res = client.post(f"/api/v1/intakes/{p2_id}/abort", json={"reason": "IDLE_TIMEOUT"})
    assert abort_res.status_code == 200

    # Fetch doctor queue with clinician auth
    headers = auth_headers("DOCTOR")
    queue_res = client.get("/api/v1/doctor/queue", headers=headers)
    assert queue_res.status_code == 200
    queue = queue_res.json()

    queue_session_ids = [item["intake_session_id"] for item in queue]
    assert p1_id in queue_session_ids
    assert p2_id not in queue_session_ids


def test_abort_nonexistent_session_returns_404(client):
    """
    Verifies that calling abort on a non-existent session returns 404.
    """
    res = client.post(
        "/api/v1/intakes/non-existent-session-id/abort",
        json={"reason": "IDLE_TIMEOUT"},
    )
    assert res.status_code == 404
