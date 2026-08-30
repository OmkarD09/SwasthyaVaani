from typing import List
from app.schemas.clinical_state import ClinicalState, Contradiction, Provenance


def detect_contradictions(state: ClinicalState) -> List[Contradiction]:
    """
    Deterministic Contradiction Detection Engine.
    Identifies conflicting facts across patient statements and historical documents.
    STRICT RULE: Surfaces conflicts for physician review; NEVER auto-resolves.
    """
    contradictions: List[Contradiction] = []
    
    # Check medication cessation vs existing medication facts
    for med in state.medications:
        # Example contradiction: Patient reports stopping drug vs active prescription
        for raw in state.raw_transcript_snippets:
            raw_lower = raw.lower()
            drug_lower = med.drug_name.lower()
            if drug_lower in raw_lower and ("stopped" in raw_lower or "band kar" in raw_lower or "chhod" in raw_lower):
                contradictions.append(
                    Contradiction(
                        field=f"medication:{med.drug_name}",
                        source_a=Provenance(
                            source_type="PATIENT_ANSWER",
                            source_id="patient_statement",
                            confidence=0.95
                        ),
                        value_a="Patient reports medication discontinued",
                        source_b=med.provenance or Provenance(
                            source_type="DOCUMENT",
                            source_id="prior_prescription",
                            confidence=0.90
                        ),
                        value_b=f"Active record: {med.drug_name} {med.dose or ''}",
                        status="OPEN"
                    )
                )

    return contradictions
