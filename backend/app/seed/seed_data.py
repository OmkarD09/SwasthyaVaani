from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.user import Hospital, Department, Doctor, Patient, User
from app.models.intake import IntakeSession, ClinicalStateModel, QuestionEvent, Answer
from app.models.safety import RedFlagModel, ContradictionModel
from app.models.review import PhysicianReviewModel, PhysicianEditModel, AuditEventModel
from app.models.document import DocumentModel
from app.core.config import settings
from app.core.security import hash_password


def seed_database(db: Session):
    """Populate database with deterministic synthetic demo entities."""
    # Check if already seeded
    if db.query(Hospital).first():
        # Ensure default staff users exist even if hospital exists
        _seed_staff_users(db)
        _seed_initial_audit_events(db)
        return

    # 1. Hospital
    hosp = Hospital(
        id="hosp_district_01",
        name="District Hospital",
        code="HOSP-DIST-01",
        city="North Wing",
        state="Maharashtra"
    )
    db.add(hosp)
    db.flush()

    # 2. Departments
    dept_gen = Department(id="dept_gen_01", hospital_id=hosp.id, name="General Medicine", code="GEN-OPD")
    dept_ayu = Department(id="dept_ayu_01", hospital_id=hosp.id, name="Ayurveda OPD", code="AYU-OPD")
    dept_cardio = Department(id="dept_cardio_01", hospital_id=hosp.id, name="Cardiology & Emergency", code="EMERG-OPD")
    dept_ortho = Department(id="dept_ortho_01", hospital_id=hosp.id, name="Orthopedics", code="ORTHO-OPD")
    dept_ped = Department(id="dept_ped_01", hospital_id=hosp.id, name="Pediatrics", code="PED-OPD")
    db.add_all([dept_gen, dept_ayu, dept_cardio, dept_ortho, dept_ped])
    db.flush()

    # 3. Doctors
    doc1 = Doctor(
        id="doc_001",
        hospital_id=hosp.id,
        department_id=dept_gen.id,
        display_name="Dr. Ananya Rao",
        specialization="General Medicine",
        license_identifier="MCI-2018-8839",
        contact="+91 98201 44512",
        working_hours="08:00 AM - 04:00 PM"
    )
    doc2 = Doctor(
        id="doc_002",
        hospital_id=hosp.id,
        department_id=dept_ayu.id,
        display_name="Dr. Devika Rao",
        specialization="Ayurveda (Kayachikitsa)",
        license_identifier="AYU-MAH-4091",
        contact="+91 94102 77123",
        working_hours="09:00 AM - 05:00 PM"
    )
    doc3 = Doctor(
        id="doc_003",
        hospital_id=hosp.id,
        department_id=dept_cardio.id,
        display_name="Dr. Vikram Sen",
        specialization="Cardiology & Critical Care",
        license_identifier="MCI-2012-1049",
        contact="+91 97600 33419",
        working_hours="07:00 AM - 03:00 PM"
    )
    db.add_all([doc1, doc2, doc3])
    db.flush()

    # 4. Seed Seed-Scenarios
    _seed_scenario_a027(db, hosp.id, doc3.id)
    _seed_scenario_a021(db, hosp.id, doc2.id)
    _seed_scenario_sv2048(db, hosp.id, doc1.id)

    # 5. Staff users
    _seed_staff_users(db)

    # 6. Audit Trail
    _seed_initial_audit_events(db)

    db.commit()


def _seed_staff_users(db: Session):
    """Seed standard hospital staff roles for RBAC console."""
    staff = [
        {"id": "user_admin_01", "email": "admin.rohan@district-hospital.in", "display_name": "Rohan (Lead Administrator)", "role": "HOSPITAL_ADMIN", "phone": "+91 98200 11001"},
        {"id": "user_super_01", "email": "superadmin@district-hospital.in", "display_name": "Chief Medical Officer", "role": "SUPER_ADMIN", "phone": "+91 98200 11000"},
        {"id": "user_doc_01", "email": "ananya.rao@district-hospital.in", "display_name": "Dr. Ananya Rao", "role": "DOCTOR", "phone": "+91 98201 44512"},
        {"id": "user_doc_02", "email": "devika.rao@district-hospital.in", "display_name": "Dr. Devika Rao", "role": "DOCTOR", "phone": "+91 94102 77123"},
        {"id": "user_nurse_01", "email": "nurse.priya@district-hospital.in", "display_name": "Sister Priya Nair", "role": "NURSE", "phone": "+91 98200 22002"},
        {"id": "user_rec_01", "email": "kiosk.desk@district-hospital.in", "display_name": "Rajesh Sharma", "role": "RECEPTIONIST", "phone": "+91 98200 33003"},
        {"id": "user_lab_01", "email": "lab.tech@district-hospital.in", "display_name": "Pooja Verma", "role": "LAB_STAFF", "phone": "+91 98200 44004"},
    ]
    seed_passwords = {
        "user_doc_01": settings.SEED_USER_DOC_01_PASSWORD,
        "user_admin_01": settings.SEED_USER_ADMIN_01_PASSWORD,
    }
    for s in staff:
        user = db.query(User).filter(User.id == s["id"]).first()
        if not user:
            user = User(
                id=s["id"],
                email=s["email"],
                display_name=s["display_name"],
                role=s["role"],
                phone=s["phone"],
                is_active=True
            )
            db.add(user)
        seed_password = seed_passwords.get(s["id"])
        if seed_password and not user.password_hash:
            user.password_hash = hash_password(seed_password)
    db.flush()


def _seed_scenario_a027(db: Session, hospital_id: str, doctor_id: str):
    """Seed Token #A-027: Sunita Verma / Sanjay Kumar - Cardiac Red-Flag."""
    p1 = db.query(Patient).filter(Patient.id == "pat_001").first()
    if not p1:
        p1 = Patient(id="pat_001", display_name="Sunita Verma", age=45, gender="Female", abha_id="ABHA-9928-1123")
        db.add(p1)
        db.flush()

    s1 = db.query(IntakeSession).filter(IntakeSession.id == "intake_001").first()
    if not s1:
        s1 = IntakeSession(
            id="intake_001",
            token="A-027",
            patient_id=p1.id,
            hospital_id=hospital_id,
            doctor_id=doctor_id,
            workflow_type="GENERAL_CLINICAL",
            interaction_mode="VOICE",
            language_code="hi",
            status="SUBMITTED",
            question_count=4,
            started_at=datetime.now(timezone.utc) - timedelta(minutes=24),
            submitted_at=datetime.now(timezone.utc) - timedelta(minutes=18)
        )
        db.add(s1)
        db.flush()

    if not db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s1.id).first():
        cs1 = ClinicalStateModel(
            intake_session_id=s1.id,
            version=1,
            state_json={
                "chief_complaint": "छाती में भारीपन और बाएं हाथ में दर्द (Chest tightness + left arm pain)",
                "symptoms": ["Chest tightness", "Left arm radiating pain", "Sweating", "Shortness of breath"],
                "onset": "Sudden onset while walking to market (2 hours ago)",
                "duration": "2 hours acute",
                "severity": 9,
                "location": "Substernal chest radiating to left shoulder and arm",
                "character": "Crushing pressure / tightness",
                "radiation": "Left arm and jaw",
                "associated_symptoms": ["Diaphoresis (profuse sweating)", "Breathlessness at rest"],
                "suggested_department": "Cardiology & Emergency",
                "recommended_handoff": "Immediate ECG & Physician Evaluation (Priority Red-Flag)",
                "red_flags": [{
                    "rule_id": "RF-CARDIAC-001",
                    "title": "Suspected Acute Coronary Syndrome",
                    "reason": "Sudden crushing chest pressure with arm radiation, diaphoresis and acute onset.",
                    "severity": "CRITICAL",
                    "evidence_ids": ["chief_complaint", "associated_symptoms"],
                    "status": "OPEN"
                }],
                "confidence": 0.98
            }
        )
        rf1 = RedFlagModel(
            intake_session_id=s1.id,
            rule_id="RF-CARDIAC-001",
            title="Suspected Acute Coronary Syndrome",
            reason="Crushing chest tightness with left arm radiation and diaphoresis.",
            severity="CRITICAL",
            status="OPEN"
        )
        db.add_all([cs1, rf1])


def _seed_scenario_a021(db: Session, hospital_id: str, doctor_id: str):
    """Seed Token #A-021: Ramesh Patel - AYUSH Stream."""
    p2 = db.query(Patient).filter(Patient.id == "pat_002").first()
    if not p2:
        p2 = Patient(id="pat_002", display_name="Ramesh Patel", age=58, gender="Male", abha_id="ABHA-4412-8874")
        db.add(p2)
        db.flush()

    s2 = db.query(IntakeSession).filter(IntakeSession.id == "intake_002").first()
    if not s2:
        s2 = IntakeSession(
            id="intake_002",
            token="A-021",
            patient_id=p2.id,
            hospital_id=hospital_id,
            doctor_id=doctor_id,
            workflow_type="AYUSH",
            interaction_mode="VOICE",
            language_code="hi",
            status="SUBMITTED",
            question_count=5,
            started_at=datetime.now(timezone.utc) - timedelta(minutes=40),
            submitted_at=datetime.now(timezone.utc) - timedelta(minutes=32)
        )
        db.add(s2)
        db.flush()

    if not db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s2.id).first():
        cs2 = ClinicalStateModel(
            intake_session_id=s2.id,
            version=1,
            state_json={
                "chief_complaint": "घुटनों में दर्द और सुबह की अकड़न (Chronic bilateral knee pain)",
                "symptoms": ["Bilateral knee stiffness", "Crepitus on bending", "Sluggish digestion"],
                "onset": "Insidious onset worsening over winter months",
                "duration": "18 months",
                "severity": 5,
                "location": "Bilateral knees, right > left",
                "character": "Dull persistent ache with morning stiffness > 30 mins",
                "associated_symptoms": ["Joint crepitation on walking", "Bloating after evening meal"],
                "suggested_department": "Ayurveda OPD",
                "recommended_handoff": "Prakriti assessment, Sandhigata Vata evaluation, Janu Basti workup",
                "ayush": {
                    "prakriti": "Vata-Kapha",
                    "agni": "Manda (sluggish)",
                    "koshtha": "Krura (hard/dry)",
                    "ahara_vihara": "Aggravated by cold food, dry weather, and heavy climbing",
                    "doshas": [67, 15, 18]
                },
                "confidence": 0.91
            }
        )
        db.add(cs2)


def _seed_scenario_sv2048(db: Session, hospital_id: str, doctor_id: str):
    """Seed Token #SV-2048: Meena Kumari - General OPD Bronchitis & Prescription."""
    p3 = db.query(Patient).filter(Patient.id == "pat_003").first()
    if not p3:
        p3 = Patient(id="pat_003", display_name="Meena Kumari", age=34, gender="Female", abha_id="ABHA-1029-3382")
        db.add(p3)
        db.flush()

    s3 = db.query(IntakeSession).filter(IntakeSession.id == "intake_003").first()
    if not s3:
        s3 = IntakeSession(
            id="intake_003",
            token="SV-2048",
            patient_id=p3.id,
            hospital_id=hospital_id,
            doctor_id=doctor_id,
            workflow_type="GENERAL_CLINICAL",
            interaction_mode="TEXT",
            language_code="en",
            status="SUBMITTED",
            question_count=4,
            started_at=datetime.now(timezone.utc) - timedelta(minutes=15),
            submitted_at=datetime.now(timezone.utc) - timedelta(minutes=8)
        )
        db.add(s3)
        db.flush()

    if not db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == s3.id).first():
        cs3 = ClinicalStateModel(
            intake_session_id=s3.id,
            version=1,
            state_json={
                "chief_complaint": "Persistent dry cough, throat tickle, and mild nocturnal wheezing",
                "symptoms": ["Dry hacking cough", "Nocturnal throat irritation", "Post-nasal drip"],
                "onset": "Gradual onset following viral upper respiratory infection 12 days ago",
                "duration": "2 weeks",
                "severity": 4,
                "location": "Upper respiratory tract & trachea",
                "character": "Dry, spasmodic hacking cough",
                "associated_symptoms": ["Mild fatigue", "Low-grade throat soreness"],
                "suggested_department": "General Medicine",
                "recommended_handoff": "Chest auscultation, Spirometry / Bronchitis evaluation, Past Rx review",
                "confidence": 0.95
            }
        )
        db.add(cs3)

    # Add mock past prescription document
    if not db.query(DocumentModel).filter(DocumentModel.patient_id == p3.id).first():
        doc_entry = DocumentModel(
            id="doc_sv2048_01",
            patient_id=p3.id,
            intake_session_id=s3.id,
            file_name="rx_august2026_bronchitis.pdf",
            file_size=184520,
            mime_type="application/pdf",
            sha256="9f82c4e2a1b5c8d0e3f7a4b6c8d1e2f3",
            storage_object_id="medical-documents/doc_sv2048_01.pdf",
            document_type="PRESCRIPTION",
            status="NEEDS_REVIEW"
        )
        db.add(doc_entry)


def _seed_initial_audit_events(db: Session):
    """Seed realistic initial security and clinical audit trail."""
    if db.query(AuditEventModel).first():
        return

    now = datetime.now(timezone.utc)
    events = [
        AuditEventModel(
            actor_user_id="user_doc_01",
            actor_role="DOCTOR",
            event_type="LOGIN",
            resource_type="SESSION",
            resource_id="sess_doc_01",
            metadata_json={"ip": "192.168.1.104", "portal": "Doctor Workstation", "browser": "Chrome/128"},
            created_at=now - timedelta(minutes=52)
        ),
        AuditEventModel(
            actor_user_id="user_admin_01",
            actor_role="HOSPITAL_ADMIN",
            event_type="LOGIN",
            resource_type="SESSION",
            resource_id="sess_admin_01",
            metadata_json={"ip": "192.168.1.5", "portal": "Hospital Admin Console", "auth": "MFA_VERIFIED"},
            created_at=now - timedelta(minutes=45)
        ),
        AuditEventModel(
            actor_user_id="kiosk_terminal_01",
            actor_role="KIOSK",
            event_type="INTAKE_STARTED",
            resource_type="INTAKE_SESSION",
            resource_id="intake_001",
            metadata_json={"token": "A-027", "language": "hi", "mode": "VOICE"},
            created_at=now - timedelta(minutes=24)
        ),
        AuditEventModel(
            actor_user_id="ai_clinical_engine",
            actor_role="SYSTEM_AI",
            event_type="RED_FLAG_ESCALATED",
            resource_type="INTAKE_SESSION",
            resource_id="intake_001",
            metadata_json={"rule": "RF-CARDIAC-001", "severity": "CRITICAL", "trigger": "Chest pain with radiation"},
            created_at=now - timedelta(minutes=19)
        ),
        AuditEventModel(
            actor_user_id="kiosk_terminal_01",
            actor_role="KIOSK",
            event_type="INTAKE_SUBMITTED",
            resource_type="INTAKE_SESSION",
            resource_id="intake_001",
            metadata_json={"token": "A-027", "questions_asked": 4, "handoff": "TRIAGE_QUEUE"},
            created_at=now - timedelta(minutes=18)
        ),
        AuditEventModel(
            actor_user_id="kiosk_terminal_03",
            actor_role="KIOSK",
            event_type="DOCUMENT_UPLOADED",
            resource_type="DOCUMENT",
            resource_id="doc_sv2048_01",
            metadata_json={"token": "SV-2048", "file": "rx_august2026_bronchitis.pdf", "type": "PRESCRIPTION"},
            created_at=now - timedelta(minutes=14)
        ),
        AuditEventModel(
            actor_user_id="ocr_pipeline",
            actor_role="SYSTEM_OCR",
            event_type="DOCUMENT_PROCESSED",
            resource_type="DOCUMENT",
            resource_id="doc_sv2048_01",
            metadata_json={"confidence": 0.94, "entities_extracted": 3, "status": "NEEDS_REVIEW"},
            created_at=now - timedelta(minutes=13)
        ),
        AuditEventModel(
            actor_user_id="user_doc_01",
            actor_role="DOCTOR",
            event_type="RECORD_ACCESS",
            resource_type="PATIENT_RECORD",
            resource_id="pat_001",
            metadata_json={"token": "A-027", "reason": "Priority clinical evaluation"},
            created_at=now - timedelta(minutes=11)
        ),
        AuditEventModel(
            actor_user_id="user_admin_01",
            actor_role="HOSPITAL_ADMIN",
            event_type="PERMISSION_CHANGE",
            resource_type="USER_ROLE",
            resource_id="user_nurse_01",
            metadata_json={"previous_role": "NURSE", "new_role": "NURSE", "action": "VERIFIED"},
            created_at=now - timedelta(minutes=8)
        ),
    ]
    db.add_all(events)
    db.flush()


def reset_demo_database(db: Session):
    """Purge and reseed all synthetic records for SIH demo resets."""
    # Delete child tables first
    db.query(PhysicianEditModel).delete()
    db.query(PhysicianReviewModel).delete()
    db.query(RedFlagModel).delete()
    db.query(ContradictionModel).delete()
    db.query(ClinicalStateModel).delete()
    db.query(Answer).delete()
    db.query(QuestionEvent).delete()
    db.query(DocumentModel).delete()
    db.query(IntakeSession).delete()
    db.query(Patient).delete()
    db.query(Doctor).delete()
    db.query(Department).delete()
    db.query(Hospital).delete()
    db.query(User).delete()
    db.query(AuditEventModel).delete()
    db.commit()

    # Reseed
    seed_database(db)
