from typing import List, Dict, Any, Optional
from app.schemas.clinical_state import ClinicalState, InformationGap
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.question_scorer import score_candidate_dimensions, is_field_already_resolved


def find_information_gaps(
    state: ClinicalState,
    workflow_type: str = "GENERAL_CLINICAL",
    asked_questions: Optional[List[str]] = None
) -> List[InformationGap]:
    """
    Identifies unresolved clinical fields required for the active clinical domain and workflow.
    Uses domain classification and dynamic scoring to rank open information gaps.
    """
    asked_questions = asked_questions or []
    domains = classify_clinical_domains(state, workflow_type)
    candidate_dims = score_candidate_dimensions(domains, state, asked_questions)

    gaps: List[InformationGap] = []

    for dim in candidate_dims:
        field_name = dim["field_name"]
        if is_field_already_resolved(field_name, state):
            continue

        gaps.append(
            InformationGap(
                field_name=field_name,
                priority=dim["priority"],
                reason=f"{dim['label']} is unresolved for {dim['domain']} domain",
                status="OPEN"
            )
        )

    # If no specific domain gaps open, ensure basic general gaps are provided if state is empty
    if not gaps and not state.duration and not is_field_already_resolved("duration", state):
        gaps.append(InformationGap(field_name="duration", priority="HIGH", reason="Duration of symptoms is unresolved", status="OPEN"))

    return gaps
