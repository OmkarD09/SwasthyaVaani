"""
Comprehensive unit and integration tests for the AYUSH Assessment Data Contract (Milestone 1).
Tests schema validation, expanded Dashavidha dimensions, provenance, status enums,
backward compatibility adapters, serialization, and ORM persistence/retrieval.
"""

import uuid
import pytest
from pydantic import ValidationError

from app.schemas.clinical_state import AyushState, Provenance
from app.schemas.ayush import (
    AyushAssessment,
    AyushAssessmentStatus,
    AyushDimensionValue,
    AyushProvenanceSource,
    AyushSystemType,
    assessment_to_ayush_state,
    ayush_state_to_assessment,
    AYUSH_TO_GENERIC_PROVENANCE_MAP,
    GENERIC_TO_AYUSH_PROVENANCE_MAP,
)
from app.models.ayush import AyushAssessmentModel
from app.models.intake import IntakeSession
from app.models.user import Patient, Hospital, Doctor


# =========================================================================
# 1. SCHEMA VALIDATION TESTS
# =========================================================================

def test_ayush_assessment_default_initialization():
    """Verify default initialization produces valid empty Ayurveda assessment."""
    assessment = AyushAssessment()
    assert assessment.system == AyushSystemType.AYURVEDA.value
    assert assessment.overall_status == AyushAssessmentStatus.INCOMPLETE
    assert assessment.prakriti is None
    assert assessment.agni is None
    assert assessment.koshtha is None
    assert assessment.sara is None
    assert assessment.evidence == []


def test_core_dimensions_population():
    """Verify core AYUSH baseline dimensions can be populated with typed values."""
    dim_agni = AyushDimensionValue(
        dimension="agni",
        value="Tikshnagni",
        status=AyushAssessmentStatus.PRELIMINARY,
        confidence=0.92,
        source=AyushProvenanceSource.PATIENT_STATED,
        evidence=["ans-001", "burning epigastric sensation"]
    )
    dim_koshtha = AyushDimensionValue(
        dimension="koshtha",
        value="Krura",
        status=AyushAssessmentStatus.PRELIMINARY,
        confidence=0.88,
        source=AyushProvenanceSource.PATIENT_STATED,
        evidence=["ans-002"]
    )

    assessment = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.PRELIMINARY,
        agni=dim_agni,
        koshtha=dim_koshtha,
        doshas=[55, 30, 15]
    )

    assert assessment.agni.value == "Tikshnagni"
    assert assessment.koshtha.value == "Krura"
    assert assessment.doshas == [55, 30, 15]
    assert assessment.agni.confidence == 0.92


def test_expanded_dashavidha_dimensions():
    """Verify all 8 expanded Dashavidha Pariksha dimensions are supported."""
    dashavidha_data = {
        "sara": ("sara", "Madhyama Twak-Sara", AyushProvenanceSource.AI_INFERRED),
        "samhanana": ("samhanana", "Madhyama Samhanana", AyushProvenanceSource.PATIENT_STATED),
        "pramana": ("pramana", "Medium build, proportionate", AyushProvenanceSource.DOCUMENT),
        "satmya": ("satmya", "Sarva-rasa Satmya (habitual to mixed diet)", AyushProvenanceSource.PATIENT_STATED),
        "sattva": ("sattva", "Pravara Sattva (high mental resilience)", AyushProvenanceSource.PATIENT_STATED),
        "ahara_shakti": ("ahara_shakti", "Abhyavaharana Shakti regular", AyushProvenanceSource.PATIENT_STATED),
        "vyayama_shakti": ("vyayama_shakti", "Madhyama (walks 30 mins daily)", AyushProvenanceSource.PATIENT_STATED),
        "vaya": ("vaya", "Madhyama Vaya (38 years adult)", AyushProvenanceSource.DOCUMENT),
    }

    assessment = AyushAssessment()
    for field_name, (dim_name, val, src) in dashavidha_data.items():
        dim_obj = AyushDimensionValue(
            dimension=dim_name,
            value=val,
            source=src,
            status=AyushAssessmentStatus.PRELIMINARY
        )
        setattr(assessment, field_name, dim_obj)

    # Verify all 8 dimensions are retrievable
    all_dims = assessment.get_all_dimensions()
    for field_name in dashavidha_data:
        assert field_name in all_dims
        assert all_dims[field_name].value == dashavidha_data[field_name][1]


def test_confidence_validation_bounds():
    """Verify confidence must be bounded between 0.0 and 1.0."""
    # Valid bounds
    AyushDimensionValue(dimension="agni", value="Sama", confidence=0.0)
    AyushDimensionValue(dimension="agni", value="Sama", confidence=1.0)
    AyushDimensionValue(dimension="agni", value="Sama", confidence=0.5)

    # Invalid below 0.0
    with pytest.raises(ValidationError):
        AyushDimensionValue(dimension="agni", value="Sama", confidence=-0.1)

    # Invalid above 1.0
    with pytest.raises(ValidationError):
        AyushDimensionValue(dimension="agni", value="Sama", confidence=1.05)


# =========================================================================
# 2. PROVENANCE VALUES & MAPPING TESTS
# =========================================================================

def test_all_ayush_provenance_sources():
    """Verify all 4 required provenance sources are valid."""
    sources = [
        AyushProvenanceSource.PATIENT_STATED,
        AyushProvenanceSource.AI_INFERRED,
        AyushProvenanceSource.DOCUMENT,
        AyushProvenanceSource.PHYSICIAN_CONFIRMED,
    ]
    for src in sources:
        dim = AyushDimensionValue(dimension="test", value="val", source=src)
        assert dim.source == src


def test_invalid_provenance_raises():
    """Verify invalid provenance string is rejected by Pydantic."""
    with pytest.raises(ValidationError):
        AyushDimensionValue(dimension="test", value="val", source="INVALID_SOURCE")  # type: ignore[arg-type]


def test_provenance_mapping_bidirectional():
    """Verify clean bidirectional mapping between AYUSH provenance and generic platform Provenance."""
    # AYUSH -> Generic
    assert AYUSH_TO_GENERIC_PROVENANCE_MAP[AyushProvenanceSource.PATIENT_STATED] == "PATIENT_ANSWER"
    assert AYUSH_TO_GENERIC_PROVENANCE_MAP[AyushProvenanceSource.AI_INFERRED] == "AI_DERIVED"
    assert AYUSH_TO_GENERIC_PROVENANCE_MAP[AyushProvenanceSource.DOCUMENT] == "DOCUMENT"
    assert AYUSH_TO_GENERIC_PROVENANCE_MAP[AyushProvenanceSource.PHYSICIAN_CONFIRMED] == "PHYSICIAN"

    # Generic -> AYUSH
    assert GENERIC_TO_AYUSH_PROVENANCE_MAP["PATIENT_ANSWER"] == AyushProvenanceSource.PATIENT_STATED
    assert GENERIC_TO_AYUSH_PROVENANCE_MAP["AI_DERIVED"] == AyushProvenanceSource.AI_INFERRED
    assert GENERIC_TO_AYUSH_PROVENANCE_MAP["DOCUMENT"] == AyushProvenanceSource.DOCUMENT
    assert GENERIC_TO_AYUSH_PROVENANCE_MAP["PHYSICIAN"] == AyushProvenanceSource.PHYSICIAN_CONFIRMED

    # Generic Provenance generation
    dim = AyushDimensionValue(
        dimension="agni",
        value="Manda",
        source=AyushProvenanceSource.PATIENT_STATED,
        source_id="ans-042",
        confidence=0.85
    )
    gen_prov = dim.to_generic_provenance()
    assert isinstance(gen_prov, Provenance)
    assert gen_prov.source_type == "PATIENT_ANSWER"
    assert gen_prov.source_id == "ans-042"
    assert gen_prov.confidence == 0.85


# =========================================================================
# 3. ASSESSMENT STATUS VALUES TESTS
# =========================================================================

def test_all_ayush_assessment_statuses():
    """Verify all 4 required assessment lifecycle statuses are supported."""
    valid_statuses = [
        AyushAssessmentStatus.INCOMPLETE,
        AyushAssessmentStatus.PRELIMINARY,
        AyushAssessmentStatus.NEEDS_REVIEW,
        AyushAssessmentStatus.PHYSICIAN_CONFIRMED,
    ]
    for st in valid_statuses:
        assessment = AyushAssessment(overall_status=st)
        assert assessment.overall_status == st


def test_invalid_status_raises():
    """Verify invalid assessment status is rejected."""
    with pytest.raises(ValidationError):
        AyushAssessment(overall_status="DEFINITIVE_DIAGNOSIS")  # type: ignore[arg-type]


def test_set_dimension_auto_transitions_incomplete():
    """Verify setting a dimension transitions an INCOMPLETE assessment to PRELIMINARY."""
    assessment = AyushAssessment(overall_status=AyushAssessmentStatus.INCOMPLETE)
    assert assessment.overall_status == AyushAssessmentStatus.INCOMPLETE

    assessment.set_dimension(
        AyushDimensionValue(
            dimension="agni",
            value="Vishamagni",
            source=AyushProvenanceSource.PATIENT_STATED,
            evidence=["q-1", "ans-1"]
        )
    )
    assert assessment.overall_status == AyushAssessmentStatus.PRELIMINARY
    assert assessment.agni.value == "Vishamagni"
    assert "q-1" in assessment.evidence
    assert "ans-1" in assessment.evidence


# =========================================================================
# 4. BACKWARD COMPATIBILITY ADAPTER TESTS
# =========================================================================

def test_adapter_legacy_ayush_state_to_assessment():
    """Verify existing AyushState seamlessly converts to rich AyushAssessment."""
    legacy_state = AyushState(
        prakriti="Vata-Pitta",
        vikriti="Vata Vriddhi",
        agni="Mandagni",
        koshtha="Krura",
        ahara_vihara="Irregular meals, spicy street food",
        doshas=[65, 25, 10],
        provenance=Provenance(source_type="PATIENT_ANSWER", source_id="ans-101", confidence=0.88)
    )

    assessment = ayush_state_to_assessment(legacy_state)

    assert assessment.system == "AYURVEDA"
    assert assessment.overall_status == AyushAssessmentStatus.PRELIMINARY
    assert assessment.agni.value == "Mandagni"
    assert assessment.koshtha.value == "Krura"
    assert assessment.ahara_vihara.value == "Irregular meals, spicy street food"
    assert assessment.doshas == [65, 25, 10]
    # Constitutional types (Prakriti/Vikriti) should be safely marked AI_INFERRED
    assert assessment.prakriti.source == AyushProvenanceSource.AI_INFERRED
    assert assessment.agni.source == AyushProvenanceSource.PATIENT_STATED


def test_adapter_assessment_to_legacy_ayush_state():
    """Verify AyushAssessment projects back to legacy AyushState without loss of core fields."""
    assessment = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.NEEDS_REVIEW,
        prakriti=AyushDimensionValue(dimension="prakriti", value="Kapha-Vata", source=AyushProvenanceSource.AI_INFERRED),
        agni=AyushDimensionValue(dimension="agni", value="Samagni", source=AyushProvenanceSource.PATIENT_STATED),
        koshtha=AyushDimensionValue(dimension="koshtha", value="Madhyama", source=AyushProvenanceSource.PATIENT_STATED),
        ahara_vihara=AyushDimensionValue(dimension="ahara_vihara", value="Warm vegetarian diet", source=AyushProvenanceSource.PATIENT_STATED),
        doshas=[33, 33, 34],
        sara=AyushDimensionValue(dimension="sara", value="Twak-sara", source=AyushProvenanceSource.AI_INFERRED)  # Expanded
    )

    legacy_state = assessment_to_ayush_state(assessment)

    assert isinstance(legacy_state, AyushState)
    assert legacy_state.prakriti == "Kapha-Vata"
    assert legacy_state.agni == "Samagni"
    assert legacy_state.koshtha == "Madhyama"
    assert legacy_state.ahara_vihara == "Warm vegetarian diet"
    assert legacy_state.doshas == [33, 33, 34]
    assert legacy_state.provenance is not None
    assert legacy_state.provenance.source_type == "PATIENT_ANSWER"


def test_adapter_none_and_empty_handling():
    """Verify adapters handle None and empty states gracefully."""
    # None -> Incomplete
    res_none = ayush_state_to_assessment(None)
    assert res_none.overall_status == AyushAssessmentStatus.INCOMPLETE

    # Empty AyushState -> Incomplete
    empty_legacy = AyushState()
    res_empty = ayush_state_to_assessment(empty_legacy)
    assert res_empty.overall_status == AyushAssessmentStatus.INCOMPLETE

    # None assessment -> None AyushState
    assert assessment_to_ayush_state(None) is None


# =========================================================================
# 5. SERIALIZATION & DESERIALIZATION TESTS
# =========================================================================

def test_json_round_trip_serialization():
    """Verify lossless serialization to dict/JSON and deserialization back to AyushAssessment."""
    original = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.NEEDS_REVIEW,
        agni=AyushDimensionValue(
            dimension="agni",
            value="Tikshnagni",
            source=AyushProvenanceSource.PATIENT_STATED,
            evidence=["ans-55"],
            confidence=0.95
        ),
        sara=AyushDimensionValue(
            dimension="sara",
            value="Rasa-sara",
            source=AyushProvenanceSource.AI_INFERRED,
            confidence=0.75
        ),
        doshas=[40, 45, 15],
        evidence=["ans-55", "doc-ocr-1"],
        uncertainties=["Ambiguous meal timings"],
        confidence=0.88,
        physician_review_state={"reviewed_by": "doc-01", "confirmed": False}
    )

    # Serialize
    json_data = original.model_dump(mode="json")
    assert isinstance(json_data, dict)
    assert json_data["system"] == "AYURVEDA"
    assert json_data["overall_status"] == "NEEDS_REVIEW"
    assert json_data["agni"]["value"] == "Tikshnagni"
    assert json_data["sara"]["value"] == "Rasa-sara"

    # Deserialize
    rehydrated = AyushAssessment.model_validate(json_data)
    assert rehydrated.system == original.system
    assert rehydrated.overall_status == original.overall_status
    assert rehydrated.agni.value == original.agni.value
    assert rehydrated.sara.value == original.sara.value
    assert rehydrated.doshas == original.doshas
    assert rehydrated.evidence == original.evidence
    assert rehydrated.uncertainties == original.uncertainties
    assert rehydrated.physician_review_state == original.physician_review_state


# =========================================================================
# 6. ORM PERSISTENCE & RETRIEVAL TESTS
# =========================================================================

def test_ayush_assessment_model_persistence(db):
    """Verify AyushAssessmentModel can be saved, retrieved, and updated in database."""
    # 1. Create prerequisites
    hosp = Hospital(name="Ayush Test Hospital", code=f"HOSP-{uuid.uuid4().hex[:6]}", city="Nashik", state="Maharashtra")
    db.add(hosp)
    db.flush()

    doc = Doctor(display_name="Dr. Vaidya", specialization="Ayurveda", hospital_id=hosp.id)
    pat = Patient(display_name="Ramesh Joshi", age=45, gender="Male")
    db.add_all([doc, pat])
    db.flush()

    session = IntakeSession(
        token=f"T-{uuid.uuid4().hex[:6].upper()}",
        patient_id=pat.id,
        hospital_id=hosp.id,
        doctor_id=doc.id,
        workflow_type="AYUSH",
        status="ACTIVE"
    )
    db.add(session)
    db.flush()

    # 2. Build structured assessment
    assessment = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.PRELIMINARY,
        agni=AyushDimensionValue(dimension="agni", value="Mandagni", source=AyushProvenanceSource.PATIENT_STATED),
        koshtha=AyushDimensionValue(dimension="koshtha", value="Krura", source=AyushProvenanceSource.PATIENT_STATED),
        sara=AyushDimensionValue(dimension="sara", value="Asthi-sara", source=AyushProvenanceSource.AI_INFERRED),
        doshas=[60, 20, 20]
    )

    # 3. Persist model
    model = AyushAssessmentModel(
        intake_session_id=session.id,
        system=assessment.system,
        status=assessment.overall_status.value,
        assessment_json=assessment.model_dump(mode="json")
    )
    db.add(model)
    db.commit()

    # 4. Retrieve and validate
    saved = db.query(AyushAssessmentModel).filter_by(intake_session_id=session.id).first()
    assert saved is not None
    assert saved.system == "AYURVEDA"
    assert saved.status == "PRELIMINARY"

    # Reconstruct contract object
    rehydrated = AyushAssessment.model_validate(saved.assessment_json)
    assert rehydrated.agni.value == "Mandagni"
    assert rehydrated.koshtha.value == "Krura"
    assert rehydrated.sara.value == "Asthi-sara"
    assert rehydrated.doshas == [60, 20, 20]

    # Verify relationship through IntakeSession
    assert session.ayush_assessment is not None
    assert session.ayush_assessment.id == saved.id

    # 5. Clean up
    db.delete(session)
    db.commit()
    # Cascade delete should have cleaned up ayush_assessment
    assert db.query(AyushAssessmentModel).filter_by(id=saved.id).first() is None

