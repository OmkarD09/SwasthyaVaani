"""Tests for SwasthyaVaani Department & OPD Triage Routing."""
import pytest
from app.services.clinical_ai.department_router import (
    DEPT_EMERGENCY,
    DEPT_GEN_MED,
    DEPT_ORTHO_SHALYA,
    DEPT_ENT_EYE,
    DEPT_PEDS,
    DEPT_GYNEC,
    DEPT_DERM,
    DEPT_PANCHAKARMA,
    DEPARTMENT_METADATA,
    DOMAIN_TO_DEPARTMENT,
    resolve_department_route,
    normalize_department_code,
)
from app.models.user import Hospital, Department, Doctor, Patient
from app.models.intake import IntakeSession, ClinicalStateModel


def test_red_flag_emergency_override():
    """Red flags must always deterministically force-route to DEPT_EMERGENCY."""
    # Even if current dept was Ortho and domain is Musculoskeletal
    route = resolve_department_route(
        current_department_code=DEPT_ORTHO_SHALYA,
        detected_domain="MUSCULOSKELETAL",
        has_red_flags=True,
        patient_age=35,
    )
    assert route == DEPT_EMERGENCY

    # Low age with red flags must route to Emergency, not Pediatrics
    route_child = resolve_department_route(
        current_department_code=DEPT_PEDS,
        detected_domain="FEVER",
        has_red_flags=True,
        patient_age=7,
    )
    assert route_child == DEPT_EMERGENCY


def test_pediatric_age_override():
    """Children under 14 should route to DEPT_PEDS unless acute cardiac or trauma emergency."""
    # Child with cough/fever
    route_child = resolve_department_route(
        current_department_code="AUTO",
        detected_domain="FEVER",
        has_red_flags=False,
        patient_age=8,
    )
    assert route_child == DEPT_PEDS

    # Toddler with skin rash
    route_toddler = resolve_department_route(
        current_department_code=DEPT_DERM,
        detected_domain="DERMATOLOGY",
        has_red_flags=False,
        patient_age=3,
    )
    assert route_toddler == DEPT_PEDS

    # Adult with fever routes to General Med
    route_adult = resolve_department_route(
        current_department_code="AUTO",
        detected_domain="FEVER",
        has_red_flags=False,
        patient_age=28,
    )
    assert route_adult == DEPT_GEN_MED


def test_acute_emergency_domain_escalation():
    """Acute high-risk domains like CARDIAC, RESPIRATORY_DISTRESS, TRAUMA escalate to DEPT_EMERGENCY."""
    route_cardiac = resolve_department_route(
        current_department_code=DEPT_GEN_MED,
        detected_domain="CARDIAC",
        has_red_flags=False,
        patient_age=50,
    )
    assert route_cardiac == DEPT_EMERGENCY

    route_respiratory = resolve_department_route(
        current_department_code="AUTO",
        detected_domain="RESPIRATORY_DISTRESS",
        has_red_flags=False,
        patient_age=45,
    )
    assert route_respiratory == DEPT_EMERGENCY


def test_auto_domain_routing():
    """When department is AUTO or unknown, detected domain determines route."""
    assert resolve_department_route("AUTO", "MUSCULOSKELETAL", False, 30) == DEPT_ORTHO_SHALYA
    assert resolve_department_route("AUTO", "OPHTHALMIC", False, 40) == DEPT_ENT_EYE
    assert resolve_department_route("AUTO", "ENT", False, 25) == DEPT_ENT_EYE
    assert resolve_department_route("AUTO", "GYNECOLOGICAL", False, 29) == DEPT_GYNEC
    assert resolve_department_route("AUTO", "DERMATOLOGY", False, 32) == DEPT_DERM
    assert resolve_department_route("AUTO", "AYUSH_PANCHAKARMA", False, 48) == DEPT_PANCHAKARMA
    assert resolve_department_route("AUTO", "GASTROINTESTINAL", False, 35) == DEPT_GEN_MED
    assert resolve_department_route("AUTO", "UNKNOWN_DOMAIN", False, 40) == DEPT_GEN_MED


def test_explicit_patient_selection_preserved():
    """If patient explicitly selected Ortho and there are no red flags, keep Ortho."""
    route = resolve_department_route(
        current_department_code=DEPT_ORTHO_SHALYA,
        detected_domain="GENERAL",
        has_red_flags=False,
        patient_age=42,
    )
    assert route == DEPT_ORTHO_SHALYA


def test_department_metadata_integrity():
    """All 8 canonical departments must have complete metadata and valid icons."""
    all_codes = [
        DEPT_EMERGENCY,
        DEPT_GEN_MED,
        DEPT_ORTHO_SHALYA,
        DEPT_ENT_EYE,
        DEPT_PEDS,
        DEPT_GYNEC,
        DEPT_DERM,
        DEPT_PANCHAKARMA,
    ]
    for code in all_codes:
        meta = DEPARTMENT_METADATA.get(code)
        assert meta is not None, f"Missing metadata for canonical code {code}"
        assert meta["code"] == code
        assert len(meta["name_en"]) > 0
        assert len(meta["name_hi"]) > 0
        assert len(meta["ayush_name"]) > 0
        assert meta["priority"] in [1, 2, 3, 4]
        assert meta["icon"] in [
            "Ambulance",
            "Stethoscope",
            "Bone",
            "Eye",
            "Baby",
            "HeartHandshake",
            "Sparkles",
            "Flower2",
        ]


def test_get_departments_public_api(client, db):
    """GET /api/v1/departments/public should return active canonical departments."""
    response = client.get("/api/v1/departments/public")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 8

    # Verify each returned department structure
    codes = [d["code"] for d in data]
    assert DEPT_EMERGENCY in codes
    assert DEPT_GEN_MED in codes
    assert DEPT_ORTHO_SHALYA in codes
    assert DEPT_PEDS in codes

    first = data[0]
    assert "code" in first
    assert "name_en" in first
    assert "name_hi" in first
    assert "ayush_name" in first
    assert "icon" in first
    assert "active_doctors_count" in first


def test_intake_creation_and_reroute_on_submit(client, db):
    """Test full flow: create intake with department_code and reroute on submit with red flags."""
    # Seed hospital
    hosp = Hospital(id="hosp_test", name="Test City Hospital", code="HOSP_TEST", is_active=True)
    db.add(hosp)

    # Seed departments
    dept_ortho = Department(id="dept_ortho_01", code="DEPT_ORTHO_SHALYA", name="Orthopedics", hospital_id="hosp_test", is_active=True)
    dept_emg = Department(id="dept_emg_01", code="DEPT_EMERGENCY", name="Emergency", hospital_id="hosp_test", is_active=True)
    dept_gen = Department(id="dept_gen_01", code="DEPT_GEN_MED", name="General Medicine", hospital_id="hosp_test", is_active=True)
    db.add_all([dept_ortho, dept_emg, dept_gen])

    # Seed doctors
    doc_ortho = Doctor(id="doc_ortho_01", display_name="Dr. Ortho", specialization="Orthopedics", department_id="dept_ortho_01", hospital_id="hosp_test", is_active=True)
    doc_emg = Doctor(id="doc_emg_01", display_name="Dr. Emergency", specialization="Emergency", department_id="dept_emg_01", hospital_id="hosp_test", is_active=True)
    db.add_all([doc_ortho, doc_emg])
    db.commit()

    # 1. Create intake selecting Orthopedics
    create_payload = {
        "patient_name": "Ramesh Kumar",
        "patient_age": 45,
        "patient_gender": "Male",
        "language_code": "hi",
        "workflow_type": "GENERAL_CLINICAL",
        "interaction_mode": "TEXT",
        "consent_given": True,
        "department_code": "DEPT_ORTHO_SHALYA",
        "chief_complaint": "Knee pain",
    }
    create_res = client.post("/api/v1/intakes", json=create_payload)
    assert create_res.status_code in [200, 201]
    intake_data = create_res.json()
    session_id = intake_data["id"]
    assert intake_data.get("department_id") == "dept_ortho_01"
    assert intake_data.get("department_code") == "DEPT_ORTHO_SHALYA"

    # 2. Simulate red flag detection in clinical state
    state = ClinicalStateModel(
        intake_session_id=session_id,
        version=2,
        state_json={
            "chief_complaint": "Severe chest pain radiating to left arm",
            "detected_domain": "CARDIAC",
            "red_flags": ["Possible Acute Coronary Syndrome"],
        },
    )
    db.add(state)
    db.commit()

    # 3. Submit intake for review - should trigger resolve_department_route override to DEPT_EMERGENCY
    submit_res = client.post(f"/api/v1/intakes/{session_id}/submit")
    assert submit_res.status_code == 200
    submit_data = submit_res.json()

    assert submit_data.get("department_id") == "dept_emg_01"
    assert submit_data.get("department_code") == "DEPT_EMERGENCY"
    assert submit_data.get("doctor_id") == "doc_emg_01"
