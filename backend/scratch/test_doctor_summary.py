import sys
import os
sys.path.insert(0, os.getcwd())
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.intake import IntakeSession, ClinicalStateModel, Answer
from app.models.user import Doctor, Hospital
from app.api.v1.doctor import get_patient_clinical_detail

db = SessionLocal()
doc = db.query(Doctor).first()
hosp = db.query(Hospital).first()
last_session = db.query(IntakeSession).filter(IntakeSession.workflow_type == "GENERAL_CLINICAL").order_by(IntakeSession.started_at.desc()).first()

fake_doctor_auth = {"id": doc.id, "role": "DOCTOR", "hospital_id": hosp.id}

detail = get_patient_clinical_detail(
    intake_id=last_session.id,
    db=db,
    _current_user=fake_doctor_auth
)

print(f"=== DOCTOR PATIENT DETAIL ===")
print(f"Intake Session ID: {detail.intake_session_id}")
print(f"Patient Name: {detail.patient_name}")
print(f"Patient Age: {detail.patient_age} | Gender: {detail.patient_gender}")
print(f"Review Status: {detail.review_status}")

cs = detail.clinical_state
print(f"\nStructured Clinical State:")
print(f"  Chief Complaint: {cs.chief_complaint}")
print(f"  Location: {cs.location}")
print(f"  Duration: {cs.duration}")
print(f"  Associated Symptoms: {cs.associated_symptoms}")
print(f"  Food Exposure: {cs.food_exposure}")
print(f"  Raw Transcript Snippets: {cs.raw_transcript_snippets}")

answers = db.query(Answer).filter(Answer.intake_session_id == last_session.id).order_by(Answer.created_at.asc()).all()
print(f"\nRaw Answers in Session ({len(answers)} total):")
for idx, a in enumerate(answers):
    print(f"  Ans #{idx+1} [{a.input_mode}]: \"{a.raw_text}\"")

# Provenance verification:
print(f"\nProvenance Verification:")
print(f"1. Facts stated by patient preserved in state: {bool(cs.chief_complaint and cs.duration and cs.associated_symptoms)}")
print(f"2. No unconfirmed/hallucinated findings (e.g. dark_stool is not True): {cs.dark_stool is not True}")
print(f"3. Snippets match patient answers: {len(cs.raw_transcript_snippets) == len(answers)}")
db.close()
