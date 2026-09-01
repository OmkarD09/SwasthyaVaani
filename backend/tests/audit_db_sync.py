import os
import sys
import json
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

# Ensure python path
sys.path.insert(0, os.path.abspath("backend"))

from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.core.config import settings
from app.models.user import User, Patient, Doctor, Hospital, Department
from app.models.intake import IntakeSession, QuestionEvent, Answer, ClinicalStateModel
from app.models.safety import RedFlagModel, ContradictionModel
from app.models.review import PhysicianReviewModel, PhysicianEditModel, AuditEventModel
from app.models.document import (
    DocumentModel, DocumentExtractionModel, DocumentOCRRunModel,
    DocumentOCREvidenceModel, DocumentCandidateSetModel, DocumentCandidateModel,
    DocumentCandidateEvidenceLinkModel
)
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from sqlalchemy import inspect


def run_full_database_audit():
    print("=" * 80)
    print("SWASTHYAVAANI — EXHAUSTIVE DATABASE & DATA FLOW AUDIT PROBE")
    print("=" * 80)

    db = SessionLocal()
    client = TestClient(app)
    inspector = inspect(engine)

    audit_results = {}

    # 1. DATABASE SCHEMA & TABLE AUDIT
    print("\n--- 1. TABLE & SCHEMA INSPECTION ---")
    tables = inspector.get_table_names()
    print(f"Total Tables in Database: {len(tables)}")
    expected_tables = [
        "hospitals", "departments", "users", "doctors", "patients",
        "intake_sessions", "question_events", "answers", "clinical_states",
        "red_flags", "contradictions", "physician_reviews", "physician_edits",
        "audit_events", "documents", "document_extractions", "document_ocr_runs",
        "document_ocr_evidence", "document_candidate_sets", "document_candidates",
        "document_candidate_evidence_links", "knowledge_documents", "knowledge_chunks"
    ]
    missing_tables = [t for t in expected_tables if t not in tables]
    print(f"Tables present: {sorted(tables)}")
    print(f"Missing expected tables: {missing_tables}")

    table_details = {}
    for table_name in expected_tables:
        if table_name in tables:
            columns = inspector.get_columns(table_name)
            pks = inspector.get_pk_constraint(table_name)
            fks = inspector.get_foreign_keys(table_name)
            indexes = inspector.get_indexes(table_name)
            uniques = inspector.get_unique_constraints(table_name)
            table_details[table_name] = {
                "columns": [c["name"] for c in columns],
                "pk": pks.get("constrained_columns", []),
                "fks": [
                    {"column": fk.get("constrained_columns"), "referred_table": fk.get("referred_table"), "referred_columns": fk.get("referred_columns")}
                    for fk in fks
                ],
                "indexes": [idx["name"] for idx in indexes],
                "unique": [u["name"] for u in uniques]
            }

    # 2. PATIENT CREATION & PROFILE TEST
    print("\n--- 2. PATIENT PROFILE CREATION & ISOLATION TEST ---")
    hosp = db.query(Hospital).first()
    if not hosp:
        hosp = Hospital(name="District Hospital Pune", code="HOSP-PUNE-01")
        db.add(hosp)
        db.commit()
        db.refresh(hosp)

    doc = db.query(Doctor).first()
    if not doc:
        doc = Doctor(hospital_id=hosp.id, display_name="Dr. Ananya Rao", specialization="General Medicine")
        db.add(doc)
        db.commit()
        db.refresh(doc)

    # Create Patient A and Patient B
    patient_a = Patient(
        display_name="Test Patient Alpha",
        age=45,
        gender="Male",
        phone="+919876543210",
        abha_id="91-1234-5678-0001"
    )
    patient_b = Patient(
        display_name="Test Patient Beta",
        age=32,
        gender="Female",
        phone="+919876543211",
        abha_id="91-1234-5678-0002"
    )
    db.add_all([patient_a, patient_b])
    db.commit()

    print(f"Patient A ID: {patient_a.id}, Name: {patient_a.display_name}")
    print(f"Patient B ID: {patient_b.id}, Name: {patient_b.display_name}")

    # 3. PATIENT INTAKE SESSION & CLINICALSTATE PERSISTENCE
    print("\n--- 3. PATIENT INTAKE SESSION & PROGRESSIVE STATE UPDATE ---")
    intake_res = client.post(
        "/api/v1/intakes",
        json={
            "patient_id": patient_a.id,
            "patient_name": patient_a.display_name,
            "patient_age": patient_a.age,
            "patient_gender": patient_a.gender,
            "hospital_id": hosp.id,
            "doctor_id": doc.id,
            "workflow_type": "GENERAL_CLINICAL",
            "language_code": "en",
            "interaction_mode": "TEXT",
            "consent_given": True
        }
    )
    intake_data = intake_res.json()
    session_id = intake_data["id"]
    token = intake_data["token"]
    print(f"Created IntakeSession ID: {session_id}, Token: {token}, Status: {intake_data['status']}")

    # Verify initial ClinicalState in DB
    init_state_db = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == session_id).all()
    print(f"Initial ClinicalState versions in DB: {len(init_state_db)} (Version: {init_state_db[0].version})")

    # Submit Answer 1: Chief Complaint
    ans1_res = client.post(
        f"/api/v1/intakes/{session_id}/answers",
        json={
            "raw_text": "I have severe crushing chest pain radiating to my left arm for 2 hours.",
            "input_mode": "TEXT",
            "language_code": "en"
        }
    )
    print(f"Answer 1 Response Code: {ans1_res.status_code}")
    ans1_data = ans1_res.json()
    print(f"Answer 1 Next Decision: {ans1_data['decision']['action']} - Question: {ans1_data['decision']['question']}")

    # Submit Answer 2: Associated Symptoms & Red Flag trigger
    ans2_res = client.post(
        f"/api/v1/intakes/{session_id}/answers",
        json={
            "question_event_id": None,
            "raw_text": "I am sweating heavily and feeling breathless.",
            "input_mode": "TEXT",
            "language_code": "en"
        }
    )
    print(f"Answer 2 Response Code: {ans2_res.status_code}")

    # Check ClinicalState versions in DB
    state_versions = db.query(ClinicalStateModel).filter(
        ClinicalStateModel.intake_session_id == session_id
    ).order_by(ClinicalStateModel.version.asc()).all()
    print(f"Total ClinicalState versions persisted in DB: {len(state_versions)}")
    for sv in state_versions:
        print(f"  - Version {sv.version}: chief_complaint={sv.state_json.get('chief_complaint')}, symptoms={sv.state_json.get('symptoms')}, red_flags={sv.state_json.get('red_flags')}")

    # Check Answers & QuestionEvents in DB
    db_answers = db.query(Answer).filter(Answer.intake_session_id == session_id).all()
    db_questions = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == session_id).all()
    print(f"Persisted Answers in DB: {len(db_answers)}")
    print(f"Persisted QuestionEvents in DB: {len(db_questions)}")

    # 4. SUBMIT INTAKE & RED FLAG PERSISTENCE AUDIT
    print("\n--- 4. INTAKE SUBMISSION & TRIAGE EVALUATION ---")
    submit_res = client.post(f"/api/v1/intakes/{session_id}/submit")
    print(f"Intake Submit Response Code: {submit_res.status_code}")
    if submit_res.status_code != 200:
        print(f"Submit Failed Error: {submit_res.text}")
    else:
        print(f"Submit Success: {submit_res.json()}")

    # Verify session status in DB
    updated_session = db.query(IntakeSession).filter(IntakeSession.id == session_id).first()
    print(f"Updated IntakeSession status in DB: {updated_session.status}, submitted_at: {updated_session.submitted_at}")

    # 5. DOCTOR QUEUE AUDIT
    print("\n--- 5. DOCTOR QUEUE RETRIEVAL AUDIT ---")
    queue_res = client.get("/api/v1/doctor/queue")
    print(f"Doctor Queue Response Code: {queue_res.status_code}")
    queue_data = queue_res.json()
    print(f"Total items in Doctor Queue: {len(queue_data)}")
    matching_queue_item = next((q for q in queue_data if q["intake_session_id"] == session_id), None)
    if matching_queue_item:
        print(f"Found in Queue: Token={matching_queue_item['token']}, Name={matching_queue_item['patient_name']}, Priority={matching_queue_item['priority']}, Complaint='{matching_queue_item['chief_complaint']}', HasRedFlags={matching_queue_item['has_red_flags']}")
    else:
        print("CRITICAL: Session NOT found in Doctor Queue!")

    # 6. DOCTOR CASE VIEW AUDIT
    print("\n--- 6. DOCTOR CASE VIEW AUDIT ---")
    case_res = client.get(f"/api/v1/doctor/patients/{session_id}")
    print(f"Doctor Case View Response Code: {case_res.status_code}")
    case_data = case_res.json()
    print(f"Case Data: Patient Name={case_data.get('patient_name')}, Token={case_data.get('token')}, ReviewStatus={case_data.get('review_status')}")
    print(f"Clinical State in Case View: {json.dumps(case_data.get('clinical_state'), indent=2)}")

    # 7. DOCTOR CONFIRMATION & FHIR AUDIT
    print("\n--- 7. DOCTOR CONFIRMATION AUDIT ---")
    confirm_res = client.post(
        f"/api/v1/doctor/patients/{session_id}/confirm",
        json={
            "intake_session_id": session_id,
            "notes": "Patient presents with acute chest pain syndrome. Immediate ECG and cardiac enzymes ordered.",
            "edits": [
                {"field_name": "severity", "old_value": "8", "new_value": "9", "reason": "Severe distress on presentation"}
            ],
            "generate_fhir": True
        }
    )
    print(f"Confirm Response Code: {confirm_res.status_code}")
    if confirm_res.status_code == 200:
        confirm_data = confirm_res.json()
        print(f"Confirmation Result: ReviewID={confirm_data.get('review_id')}, Status={confirm_data.get('status')}, FHIR Bundle ID={confirm_data.get('fhir_bundle_id')}")
    else:
        print(f"Confirm Failed Error: {confirm_res.text}")

    # Verify Review, Edit, and Audit in DB
    db_review = db.query(PhysicianReviewModel).filter(PhysicianReviewModel.intake_session_id == session_id).first()
    db_edits = db.query(PhysicianEditModel).filter(PhysicianEditModel.physician_review_id == db_review.id).all() if db_review else []
    db_audits = db.query(AuditEventModel).filter(AuditEventModel.resource_id == session_id).all()
    print(f"Persisted PhysicianReview in DB: {db_review is not None} (Status: {db_review.status if db_review else 'N/A'})")
    print(f"Persisted PhysicianEdits in DB: {len(db_edits)}")
    print(f"Persisted AuditEvents in DB: {len(db_audits)}")

    # 8. PATIENT ISOLATION TEST (Patient B trying to access Patient A)
    print("\n--- 8. PATIENT DATA ISOLATION & ACCESS AUDIT ---")
    # Query all intakes for Patient A vs Patient B
    intakes_a = db.query(IntakeSession).filter(IntakeSession.patient_id == patient_a.id).all()
    intakes_b = db.query(IntakeSession).filter(IntakeSession.patient_id == patient_b.id).all()
    print(f"Patient A Intakes count: {len(intakes_a)}")
    print(f"Patient B Intakes count: {len(intakes_b)}")
    assert len(intakes_a) >= 1
    assert len(intakes_b) == 0

    print("\n" + "=" * 80)
    print("AUDIT PROBE COMPLETED")
    print("=" * 80)


if __name__ == "__main__":
    run_full_database_audit()
