from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import Patient
from app.seed.seed_data import seed_database


def test_intake_creation_with_imported_abha_data(client: TestClient, db: Session):
    """
    Test that patient demographics with ABHA QR-imported data are correctly stored.
    Crucial Safety Rule: abha_status must be 'UNVERIFIED', NOT 'VERIFIED'.
    """
    seed_database(db)

    payload = {
        "patient_name": "Ramesh Gupta",
        "patient_age": 42,
        "patient_gender": "Male",
        "phone": "9812345678",
        "date_of_birth": "1984-06-15",
        "abha_id": "12-3456-7890-1234",
        "abha_address": "ramesh.gupta@abdm",
        "consent_given": True,
        "workflow_type": "GENERAL_CLINICAL",
        "language_code": "en",
        "interaction_mode": "VOICE",
    }

    resp = client.post("/api/v1/intakes", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["patient_name"] == "Ramesh Gupta"
    assert data["patient_age"] == 42
    assert data["patient_gender"] == "Male"
    assert data["phone"] == "9812345678"
    assert data["date_of_birth"] == "1984-06-15"
    assert data["abha_id"] == "12-3456-7890-1234"
    assert data["abha_address"] == "ramesh.gupta@abdm"
    assert data["abha_status"] == "UNVERIFIED"
    assert data["consent_recorded"] is True

    # Verify directly in DB
    patient_in_db = db.query(Patient).filter(Patient.id == data["patient_id"]).first()
    assert patient_in_db is not None
    assert patient_in_db.abha_id == "12-3456-7890-1234"
    assert patient_in_db.abha_status == "UNVERIFIED"
    assert patient_in_db.verification_timestamp is None  # Never mark verified merely from QR
    assert patient_in_db.consent_recorded is True


def test_duplicate_abha_lookup_and_no_duplicate_records(client: TestClient, db: Session):
    """
    Submitting intake with the same ABHA ID (even unhyphenated) must update/reuse
    the existing patient record and avoid duplicate patient rows.
    """
    seed_database(db)

    unique_digits = "88997766554433"
    formatted_abha = "88-9977-6655-4433"

    # First session with formatted ABHA
    payload_1 = {
        "patient_name": "Sunita Patil",
        "patient_age": 29,
        "patient_gender": "Female",
        "phone": "9988776655",
        "date_of_birth": "1997-03-21",
        "abha_id": formatted_abha,
        "abha_address": "sunita@abdm",
        "consent_given": True,
    }
    resp1 = client.post("/api/v1/intakes", json=payload_1)
    assert resp1.status_code == 200
    p1_id = resp1.json()["patient_id"]

    # Second session with raw 14 digits (should normalize and link to same patient)
    payload_2 = {
        "patient_name": "Sunita Patil",
        "patient_age": 30,  # updated age
        "abha_id": unique_digits,
        "consent_given": True,
    }
    resp2 = client.post("/api/v1/intakes", json=payload_2)
    assert resp2.status_code == 200
    p2_id = resp2.json()["patient_id"]

    # Must be the exact same patient ID
    assert p1_id == p2_id

    # Verify that only 1 patient exists with this ABHA
    patients = db.query(Patient).filter(
        (Patient.abha_id == formatted_abha) | (Patient.abha_id == unique_digits)
    ).all()
    assert len(patients) == 1
    assert patients[0].age == 30
    assert patients[0].phone == "9988776655"  # not overwritten by null


def test_consent_given_false_handling(client: TestClient, db: Session):
    """
    If consent_given is False, consent_recorded must be False.
    """
    seed_database(db)

    payload = {
        "patient_name": "Anonymous Test",
        "patient_age": 50,
        "consent_given": False,
    }
    resp = client.post("/api/v1/intakes", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["consent_recorded"] is False

    patient = db.query(Patient).filter(Patient.id == data["patient_id"]).first()
    assert patient.consent_recorded is False


def test_doctor_patient_detail_includes_abha(client: TestClient, db: Session, auth_headers):
    """
    Doctor review API must return abha_id, abha_status, phone, and date_of_birth.
    """
    seed_database(db)
    doctor_headers = auth_headers("DOCTOR")

    payload = {
        "patient_name": "Kavita Rao",
        "patient_age": 38,
        "patient_gender": "Female",
        "phone": "9823456789",
        "date_of_birth": "1988-11-04",
        "abha_id": "77-8899-0011-2233",
        "abha_address": "kavita.rao@abdm",
        "consent_given": True,
    }
    resp = client.post("/api/v1/intakes", json=payload)
    assert resp.status_code == 200
    intake_id = resp.json()["id"]

    # Fetch via doctor patient detail endpoint using authorized clinician headers
    doc_resp = client.get(f"/api/v1/doctor/patients/{intake_id}", headers=doctor_headers)
    assert doc_resp.status_code == 200
    doc_data = doc_resp.json()

    assert doc_data["patient_name"] == "Kavita Rao"
    assert doc_data["abha_id"] == "77-8899-0011-2233"
    assert doc_data["abha_address"] == "kavita.rao@abdm"
    assert doc_data["abha_status"] == "UNVERIFIED"
    assert doc_data["phone"] == "9823456789"
    assert doc_data["date_of_birth"] == "1988-11-04"
    assert doc_data["consent_recorded"] is True
