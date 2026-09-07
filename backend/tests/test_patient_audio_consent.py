import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, get_db

client = TestClient(app)

def test_patient_intake_creation_with_audio_guided_consent():
    """Verify patient intake accepts and processes audio-guided consent metadata."""
    payload = {
        "patient_name": "Rohan Verma",
        "patient_age": 29,
        "patient_gender": "Male",
        "language_code": "hi",
        "workflow_type": "GENERAL_CLINICAL",
        "interaction_mode": "VOICE",
        "consent_given": True,
        "consent_language": "हिन्दी",
        "consent_timestamp": datetime.now(timezone.utc).isoformat(),
        "consent_method": "AUDIO_GUIDED",
        "consent_version": "v1.0",
        "chief_complaint": "Persistent headache and fever",
        "symptoms": ["headache", "fever"],
        "duration": "3 days",
        "severity": 6,
        "submit_now": True,
    }

    response = client.post("/api/v1/intakes", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["id"] is not None
    assert data["token"] is not None
    assert data["consent_recorded"] is True
    assert data["patient_name"] == "Rohan Verma"
    assert data["patient_age"] == 29
    assert data["patient_display_id"] is not None
    assert data["patient_display_id"].startswith("P")
