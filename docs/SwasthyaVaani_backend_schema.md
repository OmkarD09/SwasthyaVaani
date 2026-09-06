# SwasthyaVaani — Backend Schema

> **Status:** Updated backend/data source of truth
>
> **Purpose:** Define the persistent data model, typed state structures, relationships, provenance, workflow state, AYUSH assessment model, document evidence model, and persistence invariants for SwasthyaVaani.
>
> **Primary references:** Final `SwasthyaVaani_architecture.md`, updated PRD, updated TRD, `SwasthyaVaani_Current_Project_State.md`, original Backend Schema, Rules, App Flow, and AYUSH Implementation Specification.
>
> **Important:** This document evolves the existing schema. Existing working entities remain the foundation; richer AYUSH and evidence structures are additive where required.

---

# 1. Schema Design Principles

1. PostgreSQL/Supabase is the production persistence direction.
2. SQLite remains supported for local development and controlled testing where compatible.
3. Clinical information must remain structured.
4. Raw patient input and structured clinical state must remain distinguishable.
5. Patient-stated, AI-derived, document-derived, and physician-confirmed information must remain distinguishable.
6. Important clinical facts should retain provenance where practical.
7. Safety signals are explicit records.
8. Contradictions preserve both conflicting values.
9. Physician confirmation is explicit.
10. AI output is untrusted until validated.
11. Large medical documents belong in private object/file storage; metadata and references belong in the database.
12. Schema changes use migrations.
13. Authorization is enforced server-side.
14. Demo data are synthetic.
15. Do not use the database as a raw dump of arbitrary LLM output.

---

# 2. Technology

Current implementation:

```text
SQLAlchemy 2
Pydantic
Alembic
SQLite
```

Production direction:

```text
PostgreSQL / Supabase
```

Potential supporting components:

```text
Supabase Storage / private object storage
Redis only where temporary cache/rate-limit/job requirements justify it
```

---

# 3. Core Entity Map

```text
Hospital
 └── Department
      └── Doctor
           └── User account

Patient
 └── IntakeSession
      ├── QuestionEvent[]
      │    └── Answer
      ├── ClinicalStateModel[]
      ├── AyushAssessmentModel
      ├── Document[]
      │    ├── OCRRun[]
      │    │    └── OCRevidence[]
      │    ├── CandidateSet[]
      │    │    └── Candidate[]
      │    │         └── EvidenceLink[]
      │    └── Extraction[]
      ├── RedFlag[]
      ├── Contradiction[]
      └── PhysicianReview
           └── PhysicianEdit[]

AuditEvent
KnowledgeDocument
 └── KnowledgeChunk[]
```

---

# 4. Identity and Role Schema

## 4.1 User

```text
User
----
id
auth_provider_id
role
display_name
email?
phone?
password_hash?
is_active
created_at
updated_at
```

Current roles may include:

```text
DOCTOR
ADMIN
HOSPITAL_ADMIN
SUPER_ADMIN
PATIENT
```

The exact role set must follow the deployed authorization implementation.

The client-provided role is never authoritative.

---

# 5. Hospital

```text
Hospital
--------
id
name
code
address?
city?
state?
country?
is_active
created_at
updated_at
```

Constraints:

```text
id → unique
code → unique
```

---

# 6. Department

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
Hospital 1 ─── N Department
```

---

# 7. Doctor

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

Relationships:

```text
User 1 ─── 1 Doctor
Hospital 1 ─── N Doctor
Department 1 ─── N Doctor
```

---

# 8. Patient

Patient identity is separate from an intake session.

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

Demo patients must be synthetic.

Avoid collecting unnecessary identity fields.

---

# 9. IntakeSession

An IntakeSession represents one pre-consultation encounter.

```text
IntakeSession
-------------
id
token
patient_id
hospital_id?
doctor_id?
workflow_type
ayush_system?
interaction_mode
language_code
status
question_count
started_at
completed_at?
submitted_at?
created_at
updated_at
```

## Workflow

```text
GENERAL_CLINICAL
AYUSH
DUAL_SYSTEM
```

## AYUSH system context

For detailed current AYUSH implementation:

```text
AYURVEDA
```

The architecture remains extensible to:

```text
YOGA_NATUROPATHY
UNANI
SIDDHA
HOMOEOPATHY
```

Do not create empty system-specific records unless the workflow actually supports them.

## Interaction mode

```text
VOICE
TEXT
TOUCH
MIXED
```

## Session status

Recommended states:

```text
NOT_STARTED
ACTIVE
READY_TO_SUBMIT
SUBMITTED
LIMITED_HISTORY
PATIENT_ABORTED
ERROR
```

The exact deployed enum/state values must remain compatible with current code.

---

# 10. QuestionEvent

Every adaptive question must be persisted.

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

The `target_field` is the canonical dimension selected by the adaptive engine.

Do not store internal model chain-of-thought.

`reason` should remain a short machine/debug explanation if present.

---

# 11. Answer

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

The answer must remain traceable to the QuestionEvent that produced it.

This linkage is especially important for adaptive reasoning and evidence provenance.

---

# 12. ClinicalStateModel

ClinicalState is the structured working representation of the patient interview.

```text
ClinicalStateModel
------------------
id
intake_session_id
version
state_json
created_at
```

Current architecture treats state versions as immutable historical snapshots.

Relationship:

```text
IntakeSession 1 ─── N ClinicalStateModel
```

The latest version is the active working state.

---

# 13. ClinicalState Logical Structure

The current structured state may contain:

```text
chief_complaint
symptoms
onset
duration
severity
location
character
radiation
associated_symptoms
timing
aggravating_factors
relieving_factors
past_history
family_history
medications
allergies
investigations

ayush

documents
red_flags
contradictions
uncertainties

canonical_dimensions
resolved_dimensions
active_exploration_mode
explored_areas

domain-specific fields
```

Examples of currently supported focused fields may include:

```text
food_exposure
stool_consistency
stool_frequency
hydration_status
bloating
dark_stool
blood_in_stool
dizziness
weakness
negated_symptoms
```

Only fields actually required by the implemented clinical engine should remain active.

---

# 14. CanonicalDimensionState

Important adaptive dimensions should use canonical state tracking.

Conceptual structure:

```text
CanonicalDimensionState
-----------------------
status
value
characterization?
last_updated_turn
```

Status:

```text
UNKNOWN
KNOWN_TRUE
KNOWN_FALSE
AMBIGUOUS
KNOWN_WITH_VALUE
```

Example:

```text
"How long?"
"Since when?"
"For 3 days?"

        ↓

canonical dimension:
symptom_duration
```

This prevents alias fragmentation and repeated questions.

---

# 15. Clinical Fact / Evidence Representation

Important structured information may be represented as a validated fact with source metadata.

Conceptually:

```text
ClinicalFact
------------
field_name
value_json
source_type
source_id?
confidence?
status
created_at
updated_at
```

Source types:

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

Status examples:

```text
CANDIDATE
VALIDATED
NEEDS_REVIEW
CONFIRMED
REJECTED
```

Use the existing ClinicalState structure when a separate normalized table is unnecessary.

Do not create duplicate storage models without a concrete persistence requirement.

---

# 16. AYUSH Assessment

The target richer AYUSH assessment is an additive structure.

```text
AyushAssessmentModel
--------------------
id
intake_session_id
system
status
assessment_json
created_at
updated_at
```

The richer logical object should support:

```text
system
dimensions
ahara_vihara
evidence
confidence
uncertainties
overall_status
physician_review_state
```

The current `ClinicalState.ayush` remains the adaptive working representation until migration is complete.

---

# 17. AYUSH System Context

AYUSH is the umbrella category.

Current detailed assessment:

```text
AYURVEDA
```

Future extensibility:

```text
AYURVEDA
YOGA_NATUROPATHY
UNANI
SIDDHA
HOMOEOPATHY
```

Do not represent Ayurveda-specific concepts as universal AYUSH attributes.

---

# 18. Ayurveda Assessment Dimensions

## Current/core

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha evidence
```

## Expanded

```text
Sara
Samhanana
Pramana
Satmya
Sattva
Ahara Shakti
Vyayama Shakti
Vaya
```

Expanded dimensions are adaptive assessment targets, not mandatory fields for every AYUSH session.

---

# 19. AYUSH Dimension State

Each important AYUSH dimension should support:

```text
value
status
confidence
source
evidence[]
last_updated_turn
```

Example:

```json
{
  "dimension": "agni",
  "value": "irregular digestive pattern",
  "status": "NEEDS_REVIEW",
  "source": "AI_INFERRED",
  "confidence": 0.61,
  "evidence": [
    "question-event-17",
    "question-event-19"
  ],
  "last_updated_turn": 5
}
```

The system must not create unsupported certainty.

---

# 20. AYUSH Provenance

Minimum source distinction:

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

The doctor must be able to distinguish a patient statement from an AI-derived interpretation.

A physician-confirmed value should not overwrite the historical AI inference without retaining an audit trail.

---

# 21. AYUSH Evidence

Possible evidence links:

```text
QuestionEvent
Answer
Document
DocumentCandidate
PhysicianEdit
```

Conceptually:

```text
AyushAssessment
   ↓
Dimension
   ↓
Value
   ↓
Evidence[]
```

This enables traceable review.

---

# 22. AYUSH Assessment Status

Recommended logical statuses:

```text
INCOMPLETE
PRELIMINARY
NEEDS_REVIEW
PHYSICIAN_CONFIRMED
```

The deployed implementation may use equivalent values.

---

# 23. AYUSH and Adaptive Engine

AYUSH dimensions are not stored as an independent questionnaire state.

They participate in the same adaptive selection pipeline:

```text
ClinicalState
+
AYUSH assessment
        ↓
workflow/domain context
        ↓
relevant gaps
        ↓
candidate dimensions
        ↓
information gain
        ↓
duplicate/resolved filtering
        ↓
safety
        ↓
ASK / STOP / ESCALATE
```

In `DUAL_SYSTEM`, modern and AYUSH dimensions may exist in the same candidate pool.

---

# 24. RedFlagModel

Safety signals are explicit records.

```text
RedFlagModel
------------
id
intake_session_id
rule_id
title
reason
severity
status
evidence_json?
created_at
updated_at
```

The exact fields follow the existing implementation.

Red flags are:

```text
alerts
priority-review signals
```

not diagnoses.

---

# 25. ContradictionModel

Contradictions preserve both conflicting values.

```text
ContradictionModel
------------------
id
intake_session_id
field_name
value_a_json
value_b_json
source_a?
source_b?
status
reason?
created_at
updated_at
```

Example:

```text
Patient:
stopped medication

Document:
medication listed

→ INFORMATION_CONFLICT
```

The physician resolves the conflict.

---

# 26. DocumentModel

Documents are associated with both patient and intake context where available.

```text
DocumentModel
------------
id
patient_id
intake_session_id?
file_name
storage_object_id
mime_type
file_size?
sha256
document_type?
status
created_at
updated_at
```

Current document status may include:

```text
PENDING
PROCESSING
COMPLETED
FAILED
NEEDS_REVIEW
```

The exact deployed values must remain compatible with code.

---

# 27. Document OCR Run

```text
DocumentOCRRunModel
-------------------
id
document_id
provider_name
model_name?
status
aggregate_confidence?
pages_processed?
raw_text?
created_at
completed_at?
```

This records a single OCR processing execution.

---

# 28. Document OCR Evidence

```text
DocumentOCREvidenceModel
------------------------
id
ocr_run_id
document_id
block_index
page_number?
text
confidence?
bounding_box_json?
created_at
```

OCR evidence is the source material against which extracted candidates are verified.

---

# 29. Document Candidate Set

```text
DocumentCandidateSetModel
-------------------------
id
document_id
ocr_run_id
provider_name
model_name
created_at
```

A candidate set represents one extraction run over one OCR result.

---

# 30. Document Candidate

```text
DocumentCandidateModel
----------------------
id
candidate_set_id
candidate_type
value_json
extraction_confidence
status
created_at
updated_at
```

Candidate types may include:

```text
MEDICATION
LAB
CLINICAL_HISTORY
OTHER
```

Only types actually supported by the extractor should be exposed.

---

# 31. Document Candidate Evidence Link

```text
DocumentCandidateEvidenceLinkModel
-----------------------------------
candidate_id
evidence_id
```

Relationship:

```text
Candidate M ─── N OCR Evidence
```

This supports the existing evidence-grounding requirement.

An extracted candidate must not be treated as trusted merely because an LLM produced it.

---

# 32. DocumentExtractionModel

The existing backward-compatible extraction representation may remain:

```text
DocumentExtractionModel
-----------------------
id
document_id
field_type
field_name
value_json
confidence
ocr_confidence
created_at
updated_at
```

Do not create redundant extraction tables unless the current code requires them.

---

# 33. PhysicianReviewModel

```text
PhysicianReviewModel
--------------------
id
intake_session_id
doctor_id
status
notes?
confirmed_at?
created_at
updated_at
```

Suggested logical status:

```text
PENDING
CONFIRMED
```

The exact deployed state must follow existing code.

Physician confirmation is the authoritative handoff event.

---

# 34. PhysicianEditModel

Important doctor changes remain auditable.

```text
PhysicianEditModel
------------------
id
physician_review_id
field_name
old_value_json
new_value_json
reason?
created_at
```

For AYUSH this can record:

```text
AI inferred → physician corrected
```

or:

```text
preliminary → physician confirmed
```

---

# 35. AuditEventModel

```text
AuditEventModel
---------------
id
actor_user_id
actor_role
event_type
resource_type
resource_id
metadata_json
created_at
```

Audit events should capture meaningful administrative and physician actions.

Do not place secrets or unnecessary full medical content in audit metadata.

---

# 36. KnowledgeDocument

The RAG knowledge base is separate from patient records.

```text
KnowledgeDocument
-----------------
id
title
source
source_type
version
language?
workflow?
status
created_at
updated_at
```

AYUSH reference material may be represented with:

```text
workflow = AYUSH
```

or another explicit system/workflow identifier.

---

# 37. KnowledgeChunk

```text
KnowledgeChunk
--------------
id
document_id
chunk_index
content
topic?
embedding
created_at
```

Current implementation stores embeddings as relational data rather than using a native vector column.

Target optimization may use:

```text
PostgreSQL pgvector
+
native vector similarity
+
HNSW/appropriate index
```

Do not introduce a separate vector database solely for this optimization.

---

# 38. Timeline / Event Representation

Where a timeline model exists, events should point back to their source records.

Conceptually:

```text
TimelineEvent
-------------
id
intake_session_id
event_type
event_time
source_type
source_id
metadata_json
```

Possible sources:

```text
ANSWER
DOCUMENT
REDFLAG
PHYSICIAN_REVIEW
PHYSICIAN_EDIT
```

Do not duplicate complete source objects inside the timeline.

---

# 39. Relationships

Core relationships:

```text
Hospital 1 ─── N Department
Hospital 1 ─── N Doctor
Department 1 ─ N Doctor
User 1 ─────── 1 Doctor
User 1 ─────── 0..1 Patient

Patient 1 ──── N IntakeSession
Doctor 1 ───── N IntakeSession

IntakeSession 1 ─── N QuestionEvent
QuestionEvent 1 ─── 0..1 Answer
IntakeSession 1 ─── N ClinicalStateModel
IntakeSession 1 ─── 0..1 AyushAssessmentModel
IntakeSession 1 ─── N RedFlagModel
IntakeSession 1 ─── N ContradictionModel
IntakeSession 1 ─── 0..1 PhysicianReviewModel

Patient 1 ──── N DocumentModel
Document 1 ─── N DocumentOCRRunModel
DocumentOCRRun 1 ─── N DocumentOCREvidenceModel
Document 1 ─── N DocumentCandidateSetModel
CandidateSet 1 ─── N DocumentCandidateModel
Candidate M ─── N OCRevidence

KnowledgeDocument 1 ─── N KnowledgeChunk
```

---

# 40. Persistence Invariants

The following must remain true:

```text
1. Patient → IntakeSession is explicit.
2. IntakeSession → doctor/hospital assignment is server-validated.
3. Every answer is traceable to an intake session.
4. Every answer is traceable to its QuestionEvent.
5. ClinicalState is structured.
6. State versions are ordered and retrievable.
7. Canonical dimensions prevent semantic alias fragmentation.
8. Important facts retain provenance where practical.
9. Red flags are explicit records.
10. Contradictions preserve both conflicting sources.
11. Documents remain linked to their patient/session context.
12. OCR candidates remain traceable to OCR evidence.
13. Physician confirmation is explicit.
14. Physician changes are auditable.
15. AI output is never automatically equivalent to physician confirmation.
16. Schema changes use migrations.
17. Authorization is not derived from client-side identifiers.
18. Demo records are synthetic.
```

---

# 41. Transaction Boundaries

Answer processing should keep the following state changes consistent where practical:

```text
Answer
QuestionEvent relationship
ClinicalState version
AYUSH assessment update
RedFlag / Contradiction state
next QuestionEvent
```

Document processing should preserve:

```text
Document
OCR run
OCR evidence
candidate set
candidates
evidence links
```

Physician confirmation should preserve:

```text
PhysicianReview
PhysicianEdit
AuditEvent
```

Failure must never falsely mark a critical operation as complete.

---

# 42. Backward Compatibility

The existing prototype uses:

```text
ClinicalState.ayush
```

for adaptive AYUSH data.

The richer target:

```text
AyushAssessmentModel
```

should be introduced additively.

Migration strategy:

```text
Existing ClinicalState.ayush
        ↓
compatibility layer
        ↓
AyushAssessmentModel
```

Do not delete current fields until all consumers and migrations have been verified.

---

# 43. Demo Seed Data

Use synthetic seed data only.

A controlled seed set may include:

```text
1–2 hospitals
3–5 doctors
multiple synthetic patients
clinical intake cases
document/OCR cases
red-flag case
contradiction case
AYUSH case
```

Seed reset must remain safe.

Do not hard-code production patient data into frontend components.

---

# 44. Schema Migration Rules

When modifying the schema:

1. Inspect the actual current ORM models and migrations.
2. Do not edit already-applied shared migrations casually.
3. Create a new additive migration.
4. Update Pydantic schemas.
5. Update ORM models.
6. Update affected API responses.
7. Update repositories/services if present.
8. Update tests.
9. Update seed fixtures.
10. Verify foreign keys and authorization impact.
11. Verify backward compatibility with existing records.
12. Test migration up/down behavior when supported.

---

# 45. Schema Anti-Patterns

Do NOT:

- store the entire application state as one unstructured blob;
- store raw LLM output as trusted clinical truth;
- store large medical documents directly in PostgreSQL without justification;
- duplicate the same patient data across queue and summary tables;
- use client-provided IDs as authorization;
- create one table per symptom;
- create one independent data model for every question;
- create a separate disconnected AYUSH data architecture;
- silently replace patient facts with document/AI facts;
- delete audit history casually.

---

# 46. AYUSH-Specific Schema Invariants

The following must remain true:

```text
1. AYUSH is linked to the intake session.
2. Ayurveda-specific dimensions are scoped to Ayurveda.
3. Existing baseline AYUSH fields remain compatible.
4. Expanded Dashavidha dimensions may be unknown.
5. Unknown does not mean negative.
6. Ambiguous does not mean confirmed.
7. AI_INFERRED is not PHYSICIAN_CONFIRMED.
8. Evidence can point back to patient answers or documents.
9. Physician corrections are auditable.
10. AYUSH does not create autonomous diagnosis/treatment fields.
```

---

# 47. Doctor Data Contract

The doctor patient dossier should be able to retrieve:

```text
Patient
IntakeSession
Latest ClinicalState
Relevant AYUSH Assessment
RedFlags
Contradictions
Documents
OCR evidence/candidates
Conversation timeline
PhysicianReview
PhysicianEdits
```

The exact response can remain aggregated through the current doctor patient-detail API.

Avoid creating multiple competing sources of truth.

---

# 48. FHIR Data Boundary

FHIR mapping should consume validated/confirmed data.

```text
ClinicalState
+
physician-confirmed information
        ↓
FHIR mapper
        ↓
FHIR R4 Bundle
```

The database schema should preserve enough source information for safe mapping.

Do not treat raw transcript or unvalidated LLM output as final FHIR truth.

---

# 49. Current vs Target Schema Status

## Current / verified

```text
Users
Patients
Hospitals
Departments
Doctors
IntakeSessions
QuestionEvents
Answers
ClinicalStateModel
RedFlags
Contradictions
PhysicianReview
PhysicianEdit
AuditEvent
Documents
OCR runs/evidence
Document candidates/evidence links
KnowledgeDocuments
KnowledgeChunks
```

## Target refinements

```text
richer AyushAssessmentModel
stronger AYUSH evidence links
expanded Dashavidha fields
native PostgreSQL vector storage
cloud/private object storage
```

The target refinements must not break existing consumers.

---

# 50. Final Schema Principle

> **The database is the structured evidence and workflow record of SwasthyaVaani—not a storage dump for model output.**

The schema must preserve:

```text
who said it
what was inferred
where evidence came from
what remains uncertain
what the physician changed
what the physician confirmed
```

This is the foundation for safe adaptive intake, AYUSH assessment, document intelligence, doctor review, auditability, and future interoperability.
