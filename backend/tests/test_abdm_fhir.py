import pytest
from fastapi.testclient import TestClient
from app.seed.seed_data import seed_database
from app.services.fhir.abdm_validator import validate_nrc_abdm_bundle


def test_abha_verification_endpoint(client: TestClient):
    # 1. Test ABHA Number verification
    res = client.post("/api/v1/abdm/abha/verify", json={
        "abha_id": "91-1234-5678-9012",
        "auth_method": "MOCK"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "VERIFIED"
    assert data["abha_number"] == "91-1234-5678-9012"
    assert data["state"] == "Maharashtra"

    # 2. Test ABHA Address verification
    res_addr = client.post("/api/v1/abdm/abha/verify", json={
        "abha_id": "ananya.sharma@abdm",
        "auth_method": "MOCK"
    })
    assert res_addr.status_code == 200
    assert res_addr.json()["abha_address"] == "ananya.sharma@abdm"


def test_nrces_bundle_validation_success(client: TestClient, db):
    seed_database(db)

    # 1. Create and submit an intake
    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Test ABDM Patient",
        "patient_age": 42,
        "patient_gender": "Male",
        "hospital_id": "hosp_district_01",
        "doctor_id": "doc_001",
        "workflow_type": "GENERAL_CLINICAL",
        "consent_given": True
    })
    intake_id = create_res.json()["id"]

    # Submit answer
    client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "I have had fever for 3 days, pain severity is 6 out of 10"
    })
    # Submit intake
    client.post(f"/api/v1/intakes/{intake_id}/submit")

    # Doctor confirms history
    client.post(f"/api/v1/doctor/patients/{intake_id}/confirm", json={
        "generate_fhir": True
    })

    # Export ABDM bundle
    abdm_res = client.get(f"/api/v1/abdm/bundle/{intake_id}")
    assert abdm_res.status_code == 200
    abdm_data = abdm_res.json()

    assert abdm_data["status"] == "VALIDATED"
    report = abdm_data["validation_report"]
    assert report["is_valid"] is True
    assert report["total_resources"] >= 4
    assert "Composition" in report["resource_breakdown"]
    assert "Patient" in report["resource_breakdown"]
    assert "Encounter" in report["resource_breakdown"]


def test_nrces_validator_catches_invalid_bundle():
    # Test bundle with missing Composition
    invalid_bundle = {
        "id": "bundle-invalid-01",
        "type": "collection",  # Should be document
        "entry": [
            {"resource": {"resourceType": "Patient", "id": "p1"}}
        ]
    }
    report = validate_nrc_abdm_bundle(invalid_bundle)
    assert report.is_valid is False
    error_codes = [i.code for i in report.issues]
    assert "INVALID_BUNDLE_TYPE" in error_codes
    assert "MISSING_FIRST_COMPOSITION" in error_codes


def test_abdm_hip_push(client: TestClient, db):
    seed_database(db)

    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Push Demo Patient",
        "hospital_id": "hosp_district_01",
        "consent_given": True
    })
    intake_id = create_res.json()["id"]

    res = client.post("/api/v1/abdm/hip/push", json={
        "intake_session_id": intake_id,
        "consent_id": "CONSENT-ABDM-2026-999"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "TRANSFERRED"
    assert data["transaction_id"].startswith("TX-ABDM-")
