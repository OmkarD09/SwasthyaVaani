# SwasthyaVaani — Backend Schema

> **Audience:** AI coding agents and backend developers.
>
> **Purpose:** Define the backend data model, typed schemas, relationships, state machines, and persistence rules for SwasthyaVaani.
>
> **Related documents:**
> - `PRD.md` — product requirements
> - `TRD.md` — technical requirements
> - `architecture.md` — system architecture
> - `rules.md` — hard implementation and safety rules

---

# 1. Schema Design Principles

1. PostgreSQL is the primary persistent system of record.
2. Clinical information must remain structured.
3. Raw patient input, AI-derived information, document-derived information, and physician-confirmed information must remain distinguishable.
4. Every important extracted clinical fact should retain provenance where practical.
5. AI output is untrusted until validated.
6. Clinical state is separate from raw conversation history.
7. Safety signals are explicit records, not hidden inside free-form text.
8. Contradictions are explicit records and are never automatically resolved.
9. Physician confirmation is explicit.
10. Database authorization must be enforced server-side.
11. Large documents are stored in object storage; metadata and references are stored in PostgreSQL.
12. Schema changes use migrations.

---

# 2. Technology

Recommended:

```text
PostgreSQL
Supabase
SQLAlchemy
Pydantic
Alembic
```

Optional:

```text
Redis
```

Use Redis only for temporary state/cache/rate limiting/jobs when actually needed. PostgreSQL remains the source of truth for persistent clinical data.

---

# 3. Core Entity Map

```text
Hospital
 └── Department
      └── Doctor

Patient
 └── IntakeSession
      ├── IntakePreferences
      ├── Answer[]
      ├── ClinicalState
      ├── Document[]
      │     └── DocumentExtraction[]
      ├── TimelineEvent[]
      ├── RedFlag[]
      ├── Contradiction[]
      ├── PhysicianReview
      └── AuditEvent[]

IntakeSession
 └── QuestionEvent[]
```

Additional platform entities:

```text
User
Role
Language
Workflow
SafetyRule
ProviderConfiguration
AuditEvent
```

---

# 4. User / Identity Schema

## 4.1 User

The authentication provider may be Supabase Auth or another implementation.

Application-level user record:

```text
User
------
id
auth_provider_id
role
display_name
email
phone
is_active
created_at
updated_at
```

Roles:

```text
PATIENT
DOCTOR
ADMIN
```

Do not use the client-provided role as authoritative.

---

# 5. Hospital Schema

```text
Hospital
--------
id
name
code
address
city
state
country
is_active
created_at
updated_at
```

Constraints:

- `id` unique;
- `code` unique;
- `is_active` boolean.

A kiosk may be configured with a fixed hospital, or the patient may select a hospital in a multi-hospital deployment.

---

# 6. Department Schema

```text
Department
----------
id
hospital_id
name
code
is_active
created_at
updated_at
```

Relationship:

```text
Hospital 1 ──── N Department
```

Foreign key:

```text
department.hospital_id → hospital.id
```

---

# 7. Doctor Schema

```text
Doctor
------
id
user_id
hospital_id
department_id
display_name
specialization
license_identifier? 
is_active
created_at
updated_at
```

Use `license_identifier` only if genuinely required by the deployment.

Relationships:

```text
Hospital 1 ──── N Doctor
Department 1 ── N Doctor
User 1 ──────── 1 Doctor
```

---

# 8. Patient Schema

Patient identity should be kept separate from an intake session.

```text
Patient
-------
id
user_id?
display_name
date_of_birth?
age?
gender?
phone?
abha_id?
created_at
updated_at
```

For demo mode, use synthetic patients.

Do not require Aadhaar as a substitute for ABHA.

---

# 9. ABHA Identity Data

If ABHA is integrated:

```text
Patient
  └── abha_id
```

Do not store unnecessary identity data.

Recommended:

```text
abha_id
abha_link_status
abha_verified_at
```

only if required by the actual integration.

If no live ABDM connection exists, the application may run with:

```text
abha_status = NOT_CONNECTED
```

and remain functional.

---

# 10. IntakeSession Schema

An `IntakeSession` represents one pre-consultation patient interaction.

```text
IntakeSession
-------------
id
patient_id
hospital_id
doctor_id
workflow_id
interaction_mode
language_code
status
current_question_index
question_count
started_at
completed_at?
submitted_at?
created_at
updated_at
```

Suggested `status`:

```text
NOT_STARTED
ACTIVE
NEEDS_REVIEW
READY_TO_SUBMIT
SUBMITTED
LIMITED_HISTORY
PATIENT_ABORTED
ERROR
```

Recommended:

```text
interaction_mode:
VOICE
TEXT
TOUCH
MIXED
```

---

# 11. IntakeSession Preferences

Either normalize into a table or keep compact session preferences in typed JSON.

Recommended structured fields:

```text
language_code
interaction_mode
hospital_id
doctor_id
workflow_id
```

Avoid storing critical authorization or ownership rules only inside JSON.

---

# 12. ClinicalState Schema

Clinical state is the structured working representation of the interview.

Example relational/JSON shape:

```json
{
  "chiefComplaint": null,
  "symptoms": [],
  "onset": null,
  "duration": null,
  "severity": null,
  "location": null,
  "associatedSymptoms": [],
  "aggravatingFactors": [],
  "relievingFactors": [],
  "pastHistory": [],
  "familyHistory": [],
  "medications": [],
  "allergies": [],
  "investigations": [],
  "ayush": null,
  "documents": [],
  "redFlags": [],
  "contradictions": [],
  "uncertainties": [],
  "missingInformation": []
}
```

Store the current structured state in a dedicated table or versioned JSON field.

Recommended:

```text
ClinicalState
------------
id
intake_session_id
version
state_json
created_at
updated_at
```

Relationship:

```text
IntakeSession 1 ──── N ClinicalStateVersion
```

This permits state history during development/debugging.

---

# 13. Clinical Fact Schema

For important fields, a normalized fact model is recommended.

```text
ClinicalFact
------------
id
intake_session_id
field_name
value_json
source_type
source_id
confidence?
status
created_at
updated_at
```

`source_type`:

```text
PATIENT_ANSWER
DOCUMENT
AI_DERIVED
PHYSICIAN
```

`status`:

```text
CANDIDATE
VALIDATED
NEEDS_REVIEW
CONFIRMED
REJECTED
```

This gives the system a common representation for provenance.

---

# 14. Question Schema

Store the actual questions asked, not just the final answer.

```text
QuestionEvent
-------------
id
intake_session_id
sequence_number
question_text
target_field
decision_action
reason?
created_at
```

`decision_action`:

```text
ASK
STOP
ESCALATE
```

Do not store internal chain-of-thought.

`reason` should be a concise machine/debug explanation, not hidden model reasoning.

---

# 15. Answer Schema

```text
Answer
------
id
question_event_id
intake_session_id
raw_text?
normalized_text?
input_mode
language_code
created_at
```

`input_mode`:

```text
VOICE
TEXT
TOUCH
```

Raw audio should NOT be stored by default.

If audio is explicitly required for a controlled demo, it must be treated as sensitive temporary data with a defined retention policy.

---

# 16. Answer Extraction Schema

A patient answer may produce multiple candidate facts.

```text
AnswerExtraction
----------------
id
answer_id
field_name
value_json
confidence?
status
created_at
```

Example:

```json
{
  "field_name": "duration",
  "value_json": "3 days",
  "confidence": 0.96,
  "status": "VALIDATED"
}
```

Pipeline:

```text
Answer
 ↓
LLM extraction
 ↓
Schema validation
 ↓
Domain validation
 ↓
ClinicalFact
```

---

# 17. Information Gap Schema

The question engine should track unresolved required information.

```text
InformationGap
--------------
id
intake_session_id
field_name
priority
reason
status
created_at
updated_at
```

`status`:

```text
OPEN
RESOLVED
DEFERRED
NOT_APPLICABLE
```

`priority`:

```text
HIGH
MEDIUM
LOW
```

Do not ask questions for resolved or irrelevant gaps.

---

# 18. Interview Configuration

Make interview control values configurable.

```text
InterviewConfig
---------------
id
workflow_id
max_questions
max_consecutive_low_progress
low_information_gain_threshold
is_active
version
created_at
updated_at
```

Initial recommended values:

```text
max_questions = 15
max_consecutive_low_progress = 2
```

These are safety/configuration defaults, not fixed product rules.

---

# 19. Question Decision Schema

Backend representation:

```json
{
  "action": "ASK",
  "question": "Where exactly do you feel the pain?",
  "targetField": "location",
  "reason": "Relevant unresolved field",
  "confidence": 0.91
}
```

Validate against:

```text
QuestionDecisionSchema
```

Before executing the action.

---

# 20. Document Schema

```text
Document
--------
id
patient_id
intake_session_id?
file_name
storage_object_id
mime_type
file_size
document_type
status
uploaded_at
processed_at?
created_at
updated_at
```

`document_type`:

```text
PRESCRIPTION
LAB_REPORT
DISCHARGE_SUMMARY
MEDICAL_RECORD
OTHER
```

`status`:

```text
UPLOADED
OCR_PROCESSING
OCR_COMPLETED
EXTRACTING
EXTRACTED
NEEDS_REVIEW
CONFIRMED
FAILED
```

---

# 21. Document Extraction Schema

```text
DocumentExtraction
------------------
id
document_id
field_type
field_name
value_json
confidence?
source_page?
source_region_json?
status
created_at
updated_at
```

Examples:

```text
field_type = MEDICATION
field_name = drug_name
value = Atorvastatin
```

or:

```text
field_type = LAB
field_name = uric_acid
value = 8.2 mg/dL
```

---

# 22. Medication Schema

For structured medication facts:

```text
MedicationFact
--------------
id
document_extraction_id?
intake_session_id
drug_name
dose?
frequency?
duration?
source_type
source_id
confidence?
status
created_at
updated_at
```

Use controlled statuses:

```text
EXTRACTED
NEEDS_REVIEW
CONFIRMED
REJECTED
```

---

# 23. Investigation Schema

```text
InvestigationFact
-----------------
id
document_extraction_id?
intake_session_id
test_name
value?
unit?
reference_range?
observed_at?
source_type
source_id
confidence?
status
created_at
updated_at
```

Do not invent reference ranges.

If unavailable:

```text
reference_range = null
```

---

# 24. Provenance Schema

Recommended reusable logical structure:

```text
Provenance
----------
source_type
source_id
page?
region_json?
confidence?
```

Source types:

```text
PATIENT_ANSWER
DOCUMENT
AI_DERIVED
PHYSICIAN
```

Example:

```json
{
  "source_type": "DOCUMENT",
  "source_id": "doc_123",
  "page": 1,
  "confidence": 0.94
}
```

---

# 25. TimelineEvent Schema

```text
TimelineEvent
-------------
id
patient_id
intake_session_id?
event_type
event_date?
title
description?
source_type
source_id
metadata_json?
created_at
```

Possible `event_type`:

```text
DIAGNOSIS
PRESCRIPTION
LAB_REPORT
DISCHARGE
VISIT
PATIENT_REPORTED
PHYSICIAN_CONFIRMED
OTHER
```

Timeline should be evidence-linked.

---

# 26. RedFlag Schema

```text
RedFlag
-------
id
intake_session_id
rule_id
title
reason
severity
status
created_at
reviewed_at?
reviewed_by?
```

Suggested:

```text
severity = PRIORITY
status = OPEN | REVIEWED
```

Evidence links:

```text
RedFlagEvidence
---------------
id
red_flag_id
evidence_type
evidence_id
```

This allows the doctor to see exactly which answers/facts triggered the rule.

---

# 27. SafetyRule Schema

```text
SafetyRule
----------
id
rule_code
version
name
description
rule_expression
priority
is_active
created_at
updated_at
```

Example:

```text
rule_code: RF-CP-001
version: v1
```

Do not allow uncontrolled natural-language safety rules to execute directly.

Rules should be represented as validated/configurable conditions.

---

# 28. Contradiction Schema

```text
Contradiction
-------------
id
intake_session_id
field_name
value_a_json
source_a_json
value_b_json
source_b_json
status
created_at
updated_at
resolved_at?
resolved_by?
```

Status:

```text
OPEN
REVIEWED
RESOLVED_BY_PHYSICIAN
DISMISSED
```

The system must retain both values.

---

# 29. PhysicianReview Schema

```text
PhysicianReview
---------------
id
intake_session_id
doctor_id
status
reviewed_at?
confirmed_at?
summary_version
notes?
created_at
updated_at
```

Status:

```text
NOT_REVIEWED
IN_REVIEW
EDITED
CONFIRMED
```

Only `CONFIRMED` should be considered the final physician-approved state.

---

# 30. PhysicianEdit Schema

Important physician changes should be auditable.

```text
PhysicianEdit
-------------
id
physician_review_id
field_name
old_value_json
new_value_json
reason?
created_at
```

Do not silently overwrite important clinical information without preserving the review event.

---

# 31. AuditEvent Schema

```text
AuditEvent
----------
id
actor_user_id?
actor_role
event_type
resource_type
resource_id
metadata_json?
created_at
```

Possible event types:

```text
LOGIN
INTAKE_STARTED
INTAKE_SUBMITTED
DOCUMENT_UPLOADED
DOCUMENT_PROCESSED
RED_FLAG_CREATED
CONTRADICTION_CREATED
PHYSICIAN_EDITED
PHYSICIAN_CONFIRMED
FHIR_GENERATED
ADMIN_CHANGED
PROVIDER_ERROR
```

Avoid storing unnecessary clinical content in audit metadata.

---

# 32. Workflow Schema

```text
Workflow
--------
id
name
code
type
version
is_active
configuration_json?
created_at
updated_at
```

Examples:

```text
GENERAL_CLINICAL
AYUSH
```

The question engine loads workflow-specific required fields and question rules.

---

# 33. WorkflowField Schema

```text
WorkflowField
-------------
id
workflow_id
field_name
field_type
required_level
question_priority
is_active
version
```

`required_level`:

```text
REQUIRED
RELEVANT
OPTIONAL
```

This is the basis of deterministic fallback behavior.

---

# 34. Doctor Queue Model

The queue should be derived from submitted intake sessions rather than maintained as duplicated state where possible.

Conceptual fields:

```text
QueueItem
---------
intake_session_id
doctor_id
hospital_id
priority
status
submitted_at
```

Status examples:

```text
WAITING
HISTORY_READY
PRIORITY_REVIEW
IN_REVIEW
CONFIRMED
```

Avoid duplicating patient data unnecessarily.

---

# 35. Doctor Assignment Rules

At submission:

```text
intake_session.doctor_id
```

is the target doctor.

The backend must verify:

```text
doctor exists
doctor active
doctor belongs to selected hospital/department as applicable
patient session authorized
```

Never trust a browser-provided doctor assignment.

---

# 36. Service / Provider Configuration

```text
ProviderConfiguration
---------------------
id
provider_type
provider_name
is_active
configuration_json
created_at
updated_at
```

Provider types:

```text
LLM
SPEECH
OCR
TRANSLATION
ABDM
FHIR
```

Secrets must NOT be stored as plain configuration JSON unless using a secure secret store.

---

# 37. ProviderEvent Schema

Useful for technical observability.

```text
ProviderEvent
-------------
id
provider_type
provider_name
operation
status
latency_ms?
error_code?
request_id?
created_at
```

Do not log raw patient content.

---

# 38. FHIR Export Schema

FHIR should be generated from physician-confirmed data.

```text
FHIRExport
----------
id
intake_session_id
physician_review_id
status
resource_type
bundle_json
validation_status
created_at
```

Status:

```text
PENDING
GENERATED
VALIDATED
FAILED
EXPORTED
```

`bundle_json` should only contain data permitted by the integration.

---

# 39. Notification/Event Schema

Optional but useful:

```text
DomainEvent
-----------
id
event_type
aggregate_type
aggregate_id
payload_json
created_at
processed_at?
```

Examples:

```text
INTAKE_SUBMITTED
QUEUE_UPDATED
PHYSICIAN_CONFIRMED
```

For the prototype, direct WebSocket publication from application services is acceptable; do not introduce a full event bus unless needed.

---

# 40. Recommended Foreign Keys

At minimum:

```text
department.hospital_id → hospital.id
doctor.hospital_id → hospital.id
doctor.department_id → department.id
doctor.user_id → user.id

patient.user_id → user.id

intake_session.patient_id → patient.id
intake_session.hospital_id → hospital.id
intake_session.doctor_id → doctor.id
intake_session.workflow_id → workflow.id

answer.question_event_id → question_event.id
answer.intake_session_id → intake_session.id

clinical_state.intake_session_id → intake_session.id

document.patient_id → patient.id
document.intake_session_id → intake_session.id

document_extraction.document_id → document.id

timeline_event.patient_id → patient.id
timeline_event.intake_session_id → intake_session.id

red_flag.intake_session_id → intake_session.id
contradiction.intake_session_id → intake_session.id

physician_review.intake_session_id → intake_session.id
physician_review.doctor_id → doctor.id

audit_event.actor_user_id → user.id
```

Use cascading deletes cautiously for clinical/audit records. Do not accidentally delete audit history when removing an application relationship.

---

# 41. Indexing

Recommended indexes:

```text
hospital.code
department.hospital_id
doctor.hospital_id
doctor.department_id
patient.abha_id
intake_session.patient_id
intake_session.doctor_id
intake_session.hospital_id
intake_session.status
intake_session.submitted_at
answer.intake_session_id
question_event.intake_session_id
document.patient_id
document.intake_session_id
document.status
red_flag.intake_session_id
red_flag.status
contradiction.intake_session_id
contradiction.status
audit_event.resource_type + resource_id
```

Add indexes based on actual query patterns.

---

# 42. Transaction Boundaries

## Patient submission

Must be transactional:

```text
validate session
 ↓
validate patient confirmation
 ↓
persist submission
 ↓
assign/confirm doctor
 ↓
commit
 ↓
publish queue update
```

Do not notify the doctor before the database transaction commits.

## Physician confirmation

```text
validate authorization
 ↓
persist edits
 ↓
persist confirmation
 ↓
commit
 ↓
optional FHIR generation
```

---

# 43. Concurrency Rules

Prevent two doctors from accidentally editing the same review state without detection.

Possible mechanisms:

```text
version number
updated_at comparison
optimistic locking
```

For example:

```text
expected_version
actual_version
```

If mismatch:

```text
409 CONFLICT
```

and require refresh/review.

---

# 44. Data State Hierarchy

Do not treat all information equally.

Recommended hierarchy:

```text
RAW
 ↓
EXTRACTED
 ↓
VALIDATED
 ↓
PATIENT_CONFIRMED
 ↓
PHYSICIAN_CONFIRMED
```

Not every field must pass every state, but state transitions must be explicit.

---

# 45. State Transition Rules

### AI extraction

```text
RAW → EXTRACTED
```

### Validation

```text
EXTRACTED → VALIDATED
```

### Patient correction

```text
VALIDATED → PATIENT_CONFIRMED
```

### Physician confirmation

```text
PATIENT_CONFIRMED → PHYSICIAN_CONFIRMED
```

### Rejection

```text
EXTRACTED/VALIDATED → REJECTED
```

No automatic transition from AI output directly to physician-confirmed.

---

# 46. API Response Models

All FastAPI endpoints should use Pydantic response schemas.

Examples:

```text
HospitalResponse
DoctorResponse
IntakeResponse
QuestionDecisionResponse
ClinicalStateResponse
DocumentResponse
DocumentExtractionResponse
RedFlagResponse
ContradictionResponse
DoctorPatientResponse
PhysicianReviewResponse
FHIRExportResponse
```

Do not return ORM entities directly from endpoints.

---

# 47. Pagination

Use pagination for:

- hospitals if large;
- doctor lists;
- doctor patient queue;
- timelines;
- documents;
- audit events.

Example:

```text
?page=1&page_size=25
```

Set safe maximum page size.

---

# 48. File Upload Limits

Define configurable:

```text
MAX_FILE_SIZE_BYTES
ALLOWED_MIME_TYPES
```

Example supported prototype types:

```text
image/jpeg
image/png
application/pdf
```

Do not rely only on browser-declared MIME type.

---

# 49. Data Retention

Separate:

```text
temporary session
persistent clinical record
document
audit record
```

The product must not assume that browser cleanup deletes backend data.

Retention and deletion rules should be configurable by deployment requirements.

---

# 50. Demo Seed Schema

Create deterministic seed data for:

```text
1–2 hospitals
3–5 doctors
4 synthetic patients
4 intake sessions
sample answers
sample documents
sample extracted fields
red-flag case
contradiction case
AYUSH case
```

Seed data must be safe to reset.

---

# 51. Example End-to-End Record

```text
Patient
  ↓
IntakeSession
  ↓
Answers
  ↓
ClinicalState
  ├── ClinicalFacts
  ├── RedFlags
  ├── Contradictions
  └── Documents
          ↓
     DocumentExtraction
          ↓
     TimelineEvent
  ↓
Patient Review
  ↓
PhysicianReview
  ↓
FHIRExport
```

---

# 52. Minimum Backend Schema for First Working Vertical Slice

If implementing incrementally, the minimum database set is:

```text
User
Hospital
Department
Doctor
Patient
Workflow
IntakeSession
QuestionEvent
Answer
ClinicalState
PhysicianReview
AuditEvent
```

Then add:

```text
Document
DocumentExtraction
TimelineEvent
RedFlag
Contradiction
FHIRExport
```

as those capabilities are implemented.

---

# 53. Backend Schema Rules for AI Agents

When an AI coding agent modifies the schema:

1. Inspect existing migrations first.
2. Never edit an already-applied migration in a shared environment.
3. Create a new migration for schema changes.
4. Update Pydantic schemas.
5. Update ORM models.
6. Update affected API responses.
7. Update tests.
8. Update seed fixtures where necessary.
9. Check foreign-key behavior.
10. Check authorization impact.
11. Check whether existing records remain compatible.

---

# 54. Schema Anti-Patterns

Do NOT:

- store the entire application state in one unstructured JSON blob;
- store large documents directly in PostgreSQL unless explicitly justified;
- store raw LLM output as trusted clinical truth;
- duplicate the same patient data across queue/summary/timeline tables unnecessarily;
- use client IDs as authorization;
- store provider secrets in regular database tables without secure secret handling;
- hard-delete clinical/audit history casually;
- create one table per symptom or one table per question;
- create separate unrelated data models for modern medicine and AYUSH.

---

# 55. Final Schema Invariants

The following must always remain true:

```text
1. Patient → IntakeSession is explicit.
2. IntakeSession → Doctor assignment is server-validated.
3. ClinicalState is structured.
4. Raw answers remain traceable.
5. Important extracted facts retain provenance.
6. Red flags have explicit evidence.
7. Contradictions preserve both conflicting values.
8. Physician confirmation is explicit.
9. FHIR is generated from validated/confirmed data.
10. Uploaded documents remain linked to their source.
11. External provider failure does not invalidate the data model.
12. Demo data are synthetic.
13. Authorization is server-side.
14. AI output is never automatically treated as confirmed clinical truth.
15. Schema changes use migrations.
