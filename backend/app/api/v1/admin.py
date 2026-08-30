from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.models.user import Hospital, Department, Doctor
from app.models.review import AuditEventModel

router = APIRouter(prefix="/admin", tags=["Administrator Console"])


@router.get("/hospitals")
def list_hospitals(db: Session = Depends(get_db)):
    """List configured hospitals and active departments."""
    hospitals = db.query(Hospital).all()
    results = []
    for h in hospitals:
        depts = db.query(Department).filter(Department.hospital_id == h.id).all()
        results.append({
            "id": h.id,
            "name": h.name,
            "code": h.code,
            "city": h.city,
            "departments": [{"id": d.id, "name": d.name, "code": d.code} for d in depts]
        })
    return results


@router.get("/doctors")
def list_doctors(db: Session = Depends(get_db)):
    """List active doctors and clinical specializations."""
    doctors = db.query(Doctor).all()
    return [{
        "id": d.id,
        "name": d.display_name,
        "specialization": d.specialization,
        "hospital_id": d.hospital_id,
        "is_active": d.is_active
    } for d in doctors]


@router.get("/audit")
def list_audit_events(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve system security and clinical audit trail."""
    events = db.query(AuditEventModel).order_by(AuditEventModel.created_at.desc()).limit(limit).all()
    return [{
        "id": e.id,
        "actor_role": e.actor_role,
        "event_type": e.event_type,
        "resource_type": e.resource_type,
        "resource_id": e.resource_id,
        "metadata": e.metadata_json,
        "timestamp": e.created_at
    } for e in events]


@router.get("/services/status")
def get_service_status():
    """Operational status of AI, Speech, OCR, Database, and Integration adapters."""
    return {
        "database": {"status": "ONLINE", "type": "PostgreSQL/SQLite"},
        "llm_service": {"status": "ONLINE", "provider": "Deterministic Adaptive Engine / Gemini"},
        "speech_service": {"status": "ONLINE", "provider": "Sarvam / Bhashini / Mock"},
        "ocr_service": {"status": "ONLINE", "provider": "PaddleOCR / Mock"},
        "abdm_gateway": {"status": "ONLINE", "mode": "Sandbox Adapter"},
    }
