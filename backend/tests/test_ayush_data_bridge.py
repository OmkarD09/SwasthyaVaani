import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import Patient, Doctor, Hospital
from app.models.intake import IntakeSession, ClinicalStateModel, QuestionEvent, Answer
from app.models.ayush import AyushAssessmentModel
from app.models.review import PhysicianReviewModel, PhysicianEditModel
from app.schemas.ayush import (
    AyushAssessment,
    AyushAssessmentStatus,
    AyushDimensionValue,
    AyushProvenanceSource,
    format_vaya_from_age,
)
from app.schemas.clinical_state import ClinicalState, AyushState
from app.schemas.intake import IntakeCreateRequest
from app.api.v1.intakes import create_intake_session, process_intake_answer_core
from app.api.v1.doctor import get_patient_clinical_detail, confirm_patient_history
from app.schemas.doctor import PhysicianConfirmRequest, PhysicianEditPayload


@pytest.fixture
def db():
    db_session = SessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()


@pytest.fixture
def sample_patient(db: Session):
    pat = Patient(
        display_name="Test Ayush Patient",
        age=28,
        gender="FEMALE",
        phone="9988776655",
    )
    db.add(pat)
    db.commit()
    db.refresh(pat)
    return pat


@pytest.mark.asyncio
async def test_1_and_4_ayush_session_initial_vaya_and_digestive_sync(db: Session, sample_patient: Patient):
    """
    Test 1: AYUSH session receives patient digestive information -> Agni reaches AyushAssessmentModel.
    Test 4: Age -> Vaya correctly marked SYSTEM_DERIVED.
    """
    req = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="hi",
        interaction_mode="VOICE",
        workflow_type="AYUSH",
    )
    create_resp = await create_intake_session(req=req, db=db)
    session_id = create_resp.id

    session = db.query(IntakeSession).filter(IntakeSession.id == session_id).first()
    assert session is not None

    # Verify initial Vaya seed has SYSTEM_DERIVED provenance
    ayush_init = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session_id).first()
    assert ayush_init is not None
    init_json = ayush_init.assessment_json
    assert init_json["vaya"]["source"] == AyushProvenanceSource.SYSTEM_DERIVED.value
    assert "28 years (Madhya)" in init_json["vaya"]["value"]

    # Submit digestive answer in Hindi
    ans_resp = await process_intake_answer_core(
        session=session,
        raw_text="मुझे भूख कम लगती है और खाना खाने के बाद पेट भारी रहता है।",
        input_mode="VOICE",
        language_code="hi",
        audio_duration_seconds=3.0,
        question_event_id=None,
        db=db,
    )

    # Verify ClinicalState and AyushAssessmentModel synchronization
    assert ans_resp.clinical_state.ayush is not None
    assert ans_resp.clinical_state.ayush.agni == "Manda"

    db.expire_all()
    ayush_record = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session_id).first()
    assert ayush_record is not None
    assessment = AyushAssessment(**ayush_record.assessment_json)

    assert assessment.agni is not None
    assert assessment.agni.value == "Manda"
    assert assessment.agni.source == AyushProvenanceSource.PATIENT_STATED
    assert ans_resp.answer_id in assessment.agni.evidence
    # Vaya must still be SYSTEM_DERIVED
    assert assessment.vaya.source == AyushProvenanceSource.SYSTEM_DERIVED


@pytest.mark.asyncio
async def test_2_and_3_bowel_and_diet_synchronization(db: Session, sample_patient: Patient):
    """
    Test 2: Bowel-related patient information -> Koshtha populated with Krura and PATIENT_STATED.
    Test 3: Diet/lifestyle answer -> Ahara/Vihara populated.
    """
    req = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="hi",
        interaction_mode="TEXT",
        workflow_type="AYUSH",
    )
    create_resp = await create_intake_session(req=req, db=db)
    session = db.query(IntakeSession).filter(IntakeSession.id == create_resp.id).first()

    # Bowel answer
    ans1 = await process_intake_answer_core(
        session=session,
        raw_text="कब्ज रहती है और शौच बहुत सख्त होता है।",
        input_mode="TEXT",
        language_code="hi",
        audio_duration_seconds=None,
        question_event_id=None,
        db=db,
    )
    assert ans1.clinical_state.ayush.koshtha == "Krura"

    # Diet / lifestyle answer
    ans2 = await process_intake_answer_core(
        session=session,
        raw_text="रोज बाहर का तला-भुना और मसालेदार खाना खाता हूँ, रात को देर से सोता हूँ।",
        input_mode="TEXT",
        language_code="hi",
        audio_duration_seconds=None,
        question_event_id=ans1.next_question_event_id,
        db=db,
    )

    db.expire_all()
    ayush_record = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assessment = AyushAssessment(**ayush_record.assessment_json)

    assert assessment.koshtha is not None
    assert assessment.koshtha.value == "Krura"
    assert assessment.koshtha.source == AyushProvenanceSource.PATIENT_STATED

    assert assessment.ahara_vihara is not None
    assert "तला-भुना" in assessment.ahara_vihara.value or "outside" in assessment.ahara_vihara.value or "spicy" in assessment.ahara_vihara.value or "मसालेदार" in assessment.ahara_vihara.value
    assert assessment.ahara_vihara.source == AyushProvenanceSource.PATIENT_STATED


@pytest.mark.asyncio
async def test_5_and_6_unsupported_dimensions_and_no_fake_doshas(db: Session, sample_patient: Patient):
    """
    Test 5: Unsupported dimensions (Sara, Samhanana, Pramana, Satmya) remain UNASSESSED (None).
    Test 6: No fake 33/33/34 default patient-specific result (doshas is None).
    """
    req = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="en",
        interaction_mode="TEXT",
        workflow_type="AYUSH",
    )
    create_resp = await create_intake_session(req=req, db=db)
    session = db.query(IntakeSession).filter(IntakeSession.id == create_resp.id).first()

    # Answer only about digestion
    await process_intake_answer_core(
        session=session,
        raw_text="I have had slow digestion and poor appetite for 3 days.",
        input_mode="TEXT",
        language_code="en",
        audio_duration_seconds=None,
        question_event_id=None,
        db=db,
    )

    db.expire_all()
    ayush_record = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assessment = AyushAssessment(**ayush_record.assessment_json)

    # Prakriti and Vikriti must remain None / Unassessed
    assert assessment.prakriti is None
    assert assessment.vikriti is None

    # Doshas must remain None (no fake 33/33/34)
    assert assessment.doshas is None
    assert assessment.dosha_evidence == []

    # Dashavidha unstated dimensions remain None
    assert assessment.sara is None
    assert assessment.samhanana is None
    assert assessment.pramana is None
    assert assessment.satmya is None


@pytest.mark.asyncio
async def test_7_patient_stated_vs_derived_provenance(db: Session, sample_patient: Patient):
    """
    Test 7: Patient-stated vs derived provenance is correct.
    Patient statement -> PATIENT_STATED
    Demographic age derivation -> SYSTEM_DERIVED
    """
    req = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="en",
        interaction_mode="VOICE",
        workflow_type="AYUSH",
    )
    create_resp = await create_intake_session(req=req, db=db)
    session = db.query(IntakeSession).filter(IntakeSession.id == create_resp.id).first()

    await process_intake_answer_core(
        session=session,
        raw_text="My bowel movement is always constipated and hard.",
        input_mode="VOICE",
        language_code="en",
        audio_duration_seconds=2.5,
        question_event_id=None,
        db=db,
    )

    db.expire_all()
    ayush_record = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assessment = AyushAssessment(**ayush_record.assessment_json)

    # Koshtha from patient answer
    assert assessment.koshtha.source == AyushProvenanceSource.PATIENT_STATED
    # Vaya from age 28
    assert assessment.vaya.source == AyushProvenanceSource.SYSTEM_DERIVED


@pytest.mark.asyncio
async def test_8_physician_confirmed_value_is_never_overwritten(db: Session, sample_patient: Patient):
    """
    Test 8: Physician-confirmed value is never overwritten by later automatic intake synchronization.
    """
    req = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="en",
        interaction_mode="TEXT",
        workflow_type="AYUSH",
    )
    create_resp = await create_intake_session(req=req, db=db)
    session = db.query(IntakeSession).filter(IntakeSession.id == create_resp.id).first()

    # Step 1: Intake answer sets Agni to Manda
    ans1 = await process_intake_answer_core(
        session=session,
        raw_text="My appetite is low and sluggish.",
        input_mode="TEXT",
        language_code="en",
        audio_duration_seconds=None,
        question_event_id=None,
        db=db,
    )

    db.expire_all()
    ayush_record = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assessment = AyushAssessment(**ayush_record.assessment_json)
    assert assessment.agni is not None
    assert "appetite" in assessment.agni.value.lower() or "sluggish" in assessment.agni.value.lower() or assessment.agni.value == "Manda"
    assert assessment.agni.source == AyushProvenanceSource.PATIENT_STATED

    # Step 2: Physician explicitly edits and confirms Agni as "Samagni (Balanced)"
    confirm_req = PhysicianConfirmRequest(
        notes="Clinical examination shows balanced digestion after medication.",
        edits=[
            PhysicianEditPayload(
                field_name="ayush.agni",
                old_value="Manda",
                new_value="Samagni (Balanced)",
                reason="Physician clinical examination override"
            )
        ],
        generate_fhir=False
    )
    await confirm_patient_history(
        intake_id=session.id,
        req=confirm_req,
        db=db,
        current_user={"sub": "doc-001", "role": "DOCTOR"}
    )

    db.expire_all()
    ayush_after_confirm = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assessment_conf = AyushAssessment(**ayush_after_confirm.assessment_json)
    assert assessment_conf.agni.value == "Samagni (Balanced)"
    assert assessment_conf.agni.source == AyushProvenanceSource.PHYSICIAN_CONFIRMED

    # Step 3: Subsequent patient intake answer in same session (e.g. late answer)
    await process_intake_answer_core(
        session=session,
        raw_text="Actually sometimes I still feel low appetite.",
        input_mode="TEXT",
        language_code="en",
        audio_duration_seconds=None,
        question_event_id=ans1.next_question_event_id,
        db=db,
    )

    # Step 4: Verify physician-confirmed value and provenance REMAIN UNCHANGED
    db.expire_all()
    ayush_final = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assessment_final = AyushAssessment(**ayush_final.assessment_json)
    assert assessment_final.agni.value == "Samagni (Balanced)"
    assert assessment_final.agni.source == AyushProvenanceSource.PHYSICIAN_CONFIRMED


@pytest.mark.asyncio
async def test_9_general_clinical_session_does_not_create_ayush_assessment(db: Session, sample_patient: Patient):
    """
    Test 9: General Clinical session does NOT create AYUSH assessment data.
    """
    req = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="en",
        interaction_mode="TEXT",
        workflow_type="GENERAL_CLINICAL",
    )
    create_resp = await create_intake_session(req=req, db=db)
    session = db.query(IntakeSession).filter(IntakeSession.id == create_resp.id).first()

    # Verify AyushAssessmentModel is NOT created
    ayush_record = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assert ayush_record is None

    # Submit general complaint
    await process_intake_answer_core(
        session=session,
        raw_text="I have headache on my forehead for 2 days.",
        input_mode="TEXT",
        language_code="en",
        audio_duration_seconds=None,
        question_event_id=None,
        db=db,
    )

    db.expire_all()
    ayush_record_post = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assert ayush_record_post is None


@pytest.mark.asyncio
async def test_10_ayush_session_does_create_and_update_ayush_data(db: Session, sample_patient: Patient):
    """
    Test 10: AYUSH session DOES create/update AYUSH assessment data.
    """
    req = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="hi",
        interaction_mode="VOICE",
        workflow_type="AYUSH",
    )
    create_resp = await create_intake_session(req=req, db=db)
    session = db.query(IntakeSession).filter(IntakeSession.id == create_resp.id).first()

    # Initial record exists
    ayush_init = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assert ayush_init is not None

    # Submit answer
    await process_intake_answer_core(
        session=session,
        raw_text="मुझे बहुत तेज भूख लगती है और खाना जल्दी पच जाता है।",
        input_mode="VOICE",
        language_code="hi",
        audio_duration_seconds=2.8,
        question_event_id=None,
        db=db,
    )

    db.expire_all()
    ayush_updated = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assert ayush_updated is not None
    assessment = AyushAssessment(**ayush_updated.assessment_json)
    assert assessment.agni is not None
    assert assessment.agni.value == "Tikshna"


@pytest.mark.asyncio
async def test_11_voice_and_text_parity(db: Session, sample_patient: Patient):
    """
    Test 11: Voice and Text produce the same AYUSH synchronization behavior.
    """
    # Session A: Voice
    req_voice = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="hi",
        interaction_mode="VOICE",
        workflow_type="AYUSH",
    )
    resp_v = await create_intake_session(req=req_voice, db=db)
    sess_v = db.query(IntakeSession).filter(IntakeSession.id == resp_v.id).first()
    await process_intake_answer_core(
        session=sess_v,
        raw_text="कब्ज की समस्या है और शौच सख्त होता है।",
        input_mode="VOICE",
        language_code="hi",
        audio_duration_seconds=3.2,
        question_event_id=None,
        db=db,
    )

    # Session B: Text
    req_text = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="hi",
        interaction_mode="TEXT",
        workflow_type="AYUSH",
    )
    resp_t = await create_intake_session(req=req_text, db=db)
    sess_t = db.query(IntakeSession).filter(IntakeSession.id == resp_t.id).first()
    await process_intake_answer_core(
        session=sess_t,
        raw_text="कब्ज की समस्या है और शौच सख्त होता है।",
        input_mode="TEXT",
        language_code="hi",
        audio_duration_seconds=None,
        question_event_id=None,
        db=db,
    )

    db.expire_all()
    ayush_v = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == sess_v.id).first()
    ayush_t = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == sess_t.id).first()

    ass_v = AyushAssessment(**ayush_v.assessment_json)
    ass_t = AyushAssessment(**ayush_t.assessment_json)

    assert ass_v.koshtha.value == ass_t.koshtha.value == "Krura"
    assert ass_v.koshtha.source == ass_t.koshtha.source == AyushProvenanceSource.PATIENT_STATED
    assert ass_v.vaya.value == ass_t.vaya.value


@pytest.mark.asyncio
async def test_12_same_session_multiple_answers_incremental_update(db: Session, sample_patient: Patient):
    """
    Test 12: Same-session multiple answers incrementally update the AYUSH model without losing previous findings.
    """
    req = IntakeCreateRequest(
        patient_id=sample_patient.id,
        language_code="hi",
        interaction_mode="VOICE",
        workflow_type="AYUSH",
    )
    create_resp = await create_intake_session(req=req, db=db)
    session = db.query(IntakeSession).filter(IntakeSession.id == create_resp.id).first()

    # Turn 1: Agni
    ans1 = await process_intake_answer_core(
        session=session,
        raw_text="भूख बहुत कम लगती है और भारीपन रहता है।",
        input_mode="VOICE",
        language_code="hi",
        audio_duration_seconds=2.5,
        question_event_id=None,
        db=db,
    )

    # Turn 2: Koshtha
    ans2 = await process_intake_answer_core(
        session=session,
        raw_text="कब्ज रहती है और शौच सख्त होता है।",
        input_mode="VOICE",
        language_code="hi",
        audio_duration_seconds=2.0,
        question_event_id=ans1.next_question_event_id,
        db=db,
    )

    # Turn 3: Ahara & Vihara
    ans3 = await process_intake_answer_core(
        session=session,
        raw_text="रोज बाहर का तला-भुना और मसालेदार खाना खाता हूँ, रात को देर से सोता हूँ।",
        input_mode="VOICE",
        language_code="hi",
        audio_duration_seconds=3.0,
        question_event_id=ans2.next_question_event_id,
        db=db,
    )

    db.expire_all()
    ayush_final = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assessment = AyushAssessment(**ayush_final.assessment_json)

    # All three dimensions + Vaya must coexist in the final assessment
    assert assessment.agni is not None
    assert assessment.agni.value in ["Manda", "भूख बहुत कम लगती है और भारीपन रहता है।", "भूख बहुत कम लगना"] or "भूख" in assessment.agni.value
    assert assessment.koshtha is not None and assessment.koshtha.value == "Krura"
    assert assessment.ahara_vihara is not None and ("तला-भुना" in assessment.ahara_vihara.value or "outside" in assessment.ahara_vihara.value or "spicy" in assessment.ahara_vihara.value or "मसालेदार" in assessment.ahara_vihara.value)
    assert assessment.vaya is not None and "28 years (Madhya)" in assessment.vaya.value

    # Check Doctor API Detail integration
    doc_detail = get_patient_clinical_detail(
        intake_id=session.id,
        db=db,
        _current_user={"sub": "doc-001", "role": "DOCTOR"}
    )
    assert doc_detail.ayush_assessment is not None
    assert doc_detail.ayush_assessment.agni is not None
    assert doc_detail.ayush_assessment.koshtha.value == "Krura"
    assert doc_detail.ayush_assessment.vaya.value == "28 years (Madhya)"
