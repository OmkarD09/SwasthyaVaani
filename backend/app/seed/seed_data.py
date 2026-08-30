from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.user import Hospital, Department, Doctor, Patient, User
from app.models.intake import IntakeSession, ClinicalStateModel, QuestionEvent, Answer
from app.models.safety import RedFlagModel
from app.models.review import PhysicianReviewModel
from app.models.document import DocumentModel


def seed_database(db: Session):
    """Populate database with deterministic synthetic demo entities."""
    # Check if already seeded
    if db.query(Hospital).first():
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
    db.add_all([dept_gen, dept_ayu])
    db.flush()

    # 3. Doctors
    doc1 = Doctor(id="doc_001", hospital_id=hosp.id, department_id=dept_gen.id, display_name="Dr. Ananya Rao", specialization="General Medicine")
    doc2 = Doctor(id="doc_002", hospital_id=hosp.id, department_id=dept_ayu.id, display_name="Dr. Devika Rao", specialization="Ayurveda")
    db.add_all([doc1, doc2])
    db.flush()

    # 4. Patient 1: Sanjay Kumar (Chest pain - Priority case)
    p1 = Patient(id="pat_001", display_name="Sanjay Kumar", age=51, gender="Male", abha_id="ABHA-9928-1123")
    db.add(p1)
    db.flush()

    s1 = IntakeSession(
        id="intake_001",
        token="A-027",
        patient_id=p1.id,
        hospital_id=hosp.id,
        doctor_id=doc1.id,
        workflow_type="GENERAL_CLINICAL",
        status="SUBMITTED",
        question_count=4,
        submitted_at=datetime.now(timezone.utc) - timedelta(minutes=18)
    )
    db.add(s1)
    db.flush()

    cs1 = ClinicalStateModel(
        intake_session_id=s1.id,
        version=1,
        state_json={
            "chief_complaint": "Sudden chest pressure while walking",
            "symptoms": ["Chest pressure", "Left shoulder discomfort"],
            "onset": "Sudden onset while walking to hospital",
            "duration": "Since this morning (2 hours)",
            "severity": 8,
            "location": "Centre of chest",
            "character": "Heavy squeezing pressure",
            "radiation": "Radiating to left shoulder and arm",
            "associated_symptoms": ["Breathlessness", "Sweating"],
            "red_flags": [{
                "rule_id": "RF-CP-001",
                "title": "Chest Pain with High-Risk Associated Signals",
                "reason": "Patient reported sudden heavy chest pressure with left arm radiation and breathlessness.",
                "severity": "PRIORITY",
                "evidence_ids": ["chief_complaint", "associated_symptoms"],
                "status": "OPEN"
            }],
            "confidence": 0.97
        }
    )
    rf1 = RedFlagModel(
        intake_session_id=s1.id,
        rule_id="RF-CP-001",
        title="Chest Pain with High-Risk Associated Signals",
        reason="Heavy chest pressure with left arm radiation and breathlessness.",
        severity="PRIORITY"
    )
    db.add_all([cs1, rf1])

    # 5. Patient 2: Raghav Menon (AYUSH joint pain case)
    p2 = Patient(id="pat_002", display_name="Raghav Menon", age=62, gender="Male", abha_id="ABHA-4412-8874")
    db.add(p2)
    db.flush()

    s2 = IntakeSession(
        id="intake_002",
        token="A-021",
        patient_id=p2.id,
        hospital_id=hosp.id,
        doctor_id=doc2.id,
        workflow_type="AYUSH",
        status="SUBMITTED",
        question_count=5,
        submitted_at=datetime.now(timezone.utc) - timedelta(minutes=32)
    )
    db.add(s2)
    db.flush()

    cs2 = ClinicalStateModel(
        intake_session_id=s2.id,
        version=1,
        state_json={
            "chief_complaint": "Knee stiffness, worse in the morning",
            "symptoms": ["Bilateral knee stiffness", "Crepitus on stairs"],
            "onset": "Insidious onset over months",
            "duration": "18 months",
            "severity": 5,
            "location": "Both knees, right > left",
            "character": "Dull ache with morning stiffness",
            "associated_symptoms": ["Joint cracking on stairs"],
            "ayush": {
                "prakriti": "Vata-Kapha",
                "agni": "Manda (low/sluggish)",
                "koshtha": "Krura (hard/constipated)",
                "ahara_vihara": "Aggravated by cold weather and heavy climbing",
                "doshas": [67, 15, 18]
            },
            "confidence": 0.89
        }
    )
    db.add(cs2)

    # 6. Patient 3: Meena Kumari (General OPD cough case)
    p3 = Patient(id="pat_003", display_name="Meena Kumari", age=54, gender="Female", abha_id="ABHA-1029-3382")
    db.add(p3)
    db.flush()

    s3 = IntakeSession(
        id="intake_003",
        token="SV-2048",
        patient_id=p3.id,
        hospital_id=hosp.id,
        doctor_id=doc1.id,
        workflow_type="GENERAL_CLINICAL",
        status="SUBMITTED",
        question_count=4,
        submitted_at=datetime.now(timezone.utc) - timedelta(minutes=4)
    )
    db.add(s3)
    db.flush()

    cs3 = ClinicalStateModel(
        intake_session_id=s3.id,
        version=1,
        state_json={
            "chief_complaint": "Persistent cough and throat irritation",
            "symptoms": ["Dry cough", "Throat irritation at night"],
            "onset": "Gradual onset following seasonal change",
            "duration": "2 weeks",
            "severity": 4,
            "location": "Throat / Upper respiratory",
            "character": "Dry irritating cough",
            "associated_symptoms": ["Occasional mild throat soreness"],
            "confidence": 0.94
        }
    )
    db.add(cs3)

    db.commit()
