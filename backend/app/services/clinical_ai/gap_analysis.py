from typing import List, Dict, Any
from app.schemas.clinical_state import ClinicalState, InformationGap

# Workflow Required Field Specifications
WORKFLOW_FIELD_DEFINITIONS: Dict[str, List[Dict[str, Any]]] = {
    "GENERAL_CLINICAL": [
        {"field": "onset", "label": "Onset (When and how it began)", "priority": "HIGH"},
        {"field": "duration", "label": "Duration (How long it has lasted)", "priority": "HIGH"},
        {"field": "severity", "label": "Severity (Pain/discomfort intensity 1-10)", "priority": "HIGH"},
        {"field": "location", "label": "Site / Location (Where it is felt)", "priority": "MEDIUM"},
        {"field": "character", "label": "Character / Quality (Sharp, burning, dull ache)", "priority": "MEDIUM"},
        {"field": "associated_symptoms", "label": "Associated symptoms", "priority": "MEDIUM"},
        {"field": "aggravating_factors", "label": "Triggers or aggravating factors", "priority": "LOW"},
        {"field": "relieving_factors", "label": "Relieving factors or medications tried", "priority": "LOW"},
    ],
    "AYUSH": [
        {"field": "onset", "label": "Onset (Kala / onset)", "priority": "HIGH"},
        {"field": "duration", "label": "Duration (Kala / chronicity)", "priority": "HIGH"},
        {"field": "agni", "label": "Agni (Digestive fire & appetite state)", "priority": "HIGH"},
        {"field": "koshtha", "label": "Koshtha (Bowel habit & gut motility)", "priority": "HIGH"},
        {"field": "location", "label": "Strotas / Location of pain or stiffness", "priority": "MEDIUM"},
        {"field": "ahara_vihara", "label": "Ahara & Vihara (Dietary & routine triggers)", "priority": "MEDIUM"},
        {"field": "relieving_factors", "label": "Relieving factors (Upashaya)", "priority": "LOW"},
    ],
}


def find_information_gaps(state: ClinicalState, workflow_type: str = "GENERAL_CLINICAL") -> List[InformationGap]:
    """
    Identifies unresolved clinical fields required for the active workflow.
    """
    field_defs = WORKFLOW_FIELD_DEFINITIONS.get(workflow_type, WORKFLOW_FIELD_DEFINITIONS["GENERAL_CLINICAL"])
    gaps: List[InformationGap] = []
    
    for item in field_defs:
        field_name = item["field"]
        priority = item["priority"]
        label = item["label"]
        
        # Check if field is resolved in current clinical state
        is_resolved = False
        if field_name == "onset" and state.onset:
            is_resolved = True
        elif field_name == "duration" and state.duration:
            is_resolved = True
        elif field_name == "severity" and state.severity is not None:
            is_resolved = True
        elif field_name == "location" and state.location:
            is_resolved = True
        elif field_name == "character" and state.character:
            is_resolved = True
        elif field_name == "associated_symptoms" and len(state.associated_symptoms) > 0:
            is_resolved = True
        elif field_name == "aggravating_factors" and len(state.aggravating_factors) > 0:
            is_resolved = True
        elif field_name == "relieving_factors" and len(state.relieving_factors) > 0:
            is_resolved = True
        elif field_name == "agni" and state.ayush and state.ayush.agni:
            is_resolved = True
        elif field_name == "koshtha" and state.ayush and state.ayush.koshtha:
            is_resolved = True
        elif field_name == "ahara_vihara" and state.ayush and state.ayush.ahara_vihara:
            is_resolved = True
            
        if not is_resolved:
            gaps.append(
                InformationGap(
                    field_name=field_name,
                    priority=priority,
                    reason=f"{label} is not yet resolved in clinical history",
                    status="OPEN"
                )
            )
            
    return gaps
