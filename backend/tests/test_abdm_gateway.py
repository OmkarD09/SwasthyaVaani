import pytest
from app.core.config import settings
from app.models.intake import ClinicalStateModel, IntakeSession
from app.models.review import AuditEventModel, PhysicianReviewModel
from app.models.user import Doctor, Hospital, Patient
from app.schemas.clinical_state import ClinicalState
from app.services.abdm.gateway_factory import (
    get_abdm_gateway,
    reset_abdm_gateway,
)
from app.services.abdm.live_gateway import LiveAbdmGateway
from app.services.abdm.simulated_gateway import SimulatedAbdmGateway
from app.services.fhir.abdm_validator import validate_nrc_abdm_bundle
from app.services.fhir.mapper import map_clinical_state_to_fhir_r4


@pytest.mark.asyncio
async def test_simulated_gateway_auth_flow():
    """
    Verifies SimulatedAbdmGateway provides instantaneous, deterministic
    2-step authentication without external network dependency.
    """
    gateway = SimulatedAbdmGateway()

    # Step 1: Request OTP
    init_res = await gateway.init_auth("91-4521-8890-1234", "MOBILE_OTP")
    assert init_res["status"] == "OTP_SENT"
    assert init_res["gateway_mode"] == "simulation"
    assert init_res["txn_id"].startswith("txn-sim-")
    assert "masked_mobile" in init_res

    # Step 2: Confirm with valid 6-digit demo OTP
    confirm_res = await gateway.confirm_auth(init_res["txn_id"], "123456")
    assert confirm_res["status"] == "VERIFIED"
    assert confirm_res["abha_number"] == "91-4521-8890-1234"
    assert confirm_res["patient_name"] == "Ananya Sharma"
    assert confirm_res["gender"] == "F"
    assert confirm_res["year_of_birth"] == 1992

    # Step 3: Reject malformed OTP
    bad_otp_res = await gateway.confirm_auth(init_res["txn_id"], "123")
    assert bad_otp_res["status"] == "FAILED"


@pytest.mark.asyncio
async def test_simulated_gateway_hip_push():
    """
    Verifies SimulatedAbdmGateway executes mock HIP record transfer.
    """
    gateway = SimulatedAbdmGateway()
    mock_bundle = {"id": "BUNDLE-TEST-01", "resourceType": "Bundle", "type": "document"}
    push_res = await gateway.push_hip_health_data(mock_bundle, "CARE-CTX-001")

    assert push_res["status"] == "TRANSFERRED"
    assert push_res["transaction_id"].startswith("TX-ABDM-SIM-")
    assert push_res["bundle_id"] == "BUNDLE-TEST-01"
    assert push_res["care_context_id"] == "CARE-CTX-001"


def test_gateway_factory_switching(monkeypatch):
    """
    Verifies get_abdm_gateway switches cleanly between simulation and sandbox,
    falling back resiliently to simulation when credentials are missing.
    """
    reset_abdm_gateway()

    # Case 1: simulation mode
    monkeypatch.setattr(settings, "ABDM_GATEWAY_MODE", "simulation")
    reset_abdm_gateway()
    gw1 = get_abdm_gateway()
    assert isinstance(gw1, SimulatedAbdmGateway)

    # Case 2: sandbox requested but no credentials -> graceful fallback to simulation
    monkeypatch.setattr(settings, "ABDM_GATEWAY_MODE", "sandbox")
    monkeypatch.setattr(settings, "ABDM_CLIENT_ID", None)
    monkeypatch.setattr(settings, "ABDM_CLIENT_SECRET", None)
    reset_abdm_gateway()
    gw2 = get_abdm_gateway()
    assert isinstance(gw2, SimulatedAbdmGateway)

    # Case 3: sandbox requested with valid credentials -> instantiates LiveAbdmGateway
    monkeypatch.setattr(settings, "ABDM_GATEWAY_MODE", "sandbox")
    monkeypatch.setattr(settings, "ABDM_CLIENT_ID", "test-sbx-client-id")
    monkeypatch.setattr(settings, "ABDM_CLIENT_SECRET", "test-sbx-client-secret")
    reset_abdm_gateway()
    gw3 = get_abdm_gateway()
    assert isinstance(gw3, LiveAbdmGateway)

    reset_abdm_gateway()


def test_abdm_api_status_endpoint(client):
    """
    Verifies GET /api/v1/abdm/gateway/status returns operational parameters.
    """
    res = client.get("/api/v1/abdm/gateway/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ONLINE", "DEGRADED")
    assert "gateway_mode" in data
    assert "active_facility_id" in data
    assert "ping_latency_ms" in data


def test_abdm_2step_auth_api(client):
    """
    Verifies full 2-step ABHA OTP authentication via public REST API.
    """
    # Step 1: Init auth
    init_res = client.post(
        "/api/v1/abdm/abha/auth/init",
        json={"abha_id": "91-4521-8890-1234", "auth_mode": "MOBILE_OTP"},
    )
    assert init_res.status_code == 200
    init_data = init_res.json()
    assert init_data["status"] == "OTP_SENT"
    txn_id = init_data["txn_id"]

    # Step 2: Confirm auth
    confirm_res = client.post(
        "/api/v1/abdm/abha/auth/confirm",
        json={"txn_id": txn_id, "otp": "123456"},
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "VERIFIED"
    assert confirm_data["abha_number"] == "91-4521-8890-1234"
    assert confirm_data["patient_name"] == "Ananya Sharma"


def test_abdm_hip_push_and_audit(client, db):
    """
    Verifies POST /api/v1/abdm/hip/push validates FHIR R4 Bundle,
    transfers record via gateway, and logs an immutable ABDM_HIP_PUSH_SUCCESS audit event.
    """
    # 1. Seed Hospital, Doctor, Patient, and Intake
    hosp = Hospital(id="hosp_test", name="District Hospital", code="DH01")
    doc = Doctor(
        id="doc_test",
        display_name="Dr. Sunita Rao",
        hospital_id="hosp_test",
        specialization="General Medicine",
    )
    pat = Patient(id="pat_test", display_name="Ananya Sharma", abha_id="91-4521-8890-1234")
    db.add_all([hosp, doc, pat])
    db.flush()

    session = IntakeSession(
        id="session_test_abdm",
        patient_id="pat_test",
        doctor_id="doc_test",
        hospital_id="hosp_test",
        token="A-9999",
        status="SUBMITTED",
    )
    db.add(session)
    db.flush()

    # 2. Add clinical state
    initial_state = ClinicalState(
        chief_complaint="Persistent mild fever with body ache",
        symptoms=["fever", "body ache"],
        duration="3 days",
    )
    c_state = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json=initial_state.model_dump(),
    )
    db.add(c_state)

    # 3. Add confirmed physician review
    review = PhysicianReviewModel(
        intake_session_id=session.id,
        doctor_id="doc_test",
        status="CONFIRMED",
    )
    db.add(review)
    db.commit()

    # 4. Verify NRCES Bundle generated from this record is 100% compliant
    fhir_bundle = map_clinical_state_to_fhir_r4(
        intake_session_id=session.id,
        patient_id=pat.id,
        patient_name=pat.display_name,
        doctor_name=doc.display_name,
        state=initial_state,
    )
    report = validate_nrc_abdm_bundle(fhir_bundle.model_dump())
    assert report.is_valid is True

    # 5. Push to ABDM HIP Network
    push_res = client.post(
        "/api/v1/abdm/hip/push",
        json={"intake_session_id": session.id},
    )
    assert push_res.status_code == 200
    push_data = push_res.json()
    assert push_data["status"] == "TRANSFERRED"
    assert "transaction_id" in push_data
    assert push_data["recipient_hip_id"] == settings.ABDM_HIP_ID

    # 6. Verify immutable audit event
    audit = (
        db.query(AuditEventModel)
        .filter(
            AuditEventModel.resource_id == session.id,
            AuditEventModel.event_type == "ABDM_HIP_PUSH_SUCCESS",
        )
        .first()
    )
    assert audit is not None
    assert audit.actor_role == "PHYSICIAN"
    assert audit.metadata_json["status"] == "TRANSFERRED"
