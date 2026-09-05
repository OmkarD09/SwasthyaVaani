import pytest
from app.seed.seed_data import seed_database


def test_admin_dashboard_stats(client, db):
    """Verify admin overview stats endpoint."""
    seed_database(db)
    response = client.get("/api/v1/admin/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_patients" in data
    assert "ai_assessments_today" in data
    assert "critical_cases_count" in data
    assert "intake_volume_trend" in data
    assert len(data["common_complaints"]) > 0


def test_admin_ai_monitoring_oversight(client, db):
    """Verify AI monitoring oversight telemetry and clinical safety framing."""
    seed_database(db)
    response = client.get("/api/v1/admin/ai-monitoring")
    assert response.status_code == 200
    data = response.json()
    assert data["total_assessments"] >= 0
    assert "cases" in data
    assert "safety_disclaimer" in data
    assert "SwasthyaVaani AI provides structured pre-consultation intake support" in data["safety_disclaimer"]
    assert "override_breakdown" in data
    assert len(data["override_breakdown"]) > 0


def test_admin_emergency_cases(client, db):
    """Verify critical red-flag emergency queue endpoint."""
    seed_database(db)
    response = client.get("/api/v1/admin/emergency-cases")
    assert response.status_code == 200
    cases = response.json()
    assert isinstance(cases, list)
    if len(cases) > 0:
        first = cases[0]
        assert "token" in first
        assert "severity" in first
        assert "escalation_reason" in first


def test_admin_audit_trail_filtering(client, db):
    """Verify security audit logs endpoint with filtering."""
    seed_database(db)
    response = client.get("/api/v1/admin/audit?limit=20")
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)

    # Test filtering by event type
    login_resp = client.get("/api/v1/admin/audit?event_type=LOGIN")
    assert login_resp.status_code == 200


def test_doctor_and_department_onboarding(client, db):
    """Verify onboarding new doctors and departments."""
    seed_database(db)
    # List departments
    dept_resp = client.get("/api/v1/admin/departments")
    assert dept_resp.status_code == 200
    depts = dept_resp.json()
    assert len(depts) > 0
    test_dept_id = depts[0]["id"]

    # Onboard doctor
    new_doc_payload = {
        "display_name": "Dr. Rohan Patel",
        "specialization": "Critical Care Medicine",
        "department_id": test_dept_id,
        "license_identifier": "MCI-TEST-9921",
        "contact": "+91 99887 76655",
        "working_hours": "08:00 AM - 04:00 PM"
    }
    doc_create_resp = client.post("/api/v1/admin/doctors", json=new_doc_payload)
    assert doc_create_resp.status_code == 201
    created_doc = doc_create_resp.json()
    assert created_doc["display_name"] == "Dr. Rohan Patel"
    doc_id = created_doc["id"]

    # Update doctor
    update_payload = {"is_active": False, "working_hours": "10:00 AM - 06:00 PM"}
    doc_update_resp = client.put(f"/api/v1/admin/doctors/{doc_id}", json=update_payload)
    assert doc_update_resp.status_code == 200
    assert doc_update_resp.json()["is_active"] is False


def test_staff_rbac_management(client, db):
    """Verify staff role creation and modification with server-side validation."""
    seed_database(db)
    new_user_payload = {
        "email": "test.nurse.qa@district-hospital.in",
        "display_name": "Sister Kavita",
        "role": "NURSE",
        "phone": "+91 91234 56789"
    }
    create_resp = client.post("/api/v1/admin/users", json=new_user_payload)
    assert create_resp.status_code in [201, 409]

    if create_resp.status_code == 201:
        user_id = create_resp.json()["id"]
        role_resp = client.put(f"/api/v1/admin/users/{user_id}/role", json={"role": "HOSPITAL_ADMIN"})
        assert role_resp.status_code == 200
        assert role_resp.json()["role"] == "HOSPITAL_ADMIN"

    # Test invalid role rejection
    invalid_resp = client.post("/api/v1/admin/users", json={
        "email": "invalid@test.in",
        "display_name": "Invalid Role User",
        "role": "HACKER"
    })
    assert invalid_resp.status_code == 400


def test_demo_scenario_loading(client, db):
    """Verify one-click demo scenario injection."""
    seed_database(db)
    resp = client.post("/api/v1/admin/seed/scenario/A-027")
    assert resp.status_code == 200
    assert resp.json()["status"] == "LOADED"


def test_service_status_probe(client, db):
    """Verify all integration service health probes."""
    resp = client.get("/api/v1/admin/services/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["database"]["status"] == "ONLINE"
    assert data["llm_service"]["status"] == "ONLINE"
    assert data["speech_service"]["status"] == "ONLINE"
    assert data["ocr_service"]["status"] == "ONLINE"


def test_qa_run_tests_endpoint(client, db):
    """Verify triggering QA regression test suite endpoint."""
    resp = client.post("/api/v1/admin/qa/run-tests")
    assert resp.status_code == 200
    result = resp.json()
    assert "total_tests" in result
    assert "passed_tests" in result
    assert "suites" in result
    assert len(result["suites"]) > 0
    assert result["success"] is True
