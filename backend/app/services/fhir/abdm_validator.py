from typing import Dict, Any, List
from app.schemas.abdm import ABDMValidationReport, ABDMValidationIssue


def validate_nrc_abdm_bundle(bundle_data: Dict[str, Any]) -> ABDMValidationReport:
    """
    Validates a FHIR R4 Bundle against NRCES India Core (NDHM/ABDM) Document Profile rules.
    """
    issues: List[ABDMValidationIssue] = []
    bundle_id = bundle_data.get("id", "unknown-bundle")
    bundle_type = bundle_data.get("type")
    entries = bundle_data.get("entry", [])

    resource_breakdown: Dict[str, int] = {}
    resources: List[Dict[str, Any]] = []

    for entry in entries:
        res = entry.get("resource", {})
        r_type = res.get("resourceType")
        if r_type:
            resources.append(res)
            resource_breakdown[r_type] = resource_breakdown.get(r_type, 0) + 1

    # 1. Bundle Type Rule
    if bundle_type != "document":
        issues.append(ABDMValidationIssue(
            severity="error",
            code="INVALID_BUNDLE_TYPE",
            location="Bundle.type",
            details=f"NRCES Document Bundle requires type 'document', got '{bundle_type}'"
        ))

    # 2. Composition Entry Rule (First resource must be Composition)
    if not resources or resources[0].get("resourceType") != "Composition":
        issues.append(ABDMValidationIssue(
            severity="error",
            code="MISSING_FIRST_COMPOSITION",
            location="Bundle.entry[0]",
            details="Per HL7 FHIR R4 Document specification, the first resource in the bundle MUST be a 'Composition'."
        ))
    else:
        comp = resources[0]
        if comp.get("status") != "final":
            issues.append(ABDMValidationIssue(
                severity="warning",
                code="NON_FINAL_COMPOSITION",
                location="Composition.status",
                details="Composition status should be 'final' for confirmed outpatient consultation records."
            ))

    # 3. Patient Resource Rule
    patient_res = next((r for r in resources if r.get("resourceType") == "Patient"), None)
    if not patient_res:
        issues.append(ABDMValidationIssue(
            severity="error",
            code="MISSING_PATIENT_RESOURCE",
            location="Bundle.entry",
            details="Document bundle must contain a valid Patient resource."
        ))

    # 4. Encounter Resource Rule
    encounter_res = next((r for r in resources if r.get("resourceType") == "Encounter"), None)
    if not encounter_res:
        issues.append(ABDMValidationIssue(
            severity="error",
            code="MISSING_ENCOUNTER_RESOURCE",
            location="Bundle.entry",
            details="Document bundle must contain an Encounter resource linking the patient to the consultation."
        ))

    # 5. Practitioner Resource Rule
    practitioner_res = next((r for r in resources if r.get("resourceType") == "Practitioner"), None)
    if not practitioner_res:
        issues.append(ABDMValidationIssue(
            severity="warning",
            code="MISSING_PRACTITIONER_RESOURCE",
            location="Bundle.entry",
            details="Consultation record is recommended to include an explicit Practitioner resource."
        ))

    # Overall validity calculation
    has_errors = any(i.severity == "error" for i in issues)

    return ABDMValidationReport(
        is_valid=not has_errors,
        bundle_id=bundle_id,
        total_resources=len(resources),
        resource_breakdown=resource_breakdown,
        issues=issues
    )
