# SwasthyaVaani — Product Requirements Document

> **Audience:** AI coding agents  
> **Purpose:** This file is the implementation source of truth for the SwasthyaVaani codebase.  
> **Rule:** Read this file before making architectural or feature changes. Do not invent product behavior when the PRD already defines it.

---

## 0. Project Identity

```yaml
project_name: SwasthyaVaani
problem_statement: "SIH 2026 PS 26047 — Patient Case-Taking Software"
product_type: "AI-assisted pre-consultation clinical intake platform"
roles:
  - patient
  - doctor
  - administrator
tagline: "Your story, structured before the consultation."
```

### Product definition

SwasthyaVaani collects a patient's story before the doctor consultation, asks dynamically selected questions, optionally processes previous medical records, structures the collected information, and transfers a physician-reviewable summary to the selected doctor.

### Core principle

```text
AI assists
    ↓
Doctor verifies
    ↓
Doctor decides
```

### Never position or implement as

- an autonomous AI doctor;
- an autonomous diagnosis engine;
- an autonomous treatment/prescription engine;
- a generic chatbot with no structured clinical state.

---

# 1. Product Goals

1. Collect patient history before consultation.
2. Support voice and touch/text interaction.
3. Support Indian-language interaction.
4. Ask adaptive questions rather than a rigid fixed questionnaire.
5. Minimize unnecessary questions through a Minimum Sufficient History approach.
6. Process relevant previous medical records.
7. Build a chronological patient history.
8. Surface configured red-flag combinations for physician review.
9. Generate a structured, editable, physician-reviewable summary.
10. Support an AYUSH-specific workflow.
11. Prepare structured information for FHIR/ABDM/HIS interoperability.

---

# 2. Non-Goals

SwasthyaVaani must NOT:

- autonomously diagnose a disease;
- prescribe treatment;
- replace the physician;
- make the final clinical decision;
- silently invent or complete uncertain clinical facts;
- claim perfect handwriting OCR;
- require every Indian language in the first implementation;
- require every disease/specialty in the first implementation;
- use real patient health data for development/demo;
- claim live ABDM/HIS integration unless a real integration is implemented and tested;
- claim legal/regulatory compliance solely from UI behavior.

---

# 3. User Roles

## 3.1 Patient

Patient capabilities:

- start an intake;
- select/confirm hospital;
- select doctor;
- select language;
- select interaction mode;
- provide consent;
- provide chief complaint;
- answer adaptive questions;
- answer core AYUSH questions when relevant;
- upload/capture medical documents;
- review captured information;
- correct information;
- submit the intake.

## 3.2 Doctor

Doctor capabilities:

- authenticate;
- view patient queue;
- identify priority-review cases;
- open patient record;
- view structured history;
- inspect patient-answer evidence;
- inspect documents;
- inspect timeline;
- review alerts;
- edit/correct/reject information;
- confirm the final summary.

## 3.3 Administrator

Administrator capabilities:

- manage hospitals;
- manage departments;
- manage doctors;
- manage workflow configuration;
- manage supported languages/services;
- inspect system/service status;
- inspect audit information.

---

# 4. Application Areas and Routes

## Patient

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

## Doctor

```text
/doctor/login
/doctor/dashboard
/doctor/patients
/doctor/patients/:patientId
/doctor/patients/:patientId/timeline
/doctor/patients/:patientId/documents
/doctor/patients/:patientId/review
```

## Admin

```text
/admin/login
/admin/dashboard
/admin/hospitals
/admin/doctors
/admin/workflows
/admin/services
/admin/audit
```

Route names may change if framework conventions require it, but functional separation must remain.

---

# 5. End-to-End Patient Flow

```text
Greeting
  ↓
Hospital Selection
  ↓
Doctor Selection
  ↓
Language Selection
  ↓
Voice / Text / Touch Preference
  ↓
Consent
  ↓
Chief Complaint
  ↓
Adaptive Clinical Interview
  ↓
Core AYUSH Questions When Relevant
  ↓
Basic Document Capture / Upload
  ↓
Patient Review
  ↓
Submit
  ↓
Doctor Queue
```

---

# 6. Patient UX Requirements

## 6.1 Accessibility

Patient UX must be optimized for:

- elderly users;
- low-literacy users;
- users unfamiliar with digital systems;
- multilingual users;
- touch-first interaction.

Requirements:

- large touch targets;
- readable typography;
- high contrast;
- simple wording;
- one major task per screen;
- clear primary action;
- voice + touch/text alternatives;
- obvious loading/error states.

## 6.2 Language

Initial prototype:

- Hindi;
- English.

Architecture must permit:

- Marathi;
- Tamil;
- additional Indian languages.

## 6.3 Interaction Modes

Support:

```text
VOICE
TEXT / TOUCH
```

The patient should be able to switch modes where appropriate.

---

# 7. Consent and Identity

## 7.1 Consent

Consent MUST occur before collection of clinical information.

The interface should explain:

- why information is collected;
- who will use it;
- the role of the AI system;
- the role of the physician.

Actions:

- `I Agree`
- `Need Help`

Do not use unsupported legal-compliance claims.

## 7.2 ABHA / Health ID

Provide an integration point for ABHA/health-ID where supported by the actual integration flow.

UI may provide:

```text
ABHA / Health ID

[ Enter ID ]

or

[ Scan QR ]
```

Do not collect Aadhaar unless a verified product requirement and lawful integration explicitly requires it.

ABHA functionality must be isolated behind an integration service so the patient flow remains usable if live ABDM connectivity is unavailable.

---

# 8. Chief Complaint

The patient provides a natural-language complaint.

Example:

> "Mujhe teen din se pet mein dard hai."

The application extracts a structured representation.

Example:

```json
{
  "chief_complaint": "abdominal pain",
  "duration": "3 days"
}
```

This is patient-reported information, not an autonomous diagnosis.

---

# 9. Adaptive Clinical Interview

## 9.1 Core requirement

The system MUST ask **one question at a time**.

The next question MUST depend on the current structured information state.

The system MUST NOT behave like a universal static questionnaire.

## 9.2 Core loop

```text
Patient Answer
      ↓
Extract Structured Information
      ↓
Update ClinicalState
      ↓
Identify Relevant Information Gaps
      ↓
Generate Candidate Question(s)
      ↓
Validate Candidate
      ↓
Select Exactly One Question
      ↓
Ask Patient
      ↓
Repeat
```

---

# 10. Minimum Sufficient History

### Definition

> **Minimum questions + maximum relevant information**

The number of questions is dynamic.

Do NOT implement a universal fixed count such as six questions for every case.

Example:

```text
Simple fever case      → fewer turns
Complex chronic case  → more turns
Priority symptom case → targeted questions
```

The engine should stop when the relevant information state is sufficiently complete.

---

# 11. Clinical State

The transcript is evidence; it is NOT the only source of truth.

Maintain a structured `ClinicalState`.

Example:

```ts
type ClinicalState = {
  chiefComplaint: string | null;
  symptoms: string[];
  onset: string | null;
  duration: string | null;
  severity: number | null;
  location: string | null;
  associatedSymptoms: string[];
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

Extend only when required by the product/PS.

Avoid uncontrolled free-form JSON as the main clinical state.

---

# 12. Question Decision Contract

The AI question-selection layer should return a machine-readable object.

Example:

```ts
type QuestionDecision = {
  action: "ASK" | "STOP" | "ESCALATE";
  question?: string;
  targetField?: string;
  reason?: string;
  confidence?: number;
};
```

Backend MUST validate this output before using it.

The frontend MUST NOT directly trust raw LLM output.

---

# 13. Adaptive Interview Guardrails

The interview MUST have several independent termination/anti-loop mechanisms.

## 13.1 Sufficient-information stop

If the currently relevant required information is sufficiently covered:

```text
STOP
```

## 13.2 Low-information-gain stop

If another question is unlikely to add meaningful information:

```text
STOP
```

## 13.3 Duplicate-question protection

Compare the candidate question semantically with previously asked questions.

If duplicate/redundant:

```text
REJECT
REGENERATE
```

If no useful alternative exists:

```text
STOP
```

## 13.4 Consecutive low-progress protection

Compare structured state before and after each question.

Recommended starting configuration:

```text
MAX_CONSECUTIVE_LOW_PROGRESS = 2
```

If this threshold is reached:

```text
STOP
```

## 13.5 Hard emergency limit

Use a configurable maximum number of questions only as an emergency brake.

Recommended initial prototype configuration:

```text
MAX_QUESTIONS = 15
```

The value MUST be configurable.

If reached before adequate completeness:

```text
status = "LIMITED_HISTORY"
```

Never mark the case complete merely because the hard limit was reached.

## 13.6 Model/service failure

If the model or external service fails:

```text
Retry once
    ↓
Fallback / deterministic required-field flow
    ↓
If still unavailable → LIMITED_HISTORY / safe stop
```

## 13.7 Patient cancellation

If patient stops:

```text
status = "PATIENT_ABORTED"
```

---

# 14. Explicit Adaptive-Interview Fallback

Primary strategy:

```text
Gap analysis
+
information completeness
+
question usefulness
```

Fallback strategy MUST be implemented in code:

```text
If adaptive gap analysis is not converging reliably:

1. Use a configured required-field set.
2. Identify which required fields remain unresolved.
3. Ask only questions mapped to unresolved fields.
4. Stop when the required-field set is sufficiently populated.
5. Stop at MAX_QUESTIONS even if incomplete.
6. Mark incomplete cases as LIMITED_HISTORY.
```

The LLM MUST NOT control termination on its own.

The application/backend controls the state machine.

---

# 15. Question Quality Rules

Every candidate question MUST:

- target a known information field or validated clinical objective;
- be relevant to the current complaint/context;
- not duplicate an already answered question;
- not request information already confidently known;
- be understandable to the patient;
- work through voice and/or touch/text;
- respect safety/clinical rules.

Question selection SHOULD prefer:

```text
high information value
+
low patient burden
```

Do not expose internal LLM reasoning to the patient.

---

# 16. Patient Intake UI States

The patient UI must explicitly support:

```text
NOT_STARTED
CONSENT_PENDING
LISTENING
TRANSCRIBING
ASKING
PROCESSING
NEEDS_REVIEW
READY_TO_SUBMIT
SUBMITTED
ERROR
FALLBACK
```

The central intake screen should show:

```text
Current Question
      ↓
🎙 Tap to speak

or

⌨ Type / Touch

[Change Language]
[Change Mode]
```

---

# 17. Speech / Language Provider Architecture

Use an abstraction:

```text
SpeechService
 ├── BhashiniProvider
 ├── SarvamProvider
 └── WhisperProvider
```

The clinical engine accepts normalized text regardless of provider.

Speech failures MUST fall back to text/touch.

Never expose provider API keys in frontend code.

---

# 18. Patient Review

After the adaptive interview, generate a concise structured review.

Example:

```text
Chief complaint: Chest pain
Duration: 1 day
Severity: 7/10
Associated symptoms: Breathlessness
Medication: Atorvastatin
```

Patient can:

- edit;
- confirm.

Only confirmed information should be submitted as the final patient-reviewed intake state.

---

# 19. Doctor Handoff

After patient confirmation:

```text
Patient
  ↓
Validated Intake
  ↓
Selected Doctor
  ↓
Doctor Queue
```

Doctor should not have to manually re-enter the patient's history.

Use FastAPI WebSockets or polling for queue refresh. Functional delivery is required; WebSockets are optional.

---

# 20. Doctor Dashboard

## Queue

Show:

- patients waiting;
- history ready;
- priority review;
- status.

Example:

```text
Token #42
Chest pain
⚠ Priority

Token #43
Fever
History ready

Token #44
Joint pain
AYUSH
```

Minimum queue fields:

- token;
- display name/patient ID;
- submitted time;
- chief complaint;
- status;
- priority flag.

---

# 21. Doctor Patient View

The main clinical view should contain:

- patient information;
- chief complaint;
- structured history;
- associated symptoms;
- medications;
- allergies;
- investigations;
- timeline;
- documents;
- alerts;
- AI draft status.

Initial status:

```text
AI DRAFT — NOT YET REVIEWED
```

After physician confirmation:

```text
PHYSICIAN CONFIRMED
```

---

# 22. Source and Evidence

Important information should expose provenance.

## Patient-derived example

```text
Duration: 3 days

Source:
Patient response
"Three days se bukhar hai."
```

## Document-derived example

```text
Atorvastatin 20 mg
Confidence: High

Source:
Prescription_01.pdf
Page 1
```

The user should be able to distinguish:

- patient input;
- document-derived information;
- AI transformation;
- physician-confirmed information.

---

# 23. Medical Document Intelligence

Patients can upload/capture:

- prescriptions;
- lab reports;
- discharge summaries;
- other relevant records.

Pipeline:

```text
File
 ↓
OCR
 ↓
Layout Understanding
 ↓
Medical Entity Extraction
 ↓
Normalization
 ↓
Confidence + Provenance
 ↓
Structured Data
 ↓
Timeline
```

### Initial extraction targets

#### Medication

```text
drug
dose
frequency
duration
```

#### Laboratory

```text
test
value
unit
reference range
date
```

#### Historical information

```text
diagnosis
procedure
hospitalization
visit date
```

Uncertain information MUST be marked for review.

---

# 24. OCR Architecture

Recommended:

```text
DocumentService
      ↓
OCR Provider
      ↓
Extraction Service
      ↓
Validation Service
      ↓
DocumentFacts
```

Potential technology:

- PaddleOCR;
- LLM structured extraction;
- regex/spaCy as supporting validators.

OCR output MUST NOT directly become trusted clinical facts without validation.

---

# 25. Uncertainty Handling

Example:

```text
Atorvastatin ?0 mg

⚠ Needs review
```

Do not silently fill uncertain medical values.

Confidence should be treated as a decision aid, not as proof of correctness.

---

# 26. Contradiction Detection

Detect conflicts between information sources.

Example:

```text
Patient:
"I stopped Metformin."

Previous record:
Metformin 500 mg

⚠ INFORMATION CONFLICT
Physician confirmation required
```

The system MUST NOT automatically choose which source is correct.

---

# 27. Red-Flag Detection

Use a configurable rule layer for the prototype.

Example:

```text
Chest pain
+
Breathlessness
+
Left-arm radiation

→ PRIORITY REVIEW
```

Patient-facing:

> “Your responses should be reviewed by a healthcare professional.”

Doctor-facing:

```text
PRIORITY REVIEW

Observed:
Chest pain
Breathlessness
Left-arm radiation

Source:
Patient responses
```

Never present a red flag as a definitive diagnosis.

---

# 28. Patient Timeline

Combine:

- current intake;
- patient-reported history;
- previous documents;
- confirmed events.

Example:

```text
2024 — Diagnosis
2025 — Prescription
2026 — Lab Report
Today — Current Complaint
```

Timeline entries should link to evidence where available.

---

# 29. AYUSH Workflow

AYUSH is part of the same product and patient record.

The adaptive interview should enter an AYUSH path when the selected workflow/case makes it relevant.

```text
Patient
   |
   +-- General / Modern Clinical History
   |
   +-- AYUSH Clinical History
```

The early/core implementation MUST include the core AYUSH question set required by PS 26047.

Potential structured areas, subject to validation against authoritative requirements:

- Prakriti;
- Vikriti;
- Agni;
- Koshtha;
- Ahara-Vihara;
- relevant required examination/case-taking parameters.

Do not invent clinical conclusions from these fields.

Deeper AYUSH structures, visualization and analytics can be added after the core workflow is stable.

---

# 30. Administrator

## Hospital management

- list;
- add;
- edit;
- activate/deactivate.

## Doctor management

- list;
- add;
- edit;
- specialty;
- department;
- hospital association.

## Workflow management

- clinical workflow configuration;
- AYUSH configuration;
- language/service configuration.

## Services

Show status for:

```text
LLM
Speech
OCR
Database
Integration
```

## Audit

Track important:

- physician confirmations;
- physician edits;
- administrator changes;
- system events.

---

# 31. Authentication and RBAC

Roles:

```text
PATIENT
DOCTOR
ADMIN
```

Minimum authorization model:

```text
PATIENT
→ own active session / own submitted information

DOCTOR
→ patients assigned/available according to application rules

ADMIN
→ platform configuration and operational data
```

Authorization MUST be enforced server-side.

Do not rely on hiding frontend routes.

Protect document endpoints with authorization checks.

---

# 32. FHIR / ABDM Integration Boundary

The physician-confirmed history should be representable in a FHIR R4-compatible structure.

Potential resources:

- Patient;
- Encounter;
- Observation;
- Condition;
- MedicationStatement;
- Composition.

Generate FHIR from validated/confirmed structured data, not uncontrolled raw LLM output.

ABDM/HIS integration should exist behind an integration service.

Do not fake a live production connection.

---

# 33. Privacy and Security

Required engineering controls include:

- role-based access control;
- authenticated APIs;
- secure transport;
- controlled document access;
- session isolation;
- audit logging;
- minimum-necessary data exposure;
- server-side authorization;
- secret management.

Development/demo data MUST be synthetic.

Client-side cleanup may be demonstrated after submission, but:

```text
sessionStorage.clear()
```

does NOT equal DPDP compliance.

Any retention/deletion policy must be implemented at the relevant backend/storage layers as well.

---

# 34. AI Architecture

```text
                    Clinical AI Layer
                           |
          +----------------+----------------+
          |                |                |
     Interpretation   Next Question      Summary
          |                |                |
          +----------------+----------------+
                           |
                     Validation Layer
                           |
                    Structured Output
```

### AI responsibilities

- interpret patient language;
- extract structured information;
- identify information gaps;
- propose the next question;
- generate the structured summary.

### Validation responsibilities

- schema validation;
- rule validation;
- confidence handling;
- contradiction checks;
- stop-condition enforcement;
- safety restrictions.

AI provider should be replaceable.

---

# 35. Technical Stack

```text
Frontend:
  Next.js
  React
  TypeScript
  Tailwind CSS
  shadcn/ui
  Lucide React

Charts:
  Recharts where useful

Backend:
  FastAPI
  Python

AI:
  LLM API
  Structured JSON/schema output
  Provider abstraction

Speech:
  BHASHINI
  Sarvam fallback
  Whisper fallback where useful

OCR:
  PaddleOCR

Extraction:
  LLM + rules/validation
  regex/spaCy as supporting tools

Database:
  PostgreSQL via Supabase

File storage:
  Supabase Storage

Realtime:
  FastAPI WebSockets when useful

Authentication:
  Supabase Auth or JWT + RBAC

Client API state:
  TanStack Query where useful

Session/cache:
  Redis optional

FHIR:
  fhir.resources / FHIR R4

Deployment:
  Vercel
  Render
  Supabase

Development:
  Docker
```

Do not create a microservice for every feature. Prefer a modular monolith for the prototype unless scale or deployment requirements clearly justify separation.

---

# 36. Data Model

Core entities:

```text
Hospital
Department
Doctor
Patient
IntakeSession
Question
Answer
ClinicalState
Document
DocumentExtraction
TimelineEvent
RedFlag
Contradiction
PhysicianReview
AuditEvent
```

Suggested relationships:

```text
Hospital
  └── Department
        └── Doctor

Patient
  └── IntakeSession
        ├── Answers
        ├── ClinicalState
        ├── Documents
        ├── TimelineEvents
        ├── RedFlags
        ├── Contradictions
        └── PhysicianReview
```

---

# 37. API Boundary

Suggested responsibilities:

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

Exact route names may evolve, but responsibilities and authorization boundaries must remain clear.

---

# 38. External Provider Abstractions

## LLM

```text
LLMService
 ├── ProviderA
 ├── ProviderB
 └── MockProvider
```

## Speech

```text
SpeechService
 ├── BhashiniProvider
 ├── SarvamProvider
 └── WhisperProvider
```

## OCR

```text
OCRService
 ├── PaddleOCRProvider
 └── MockOCRProvider
```

The application must be capable of deterministic mock/demo operation without depending on external providers.

---

# 39. File and Database Storage

## PostgreSQL / Supabase

Store:

- structured patient/session metadata;
- clinical state;
- question/answer events;
- extracted facts;
- physician review;
- audit events.

## Supabase Storage

Store:

- prescriptions;
- lab reports;
- discharge documents.

Database stores metadata/references rather than unnecessary copies of large files.

---

# 40. Realtime Behavior

A completed patient intake should be visible in the selected doctor's queue without requiring manual data re-entry.

Preferred prototype architecture:

```text
Patient
   ↓
POST intake submission
   ↓
FastAPI
   ↓
Persist
   ↓
WebSocket event OR queue refresh
   ↓
Doctor UI
```

WebSockets are optional. Correct event delivery is mandatory.

---

# 41. Demo Mode

A deterministic demo mode is REQUIRED.

Create synthetic cases:

### Case A — Priority
Chest pain + breathlessness + left-arm radiation.

### Case B — General OPD
Fever with a shorter adaptive path.

### Case C — AYUSH
Chronic joint-pain case with core AYUSH questions.

### Case D — Documents
Prior prescription/lab report producing structured extraction.

Demo data must be fictional/synthetic.

---

# 42. Frontend Component Requirements

Reusable components should include:

```text
LanguageSelector
HospitalSelector
DoctorSelector
ConsentCard
VoiceButton
TranscriptCard
QuestionCard
ProgressIndicator
PatientSummary
DocumentCard
DocumentViewer
SourceBadge
ConfidenceBadge
AlertBanner
ContradictionCard
Timeline
PatientQueue
ReviewEditor
AYUSHPanel
StatusChip
```

Avoid duplicated UI implementations without a reason.

---

# 43. Product States

## Patient

```text
NOT_STARTED
HOSPITAL_SELECTED
DOCTOR_SELECTED
LANGUAGE_SELECTED
CONSENT_PENDING
LISTENING
TRANSCRIBING
ASKING
PROCESSING
NEEDS_REVIEW
READY_TO_SUBMIT
SUBMITTED
PATIENT_ABORTED
LIMITED_HISTORY
ERROR
FALLBACK
```

## Doctor

```text
NEW
AI_DRAFT
PRIORITY_REVIEW
NEEDS_VERIFICATION
PHYSICIAN_CONFIRMED
```

---

# 44. Error and Fallback Rules

## Speech failure

```text
Speech unavailable
→ show text/touch fallback
```

## LLM failure

```text
retry once
→ required-field deterministic fallback
→ mock/demo mode if configured
→ limited-history stop if not safe to continue
```

## OCR failure

```text
Keep document
→ mark extraction unavailable
→ allow doctor to inspect source document
```

## Database/API failure

Do not silently lose patient input.

Show an explicit error state.

## External provider outage

The core application should remain demonstrable in mock mode.

---

# 45. Privacy Cleanup

After patient submission, the frontend MAY demonstrate temporary-session cleanup.

Example:

```text
Submit
 ↓
10-second privacy countdown
 ↓
Clear temporary browser session state
 ↓
Show "Temporary session data cleared"
```

Implementation example:

```ts
setTimeout(() => {
  sessionStorage.clear();
}, 10_000);
```

This is a **client-side cleanup demo**, not proof of DPDP compliance.

Backend persistence, retention, access control and deletion must be handled independently.

---

# 46. Testing Requirements

## Unit tests

Test:

- clinical state updates;
- question deduplication;
- question termination;
- low-progress detection;
- hard-limit behavior;
- fallback behavior;
- red-flag rules;
- contradiction rules;
- document extraction validation.

## Integration tests

Test:

```text
Patient answer
→ ClinicalState
→ QuestionDecision
→ Summary
→ Doctor view
```

and:

```text
Document
→ OCR
→ Extraction
→ Validation
→ Doctor view
```

## End-to-end scenarios

At minimum:

1. simple fever;
2. chest-pain priority case;
3. AYUSH case;
4. document-heavy case;
5. speech provider failure;
6. LLM provider failure.

---

# 47. Success Metrics

Only report values that are actually measured.

## Adaptive intake

- average number of questions;
- median intake duration;
- required-field capture rate;
- next-question relevance;
- redundant-question rate;
- premature-stop rate;
- limited-history rate.

## Document intelligence

- medication extraction precision/recall;
- laboratory extraction precision/recall;
- uncertain extraction rate.

## Safety

- red-flag sensitivity/specificity on controlled test cases;
- contradiction detection accuracy.

## Doctor

- physician correction rate;
- median review time.

## AYUSH

At minimum:

> **AYUSH required-field completeness on AYUSH-eligible test cases.**

Optional:

> **Percentage of AYUSH-eligible intakes in which at least one AYUSH-specific field was captured.**

---

# 48. Acceptance Criteria

## Patient

- [ ] Can select/confirm hospital.
- [ ] Can select doctor.
- [ ] Can select language.
- [ ] Can select voice/text/touch mode.
- [ ] Sees consent before clinical data collection.
- [ ] Can provide natural-language complaint.
- [ ] Receives one question at a time.
- [ ] Next questions adapt to previous answers.
- [ ] Redundant questions are blocked.
- [ ] Adaptive interview terminates safely.
- [ ] Core AYUSH question path can activate when relevant.
- [ ] Can review/correct captured information.
- [ ] Can submit.

## Doctor

- [ ] Submitted case appears in queue.
- [ ] Doctor can open patient.
- [ ] Structured summary is available.
- [ ] AI draft status is visible.
- [ ] Priority/red-flag state is visible when triggered.
- [ ] Doctor can inspect evidence.
- [ ] Doctor can inspect documents.
- [ ] Doctor can edit/correct.
- [ ] Doctor can confirm.
- [ ] Physician confirmation is recorded.

## Documents

- [ ] Document upload works.
- [ ] OCR can run or deterministic mock path exists.
- [ ] Extracted facts have provenance/confidence.
- [ ] Uncertainty is visible.
- [ ] Doctor can inspect the original document.

## AYUSH

- [ ] Relevant AYUSH path can be demonstrated.
- [ ] Core AYUSH fields can be captured.
- [ ] AYUSH data appear in doctor view.

## Safety

- [ ] Red-flag rules are deterministic/configurable.
- [ ] Contradictions are surfaced, not automatically resolved.
- [ ] LLM cannot override termination/safety controls.

## Admin

- [ ] Hospital management exists.
- [ ] Doctor management exists.
- [ ] Workflow/service status is visible.
- [ ] Audit events are accessible.

## Integration

- [ ] Physician-confirmed data can be mapped to FHIR-compatible resources.
- [ ] External provider failure does not collapse the whole application.
- [ ] No provider secrets are exposed in client code.

---

# 49. Development Priority

This is a **priority order, not separate product phases**.

The product has one continuous scope.

## P0 — Core clinical workflow

- patient onboarding;
- hospital;
- doctor;
- language;
- interaction mode;
- consent;
- chief complaint;
- dynamic interview;
- interview guardrails;
- core AYUSH question path;
- patient review;
- submit;
- doctor queue;
- structured summary;
- doctor edit/confirm.

## P1 — Multimodal + safety depth

- basic document OCR;
- medication/lab/date extraction;
- source provenance;
- timeline;
- red flags;
- contradiction detection;
- uncertainty states.

## P2 — Platform / integration depth

- richer AYUSH structure;
- FHIR output;
- ABDM/HIS integration boundary;
- admin controls;
- audit depth;
- additional languages;
- advanced analytics/accessibility.

All P0/P1/P2 items belong to the same SwasthyaVaani product. Priority only determines implementation order and risk management.

---

# 50. Evaluation Checkpoints

Two evaluation dates exist:

- **3 September 2026**
- **8 September 2026**

Treat these as **evaluation checkpoints**, not separate product versions.

The PRD describes one continuous SwasthyaVaani product.

By the first checkpoint, the P0 vertical slice must already be demonstrable. Work continues afterward on the same architecture and scope.

---

# 51. Agent Coding Rules

When an AI coding agent works on the repository:

1. Read this PRD before modifying architecture.
2. Inspect the current code before creating or replacing files.
3. Reuse existing components/services where possible.
4. Do not rewrite working modules without a concrete reason.
5. Implement one coherent feature at a time.
6. Keep API contracts typed and explicit.
7. Run relevant tests after significant changes.
8. Preserve working behavior unless the PRD requires a change.
9. Do not invent medical facts, clinical conclusions, statistics, regulatory claims, integrations or credentials.
10. Keep AI/speech/OCR providers behind replaceable interfaces.
11. Do not place secrets in frontend code.
12. Enforce authorization on the backend.
13. Treat provenance, safety and physician verification as first-class requirements.
14. Prefer a simple modular architecture over unnecessary microservices.
15. Maintain mock/demo mode so external-service failure does not block development or demonstration.
16. Do not add a feature merely because a coding agent suggests it.
17. When unsure, prefer the smallest implementation that satisfies the documented requirement.

---

# 52. Final Product Positioning

Use consistently:

> **SwasthyaVaani is an AI-assisted pre-consultation clinical intake platform.**

Primary message:

> **AI structures the patient's story; the physician makes the decision.**

Primary differentiator:

> **Adaptive Clinical Intake — ask only what this patient needs to provide a useful clinical history.**

Supporting differentiators:

- multilingual voice/touch accessibility;
- source-grounded medical-document intelligence;
- red-flag and uncertainty handling;
- contradiction detection;
- AYUSH + modern clinical workflows;
- physician-controlled verification.

---

# 53. Final Rule

> **Build a reliable clinical workflow first. Add complexity only when it strengthens the patient experience, physician usefulness, safety, interoperability, or measurable product value.**
