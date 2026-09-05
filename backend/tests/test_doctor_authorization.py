import pytest
from fastapi.testclient import TestClient

from app.seed.seed_data import seed_database


def _headers_for(role: str | None, auth_headers) -> dict[str, str]:
    return auth_headers(role) if role else {}


def _create_intake(client: TestClient, name: str = "Authorization Test Patient") -> str:
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


@pytest.mark.parametrize(
    ("role", "expected_status"),
    [(None, 403), ("PATIENT", 403), ("DOCTOR", 200), ("ADMIN", 200)],
)
def test_doctor_queue_role_matrix(
    client: TestClient, db, auth_headers, role: str | None, expected_status: int
):
    seed_database(db)
    response = client.get("/api/v1/doctor/queue", headers=_headers_for(role, auth_headers))
    assert response.status_code == expected_status


@pytest.mark.parametrize(
    ("role", "expected_status"),
    [(None, 403), ("PATIENT", 403), ("DOCTOR", 200), ("ADMIN", 200)],
)
@pytest.mark.parametrize("suffix", ["", "/conversation"])
def test_doctor_patient_read_role_matrix(
    client: TestClient,
    db,
    auth_headers,
    role: str | None,
    expected_status: int,
    suffix: str,
):
    seed_database(db)
    intake_id = _create_intake(client)
    response = client.get(
        f"/api/v1/doctor/patients/{intake_id}{suffix}",
        headers=_headers_for(role, auth_headers),
    )
    assert response.status_code == expected_status


@pytest.mark.parametrize(
    ("role", "expected_status"),
    [(None, 403), ("PATIENT", 403), ("DOCTOR", 200), ("ADMIN", 200)],
)
def test_doctor_confirmation_role_matrix(
    client: TestClient, db, auth_headers, role: str | None, expected_status: int
):
    seed_database(db)
    intake_id = _create_intake(client, name=f"Confirmation {role or 'Guest'}")
    response = client.post(
        f"/api/v1/doctor/patients/{intake_id}/confirm",
        headers=_headers_for(role, auth_headers),
        json={"generate_fhir": False},
    )
    assert response.status_code == expected_status
