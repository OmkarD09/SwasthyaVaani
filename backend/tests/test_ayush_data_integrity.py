"""
Targeted Regression Tests for AYUSH Clinical Data Integrity and Provenance Accuracy.
Ensures zero synthetic clinical fallbacks and strict provenance attribution.
"""

import pytest
from app.schemas.ayush import (
    AyushAssessment,
    AyushDimensionValue,
    AyushProvenanceSource,
    AyushAssessmentStatus,
    ayush_state_to_assessment,
    assessment_to_ayush_state,
    format_vaya_from_age,
)
from app.schemas.clinical_state import AyushState, Provenance


class TestAyushDataIntegrity:
    """Test suite verifying absence of synthetic fallbacks and correct provenance."""

    def test_ayush_dimension_value_default_source_is_not_patient_stated(self):
        """Bug 5 fix: AyushDimensionValue without explicit source must default to None, never PATIENT_STATED."""
        dim = AyushDimensionValue(dimension="prakriti", value="Vata-Pitta")
        assert dim.source is None
        assert dim.source != AyushProvenanceSource.PATIENT_STATED

    def test_ayush_dimension_value_explicit_sources_preserved(self):
        """Explicit provenances must be preserved faithfully."""
        dim_ps = AyushDimensionValue(dimension="agni", value="Tikshna", source=AyushProvenanceSource.PATIENT_STATED)
        assert dim_ps.source == AyushProvenanceSource.PATIENT_STATED

        dim_ai = AyushDimensionValue(dimension="vikriti", value="Pitta Dushti", source=AyushProvenanceSource.AI_INFERRED)
        assert dim_ai.source == AyushProvenanceSource.AI_INFERRED

        dim_doc = AyushDimensionValue(dimension="prakriti", value="Pitta-Kapha", source=AyushProvenanceSource.DOCUMENT)
        assert dim_doc.source == AyushProvenanceSource.DOCUMENT

        dim_pc = AyushDimensionValue(dimension="koshtha", value="Mridu", source=AyushProvenanceSource.PHYSICIAN_CONFIRMED)
        assert dim_pc.source == AyushProvenanceSource.PHYSICIAN_CONFIRMED

        dim_sd = AyushDimensionValue(dimension="vaya", value="Madhya", source=AyushProvenanceSource.SYSTEM_DERIVED)
        assert dim_sd.source == AyushProvenanceSource.SYSTEM_DERIVED

    def test_system_derived_provenance_mapping(self):
        """SYSTEM_DERIVED must map cleanly to generic provenance without error."""
        dim = AyushDimensionValue(dimension="vaya", value="Madhya", source=AyushProvenanceSource.SYSTEM_DERIVED)
        generic_prov = dim.to_generic_provenance()
        assert generic_prov.source_type == "AI_DERIVED"

    def test_missing_provenance_to_generic_provenance(self):
        """Missing provenance maps to UNKNOWN rather than pretending to be patient answer."""
        dim = AyushDimensionValue(dimension="agni", value="Sama")
        generic_prov = dim.to_generic_provenance()
        assert generic_prov.source_type == "UNKNOWN"

    def test_null_core_dimensions_serialize_as_none(self):
        """Null dimensions in AyushAssessment must remain None and not inject defaults."""
        assessment = AyushAssessment()
        assert assessment.doshas is None
        assert assessment.prakriti is None
        assert assessment.vikriti is None
        assert assessment.agni is None
        assert assessment.koshtha is None
        assert assessment.ahara_vihara is None

        payload = assessment.model_dump()
        assert payload["doshas"] is None
        assert payload["prakriti"] is None
        assert payload["vikriti"] is None
        assert payload["agni"] is None
        assert payload["koshtha"] is None
        assert payload["ahara_vihara"] is None

    def test_actual_dosha_percentages_serialize_correctly(self):
        """Real dosha values must serialize faithfully without modification."""
        assessment = AyushAssessment(doshas=[67, 15, 18])
        assert assessment.doshas == [67, 15, 18]
        payload = assessment.model_dump()
        assert payload["doshas"] == [67, 15, 18]

    def test_format_vaya_from_age(self):
        """Format vaya categorizes chronological age into accurate Ayurvedic life stage."""
        assert "Bala" in format_vaya_from_age(12)
        assert "Madhya" in format_vaya_from_age(21)
        assert "Madhya" in format_vaya_from_age(45)
        assert "Vriddha" in format_vaya_from_age(68)

    def test_ayush_state_to_assessment_preserves_constitutional_inference(self):
        """Prakriti/Vikriti from state are mapped to AI_INFERRED when source is not physician."""
        state = AyushState(
            prakriti="Vata-Pitta",
            vikriti="Vata Dushti",
            agni="Samagni",
            koshtha="Madhyam",
            provenance=Provenance(source_type="PATIENT_ANSWER", source_id="turn_1")
        )
        assessment = ayush_state_to_assessment(state)
        # Constitutional inferences are AI_INFERRED
        assert assessment.prakriti.source == AyushProvenanceSource.AI_INFERRED
        assert assessment.vikriti.source == AyushProvenanceSource.AI_INFERRED
        # Agni and Koshtha from patient answer remain PATIENT_STATED
        assert assessment.agni.source == AyushProvenanceSource.PATIENT_STATED
        assert assessment.koshtha.source == AyushProvenanceSource.PATIENT_STATED

    def test_dashavidha_count_preservation(self):
        """Dashavidha count must strictly represent the 8 Dashavidha dimensions only."""
        assessment = AyushAssessment()
        assessment.vaya = AyushDimensionValue(
            dimension="vaya",
            value="Madhya",
            source=AyushProvenanceSource.SYSTEM_DERIVED
        )
        # 1 dimension populated out of 8
        all_dims = assessment.get_all_dimensions()
        assert "vaya" in all_dims
        assert len(all_dims) == 1
        assert "prakriti" not in all_dims
        assert "agni" not in all_dims
