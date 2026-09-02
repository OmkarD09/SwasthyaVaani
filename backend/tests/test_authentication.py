from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.models.user import User
from app.seed.seed_data import seed_database


VALID_PASSWORD = "synthetic-doctor-password"


def _seed_login_user(db):
    seed_database(db)
    user = db.query(User).filter(User.id == "user_doc_01").one()
    user.password_hash = hash_password(VALID_PASSWORD)
    db.commit()


def _login(client: TestClient, username: str, password: str):
    return client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password, "role": "DOCTOR"},
    )


def test_valid_seeded_clinician_login_and_authorization(client, db):
    _seed_login_user(db)

    response = _login(
        client, "ananya.rao@district-hospital.in", VALID_PASSWORD
    )

    assert response.status_code == 200
    session = response.json()
    assert session["user_id"] == "user_doc_01"
    assert session["role"] == "DOCTOR"
    protected = client.get(
        "/api/v1/doctor/queue",
        headers={"Authorization": f"Bearer {session['access_token']}"},
    )
    assert protected.status_code == 200


def test_wrong_password_is_rejected_without_token(client, db):
    _seed_login_user(db)

    response = _login(client, "ananya.rao@district-hospital.in", "wrong-password")

    assert response.status_code == 401
    assert "access_token" not in response.json()


def test_unknown_clinician_is_rejected_without_token(client, db):
    _seed_login_user(db)

    response = _login(client, "unknown@example.invalid", VALID_PASSWORD)

    assert response.status_code == 401
    assert "access_token" not in response.json()


def test_empty_credentials_are_rejected(client):
    response = _login(client, "", "")

    assert response.status_code == 422
    assert "access_token" not in response.json()


def test_missing_and_invalid_tokens_cannot_access_doctor_endpoint(client):
    missing = client.get("/api/v1/doctor/queue")
    invalid = client.get(
        "/api/v1/doctor/queue", headers={"Authorization": "Bearer invalid"}
    )

    assert missing.status_code == 403
    assert invalid.status_code == 401
