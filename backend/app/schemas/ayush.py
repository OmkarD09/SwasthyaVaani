"""
AYUSH Assessment Data Contracts, Schemas, and Provenance Adapters.
Target Specification: SIH Problem Statement 26047 / docs/SwasthyaVaani_AYUSH_Specification (1).md.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.clinical_state import AyushState, Provenance


class AyushProvenanceSource(str, Enum):
    """Provenance tracking origin of every AYUSH observation or inference."""
    PATIENT_STATED = "PATIENT_STATED"
    AI_INFERRED = "AI_INFERRED"
    DOCUMENT = "DOCUMENT"
    PHYSICIAN_CONFIRMED = "PHYSICIAN_CONFIRMED"


class AyushAssessmentStatus(str, Enum):
    """Lifecycle status of the AYUSH clinical assessment."""
    INCOMPLETE = "INCOMPLETE"
    PRELIMINARY = "PRELIMINARY"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    PHYSICIAN_CONFIRMED = "PHYSICIAN_CONFIRMED"


class AyushSystemType(str, Enum):
    """Supported systems under the broader AYUSH umbrella."""
    AYURVEDA = "AYURVEDA"
    YOGA_NATUROPATHY = "YOGA_NATUROPATHY"
    UNANI = "UNANI"
    SIDDHA = "SIDDHA"
    HOMOEOPATHY = "HOMOEOPATHY"


# Provenance Bidirectional Mapping
AYUSH_TO_GENERIC_PROVENANCE_MAP: Dict[AyushProvenanceSource, str] = {
    AyushProvenanceSource.PATIENT_STATED: "PATIENT_ANSWER",
    AyushProvenanceSource.AI_INFERRED: "AI_DERIVED",
    AyushProvenanceSource.DOCUMENT: "DOCUMENT",
    AyushProvenanceSource.PHYSICIAN_CONFIRMED: "PHYSICIAN",
}

GENERIC_TO_AYUSH_PROVENANCE_MAP: Dict[str, AyushProvenanceSource] = {
    "PATIENT_ANSWER": AyushProvenanceSource.PATIENT_STATED,
    "AI_DERIVED": AyushProvenanceSource.AI_INFERRED,
    "DOCUMENT": AyushProvenanceSource.DOCUMENT,
    "PHYSICIAN": AyushProvenanceSource.PHYSICIAN_CONFIRMED,
    "UNKNOWN": AyushProvenanceSource.AI_INFERRED,
}


class AyushDimensionValue(BaseModel):
    """Detailed representation of an individual AYUSH clinical assessment dimension."""
    dimension: str
    value: Optional[Any] = None
    status: AyushAssessmentStatus = AyushAssessmentStatus.PRELIMINARY
    confidence: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    source: AyushProvenanceSource = AyushProvenanceSource.PATIENT_STATED
    source_id: Optional[str] = Field(default=None, description="Linked question_event_id, answer_id, doc_id, or actor_id")
    evidence: List[str] = Field(default_factory=list, description="IDs or snippets of supporting evidence")
    last_updated_turn: Optional[int] = None

    def to_generic_provenance(self) -> Provenance:
        source_type = AYUSH_TO_GENERIC_PROVENANCE_MAP.get(self.source, "AI_DERIVED")
        return Provenance(
            source_type=source_type,  # type: ignore[arg-type]
            source_id=self.source_id or f"ayush-dim-{self.dimension}",
            confidence=self.confidence or 1.0,
        )


class AyushAssessment(BaseModel):
    """
    Richer AYUSH Assessment contract supporting core baseline dimensions plus
    the expanded Dashavidha Pariksha dimensions, evidence tracking, and physician review.
    """
    system: str = AyushSystemType.AYURVEDA.value
    overall_status: AyushAssessmentStatus = AyushAssessmentStatus.INCOMPLETE

    # Core AYUSH Baseline Dimensions
    prakriti: Optional[AyushDimensionValue] = None
    vikriti: Optional[AyushDimensionValue] = None
    agni: Optional[AyushDimensionValue] = None
    koshtha: Optional[AyushDimensionValue] = None
    ahara_vihara: Optional[AyushDimensionValue] = None
    doshas: Optional[List[int]] = Field(default=None, description="[Vata%, Pitta%, Kapha%]")
    dosha_evidence: List[str] = Field(default_factory=list)

    # Expanded Dashavidha Dimensions
    sara: Optional[AyushDimensionValue] = None
    samhanana: Optional[AyushDimensionValue] = None
    pramana: Optional[AyushDimensionValue] = None
    satmya: Optional[AyushDimensionValue] = None
    sattva: Optional[AyushDimensionValue] = None
    ahara_shakti: Optional[AyushDimensionValue] = None
    vyayama_shakti: Optional[AyushDimensionValue] = None
    vaya: Optional[AyushDimensionValue] = None

    # Cross-dimension evidence, uncertainty, and review state
    evidence: List[str] = Field(default_factory=list, description="Global list of linked evidence references")
    uncertainties: List[str] = Field(default_factory=list, description="Flagged clinical uncertainties or conflicts")
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    physician_review_state: Optional[Dict[str, Any]] = None
    last_updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def get_dimension(self, name: str) -> Optional[AyushDimensionValue]:
        return getattr(self, name, None)

    def set_dimension(self, dimension_value: AyushDimensionValue) -> None:
        if hasattr(self, dimension_value.dimension):
            setattr(self, dimension_value.dimension, dimension_value)
            if dimension_value.evidence:
                for ev in dimension_value.evidence:
                    if ev not in self.evidence:
                        self.evidence.append(ev)
            self.last_updated_at = datetime.now(timezone.utc)
            if self.overall_status == AyushAssessmentStatus.INCOMPLETE:
                self.overall_status = AyushAssessmentStatus.PRELIMINARY

    def get_all_dimensions(self) -> Dict[str, AyushDimensionValue]:
        """Returns all populated dimension values."""
        dim_names = [
            "prakriti", "vikriti", "agni", "koshtha", "ahara_vihara",
            "sara", "samhanana", "pramana", "satmya", "sattva",
            "ahara_shakti", "vyayama_shakti", "vaya"
        ]
        res: Dict[str, AyushDimensionValue] = {}
        for d in dim_names:
            val = getattr(self, d, None)
            if val is not None and isinstance(val, AyushDimensionValue):
                res[d] = val
        return res


# -------------------------------------------------------------------------
# Backward-Compatible Adapters: AyushState <-> AyushAssessment
# -------------------------------------------------------------------------

def ayush_state_to_assessment(
    state: Optional[AyushState],
    system: str = "AYURVEDA",
    default_status: AyushAssessmentStatus = AyushAssessmentStatus.PRELIMINARY
) -> AyushAssessment:
    """
    Converts a legacy AyushState into a richer AyushAssessment object.
    Preserves all existing values, maps generic provenance, and initializes status.
    """
    if not state:
        return AyushAssessment(system=system, overall_status=AyushAssessmentStatus.INCOMPLETE)

    prov_source = AyushProvenanceSource.PATIENT_STATED
    prov_conf = 1.0
    source_id = None
    if state.provenance:
        prov_source = GENERIC_TO_AYUSH_PROVENANCE_MAP.get(
            state.provenance.source_type,
            AyushProvenanceSource.PATIENT_STATED
        )
        prov_conf = state.provenance.confidence or 1.0
        source_id = state.provenance.source_id

    assessment = AyushAssessment(
        system=system,
        overall_status=default_status,
        doshas=state.doshas,
        confidence=prov_conf,
    )

    core_mappings = {
        "prakriti": state.prakriti,
        "vikriti": state.vikriti,
        "agni": state.agni,
        "koshtha": state.koshtha,
        "ahara_vihara": state.ahara_vihara,
    }

    has_any_dim = False
    for dim_name, val in core_mappings.items():
        if val is not None:
            has_any_dim = True
            # Constitutional inferences (Prakriti/Vikriti) are AI_INFERRED unless stated otherwise
            dim_source = prov_source
            if dim_name in ["prakriti", "vikriti"] and dim_source == AyushProvenanceSource.PATIENT_STATED:
                dim_source = AyushProvenanceSource.AI_INFERRED

            dim_val = AyushDimensionValue(
                dimension=dim_name,
                value=val,
                status=default_status,
                confidence=prov_conf,
                source=dim_source,
                source_id=source_id,
            )
            setattr(assessment, dim_name, dim_val)

    if not has_any_dim and not state.doshas:
        assessment.overall_status = AyushAssessmentStatus.INCOMPLETE

    return assessment


def assessment_to_ayush_state(assessment: Optional[AyushAssessment]) -> Optional[AyushState]:
    """
    Converts an AyushAssessment object back into a legacy AyushState.
    Ensures 100% backward compatibility for downstream consumers (FHIR mapper, UI, legacy tests).
    """
    if not assessment:
        return None

    # Derive primary provenance from highest-confidence or available dimension
    primary_source = AyushProvenanceSource.AI_INFERRED
    primary_conf = assessment.confidence or 0.9
    source_id = "ayush-assessment"

    for dim in assessment.get_all_dimensions().values():
        if dim.source == AyushProvenanceSource.PHYSICIAN_CONFIRMED:
            primary_source = AyushProvenanceSource.PHYSICIAN_CONFIRMED
            source_id = dim.source_id or source_id
            break
        elif dim.source == AyushProvenanceSource.PATIENT_STATED:
            primary_source = AyushProvenanceSource.PATIENT_STATED
            source_id = dim.source_id or source_id

    gen_source_type = AYUSH_TO_GENERIC_PROVENANCE_MAP.get(primary_source, "AI_DERIVED")
    prov = Provenance(
        source_type=gen_source_type,  # type: ignore[arg-type]
        source_id=source_id,
        confidence=primary_conf,
    )

    return AyushState(
        prakriti=assessment.prakriti.value if assessment.prakriti else None,
        vikriti=assessment.vikriti.value if assessment.vikriti else None,
        agni=assessment.agni.value if assessment.agni else None,
        koshtha=assessment.koshtha.value if assessment.koshtha else None,
        ahara_vihara=assessment.ahara_vihara.value if assessment.ahara_vihara else None,
        doshas=assessment.doshas,
        provenance=prov,
    )


def format_vaya_from_age(age: int) -> str:
    """
    Maps chronological age to an Ayurvedic Vaya stage descriptor while preserving numerical age.
    - Bala (childhood / youth): < 16
    - Madhya (adulthood / middle age): 16 - 60
    - Vriddha (elderly / geriatric): > 60
    """
    if age < 16:
        stage = "Bala"
    elif age <= 60:
        stage = "Madhya"
    else:
        stage = "Vriddha"
    return f"{age} years ({stage})"

