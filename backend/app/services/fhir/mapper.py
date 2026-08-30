import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.schemas.clinical_state import ClinicalState
from app.schemas.fhir import FHIRBundle


def map_clinical_state_to_fhir_r4(
    intake_session_id: str,
    patient_id: str,
    patient_name: str,
    doctor_name: str,
    state: ClinicalState
) -> FHIRBundle:
    """
    Transforms confirmed structured clinical data into an official NRCES India Core
    compliant FHIR R4 Document Bundle.
    
    Adheres strictly to:
    - https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle
    - https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord
    """
    bundle_id = f"bundle-{uuid.uuid4()}"
    timestamp_str = datetime.now(timezone.utc).isoformat()
    entries: List[Dict[str, Any]] = []

    # 1. Mandatory First Resource: FHIR Composition (Document Header)
    comp_id = f"comp-{intake_session_id}"
    composition_resource = {
        "resourceType": "Composition",
        "id": comp_id,
        "meta": {
            "versionId": "1",
            "lastUpdated": timestamp_str,
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord"]
        },
        "status": "final",
        "type": {
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "code": "371530004",
                    "display": "Clinical consultation report"
                }
            ],
            "text": "Outpatient Consultation Record"
        },
        "subject": {"reference": f"Patient/{patient_id}", "display": patient_name},
        "date": timestamp_str,
        "author": [{"display": doctor_name}],
        "title": "Pre-Consultation Clinical Intake - SwasthyaVaani",
        "section": [
            {
                "title": "Chief Complaint & History of Present Illness",
                "code": {"coding": [{"system": "http://snomed.info/sct", "code": "422843007", "display": "Chief complaint"}]},
                "text": {"status": "generated", "div": f"<div xmlns='http://www.w3.org/1999/xhtml'>{state.chief_complaint or 'General consultation'}</div>"}
            }
        ]
    }
    entries.append({"resource": composition_resource})

    # 2. FHIR Patient Resource (NRCES India Profile)
    patient_resource = {
        "resourceType": "Patient",
        "id": patient_id,
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"]
        },
        "identifier": [
            {
                "type": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": "MR", "display": "Medical Record Number"}]},
                "system": "https://healthid.ndhm.gov.in",
                "value": f"ABHA-{patient_id[:8]}"
            }
        ],
        "name": [{"text": patient_name}]
    }
    entries.append({"resource": patient_resource})

    # 3. FHIR Practitioner Resource
    practitioner_id = f"practitioner-{uuid.uuid4().hex[:6]}"
    practitioner_resource = {
        "resourceType": "Practitioner",
        "id": practitioner_id,
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Practitioner"]
        },
        "name": [{"text": doctor_name}]
    }
    entries.append({"resource": practitioner_resource})

    # 4. FHIR Encounter Resource
    encounter_id = f"enc-{intake_session_id}"
    encounter_resource = {
        "resourceType": "Encounter",
        "id": encounter_id,
        "meta": {
            "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Encounter"]
        },
        "status": "finished",
        "class": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "AMB",
            "display": "Ambulatory"
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "participant": [{"individual": {"reference": f"Practitioner/{practitioner_id}", "display": doctor_name}}],
        "period": {"start": timestamp_str}
    }
    entries.append({"resource": encounter_resource})

    # 5. FHIR Condition Resource (Chief Complaint)
    if state.chief_complaint:
        condition_resource = {
            "resourceType": "Condition",
            "id": f"cond-{uuid.uuid4()}",
            "meta": {
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition"]
            },
            "clinicalStatus": {
                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]
            },
            "verificationStatus": {
                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "confirmed"}]
            },
            "code": {"text": state.chief_complaint},
            "subject": {"reference": f"Patient/{patient_id}"},
            "onsetDateTime": timestamp_str
        }
        entries.append({"resource": condition_resource})

    # 6. FHIR Observation Resources (Duration, Severity, AYUSH)
    if state.duration:
        entries.append({
            "resource": {
                "resourceType": "Observation",
                "id": f"obs-dur-{uuid.uuid4()}",
                "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"]},
                "status": "final",
                "code": {"text": "Symptom Duration"},
                "valueString": state.duration,
                "subject": {"reference": f"Patient/{patient_id}"}
            }
        })

    if state.severity:
        entries.append({
            "resource": {
                "resourceType": "Observation",
                "id": f"obs-sev-{uuid.uuid4()}",
                "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"]},
                "status": "final",
                "code": {"text": "Pain Severity Score (1-10)"},
                "valueInteger": state.severity,
                "subject": {"reference": f"Patient/{patient_id}"}
            }
        })

    # AYUSH Observations
    if state.ayush:
        if state.ayush.agni:
            entries.append({
                "resource": {
                    "resourceType": "Observation",
                    "id": f"obs-agni-{uuid.uuid4()}",
                    "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"]},
                    "status": "final",
                    "code": {"text": "Ayurveda Agni Assessment"},
                    "valueString": state.ayush.agni,
                    "subject": {"reference": f"Patient/{patient_id}"}
                }
            })
        if state.ayush.koshtha:
            entries.append({
                "resource": {
                    "resourceType": "Observation",
                    "id": f"obs-koshtha-{uuid.uuid4()}",
                    "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"]},
                    "status": "final",
                    "code": {"text": "Ayurveda Koshtha Assessment"},
                    "valueString": state.ayush.koshtha,
                    "subject": {"reference": f"Patient/{patient_id}"}
                }
            })

    # 7. FHIR MedicationStatement Resources
    for med in state.medications:
        entries.append({
            "resource": {
                "resourceType": "MedicationStatement",
                "id": f"med-{uuid.uuid4()}",
                "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationStatement"]},
                "status": "active",
                "medicationCodeableConcept": {"text": med.drug_name},
                "subject": {"reference": f"Patient/{patient_id}"},
                "dosage": [{"text": f"{med.dose or ''} {med.frequency or ''}".strip()}]
            }
        })

    return FHIRBundle(
        id=bundle_id,
        type="document",
        entry=entries
    )
