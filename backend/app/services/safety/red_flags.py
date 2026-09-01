from typing import List
from app.schemas.clinical_state import ClinicalState, RedFlag


def evaluate_red_flags(state: ClinicalState) -> List[RedFlag]:
    """
    Deterministic Safety Rule Engine.
    Detects critical risk patterns and generates PRIORITY_REVIEW alerts.
    STRICT CLINICAL RULE: Generates safety alerts only; NEVER diagnoses a condition.
    """
    detected_flags: List[RedFlag] = []
    
    complaint_lower = (state.chief_complaint or "").lower()
    symptoms_lower = [s.lower() for s in state.symptoms + state.associated_symptoms]
    all_text = " ".join([complaint_lower] + symptoms_lower + [(state.location or "").lower(), (state.radiation or "").lower()])
    
    # Rule 1: RF-CP-001 - Cardinal Cardiac Warning Combination
    has_chest_pain = "chest" in all_text or "heart" in all_text or "chaati" in all_text or "seen" in all_text
    has_dyspnea = "breath" in all_text or "saans" in all_text or "dyspnea" in all_text or "sweat" in all_text
    has_radiation = "arm" in all_text or "shoulder" in all_text or "left" in all_text or "kandha" in all_text or "haath" in all_text
    
    if has_chest_pain and (has_dyspnea or has_radiation):
        detected_flags.append(
            RedFlag(
                rule_id="RF-CP-001",
                title="Chest Pain with High-Risk Associated Signals",
                reason="Patient reported chest discomfort accompanied by breathlessness/radiation. Requires prompt physician evaluation.",
                severity="PRIORITY",
                evidence_ids=["chief_complaint", "associated_symptoms"],
            )
        )
        
    # Rule 2: RF-SEV-001 - Critical Pain Severity Warning
    if state.severity and state.severity >= 8:
        detected_flags.append(
            RedFlag(
                rule_id="RF-SEV-001",
                title="Severe Pain Intensity (Severity >= 8/10)",
                reason=f"Patient reported high pain severity ({state.severity}/10). Requires clinical assessment.",
                severity="PRIORITY",
                evidence_ids=["severity"],
            )
        )
        
    # Rule 3: RF-SO-001 - High Fever with Respiratory Distress
    has_fever = "fever" in all_text or "bukhar" in all_text or "taap" in all_text
    if has_fever and ("shortness" in all_text or "gasping" in all_text or "saans" in all_text):
        detected_flags.append(
            RedFlag(
                rule_id="RF-SO-001",
                title="Febrile Illness with Respiratory Difficulty",
                reason="Fever reported in conjunction with breathing difficulty.",
                severity="PRIORITY",
                evidence_ids=["symptoms", "associated_symptoms"],
            )
        )

    # Rule 4: RF-GI-001 - Gastrointestinal Bleeding / Melena Warning
    has_gi_bleed = bool(state.dark_stool) or any(w in all_text for w in ["black stool", "dark stool", "blood in stool", "vomiting blood", "khoon"])
    has_hypoperfusion = bool(state.dizziness) or bool(state.weakness) or any(w in all_text for w in ["dizzy", "dizziness", "weak", "weakness", "fainting", "chakkar"])
    if has_gi_bleed:
        reason_text = "Patient reported dark/black stool or GI bleeding." + (" Accompanied by dizziness/weakness indicating potential hypoperfusion." if has_hypoperfusion else "")
        detected_flags.append(
            RedFlag(
                rule_id="RF-GI-001",
                title="Gastrointestinal Bleeding / Melena Warning",
                reason=reason_text,
                severity="PRIORITY",
                evidence_ids=["associated_symptoms"],
            )
        )

    return detected_flags
