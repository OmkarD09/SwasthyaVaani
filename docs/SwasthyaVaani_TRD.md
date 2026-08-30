# SwasthyaVaani — Technical Requirements Document (TRD)

> Audience: AI coding agents and the development team.  
> Relationship: `PRD.md` defines WHAT to build. This document defines HOW to build it.  
> Treat this file as the technical source of truth unless an explicit project decision changes it.

## 1. Technical Objective

Build SwasthyaVaani as a secure, modular, testable web platform with three role-based experiences:

```text
Patient Kiosk / Tablet
        ↓
Doctor Workstation
        ↓
Administrator Console
        ↓
Shared Backend + AI + Data + Integration
```

The system must support:

- adaptive clinical intake;
- one-question-at-a-time interaction;
- multilingual voice/text/touch;
- structured clinical state;
- core AYUSH questioning when relevant;
- document OCR and extraction;
- provenance and confidence;
- red-flag detection;
- contradiction detection;
- physician review and confirmation;
- FHIR-compatible output;
- future ABDM/HIS integration;
- replaceable AI/speech/OCR providers;
- deterministic fallback behavior.

Prefer a **modular monolith** for the prototype. Do not create microservices unless a concrete requirement justifies them.

---

## 2. Architecture Principles

### 2.1 Layering

```text
UI
 ↓
API / Application
 ↓
Domain / Clinical Logic
 ↓
Provider Adapters
 ↓
Persistence / External Integrations
```

Clinical logic must not live directly inside UI components.

### 2.2 Provider abstraction

```text
LLMService
 ├── PrimaryLLMProvider
 ├── SecondaryLLMProvider
 └── MockLLMProvider

SpeechService
 ├── BhashiniProvider
 ├── SarvamProvider
 ├── WhisperProvider
 └── MockSpeechProvider

OCRService
 ├── PaddleOCRProvider
 └── MockOCRProvider
```

### 2.3 Deterministic control around AI

LLM may:

- interpret patient language;
- extract candidate facts;
- propose a next question;
- draft a summary.

Backend/application controls:

- authorization;
- schema validation;
- required-field logic;
- question repetition;
- termination;
- red-flag rules;
- contradiction state;
- persistence;
- physician confirmation.

### 2.4 Fail safely

External provider failure must not destroy the core application.

```text
Provider failure
   ↓
Retry
   ↓
Alternate provider / deterministic fallback
   ↓
Limited history if safe continuation is impossible
```

---

## 3. Recommended Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Recharts only where useful
- TanStack Query where useful

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

### Data

- PostgreSQL
- Supabase-hosted PostgreSQL

### File storage

- Supabase Storage

### AI

- LLM API with structured output
- provider abstraction

### Speech

- BHASHINI
- Sarvam fallback
- Whisper fallback where useful

### OCR

- PaddleOCR

### Interoperability

- FHIR R4
- `fhir.resources`

### Authentication

- Supabase Auth or JWT
- server-side RBAC

### Realtime

- FastAPI WebSockets when useful
- polling fallback

### Optional

- Redis for temporary session state, cache, rate limiting, or short-lived jobs

### Deployment

- Vercel
- Render
- Supabase

### Development

- Docker
- Git
- GitHub

---

## 4. Repository Structure

Preferred structure:

```text
/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── patient/
│   │   ├── doctor/
│   │   ├── admin/
│   │   ├── intake/
│   │   ├── documents/
│   │   └── shared/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── tests/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── rules/
│   │   ├── config/
│   │   ├── services/
│   │   │   ├── clinical_ai/
│   │   │   ├── speech/
│   │   │   ├── documents/
│   │   │   ├── safety/
│   │   │   ├── fhir/
│   │   │   ├── auth/
│   │   │   └── integrations/
│   │   └── tests/
│   └── migrations/
│
├── shared/
│   ├── schemas/
│   └── fixtures/
│
├── docs/
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 5. Frontend Application Areas

### Patient

```text
/patient/start
/patient/hospital
/patient/doctor
/patient/language
/patient/mode
/patient/consent
/patient/intake
/patient/documents
/patient/review
/patient/complete
```

### Doctor

```text
/doctor/login
/doctor/dashboard
/doctor/patients
/doctor/patients/:patientId
/doctor/patients/:patientId/timeline
/doctor/patients/:patientId/documents
/doctor/patients/:patientId/review
```

### Admin

```text
/admin/login
/admin/dashboard
/admin/hospitals
/admin/doctors
/admin/workflows
/admin/services
/admin/audit
```

Route names can change for framework conventions, but role separation must remain.

---

## 6. Patient State Machine

Use explicit state rather than route-based inference.

```ts
type IntakeStatus =
  | "NOT_STARTED"
  | "HOSPITAL_SELECTED"
  | "DOCTOR_SELECTED"
  | "LANGUAGE_SELECTED"
  | "CONSENT_PENDING"
  | "ASKING"
  | "LISTENING"
  | "TRANSCRIBING"
  | "PROCESSING"
  | "NEEDS_REVIEW"
  | "READY_TO_SUBMIT"
  | "SUBMITTED"
  | "LIMITED_HISTORY"
  | "PATIENT_ABORTED"
  | "ERROR"
  | "FALLBACK";
```

Frontend and backend should share equivalent status definitions.

---

## 7. Core Clinical State

Do not use raw transcript as the primary application state.

```ts
type ClinicalState = {
  chiefComplaint: string | null;
  symptoms: string[];
  onset: string | null;
  duration: string | null;
  severity: number | null;
  location: string | null;
  associatedSymptoms: string[];
  aggravatingFactors: string[];
  relievingFactors: string[];
  pastHistory: string[];
  familyHistory: string[];
  medications: Medication[];
  allergies: string[];
  investigations: Investigation[];
  ayush: AyushState | null;
  documents: DocumentReference[];
  redFlags: RedFlag[];
  contradictions: Contradiction[];
  uncertainties: Uncertainty[];
  missingInformation: InformationGap[];
};
```

The schema must be extended only when validated requirements demand it.

---

## 8. Adaptive Interview Engine

### Required pipeline

```text
Patient answer
      ↓
Normalize speech/text
      ↓
Extract candidate information
      ↓
Validate candidate information
      ↓
Merge into ClinicalState
      ↓
Evaluate safety rules
      ↓
Determine information gaps
      ↓
Generate candidate questions
      ↓
Validate candidates
      ↓
Deduplicate candidates
      ↓
Rank by usefulness
      ↓
ASK / STOP / ESCALATE
```

The engine returns exactly one decision.

### Contract

```ts
type QuestionDecision = {
  action: "ASK" | "STOP" | "ESCALATE";
  question?: string;
  targetField?: string;
  reason?: string;
  confidence?: number;
};
```

---

## 9. Minimum Sufficient History

The interview must be dynamic.

Do not implement a universal fixed question count such as six.

Normal stopping is based on:

- relevant required fields being sufficiently covered;
- low expected information gain;
- no meaningful unresolved information;
- no useful alternative question remaining.

Different cases may require different numbers of questions.

---

## 10. Anti-Infinite-Loop Guardrails

The LLM must never control termination by itself.

### Guardrail A — completeness

```text
relevant required information complete
→ STOP
```

### Guardrail B — low information gain

```text
expected value of another question too low
→ STOP
```

### Guardrail C — semantic duplicate

```text
candidate duplicates previous question
→ reject
→ regenerate
```

### Guardrail D — low progress

Recommended initial configuration:

```text
MAX_CONSECUTIVE_LOW_PROGRESS = 2
```

If reached:

```text
STOP
```

### Guardrail E — hard emergency limit

Recommended initial prototype configuration:

```text
MAX_QUESTIONS = 15
```

Make configurable.

If reached before adequate completeness:

```text
status = LIMITED_HISTORY
```

Never mark the history fully complete solely because the limit was reached.

### Guardrail F — model/service failure

```text
retry once
→ deterministic required-field fallback
→ limited history if safe continuation is impossible
```

### Guardrail G — patient cancellation

```text
status = PATIENT_ABORTED
```

---

## 11. Deterministic Question Fallback

The fallback must exist in code.

```text
If adaptive gap analysis is not converging:

1. Load required fields for the active workflow.
2. Identify unresolved fields.
3. Select a validated question mapped to an unresolved field.
4. Prevent duplication.
5. Repeat until required fields are sufficiently covered.
6. Stop at MAX_QUESTIONS.
7. Mark LIMITED_HISTORY if incomplete.
```

This is the emergency implementation path if the LLM-based gap analysis is unreliable near a checkpoint.

---

## 12. Question Deduplication

Do not rely only on exact string comparison.

Pipeline:

```text
Candidate question
      ↓
Normalize
      ↓
Semantic similarity to previous questions
      ↓
Duplicate?
   YES → reject
   NO  → continue
```

Store question metadata:

```ts
type AskedQuestion = {
  id: string;
  text: string;
  targetField: string;
  askedAt: string;
};
```

---

## 13. Information Progress

After every answer compare:

```text
state_before
state_after
```

Track:

- newly resolved required fields;
- newly captured facts;
- changed confidence;
- newly created contradictions;
- newly created alerts.

This can drive the low-progress guard.

---

## 14. Patient Interaction

The patient interface must support:

- voice;
- text;
- touch/options.

Voice flow:

```text
Microphone
 ↓
recording
 ↓
transcription
 ↓
normalized text
 ↓
clinical engine
```

TTS flow:

```text
Next question
 ↓
speech provider
 ↓
audio
 ↓
patient
```

Speech provider must be replaceable.

---

## 15. Patient Identity / ABHA

Provide an ABHA/health-ID integration point where the actual integration supports it.

Possible UI:

```text
ABHA / Health ID

[ Enter ID ]

or

[ Scan QR ]
```

Do not add Aadhaar collection unless a verified requirement and lawful workflow require it.

ABHA must not become a hard dependency for local/demo mode.

---

## 16. Patient Review

Before final submission:

```text
ClinicalState
   ↓
Validated summary
   ↓
Patient review
   ↓
Edit / Confirm
```

The patient-confirmed record becomes the input to the doctor handoff.

---

## 17. Doctor Handoff

Submission:

```text
POST /api/intakes/:id/submit
       ↓
database transaction
       ↓
queue event
       ↓
doctor queue
```

Possible real-time mechanism:

```text
FastAPI WebSocket
```

Fallback:

```text
polling
```

Do not claim successful handoff until persistence succeeds.

---

## 18. Doctor Dashboard

Doctor UI should support:

- patient queue;
- history-ready state;
- priority review;
- structured summary;
- patient evidence;
- documents;
- timeline;
- alerts;
- edit;
- confirm.

Status:

```text
AI_DRAFT
    ↓
NEEDS_VERIFICATION
    ↓
PHYSICIAN_CONFIRMED
```

---

## 19. Source / Provenance

Use a shared provenance schema.

```ts
type Provenance = {
  sourceType:
    | "PATIENT_ANSWER"
    | "DOCUMENT"
    | "AI_DERIVED"
    | "PHYSICIAN";
  sourceId: string;
  page?: number;
  region?: SourceRegion;
  confidence?: number;
};
```

Important clinical facts should have provenance where practical.

---

## 20. Document Processing

Pipeline:

```text
Upload
 ↓
Storage
 ↓
OCR
 ↓
Layout understanding
 ↓
Medical entity extraction
 ↓
Validation
 ↓
Confidence / provenance
 ↓
ClinicalState / Timeline
```

Initial extraction targets:

### Medication

- drug;
- dose;
- frequency;
- duration.

### Lab

- test;
- value;
- unit;
- reference range;
- date.

### Historical event

- diagnosis;
- procedure;
- hospitalization;
- visit date.

---

## 21. OCR Architecture

```text
DocumentService
      ↓
OCRService
      ↓
ExtractionService
      ↓
ValidationService
      ↓
DocumentFacts
```

Recommended OCR:

```text
PaddleOCR
```

Recommended extraction:

```text
LLM structured extraction
+
rules/validation
+
regex/spaCy as supporting tools
```

OCR output is never automatically trusted clinical truth.

---

## 22. Document Fact Model

Example:

```ts
type ExtractedMedication = {
  drugName: string | null;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  confidence: number;
  sourceDocumentId: string;
  sourceRegion?: SourceRegion;
  status: "EXTRACTED" | "NEEDS_REVIEW" | "CONFIRMED";
};
```

Equivalent structured types should exist for investigations and relevant historical facts.

---

## 23. Red-Flag Engine

Use deterministic/configurable rules for prototype safety.

Example:

```text
WHEN
  chest_pain = true
  AND breathlessness = true
  AND arm_radiation = true

THEN
  create PRIORITY_REVIEW
```

Example result:

```ts
type RedFlag = {
  ruleId: string;
  title: string;
  reason: string;
  severity: "PRIORITY";
  evidenceIds: string[];
  status: "OPEN" | "REVIEWED";
};
```

The rule engine detects a pattern requiring review. It does not diagnose.

---

## 24. Contradiction Engine

Example:

```text
Patient:
"I stopped Metformin."

Previous record:
Metformin 500 mg.
```

Create:

```ts
type Contradiction = {
  field: string;
  sourceA: Provenance;
  valueA: unknown;
  sourceB: Provenance;
  valueB: unknown;
  status:
    | "OPEN"
    | "REVIEWED"
    | "RESOLVED_BY_PHYSICIAN";
};
```

Never auto-resolve clinical contradictions.

---

## 25. Confidence / Uncertainty

Confidence is metadata, not proof.

Standard states:

```text
HIGH
MEDIUM
LOW
NEEDS_REVIEW
```

The UI should use consistent visual treatment for:

- speech uncertainty;
- OCR uncertainty;
- extracted-field uncertainty.

---

## 26. Summary Generation

Use validated structured state as input.

```text
ClinicalState
+
validated extracted facts
+
relevant alerts
+
provenance
      ↓
Summary LLM
      ↓
Structured Summary
      ↓
Schema validation
      ↓
Patient / Doctor UI
```

Summary generation must not introduce unsupported facts.

---

## 27. AYUSH Workflow

AYUSH is part of the same clinical record.

```text
Patient
   |
   +-- General Clinical History
   |
   +-- AYUSH Clinical History
```

When the relevant workflow is active, the adaptive engine can target core AYUSH fields required by PS 26047.

Potential areas:

- Prakriti;
- Vikriti;
- Agni;
- Koshtha;
- Ahara-Vihara;
- relevant validated case-taking/examination parameters.

Core AYUSH questioning MUST be available early in the implementation.

Do not create an unrelated AYUSH app.

Do not generate unsupported clinical conclusions from AYUSH fields.

---

## 28. Authentication and RBAC

Recommended:

```text
Supabase Auth
+
application RBAC
```

Roles:

```text
PATIENT
DOCTOR
ADMIN
```

Authorization MUST be enforced server-side.

Examples:

```text
PATIENT
→ own session / own information

DOCTOR
→ authorized patient records

ADMIN
→ configuration / operational resources
```

---

## 29. API Design

Use typed request/response schemas.

Core examples:

```http
POST /api/auth/login

GET  /api/hospitals
GET  /api/hospitals/:id/doctors

POST /api/intakes
GET  /api/intakes/:id
POST /api/intakes/:id/answers
POST /api/intakes/:id/next-question
POST /api/intakes/:id/review
POST /api/intakes/:id/submit

GET  /api/doctor/queue
GET  /api/doctor/patients/:id
PATCH /api/doctor/patients/:id/history
POST /api/doctor/patients/:id/confirm

POST /api/documents
POST /api/documents/:id/process
GET  /api/documents/:id

GET /api/admin/hospitals
GET /api/admin/doctors
GET /api/admin/audit
```

Exact route names may change, but authorization and responsibility boundaries must remain.

---

## 30. Error Contract

Use consistent backend error responses.

Example:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "requestId": "req_123"
  }
}
```

Do not expose stack traces to users.

---

## 31. File Storage

Use Supabase Storage for uploaded documents.

Requirements:

- validate file size;
- validate/inspect MIME type;
- normalize filenames;
- use non-guessable object IDs;
- protect document access server-side;
- do not expose unrestricted public document URLs.

---

## 32. Database Rules

Persist:

- structured patient/session data;
- clinical state;
- question/answer events;
- document metadata;
- extracted facts;
- physician review;
- audit events.

Do not store raw provider responses unless needed for debugging/testing.

---

## 33. Session and Privacy

Separate:

```text
temporary client state
active intake session
persistent clinical record
uploaded document
audit record
```

A frontend cleanup action such as:

```ts
sessionStorage.clear()
```

is only client-side cleanup.

It is NOT equivalent to DPDP compliance.

Backend/storage retention and deletion policies are separate requirements.

Optional UI demo:

```text
Submit
 ↓
10-second countdown
 ↓
clear temporary browser state
 ↓
"Temporary session data cleared"
```

Do not label the above as proof of legal compliance.

---

## 34. Real-Time Architecture

Preferred:

```text
Patient submit
   ↓
FastAPI transaction
   ↓
Queue event
   ↓
WebSocket
   ↓
Doctor dashboard
```

Fallback:

```text
Periodic polling
```

The queue must remain correct even if WebSocket is unavailable.

---

## 35. FHIR Architecture

Generate FHIR from physician-confirmed structured information.

```text
PHYSICIAN_CONFIRMED
        ↓
FHIR mapper
        ↓
FHIR R4 resources
        ↓
validation
        ↓
FHIR Bundle / payload
```

Potential resources:

- Patient;
- Encounter;
- Observation;
- Condition;
- MedicationStatement;
- Composition.

Do not generate FHIR directly from uncontrolled raw LLM output.

---

## 36. ABDM / HIS Boundary

Create an adapter:

```text
IntegrationService
 ├── FHIR export
 ├── ABDM adapter
 └── HIS adapter
```

The core application must not depend on implementation details of a specific external system.

If real credentials/API access are unavailable:

```text
sandbox/mock adapter
```

is allowed if explicitly labeled as mock/sandbox.

---

## 37. Admin Architecture

Admin configuration includes:

```text
Hospitals
Departments
Doctors
Workflows
Languages
AI/Speech/OCR services
Audit
```

Safety-critical rules must be versioned and tested.

Do not allow arbitrary unvalidated edits to clinical safety rules.

---

## 38. Mock / Demo Mode

A deterministic mock mode is required.

Demo cases:

### Case A
Chest pain + breathlessness + left-arm radiation → priority review.

### Case B
Fever → shorter adaptive path.

### Case C
AYUSH chronic joint-pain path.

### Case D
Document-heavy follow-up.

Mock mode should reproduce:

- patient flow;
- adaptive decisions;
- document extraction;
- alerts;
- doctor queue;
- physician confirmation.

External provider availability must not determine whether the system can be demonstrated.

---

## 39. Testing

### Unit tests

Required for:

- ClinicalState merge;
- missing-field detection;
- question deduplication;
- question ranking;
- sufficient-information stop;
- low-information-gain stop;
- low-progress stop;
- maximum-question stop;
- fallback logic;
- red-flag rules;
- contradiction rules;
- FHIR mapping.

### Integration tests

Required for:

```text
answer
→ state
→ next question
→ summary
→ doctor view
```

and:

```text
document
→ OCR
→ extraction
→ validation
→ doctor view
```

### End-to-end

At minimum:

1. fever;
2. priority chest-pain;
3. AYUSH;
4. document-heavy;
5. speech provider failure;
6. LLM provider failure;
7. OCR failure;
8. patient cancellation;
9. maximum-question fallback;
10. unauthorized record access.

---

## 40. Synthetic Data

Use fictional data only.

Create deterministic fixtures for:

```text
case-fever
case-chest-pain-priority
case-ayush-joint-pain
case-document-heavy
```

Each fixture should include:

- patient;
- hospital;
- doctor;
- answers;
- expected ClinicalState;
- expected next questions;
- expected termination;
- expected alerts;
- documents;
- expected extracted facts;
- expected doctor summary.

---

## 41. Performance Targets

These are engineering targets, not clinical claims.

Initial targets:

```text
Frontend initial load: reasonable on normal broadband
Backend non-AI API target: < 500 ms
Queue update: near real-time when WebSocket is used
Question generation: provide visible progress state
OCR: asynchronous/progress state when needed
```

Measure actual values before reporting them.

---

## 42. Security Requirements

MUST:

- keep API secrets server-side;
- validate all incoming payloads;
- enforce RBAC server-side;
- protect document routes;
- use secure transport;
- use environment variables for secrets;
- avoid sensitive data in URLs;
- avoid sensitive data in general logs;
- use synthetic demo data.

Never trust:

- client-side role;
- client-side patient ID;
- raw LLM output;
- raw OCR output;
- client-reported confidence.

---

## 43. Logging / Observability

Recommended events:

```text
AUTH_SUCCESS
AUTH_FAILURE
INTAKE_STARTED
QUESTION_ASKED
ANSWER_RECEIVED
STATE_UPDATED
QUESTION_REJECTED
INTERVIEW_STOPPED
DOCUMENT_UPLOADED
OCR_COMPLETED
EXTRACTION_COMPLETED
RED_FLAG_CREATED
CONTRADICTION_CREATED
PHYSICIAN_EDITED
PHYSICIAN_CONFIRMED
FHIR_GENERATED
PROVIDER_ERROR
```

Avoid logging unnecessary raw clinical text/audio.

Add request IDs for backend debugging.

---

## 44. Development Priority

This is **implementation order**, not separate product versions.

### P0 — Core clinical workflow

- patient onboarding;
- hospital;
- doctor;
- language;
- interaction mode;
- consent;
- chief complaint;
- adaptive interview;
- termination guardrails;
- core AYUSH question path;
- patient review;
- submit;
- doctor queue;
- structured summary;
- physician edit/confirm.

### P1 — Multimodal + safety depth

- basic OCR;
- medication/lab/date extraction;
- provenance;
- timeline;
- red flags;
- contradiction detection;
- uncertainty states.

### P2 — Platform depth

- richer AYUSH structure;
- FHIR;
- ABDM/HIS boundary;
- admin;
- audit depth;
- additional languages;
- advanced accessibility/analytics.

The complete scope remains one product.

---

## 45. Evaluation Checkpoints

The project has two evaluation dates:

- **3 September 2026**
- **8 September 2026**

These are checkpoints only.

The architecture and product scope remain continuous.

The first checkpoint should have the P0 vertical slice working reliably, while development continues on P1/P2.

---

## 46. AI Coding Agent Rules

Before coding:

1. Read `PRD.md`.
2. Read `TRD.md`.
3. Inspect the existing repository.
4. Identify existing services/components before creating new ones.
5. Determine the smallest implementation satisfying the requirement.

While coding:

1. Preserve working behavior.
2. Keep schemas/types explicit.
3. Keep providers abstract.
4. Keep clinical logic out of UI.
5. Add tests for domain logic.
6. Do not expose secrets.
7. Do not add unrequested features.
8. Do not invent medical/regulatory claims.

After coding:

1. Run lint.
2. Run type checks.
3. Run unit tests.
4. Run relevant integration tests.
5. Run the primary end-to-end flow.
6. Report changed files, tests, limitations, and remaining risks.

---

## 47. Technical Definition of Done

A feature is done only when:

- code is implemented;
- schema/types are defined;
- authorization is correct;
- error states exist;
- relevant tests pass;
- frontend states exist;
- API contract is clear;
- provider failure behavior is handled where relevant;
- no secrets are exposed;
- no unsupported medical/regulatory claims are introduced.

---

## 48. Final Technical Principle

> **Keep the AI probabilistic, but keep product control deterministic.**

The AI may interpret language and propose the next question.

The application decides:

- whether the output is valid;
- whether the question is allowed;
- whether it is repetitive;
- whether required information is complete;
- whether the interview must stop;
- whether a safety rule fires;
- whether information can be persisted;
- whether the physician has confirmed it.

This separation is the core technical architecture of SwasthyaVaani.
