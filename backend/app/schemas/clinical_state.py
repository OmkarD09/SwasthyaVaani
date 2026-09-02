from datetime import datetime, timezone
from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel, Field


class Provenance(BaseModel):
    """Tracks origin of every extracted clinical fact."""
    source_type: Literal["PATIENT_ANSWER", "DOCUMENT", "AI_DERIVED", "PHYSICIAN", "UNKNOWN"] = "PATIENT_ANSWER"
    source_id: str = Field(..., description="ID of Answer, Document, or Actor")
    page: Optional[int] = None
    region: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)


class Medication(BaseModel):
    drug_name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    status: Literal["EXTRACTED", "NEEDS_REVIEW", "CONFIRMED", "REJECTED"] = "EXTRACTED"
    provenance: Optional[Provenance] = None


class Investigation(BaseModel):
    test_name: str
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    observed_at: Optional[str] = None
    flag: Optional[str] = None  # e.g. "High", "Low", "Review"
    provenance: Optional[Provenance] = None


class AyushState(BaseModel):
    """Core AYUSH structured parameters required by PS 26047."""
    prakriti: Optional[str] = None
    vikriti: Optional[str] = None
    agni: Optional[str] = None         # e.g. "Tikshna", "Manda", "Sama", "Visham"
    koshtha: Optional[str] = None      # e.g. "Mridu", "Krura", "Madhyam"
    ahara_vihara: Optional[str] = None # Diet and lifestyle habits
    doshas: Optional[List[int]] = Field(default=None, description="[Vata%, Pitta%, Kapha%]")
    provenance: Optional[Provenance] = None


class RedFlag(BaseModel):
    rule_id: str
    title: str
    reason: str
    severity: Literal["PRIORITY", "WARNING"] = "PRIORITY"
    evidence_ids: List[str] = Field(default_factory=list)
    status: Literal["OPEN", "REVIEWED"] = "OPEN"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Contradiction(BaseModel):
    field: str
    source_a: Provenance
    value_a: Any
    source_b: Provenance
    value_b: Any
    status: Literal["OPEN", "REVIEWED", "RESOLVED_BY_PHYSICIAN", "DISMISSED"] = "OPEN"
    resolution_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InformationGap(BaseModel):
    field_name: str
    priority: Literal["HIGH", "MEDIUM", "LOW"] = "MEDIUM"
    reason: str
    status: Literal["OPEN", "RESOLVED", "DEFERRED", "NOT_APPLICABLE"] = "OPEN"


DimensionStatusType = Literal["UNKNOWN", "KNOWN_TRUE", "KNOWN_FALSE", "AMBIGUOUS", "KNOWN_WITH_VALUE"]


class CanonicalDimensionState(BaseModel):
    """Explicit state representation for every clinically relevant dimension."""
    status: DimensionStatusType = "UNKNOWN"
    value: Optional[Any] = None
    characterization: Dict[str, Any] = Field(default_factory=dict) # e.g. laterality, onset, progression
    last_updated_turn: Optional[int] = None


class ClinicalState(BaseModel):
    """Primary structured representation of the patient clinical intake."""
    chief_complaint: Optional[str] = None
    symptoms: List[str] = Field(default_factory=list)
    onset: Optional[str] = None
    duration: Optional[str] = None
    severity: Optional[int] = Field(default=None, ge=1, le=10)
    location: Optional[str] = None
    character: Optional[str] = None
    radiation: Optional[str] = None
    associated_symptoms: List[str] = Field(default_factory=list)
    timing: Optional[str] = None
    aggravating_factors: List[str] = Field(default_factory=list)
    relieving_factors: List[str] = Field(default_factory=list)

    # History & Medications
    past_history: List[str] = Field(default_factory=list)
    family_history: List[str] = Field(default_factory=list)
    medications: List[Medication] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    investigations: List[Investigation] = Field(default_factory=list)

    # Canonical Dimension Tracking (Source of Truth for Candidate Generation)
    canonical_dimensions: Dict[str, CanonicalDimensionState] = Field(default_factory=dict)
    asked_dimension_history: List[str] = Field(default_factory=list)
    last_non_informative_response: Optional[str] = None

    # Focused Domain Detail Tracking
    food_exposure: Optional[str] = None
    stool_consistency: Optional[str] = None
    stool_frequency: Optional[str] = None
    hydration_status: Optional[str] = None
    bloating: Optional[str] = None
    dark_stool: Optional[bool] = None
    blood_in_stool: Optional[str] = None
    dizziness: Optional[str] = None
    weakness: Optional[str] = None
    negated_symptoms: List[str] = Field(default_factory=list)
    resolved_dimensions: List[str] = Field(default_factory=list)
    dimension_status: Dict[str, str] = Field(default_factory=dict) # e.g. {"stool_frequency": "AMBIGUOUS", "duration": "RESOLVED"}

    # Clinical Reasoning & Exploration State
    active_exploration_mode: Optional[Literal["SAFETY_REQUIRED", "TARGETED_FOLLOW_UP", "OPEN_EXPLORATION"]] = None
    explored_areas: List[str] = Field(default_factory=list)

    # Specialized Domains
    ayush: Optional[AyushState] = None

    # Safety, Quality & Provenance Signals
    red_flags: List[RedFlag] = Field(default_factory=list)
    contradictions: List[Contradiction] = Field(default_factory=list)
    missing_information: List[InformationGap] = Field(default_factory=list)
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    raw_transcript_snippets: List[str] = Field(default_factory=list)

    def set_canonical_dimension(
        self,
        dimension: str,
        status: DimensionStatusType,
        value: Any = None,
        characterization: Optional[Dict[str, Any]] = None,
        turn: Optional[int] = None
    ) -> None:
        """Sets or updates the explicit canonical state for a clinical dimension."""
        char_dict = characterization or {}
        existing = self.canonical_dimensions.get(dimension)
        if existing and existing.characterization:
            char_dict = {**existing.characterization, **char_dict}

        self.canonical_dimensions[dimension] = CanonicalDimensionState(
            status=status,
            value=value if value is not None else (existing.value if existing else None),
            characterization=char_dict,
            last_updated_turn=turn
        )
        if status in ["KNOWN_TRUE", "KNOWN_FALSE", "KNOWN_WITH_VALUE"]:
            if dimension not in self.resolved_dimensions:
                self.resolved_dimensions.append(dimension)
            self.dimension_status[dimension] = "RESOLVED"
        elif status == "AMBIGUOUS":
            self.dimension_status[dimension] = "AMBIGUOUS"

    def get_canonical_dimension(self, dimension: str) -> Optional[CanonicalDimensionState]:
        return self.canonical_dimensions.get(dimension)

    def is_dimension_sufficiently_known(self, dimension: str) -> bool:
        dim_state = self.canonical_dimensions.get(dimension)
        if not dim_state:
            return False
        return dim_state.status in ["KNOWN_TRUE", "KNOWN_FALSE", "KNOWN_WITH_VALUE"]
