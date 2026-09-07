import asyncio
import os
import sys
import uuid

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import get_db, SessionLocal
from app.models.user import Patient, Hospital, Doctor
from app.models.intake import Answer, ClinicalStateModel, IntakeSession, QuestionEvent
from app.schemas.clinical_state import ClinicalState
from app.api.v1.intakes import process_intake_answer_core


async def run_manual_validations():
    print("=" * 70)
    print("STARTING MANUAL VALIDATION OF NEGATION SCENARIOS A, B, C, D")
    print("=" * 70)

    db = SessionLocal()
    try:
        hospital = db.query(Hospital).first()
        if not hospital:
            hospital = Hospital(name="Validation Hospital", code=f"VAL-{uuid.uuid4().hex[:6]}")
            db.add(hospital)
            db.flush()

        doctor = db.query(Doctor).filter(Doctor.hospital_id == hospital.id).first()
        if not doctor:
            doctor = Doctor(hospital_id=hospital.id, display_name="Dr. Validation", specialization="General Medicine")
            db.add(doctor)
            db.flush()

        # Create a test patient
        patient = Patient(display_name="Validation Patient", age=32, gender="male")
        db.add(patient)
        db.flush()

        # -------------------------------------------------------------
        # SCENARIO A: "I am vomiting" -> vomiting = KNOWN_TRUE
        # -------------------------------------------------------------
        print("\n--- SCENARIO A: Positive Vomiting ---")
        sess_a = IntakeSession(
            token=str(uuid.uuid4()),
            patient_id=patient.id,
            hospital_id=hospital.id,
            doctor_id=doctor.id,
            workflow_type="GENERAL_CLINICAL",
            language_code="en",
            interaction_mode="TEXT",
            status="IN_PROGRESS",
            question_count=1
        )
        db.add(sess_a)
        db.flush()

        init_state_a = ClinicalState(chief_complaint="Severe stomach pain", location="Abdomen")
        csm_a = ClinicalStateModel(
            intake_session_id=sess_a.id,
            version=1,
            state_json=init_state_a.model_dump()
        )
        db.add(csm_a)

        qe_a = QuestionEvent(
            intake_session_id=sess_a.id,
            sequence_number=1,
            question_text="Are you having any nausea or vomiting?",
            target_field="vomiting",
            decision_action="ASK"
        )
        db.add(qe_a)
        db.commit()

        res_a = await process_intake_answer_core(
            session=sess_a,
            raw_text="I am vomiting frequently",
            input_mode="TEXT",
            language_code="en",
            audio_duration_seconds=None,
            question_event_id=qe_a.id,
            db=db
        )

        latest_csm_a = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == sess_a.id).order_by(ClinicalStateModel.version.desc()).first()
        state_a = ClinicalState(**latest_csm_a.state_json)
        vomit_dim_a = state_a.canonical_dimensions.get("vomiting")

        print(f"Answer: 'I am vomiting frequently'")
        print(f"Canonical Dimension 'vomiting': status={vomit_dim_a.status if vomit_dim_a else None}, value={vomit_dim_a.value if vomit_dim_a else None}")
        print(f"Associated Symptoms: {state_a.associated_symptoms}")
        print(f"Negated Symptoms: {state_a.negated_symptoms}")
        assert vomit_dim_a is not None and vomit_dim_a.status == "KNOWN_TRUE", f"Expected KNOWN_TRUE, got {vomit_dim_a}"
        assert vomit_dim_a.value is True
        assert "vomiting" not in state_a.negated_symptoms
        assert any("vomit" in str(s).lower() for s in state_a.associated_symptoms)
        print(">>> SCENARIO A PASSED: vomiting = KNOWN_TRUE, associated_symptoms contains vomiting")

        # -------------------------------------------------------------
        # SCENARIO B: "I am not vomiting" -> vomiting = KNOWN_FALSE
        # -------------------------------------------------------------
        print("\n--- SCENARIO B: Explicit Negation ---")
        sess_b = IntakeSession(
            token=str(uuid.uuid4()),
            patient_id=patient.id,
            hospital_id=hospital.id,
            doctor_id=doctor.id,
            workflow_type="GENERAL_CLINICAL",
            language_code="en",
            interaction_mode="TEXT",
            status="IN_PROGRESS",
            question_count=1
        )
        db.add(sess_b)
        db.flush()

        init_state_b = ClinicalState(chief_complaint="Severe stomach pain", location="Abdomen")
        csm_b = ClinicalStateModel(
            intake_session_id=sess_b.id,
            version=1,
            state_json=init_state_b.model_dump()
        )
        db.add(csm_b)

        qe_b = QuestionEvent(
            intake_session_id=sess_b.id,
            sequence_number=1,
            question_text="Are you having any nausea or vomiting?",
            target_field="vomiting",
            decision_action="ASK"
        )
        db.add(qe_b)
        db.commit()

        res_b = await process_intake_answer_core(
            session=sess_b,
            raw_text="No, I am not vomiting.",
            input_mode="TEXT",
            language_code="en",
            audio_duration_seconds=None,
            question_event_id=qe_b.id,
            db=db
        )

        latest_csm_b = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == sess_b.id).order_by(ClinicalStateModel.version.desc()).first()
        state_b = ClinicalState(**latest_csm_b.state_json)
        vomit_dim_b = state_b.canonical_dimensions.get("vomiting")

        print(f"Answer: 'No, I am not vomiting.'")
        print(f"Canonical Dimension 'vomiting': status={vomit_dim_b.status if vomit_dim_b else None}, value={vomit_dim_b.value if vomit_dim_b else None}")
        print(f"Associated Symptoms: {state_b.associated_symptoms}")
        print(f"Negated Symptoms: {state_b.negated_symptoms}")
        assert vomit_dim_b is not None and vomit_dim_b.status == "KNOWN_FALSE", f"Expected KNOWN_FALSE, got {vomit_dim_b}"
        assert vomit_dim_b.value is False
        assert "vomiting" in state_b.negated_symptoms
        assert not any("vomit" in str(s).lower() for s in state_b.associated_symptoms)
        print(">>> SCENARIO B PASSED: vomiting = KNOWN_FALSE, negated_symptoms contains vomiting, associated_symptoms empty")

        # -------------------------------------------------------------
        # SCENARIO C: "I'm not sure whether I'm vomiting" -> remains UNKNOWN
        # -------------------------------------------------------------
        print("\n--- SCENARIO C: Ambiguity ('I'm not sure') ---")
        sess_c = IntakeSession(
            token=str(uuid.uuid4()),
            patient_id=patient.id,
            hospital_id=hospital.id,
            doctor_id=doctor.id,
            workflow_type="GENERAL_CLINICAL",
            language_code="en",
            interaction_mode="TEXT",
            status="IN_PROGRESS",
            question_count=1
        )
        db.add(sess_c)
        db.flush()

        init_state_c = ClinicalState(chief_complaint="Severe stomach pain", location="Abdomen")
        csm_c = ClinicalStateModel(
            intake_session_id=sess_c.id,
            version=1,
            state_json=init_state_c.model_dump()
        )
        db.add(csm_c)

        qe_c = QuestionEvent(
            intake_session_id=sess_c.id,
            sequence_number=1,
            question_text="Are you having any nausea or vomiting?",
            target_field="vomiting",
            decision_action="ASK"
        )
        db.add(qe_c)
        db.commit()

        res_c = await process_intake_answer_core(
            session=sess_c,
            raw_text="I'm not sure whether I'm vomiting",
            input_mode="TEXT",
            language_code="en",
            audio_duration_seconds=None,
            question_event_id=qe_c.id,
            db=db
        )

        latest_csm_c = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == sess_c.id).order_by(ClinicalStateModel.version.desc()).first()
        state_c = ClinicalState(**latest_csm_c.state_json)
        vomit_dim_c = state_c.canonical_dimensions.get("vomiting")

        print(f"Answer: 'I\\'m not sure whether I\\'m vomiting'")
        print(f"Canonical Dimension 'vomiting': status={vomit_dim_c.status if vomit_dim_c else 'UNKNOWN (unset)'}")
        print(f"Associated Symptoms: {state_c.associated_symptoms}")
        print(f"Negated Symptoms: {state_c.negated_symptoms}")
        assert vomit_dim_c is None or vomit_dim_c.status == "UNKNOWN", f"Expected UNKNOWN or unset, got {vomit_dim_c}"
        assert "vomiting" not in state_c.negated_symptoms
        assert not any("vomit" in str(s).lower() for s in state_c.associated_symptoms)
        assert state_c.is_dimension_sufficiently_known("vomiting") is False
        print(">>> SCENARIO C PASSED: vomiting remains UNKNOWN, not KNOWN_FALSE")

        # -------------------------------------------------------------
        # SCENARIO D: Mixed Modality Voice (Negation) -> Text Follow-up
        # -------------------------------------------------------------
        print("\n--- SCENARIO D: Mixed Modality (Voice Negation -> Text Follow-up) ---")
        sess_d = IntakeSession(
            token=str(uuid.uuid4()),
            patient_id=patient.id,
            hospital_id=hospital.id,
            doctor_id=doctor.id,
            workflow_type="GENERAL_CLINICAL",
            language_code="en",
            interaction_mode="VOICE",
            status="IN_PROGRESS",
            question_count=1
        )
        db.add(sess_d)
        db.flush()

        init_state_d = ClinicalState(chief_complaint="Stomach cramps", location="Abdomen")
        csm_d = ClinicalStateModel(
            intake_session_id=sess_d.id,
            version=1,
            state_json=init_state_d.model_dump()
        )
        db.add(csm_d)

        qe_d1 = QuestionEvent(
            intake_session_id=sess_d.id,
            sequence_number=1,
            question_text="Are you having any nausea or vomiting along with the cramps?",
            target_field="vomiting",
            decision_action="ASK"
        )
        db.add(qe_d1)
        db.commit()

        # Turn 1: Voice input with negation
        print("Turn 1 (Voice): 'No, I haven\\'t vomited'")
        res_d1 = await process_intake_answer_core(
            session=sess_d,
            raw_text="No, I haven't vomited",
            input_mode="VOICE",
            language_code="en",
            audio_duration_seconds=2.4,
            question_event_id=qe_d1.id,
            db=db
        )

        # Verify state after Voice turn
        latest_csm_d1 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == sess_d.id).order_by(ClinicalStateModel.version.desc()).first()
        state_d1 = ClinicalState(**latest_csm_d1.state_json)
        assert state_d1.canonical_dimensions["vomiting"].status == "KNOWN_FALSE"
        assert "vomiting" in state_d1.negated_symptoms
        print(f"Turn 1 State: vomiting={state_d1.canonical_dimensions['vomiting'].status}, next_question={(res_d1.decision.question or '')[:60]}...")

        # Turn 2: Text switch follow-up
        print("Turn 2 (Text): 'It has been happening for 2 days'")
        res_d2 = await process_intake_answer_core(
            session=sess_d,
            raw_text="It has been happening for 2 days",
            input_mode="TEXT",
            language_code="en",
            audio_duration_seconds=None,
            question_event_id=res_d1.next_question_event_id,
            db=db
        )

        latest_csm_d2 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == sess_d.id).order_by(ClinicalStateModel.version.desc()).first()
        state_d2 = ClinicalState(**latest_csm_d2.state_json)

        print(f"Turn 2 State: vomiting={state_d2.canonical_dimensions['vomiting'].status}, duration={state_d2.duration}")
        assert state_d2.canonical_dimensions["vomiting"].status == "KNOWN_FALSE"
        assert state_d2.canonical_dimensions["vomiting"].value is False
        assert "vomiting" in state_d2.negated_symptoms
        assert state_d2.duration is not None
        print(">>> SCENARIO D PASSED: Voice negation persisted across Text follow-up; canonical state consistent!")

        print("\n" + "=" * 70)
        print("ALL 4 MANUAL VALIDATION SCENARIOS (A, B, C, D) PASSED PERFECTLY!")
        print("=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run_manual_validations())
