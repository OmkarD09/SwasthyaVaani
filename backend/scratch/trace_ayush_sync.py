import asyncio
import os
import sys

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

import functools
print = functools.partial(print, flush=True)

from app.core.database import SessionLocal
from app.models.user import Patient, Doctor, Hospital
from app.models.intake import IntakeSession, ClinicalStateModel, QuestionEvent
from app.models.ayush import AyushAssessmentModel
from app.schemas.intake import IntakeCreateRequest
from app.api.v1.intakes import create_intake_session, process_intake_answer_core
from app.api.v1.doctor import get_patient_clinical_detail

async def main():
    db = SessionLocal()
    try:
        # Create test patient
        patient = Patient(
            display_name="AyushTest Patient",
            age=26,
            gender="MALE",
            phone="9876543210"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

        print(f"Created patient: id={patient.id}, age={patient.age}")

        # Step 1: Create AYUSH Intake Session
        req = IntakeCreateRequest(
            patient_id=patient.id,
            language_code="hi",
            interaction_mode="VOICE",
            workflow_type="AYUSH",
        )
        create_resp = await create_intake_session(req=req, db=db)
        session_id = create_resp.id
        print(f"Created AYUSH Session ID: {session_id}")

        session = db.query(IntakeSession).filter(IntakeSession.id == session_id).first()
        first_q = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == session_id).order_by(QuestionEvent.sequence_number.asc()).first()
        first_q_id = first_q.id if first_q else None
        print(f"First Question Event: id={first_q_id}, text={first_q.question_text if first_q else None}")

        # Check initial AyushAssessmentModel
        ayush_init = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session_id).first()
        print("\n--- Initial AyushAssessmentModel ---")
        if ayush_init:
            print("Status:", ayush_init.status)
            print("Assessment JSON:", ayush_init.assessment_json)
        else:
            print("No AyushAssessmentModel found!")

        # Step 2: Answer 1 (Digestive complaint in Hindi)
        print("\n--- Submitting Turn 1: 'मुझे भूख कम लगती है और खाना खाने के बाद पेट भारी रहता है।' ---")
        ans1_resp = await process_intake_answer_core(
            session=session,
            raw_text="मुझे भूख कम लगती है और खाना खाने के बाद पेट भारी रहता है।",
            input_mode="VOICE",
            language_code="hi",
            audio_duration_seconds=3.5,
            question_event_id=first_q_id,
            db=db,
        )
        print("Extracted Facts Turn 1:", ans1_resp.extracted_facts)
        print("ClinicalState AYUSH Turn 1:", ans1_resp.clinical_state.ayush)
        print("ClinicalState Canonical Dimensions Turn 1:", {k: v.model_dump() for k, v in ans1_resp.clinical_state.canonical_dimensions.items()})
        print("Next Question Decision Turn 1:", ans1_resp.decision.action, ans1_resp.decision.target_field, ans1_resp.decision.question)

        # Check DB AyushAssessmentModel after Turn 1
        db.expire_all()
        ayush_t1 = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session_id).first()
        print("AyushAssessmentModel DB JSON after Turn 1:", ayush_t1.assessment_json if ayush_t1 else None)

        # Step 3: Answer 2 (Bowel habits)
        print("\n--- Submitting Turn 2: 'कब्ज रहती है और शौच सख्त होता है।' ---")
        ans2_resp = await process_intake_answer_core(
            session=session,
            raw_text="कब्ज रहती है और शौच सख्त होता है।",
            input_mode="VOICE",
            language_code="hi",
            audio_duration_seconds=2.8,
            question_event_id=ans1_resp.next_question_event_id,
            db=db,
        )
        print("Extracted Facts Turn 2:", ans2_resp.extracted_facts)
        print("ClinicalState AYUSH Turn 2:", ans2_resp.clinical_state.ayush)
        print("Next Question Decision Turn 2:", ans2_resp.decision.action, ans2_resp.decision.target_field, ans2_resp.decision.question)

        # Step 4: Answer 3 (Diet / lifestyle)
        print("\n--- Submitting Turn 3: 'रोज बाहर का तला-भुना और मसालेदार खाना खाता हूँ, रात को देर से सोता हूँ।' ---")
        ans3_resp = await process_intake_answer_core(
            session=session,
            raw_text="रोज बाहर का तला-भुना और मसालेदार खाना खाता हूँ, रात को देर से सोता हूँ।",
            input_mode="VOICE",
            language_code="hi",
            audio_duration_seconds=3.2,
            question_event_id=ans2_resp.next_question_event_id,
            db=db,
        )
        print("Extracted Facts Turn 3:", ans3_resp.extracted_facts)
        print("ClinicalState AYUSH Turn 3:", ans3_resp.clinical_state.ayush)

        # Check Doctor API Response
        db.expire_all()
        doc_detail = get_patient_clinical_detail(intake_id=session_id, db=db, _current_user={"sub": "doc-1", "role": "DOCTOR"})
        print("\n--- Doctor API Detail ayush_assessment ---")
        if doc_detail.ayush_assessment:
            print(doc_detail.ayush_assessment.model_dump(mode="json"))
        else:
            print("ayush_assessment is None in Doctor API response!")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
