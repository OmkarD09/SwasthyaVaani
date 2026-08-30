# SwasthyaVaani — Implementation Plan

> **Audience:** AI coding agents and developers.
>
> **Purpose:** Convert `PRD.md`, `TRD.md`, `architecture.md`, `backend_schema.md`, `rules.md`, and `appflow.md` into an executable development sequence.
>
> **Important:** This is one continuous 10-day implementation plan. The dates **3 September 2026** and **8 September 2026** are evaluation checkpoints, not separate product versions.

---

# 1. Implementation Strategy

Build in **vertical slices**, not isolated layers.

The preferred development pattern is:

```text
Database / API contract
        ↓
Backend domain logic
        ↓
Frontend flow
        ↓
Real provider or mock provider
        ↓
Integration test
        ↓
Demo scenario
```

Do not spend several days building backend infrastructure before connecting it to a real user flow.

The primary end-to-end path is:

```text
Patient
 ↓
Hospital
 ↓
Doctor
 ↓
Language
 ↓
Interaction Mode
 ↓
Consent
 ↓
Chief Complaint
 ↓
Adaptive Interview
 ↓
Core AYUSH when relevant
 ↓
Basic Documents
 ↓
Patient Review
 ↓
Submit
 ↓
Doctor Queue
 ↓
Structured Summary
 ↓
Alerts / Evidence
 ↓
Doctor Edit
 ↓
Doctor Confirm
 ↓
FHIR-compatible output
```

---

# 2. Definition of Implementation Success

By the end of the implementation period, the application should be able to demonstrate:

1. Patient onboarding.
2. Hospital and doctor selection.
3. Language selection.
4. Voice/text/touch interaction.
5. Consent.
6. Dynamic one-question-at-a-time clinical intake.
7. Minimum Sufficient History behavior.
8. Anti-loop and deterministic fallback behavior.
9. Core AYUSH questioning.
10. Basic medical-document OCR/extraction.
11. Red-flag detection.
12. Contradiction detection.
13. Source/provenance.
14. Patient review.
15. Doctor queue handoff.
16. Doctor review/edit/confirmation.
17. Timeline.
18. FHIR-compatible mapping.
19. Administrator controls.
20. Provider-failure fallback/demo mode.

---

# 3. Workstream Structure

Use six parallel ownership areas after the initial research/design day.

```text
1. Clinical AI
2. Speech + Document AI
3. Backend
4. Patient Frontend
5. Doctor + Admin Frontend
6. Integration / QA / DevOps
```

Ownership should be primary, not exclusive. Team members must help unblock other workstreams.

---

# 4. Day 1 — Product Freeze + Technical Foundation

## Objective

Remove ambiguity and make the repository ready for implementation.

## Product tasks

- Confirm final patient journey.
- Confirm doctor journey.
- Confirm admin journey.
- Confirm core AYUSH path.
- Confirm adaptive interview semantics.
- Confirm Minimum Sufficient History definition.
- Confirm safety and fallback rules.
- Confirm design tokens and UI direction.

## Clinical AI tasks

Define:

```text
ClinicalState
InformationGap
QuestionDecision
RedFlag
Contradiction
```

Define the first workflow configuration:

```text
GENERAL_CLINICAL
AYUSH
```

Create a small set of required fields for controlled test cases.

## Backend tasks

Initialize:

```text
FastAPI
PostgreSQL/Supabase
SQLAlchemy
Alembic
Pydantic
```

Create base models/migrations for:

```text
Hospital
Department
Doctor
Patient
Workflow
IntakeSession
QuestionEvent
Answer
ClinicalState
```

## Frontend tasks

Existing prototype first:

```text
inspect existing frontend
↓
reuse useful components
↓
apply design tokens
↓
connect route structure
```

Build route shells for patient/doctor/admin.

## DevOps/QA tasks

Set up:

- GitHub repository workflow;
- `.env.example`;
- local environment;
- Docker if used;
- lint;
- type checking;
- test runner;
- basic CI;
- seed/reset script.

## End-of-day gate

The repository starts cleanly and the core screens/routes exist.

---

# 5. Day 2 — Patient + Doctor Skeleton

## Objective

Create the first complete non-AI vertical slice.

## Patient

Implement:

```text
Start
→ Hospital
→ Doctor
→ Language
→ Mode
→ Consent
→ Chief Complaint
```

## Doctor

Implement:

```text
Login
→ Dashboard
→ Queue
→ Patient shell
```

## Backend

Implement:

```http
GET /api/hospitals
GET /api/hospitals/:id/doctors

POST /api/intakes
GET /api/intakes/:id
```

Implement session persistence.

## Authentication

Implement:

- patient session;
- doctor authentication;
- admin authentication;
- server-side RBAC.

## Acceptance

A patient can create an intake session with:

```text
patient_id
hospital_id
doctor_id
language
interaction_mode
workflow_id
```

The session is stored in PostgreSQL.

---

# 6. Day 3 — Adaptive Clinical Engine

## Objective

Make the core USP functional.

## Clinical state

Implement:

```text
answer
→ extraction
→ validation
→ ClinicalState merge
```

## Question engine

Implement:

```text
ClinicalState
 ↓
relevant gaps
 ↓
candidate questions
 ↓
duplicate filter
 ↓
question ranking
 ↓
ASK / STOP / ESCALATE
```

## Required protections

Implement:

```text
semantic duplicate detection
resolved-field protection
low-progress detection
MAX_QUESTIONS
patient cancellation
model failure fallback
```

Initial configuration:

```text
MAX_QUESTIONS = 15
MAX_CONSECUTIVE_LOW_PROGRESS = 2
```

## Frontend

Build the hero interaction:

```text
Current question
↓
Voice / text / touch
↓
Answer
↓
Next question
```

## Acceptance

At least three synthetic complaint paths must behave differently.

Example:

```text
Fever
Chest pain
Abdominal pain
```

The engine must not simply ask the same sequence for all cases.

---

# 7. Day 4 — Speech Integration + Core AYUSH

## Objective

Turn the intake into a real multilingual/voice interaction.

## Speech

Implement:

```text
SpeechService
 ├── BhashiniProvider
 ├── SarvamProvider
 ├── WhisperProvider
 └── MockProvider
```

Since Sarvam has already been tested successfully, use it as a practical development/fallback provider when appropriate.

## Frontend states

Implement:

```text
IDLE
LISTENING
TRANSCRIBING
SUCCESS
ERROR
FALLBACK
```

## TTS

Connect:

```text
Question text
→ TTS
→ patient audio
```

## AYUSH

Add core AYUSH question targets into the same adaptive engine.

Example concept:

```text
workflow = AYUSH
→ AYUSH required fields
→ adaptive question selection
```

Do not build deep visualization yet.

## Acceptance

A demo patient can:

```text
choose Hindi
→ choose voice
→ speak complaint
→ receive transcript
→ hear next question
→ answer adaptive questions
```

A relevant AYUSH workflow can capture core AYUSH fields.

---

# 8. Day 5 — Basic Documents + Safety + First Full Checkpoint

## Objective

Add multimodal clinical depth and make the complete flow demonstrable.

## Documents

Implement:

```text
Upload
→ Storage
→ OCR
→ extraction
→ validation
→ provenance
```

Initial scope:

- prescription;
- lab report;
- one controlled discharge/medical document case.

## OCR

Use:

```text
PaddleOCR
```

with mock fallback.

## Extraction

Start with:

```text
Medication
Date
Lab value
```

Do not attempt universal handwriting recognition.

## Safety

Implement deterministic red-flag rules.

Example:

```text
chest pain
+
breathlessness
+
arm radiation
→ PRIORITY_REVIEW
```

## Contradictions

Implement basic source comparison.

Example:

```text
Patient:
stopped medication

Document:
medication listed
→ INFORMATION_CONFLICT
```

## Provenance

Connect:

```text
fact
→ source
→ page/region where available
→ confidence
```

## Evaluation checkpoint

At the **3 September 2026** checkpoint, the preferred demo should already show:

```text
Patient onboarding
→ adaptive interview
→ core AYUSH where relevant
→ basic document
→ patient review
→ doctor queue
→ doctor summary
→ visible safety/evidence
```

Do not treat this as a separate product version.

---

# 9. Day 6 — Hardening Based on Evidence

## Objective

Fix what failed during the first evaluation.

Immediately after the checkpoint:

```text
collect judge/team observations
↓
rank by impact
↓
fix blockers first
```

Priority:

```text
P0 functional bugs
→ safety bugs
→ data correctness
→ UX confusion
→ latency
→ cosmetic polish
```

## Clinical AI

Improve:

- question relevance;
- early stopping;
- duplicate prevention;
- fallback reliability;
- summary correctness.

## Backend

Improve:

- transactions;
- error handling;
- retries;
- logging;
- validation;
- authorization.

## Frontend

Improve:

- unclear interactions;
- accessibility;
- loading states;
- doctor information hierarchy.

## Acceptance

Everything demonstrated on the previous checkpoint must continue to work.

---

# 10. Day 7 — Timeline + Provenance + Deep Doctor Workflow

## Objective

Make the doctor experience genuinely useful.

## Timeline

Implement:

```text
patient history
+
documents
+
current intake
+
confirmed events
→ chronological timeline
```

## Doctor evidence

Click:

```text
Medication
→ source document

Duration
→ patient response
```

## Doctor view

Refine:

```text
Patient Header
Chief Complaint
Structured History
Alerts
Timeline
Documents
Evidence
Review
```

## Physician edits

Implement:

```text
AI_DRAFT
→ EDIT
→ save
→ audit
→ confirm
```

## Acceptance

A doctor can understand the patient's case quickly without reading the entire transcript.

---

# 11. Day 8 — FHIR + ABDM/HIS Boundary + Admin

## Objective

Make the system integration-ready and complete the third role.

## FHIR

Implement:

```text
PHYSICIAN_CONFIRMED
→ FHIR mapper
→ validation
→ FHIR payload
```

Potential resources:

```text
Patient
Encounter
Observation
Condition
MedicationStatement
Composition
```

## ABDM/HIS

Implement adapter boundary:

```text
IntegrationService
 ├── FHIR
 ├── ABDM
 └── HIS
```

If live credentials/integration are unavailable:

```text
clearly labelled mock/sandbox adapter
```

## Admin

Implement:

```text
Hospitals
Doctors
Departments
Workflows
Languages/Providers
Service Status
Audit
```

## Acceptance

Admin can manage platform entities, and a confirmed patient record can be mapped into a validated FHIR-compatible representation.

---

# 12. Day 9 — Full Integration + Reliability

## Objective

Make the whole platform behave like one product.

## Full-flow test

```text
Patient
→ hospital
→ doctor
→ language
→ voice
→ consent
→ complaint
→ adaptive interview
→ AYUSH
→ document
→ review
→ submit
→ doctor queue
→ summary
→ red flag
→ contradiction
→ evidence
→ physician confirmation
→ FHIR
```

## Reliability tests

Simulate:

- BHASHINI failure;
- Sarvam failure;
- LLM timeout;
- OCR failure;
- WebSocket failure;
- database error;
- upload error;
- unauthorized patient access;
- unauthorized doctor access.

## Performance

Measure:

```text
API latency
LLM latency
speech latency
OCR latency
queue update time
```

Optimize only measured bottlenecks.

---

# 13. Day 10 — Final Validation + Presentation Checkpoint

## Objective

Freeze the strongest stable build.

Do NOT start a new major feature.

## Final validation

Run:

```text
lint
typecheck
unit tests
integration tests
E2E tests
security checks
```

## Demo rehearsal

Run the full demo repeatedly from a clean environment.

Recommended sequence:

```text
1. Patient starts
2. Hospital selected
3. Doctor selected
4. Hindi selected
5. Voice selected
6. Consent
7. Patient speaks complaint
8. AI asks adaptive questions
9. AYUSH path demonstrated when applicable
10. Document processed
11. Patient confirms
12. Doctor receives case
13. Doctor sees summary
14. Red flag/contradiction visible
15. Source evidence opened
16. Doctor edits
17. Doctor confirms
18. FHIR representation shown
```

## Second evaluation checkpoint

**8 September 2026** is the second evaluation checkpoint for the same product.

Do not create a separate code branch/product concept just for the checkpoint.

---

# 14. Frontend Implementation Order

The frontend team should implement in this order:

```text
1. App shell
2. Patient onboarding
3. Patient intake UI
4. Adaptive question UI
5. Voice states
6. Patient review
7. Doctor queue
8. Doctor summary
9. Alerts
10. Documents
11. Timeline
12. Evidence viewer
13. Physician review
14. Admin
15. FHIR/integration views
16. Accessibility/polish
```

---

# 15. Backend Implementation Order

```text
1. Database/migrations
2. Auth/RBAC
3. Hospital/doctor/patient APIs
4. IntakeSession
5. ClinicalState
6. Answer/question APIs
7. Adaptive engine
8. Termination/fallback
9. Speech service
10. Document service
11. Safety engine
12. Contradiction engine
13. Timeline/provenance
14. Physician review
15. FHIR mapper
16. Admin
17. Integration adapters
```

---

# 16. AI/ML Implementation Order

```text
1. Structured extraction
2. ClinicalState update
3. Information-gap detection
4. Candidate question generation
5. Question validation
6. Duplicate detection
7. Ranking
8. Stop decision
9. Fallback engine
10. Summary generation
11. Document extraction
12. Confidence/provenance
```

Keep deterministic rules outside the LLM.

---

# 17. Definition of Done Per Feature

A feature is complete only when:

```text
Implementation
+
Types/schema
+
API integration
+
UI state
+
Error handling
+
Authorization
+
Relevant tests
+
Demo path
```

A static UI mockup is not considered implemented.

A backend endpoint without frontend integration is not considered complete if the feature is user-facing.

---

# 18. Branch / Git Strategy

Recommended:

```text
main
 ├── feature/patient-intake
 ├── feature/adaptive-engine
 ├── feature/speech
 ├── feature/documents
 ├── feature/doctor-dashboard
 ├── feature/safety
 ├── feature/fhir
 └── feature/admin
```

Use pull requests for meaningful changes.

Do not allow different team members to casually overwrite the same core files.

---

# 19. Daily Integration Rules

Every day:

### Start

```text
10-minute blocker sync
```

### Midday

```text
integration checkpoint
```

### End

```text
clean demo run
```

Each owner reports:

```text
DONE
BLOCKED
NEXT
RISK
```

---

# 20. Priority Rules During a Crunch

When time runs short:

```text
1. Fix broken P0
2. Fix safety/data correctness
3. Complete end-to-end path
4. Fix UX confusion
5. Add high-value P1
6. Add integration depth
7. Cosmetic polish
```

Never sacrifice core correctness just to add another feature.

---

# 21. Emergency Scope Reduction

If implementation falls behind:

## Keep

```text
Patient
→ Adaptive Intake
→ Core AYUSH
→ Basic OCR
→ Summary
→ Doctor
→ Red Flag
→ Physician Review
```

## Defer first

```text
advanced analytics
deep admin features
extra languages
advanced AYUSH visualizations
live ABDM
advanced FHIR workflows
nonessential charts
```

Do not remove the adaptive interview or physician verification.

---

# 22. Final Technical Flow

```text
                    PATIENT
                       |
                 Next.js UI
                       |
                     FastAPI
                       |
          +------------+-------------+
          |            |             |
       Speech       Clinical       Docs
       Service         AI           AI
          |            |             |
 Bhashini/Sarvam    LLM +        PaddleOCR
 Whisper             Rules           |
          |            |             |
          +------------+-------------+
                       |
                ClinicalState
                       |
          +------------+-------------+
          |            |             |
       Safety     Provenance      Timeline
          |            |             |
          +------------+-------------+
                       |
                 Patient Review
                       |
                    Submit
                       |
                  Doctor Queue
                       |
                 Doctor Review
                       |
               Physician Confirm
                       |
                    FHIR R4
                       |
                 ABDM / HIS
```

---

# 23. Final Agent Rule

Before implementing any feature, answer:

```text
1. Which PRD requirement does this satisfy?
2. Which app-flow state does it belong to?
3. Which backend schema is affected?
4. Which API contract is needed?
5. Which UI state is needed?
6. Which failure/fallback path exists?
7. How will it be tested?
8. How will it be demonstrated?
```

If those questions cannot be answered, do not immediately add the feature.

> **Build one coherent SwasthyaVaani. Do not build disconnected demos.**
