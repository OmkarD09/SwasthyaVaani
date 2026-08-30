import pytest
from app.schemas.clinical_state import ClinicalState, Medication, Provenance
from app.services.safety.red_flags import evaluate_red_flags
from app.services.safety.contradictions import detect_contradictions


def test_red_flag_triggers_on_cardiac_signals():
    # Case A: Chest pain + breathlessness + left arm radiation
    state = ClinicalState(
        chief_complaint="Heavy chest pressure",
        location="Centre of chest",
        radiation="Left arm and shoulder",
        associated_symptoms=["Breathlessness", "Sweating"]
    )
    flags = evaluate_red_flags(state)
    
    assert len(flags) > 0
    rf_codes = [f.rule_id for f in flags]
    assert "RF-CP-001" in rf_codes
    assert flags[0].severity == "PRIORITY"


def test_red_flag_triggers_on_high_severity():
    state = ClinicalState(
        chief_complaint="Severe abdominal pain",
        severity=9
    )
    flags = evaluate_red_flags(state)
    rf_codes = [f.rule_id for f in flags]
    assert "RF-SEV-001" in rf_codes


def test_red_flag_not_triggered_on_mild_symptom():
    state = ClinicalState(
        chief_complaint="Mild common cold",
        severity=3,
        duration="2 days"
    )
    flags = evaluate_red_flags(state)
    assert len(flags) == 0


def test_contradiction_detection_preserves_both_sources():
    state = ClinicalState(
        chief_complaint="Follow-up consultation",
        medications=[
            Medication(
                drug_name="Metformin",
                dose="500 mg",
                provenance=Provenance(source_type="DOCUMENT", source_id="prior_presc_01")
            )
        ],
        raw_transcript_snippets=["I stopped Metformin last week because it gave me nausea."]
    )
    
    contradictions = detect_contradictions(state)
    assert len(contradictions) == 1
    c = contradictions[0]
    assert "Metformin" in c.field
    assert c.source_a.source_type == "PATIENT_ANSWER"
    assert c.source_b.source_type == "DOCUMENT"
    assert c.status == "OPEN"
