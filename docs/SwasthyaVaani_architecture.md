# SwasthyaVaani — System Architecture

> **Audience:** AI coding agents and developers.  
> **Purpose:** Define the target technical architecture and boundaries for the SwasthyaVaani implementation.  
> **Related documents:** `PRD.md` = product requirements, `TRD.md` = technical requirements.

---

## 1. Architecture Goal

SwasthyaVaani is a role-based, AI-assisted pre-consultation clinical intake platform.

The architecture must support three application roles:

```text
PATIENT
DOCTOR
ADMINISTRATOR
```

The architecture must keep:

- clinical decision authority with the physician;
- AI outputs structured and validated;
- safety rules deterministic;
- external providers replaceable;
- patient data access role-controlled;
- document provenance traceable;
- the product usable when an external provider fails.

---

# 2. System Context

```text
                         SWASTHYAVAANI
                               |
        +----------------------+----------------------+
        |                      |                      |
   PATIENT CLIENT         DOCTOR CLIENT         ADMIN CLIENT
   Tablet / Kiosk          Desktop / Laptop     Desktop / Laptop
        |                      |                      |
        +----------------------+----------------------+
                               |
                         APPLICATION API
                           FastAPI
                               |
        +----------------------+----------------------+
        |                      |                      |
     Clinical AI          Document AI             Safety
        |                      |                      |
        +----------------------+----------------------+
                               |
                     Structured Clinical Data
                               |
                +--------------+--------------+
                |                             |
            PostgreSQL                    File Storage
            / Supabase                   / Supabase
                |
             FHIR R4
                |
         ABDM / HIS adapters
```

---

# 3. Architectural Style

Use a **modular monolith** for the prototype.

```text
Next.js frontend
       ↓
FastAPI backend
       ↓
Domain modules
       ↓
Provider adapters
       ↓
PostgreSQL / Storage
```

Do NOT split into many microservices unless a concrete requirement appears.

The following logical modules should be separated in code even when deployed as one backend:

```text
auth
patient
doctor
admin
intake
clinical_ai
speech
documents
safety
timeline
review
fhir
integrations
audit
```

---

# 4. Client Architecture

## 4.1 Patient Client

Optimized for:

- tablet/kiosk;
- touch;
- voice;
- accessibility;
- very low cognitive load.

Main responsibility:

```text
Collect → Explain → Confirm → Submit
```

The patient client MUST NOT contain clinical decision logic.

---

## 4.2 Doctor Client

Optimized for:

- desktop/laptop;
- rapid scanning;
- high information density;
- evidence review.

Main responsibility:

```text
Receive → Review → Edit → Confirm
```

The doctor client displays AI outputs but the backend remains authoritative for permissions and persistence.

---

## 4.3 Admin Client

Optimized for:

- management;
- configuration;
- service status;
- audit.

Main responsibility:

```text
Configure → Monitor → Audit
```

---

# 5. Frontend Layer

Recommended:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide React
TanStack Query
```

Suggested structure:

```text
frontend/
├── app/
├── components/
├── features/
│   ├── patient/
│   ├── doctor/
│   ├── admin/
│   ├── intake/
│   ├── documents/
│   ├── safety/
│   └── shared/
├── hooks/
├── lib/
└── types/
```

### Rules

- Do not place LLM logic in React components.
- Do not place provider API keys in browser code.
- Use API contracts/types shared with the backend where practical.
- Keep UI state separate from clinical state.
- Use server/API state tools for queue/record data.

---

# 6. Backend Layer

Recommended:

```text
Python
FastAPI
Pydantic
SQLAlchemy
Alembic
```

Suggested structure:

```text
backend/app/
├── api/
├── models/
├── schemas/
├── services/
│   ├── auth/
│   ├── intake/
│   ├── clinical_ai/
│   ├── speech/
│   ├── documents/
│   ├── safety/
│   ├── timeline/
│   ├── review/
│   ├── fhir/
│   ├── integrations/
│   └── audit/
├── rules/
├── config/
└── tests/
```

The API layer handles transport/authentication.

The service layer handles application behavior.

The domain/rules layer handles deterministic clinical workflow controls.

---

# 7. Core Request Flow

Example patient answer:

```text
Patient speaks
      ↓
Patient frontend
      ↓
POST /api/intakes/:id/answers
      ↓
FastAPI
      ↓
Speech/text normalization
      ↓
Clinical AI extraction
      ↓
Schema validation
      ↓
ClinicalState update
      ↓
Safety rules
      ↓
Information-gap analysis
      ↓
Question decision
      ↓
Frontend
```

---

# 8. Clinical AI Architecture

The AI system should be treated as a bounded subsystem.

```text
                   CLINICAL AI
                        |
         +--------------+--------------+
         |              |              |
     Extraction     Question        Summary
                      Selection
         |              |              |
         +--------------+--------------+
                        |
                  Validation
                        |
                Structured Output
```

### AI can

- interpret patient language;
- extract candidate structured facts;
- propose next questions;
- draft structured summaries.

### AI cannot independently control

- authorization;
- final clinical confirmation;
- red-flag rule state;
- contradiction resolution;
- database persistence;
- interview termination;
- FHIR export approval.

---

# 9. Provider Adapter Architecture

External dependencies MUST be behind interfaces.

```text
                    Provider Interfaces
                           |
        +------------------+------------------+
        |                  |                  |
      LLM                Speech              OCR
        |                  |                  |
  Provider A/B        Bhashini/Sarvam/     PaddleOCR/
  + Mock              Whisper + Mock       Mock
```

The rest of the backend should only call the interface.

Example:

```python
class SpeechProvider:
    async def transcribe(...): ...
    async def synthesize(...): ...
    async def detect_language(...): ...
```

This prevents vendor lock-in and lets the project continue during API availability issues.

---

# 10. Adaptive Interview Architecture

## State

```text
IntakeSession
    ↓
ClinicalState
    ↓
InformationGaps
    ↓
CandidateQuestions
    ↓
ValidatedQuestion
```

### Decision pipeline

```text
Current ClinicalState
        ↓
Required information
        ↓
Resolved fields
        ↓
Unresolved relevant fields
        ↓
Candidate question generation
        ↓
Duplicate check
        ↓
Information-gain check
        ↓
Safety check
        ↓
ASK / STOP / ESCALATE
```

### Termination control

Application-level controls:

```text
Sufficient information → STOP

Low expected information gain → STOP

Duplicate question → REJECT / REGENERATE

No meaningful progress for 2 turns → STOP

MAX_QUESTIONS reached → LIMITED_HISTORY

Model failure → FALLBACK / LIMITED_HISTORY

Patient cancellation → PATIENT_ABORTED
```

Recommended initial configuration:

```text
MAX_QUESTIONS = 15
MAX_CONSECUTIVE_LOW_PROGRESS = 2
```

These values must be configurable.

---

# 11. Clinical State vs Conversation

Do not use the conversation transcript as the only source of state.

```text
Raw Conversation
      |
      +------> Evidence / provenance
      |
      ↓
Structured ClinicalState
      |
      +------> Question Engine
      +------> Safety Engine
      +------> Summary Generator
      +------> Doctor UI
```

This is necessary for deterministic decision-making and testing.

---

# 12. Question Selection and Fallback

Primary:

```text
Gap analysis
+
information completeness
+
information gain
```

Fallback:

```text
Workflow-specific required-field schema
+
unresolved-field targeting
+
duplicate protection
+
MAX_QUESTIONS
```

The fallback must be deterministic and implemented in the backend.

---

# 13. Speech Architecture

```text
Patient microphone
      ↓
Frontend capture
      ↓
FastAPI
      ↓
SpeechService
      ↓
Bhashini / Sarvam / Whisper
      ↓
Normalized text
      ↓
Clinical AI
```

For response audio:

```text
Next question text
      ↓
SpeechService
      ↓
TTS provider
      ↓
Audio
      ↓
Patient frontend
```

Speech failure:

```text
Voice error
    ↓
Text/touch fallback
```

---

# 14. Document Architecture

```text
Patient upload/capture
        ↓
Secure object storage
        ↓
Document metadata
        ↓
OCR
        ↓
Layout understanding
        ↓
Medical entity extraction
        ↓
Validation
        ↓
Provenance + confidence
        ↓
ClinicalState / Timeline
```

### Document sources

- prescription;
- lab report;
- discharge summary;
- other relevant medical record.

### Storage model

Binary file:

```text
Supabase Storage
```

Metadata:

```text
PostgreSQL
```

---

# 15. Provenance Architecture

Every important fact should be traceable.

```text
Fact
 ↓
Provenance
 ├── source type
 ├── source ID
 ├── page
 ├── region
 └── confidence
```

Possible sources:

```text
PATIENT_ANSWER
DOCUMENT
AI_DERIVED
PHYSICIAN
```

Doctor UI must expose this when useful.

---

# 16. Safety Architecture

Safety-critical signals should be deterministic/configurable.

```text
ClinicalState
      ↓
Safety Rule Engine
      |
      +----> RedFlag[]
      |
      +----> Contradiction[]
      |
      +----> Uncertainty[]
```

The safety engine may create:

```text
PRIORITY_REVIEW
```

It must not create a diagnosis.

---

# 17. Red-Flag Flow

```text
Patient responses
      ↓
ClinicalState
      ↓
Rule evaluation
      ↓
Matched rule
      ↓
RedFlag created
      ↓
Patient UI: calm review-needed message
      ↓
Doctor UI: priority review
```

Example:

```text
Chest pain
+
Breathlessness
+
Left-arm radiation
→ PRIORITY_REVIEW
```

The exact rule set should be versioned and tested.

---

# 18. Contradiction Flow

```text
Patient statement
      +
Historical document
      ↓
Fact comparison
      ↓
Potential contradiction
      ↓
Contradiction record
      ↓
Doctor review
```

Never auto-resolve clinical contradictions.

---

# 19. Doctor Review Architecture

```text
AI_DRAFT
    ↓
NEEDS_VERIFICATION
    ↓
PHYSICIAN_EDITED (optional)
    ↓
PHYSICIAN_CONFIRMED
```

Only confirmed information should be used for final FHIR export.

---

# 20. Patient-to-Doctor Handoff

```text
Patient Review
      ↓
Patient Confirm
      ↓
Submission transaction
      ↓
Persist intake
      ↓
Assign selected doctor
      ↓
Queue event
      ↓
Doctor Queue
```

The patient UI must not report success until the backend transaction succeeds.

---

# 21. Realtime Architecture

Preferred:

```text
FastAPI
   ↓
WebSocket event
   ↓
Doctor dashboard
```

Fallback:

```text
Polling
```

Use realtime only for meaningful events such as:

```text
NEW_PATIENT_INTAKE
PATIENT_PRIORITY_UPDATED
PHYSICIAN_REVIEW_UPDATED
```

---

# 22. Database Architecture

Primary database:

```text
PostgreSQL / Supabase
```

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

Suggested relation:

```text
Hospital
 └── Department
      └── Doctor

Patient
 └── IntakeSession
      ├── Answer[]
      ├── ClinicalState
      ├── Document[]
      ├── TimelineEvent[]
      ├── RedFlag[]
      ├── Contradiction[]
      └── PhysicianReview
```

---

# 23. Authentication / Authorization

Recommended:

```text
Supabase Auth
+
server-side RBAC
```

Authorization is checked on every protected API request.

```text
PATIENT
→ own session/records

DOCTOR
→ authorized patient records

ADMIN
→ administrative resources
```

Never rely on frontend-only route protection.

---

# 24. Admin Architecture

```text
Admin UI
   ↓
Admin API
   ↓
RBAC
   ↓
Configuration/Data
```

Admin modules:

```text
Hospitals
Departments
Doctors
Workflows
Languages
Provider Status
Audit
```

Safety-critical configuration requires versioning and controlled modification.

---

# 25. FHIR Architecture

FHIR mapping happens after physician confirmation.

```text
PHYSICIAN_CONFIRMED
       ↓
Validated ClinicalState
       ↓
FHIR Mapper
       ↓
FHIR R4 resources
       ↓
FHIR validation
       ↓
FHIR Bundle / payload
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

Raw LLM output must never be converted directly into FHIR without validation.

---

# 26. ABDM / HIS Adapter

Keep integration behind an adapter.

```text
Core Application
       ↓
IntegrationService
       |
       +── FHIR Export
       +── ABDM Adapter
       +── HIS Adapter
```

The core workflow must work without a live external integration.

If no real integration is available:

```text
Sandbox / Mock Adapter
```

must be clearly labeled.

---

# 27. AYUSH Architecture

AYUSH shares the same patient/session architecture.

```text
ClinicalState
     |
     +── General Clinical
     |
     +── AYUSH
```

When the relevant workflow is selected:

```text
workflow_type = AYUSH
```

the adaptive question engine loads the validated AYUSH field set.

Core AYUSH questioning must be supported early.

Deeper AYUSH visualizations and analytics are secondary.

---

# 28. Privacy / Data Lifecycle

Separate these categories:

```text
Temporary client state
Active intake session
Persistent clinical record
Uploaded documents
Audit records
```

Client-side:

```ts
sessionStorage.clear()
```

may be used as a temporary cleanup demonstration.

It does NOT establish regulatory compliance.

Backend/database/storage retention must be controlled separately.

---

# 29. Security Boundaries

```text
Browser
  ↓ HTTPS
API Gateway
  ↓ Auth/RBAC
Domain Services
  ↓ Validation
Database / Storage
```

Rules:

- secrets stay server-side;
- authenticated APIs only;
- protected document endpoints;
- server-side authorization;
- input validation;
- AI output validation;
- audit important mutations;
- minimize sensitive logging.

---

# 30. API Boundary

High-level API groups:

```text
/auth
/hospitals
/doctors
/intakes
/documents
/doctor
/admin
/fhir
/health
```

Suggested endpoints:

```http
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
```

Exact endpoints may evolve, but responsibilities must remain clear.

---

# 31. Failure Architecture

| Failure | Required behavior |
|---|---|
| BHASHINI unavailable | Sarvam/Whisper/text fallback |
| Sarvam unavailable | Whisper/other provider/text fallback |
| LLM unavailable | retry → deterministic required-field flow → limited history |
| OCR unavailable | preserve document → mark extraction unavailable → doctor source review |
| WebSocket unavailable | polling |
| ABDM unavailable | integration-ready mock/sandbox |
| Database unavailable | explicit error; never falsely confirm submission |
| Upload failure | explicit error; do not mark upload complete |

---

# 32. Mock / Demo Architecture

Mock mode must exercise the same UI and application contracts.

```text
Mock Provider
      ↓
same interface
      ↓
same validation
      ↓
same application logic
      ↓
same frontend
```

The mock path should reproduce:

- adaptive interview;
- AYUSH questions;
- OCR extraction;
- red flags;
- contradictions;
- doctor queue;
- physician confirmation.

Do not create a separate demo application.

---

# 33. Testing Architecture

## Unit

Test:

- ClinicalState merge;
- field resolution;
- question deduplication;
- information gain;
- stop conditions;
- fallback;
- red-flag rules;
- contradiction detection;
- FHIR mapping.

## Integration

```text
answer → state → next question
document → OCR → extraction → validation
submit → queue
confirm → FHIR
```

## E2E

Test:

- fever;
- chest-pain priority;
- AYUSH;
- document-heavy;
- provider failures;
- patient cancellation;
- maximum-question fallback;
- unauthorized access.

---

# 34. Observability

Track technical events:

```text
REQUEST
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

Do not put unnecessary raw patient content in logs.

Track latency for:

```text
LLM
Speech
OCR
API
Question generation
Document processing
```

---

# 35. Deployment Architecture

```text
                     Internet
                        |
              +---------+---------+
              |                   |
           Vercel               Render
         Next.js UI            FastAPI
                                  |
                       +----------+----------+
                       |                     |
                   Supabase              External APIs
                 PostgreSQL/Storage      AI/Speech/OCR
```

Optional:

```text
Redis
```

only when required.

---

# 36. Environment / Secrets

Use `.env.example`.

Examples:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
LLM_API_KEY
BHASHINI_API_KEY
SARVAM_API_KEY
REDIS_URL
```

Never commit real keys.

Never expose server keys in client bundles.

---

# 37. Technical Data Flow — Complete

```text
                    PATIENT
                       |
                 Voice / Touch
                       |
                 Next.js Client
                       |
                     FastAPI
                       |
              +--------+--------+
              |        |        |
           Speech   Clinical   Session
           Service     AI       State
              |        |        |
           Bhashini  LLM        |
           Sarvam    Rules      |
           Whisper   Validation |
              |        |        |
              +--------+--------+
                       |
                 ClinicalState
                       |
             +---------+---------+
             |         |         |
          Safety    Documents   Question
            |          |         Engine
            |         OCR          |
            |       Extract        |
            +---------+------------+
                      |
              Patient Review
                      |
                    Submit
                      |
              PostgreSQL/Storage
                      |
                Doctor Queue
                      |
               Doctor Dashboard
                      |
            Review / Edit / Confirm
                      |
                FHIR Mapping
                      |
               ABDM / HIS Adapter
```

---

# 38. Architectural Invariants

These MUST remain true even if implementation details change:

1. Patient, doctor and admin access are separated.
2. LLM output is validated before persistence.
3. LLM does not control interview termination.
4. Safety rules are deterministic/configurable.
5. Contradictions are surfaced, not automatically resolved.
6. Important extracted facts retain provenance.
7. Physician confirmation is explicit.
8. External AI providers are replaceable.
9. Provider failure does not destroy the complete workflow.
10. No API secrets are exposed to the browser.
11. FHIR is generated from validated/confirmed structured data.
12. Mock/demo mode uses the same application contracts as real providers.
13. No autonomous diagnosis is implemented.
14. Evaluation dates are checkpoints, not separate architectures or product versions.

---

# 39. Agent Implementation Order

An AI coding agent should normally implement in this order:

```text
1. Repository + environment
2. Database models + migrations
3. Auth/RBAC
4. Patient flow shell
5. Doctor queue + patient view
6. ClinicalState
7. Adaptive question engine
8. Termination/fallback guardrails
9. Core AYUSH path
10. Speech provider abstraction
11. Document/OCR abstraction
12. Provenance/confidence
13. Red flags
14. Contradictions
15. Physician review
16. Timeline
17. FHIR mapper
18. Admin
19. Integration adapters
20. Hardening + tests
```

Do not proceed to complex infrastructure when a prior core layer is unstable.

---

# 40. Final Architecture Rule

> **Keep the AI probabilistic, but keep product control deterministic.**

AI may interpret, extract and propose.

The application must decide:

```text
Is this valid?
Is this question allowed?
Is it repetitive?
Is enough information collected?
Should the interview stop?
Did a safety rule trigger?
Can this record be persisted?
Has the physician confirmed it?
```

That separation is the central architectural principle of SwasthyaVaani.
