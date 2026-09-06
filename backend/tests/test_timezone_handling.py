import pytest
from datetime import datetime, timezone
from app.core.datetime_utils import ensure_utc, ensure_utc_iso, utcnow
from app.schemas.doctor import DoctorQueueItem, DoctorPatientDetail, PhysicianConfirmResponse
from app.schemas.clinical_state import ClinicalState


def test_ensure_utc_naive_datetime():
    naive_dt = datetime(2026, 9, 6, 17, 15, 0)
    utc_dt = ensure_utc(naive_dt)
    assert utc_dt is not None
    assert utc_dt.tzinfo == timezone.utc
    assert utc_dt.hour == 17
    assert utc_dt.minute == 15


def test_ensure_utc_iso_string_without_tz():
    iso_str = "2026-09-06T17:15:00"
    utc_dt = ensure_utc(iso_str)
    assert utc_dt is not None
    assert utc_dt.tzinfo == timezone.utc


def test_ensure_utc_iso_string_with_z():
    iso_str = "2026-09-06T17:15:00Z"
    utc_dt = ensure_utc(iso_str)
    assert utc_dt is not None
    assert utc_dt.tzinfo == timezone.utc


def test_ensure_utc_iso_formatter():
    naive_dt = datetime(2026, 9, 6, 17, 15, 0)
    iso_result = ensure_utc_iso(naive_dt)
    assert iso_result is not None
    assert "+00:00" in iso_result or iso_result.endswith("Z")


def test_doctor_queue_item_serialization_has_timezone():
    item = DoctorQueueItem(
        intake_session_id="session_123",
        token="A-123456",
        patient_id="pat_123",
        patient_display_id="P001",
        display_id="P001",
        patient_name="Ramesh Kumar",
        chief_complaint="Chest tightness",
        language_code="en",
        workflow_type="GENERAL_CLINICAL",
        status="REVIEWED",
        submitted_at=datetime(2026, 9, 6, 17, 10, 0),  # Naive datetime
        reviewed_at=datetime(2026, 9, 6, 17, 15, 0),   # Naive datetime
    )
    dumped_json = item.model_dump_json()
    assert "2026-09-06T17:10:00Z" in dumped_json or "+00:00" in dumped_json
    assert "2026-09-06T17:15:00Z" in dumped_json or "+00:00" in dumped_json
    # Must never be a timezone-less string
    assert '"reviewed_at":"2026-09-06T17:15:00"' not in dumped_json


def test_physician_confirm_response_serialization_has_timezone():
    resp = PhysicianConfirmResponse(
        intake_session_id="session_123",
        review_id="rev_123",
        confirmed_at=datetime(2026, 9, 6, 17, 15, 0),  # Naive datetime
        reviewed_at=datetime(2026, 9, 6, 17, 15, 0),
        message="Confirmed",
    )
    dumped_json = resp.model_dump_json()
    assert "2026-09-06T17:15:00Z" in dumped_json or "+00:00" in dumped_json
    assert '"confirmed_at":"2026-09-06T17:15:00"' not in dumped_json
