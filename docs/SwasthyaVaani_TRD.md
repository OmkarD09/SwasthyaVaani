# SwasthyaVaani — Technical Requirements Document (TRD)

> **Status:** Updated technical source of truth
>
> **Relationship:** The PRD defines **WHAT** SwasthyaVaani must do. This document defines **HOW** it should be implemented.
>
> **Primary references:** Final `SwasthyaVaani_architecture.md`, `SwasthyaVaani_Current_Project_State.md`, updated PRD, original TRD, Backend Schema, Rules, App Flow, and AYUSH Implementation Specification.
>
> **Important:** This document evolves the existing SwasthyaVaani implementation. It does not authorize a greenfield rewrite.

---

# 1. Technical Objective

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
- structured ClinicalState;
- integrated AYUSH assessment;
- document OCR and evidence extraction;
- provenance and confidence;
- deterministic red-flag detection;
- contradiction detection;
- physician review and confirmation;
- FHIR-compatible output;
- future/live integration boundaries for ABDM/HIS;
- replaceable AI/speech/OCR providers;
- deterministic fallback behavior.

Use a **modular monolith** for the current architecture.

Do not create microservices without a concrete operational requirement.

---

# 2. Technical Architecture Principles

## 2.1 Layering

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

## 2.2 Provider Abstraction

```text
LLMService
 ├── Groq provider
 ├── Gemini provider
 └── Mock provider

SpeechService
 ├── Sarvam provider
 ├── Bhashini provider
 └── Mock provider

OCRService
 ├── PaddleOCR provider
 └── Mock provider

EmbeddingService
 ├── Gemini provider
 └── Mock provider
```

External provider selection belongs behind service/provider boundaries.

## 2.3 Deterministic Control Around AI

The LLM may:

- understand natural language;
- extract candidate structured facts;
- phrase a question;
- draft a structured summary.

The application controls:

- authorization;
- schema validation;
- canonical state;
- safety;
- contradiction handling;
- candidate selection;
- duplicate detection;
- sufficiency;
- termination;
- persistence;
- physician confirmation.

## 2.4 Fail Safely

```text
Provider failure
    ↓
Retry
    ↓
Alternate provider / deterministic fallback
    ↓
Limited history if safe continuation is impossible
```

Already collected patient data must not be lost merely because an external provider fails.

---

# 3. Technology Stack

## Frontend

Current implementation:

```text
React
TypeScript
Vite
Wouter
Tailwind CSS
Radix UI
shadcn/ui
Framer Motion
TanStack React Query
React Hook Form
Zod
Recharts
```

## Backend

```text
Python
FastAPI
Uvicorn
Pydantic
SQLAlchemy 2
Alembic
JWT authentication
```

## Data

Current prototype:

```text
SQLite
```

Production direction:

```text
PostgreSQL / Supabase
```

## AI

```text
Groq
Google Gemini
```

## Speech

```text
Sarvam
Bhashini
browser speech fallback where available
Mock provider
```

## OCR

```text
PaddleOCR
Mock OCR
```

## Interoperability

```text
FHIR R4
ABDM / NRCES India Core mapping and integration boundary
```

---

# 4. Repository / Module Architecture

The current backend is a modular monolith.

Logical modules include:

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
rag
fhir
abdm
audit
providers
```

The clinical AI domain contains:

```text
adaptive_engine
domain_classifier
gap_analysis
question_scorer
fact extraction
```

Provider adapters contain:

```text
llm_provider
speech_provider
ocr_provider
embedding_provider
```

---

# 5. Frontend Technical Requirements

## 5.1 Patient

The patient application is responsible for:

```text
language
demographics
interaction mode
consent
clinical input
voice/text/touch
document upload
review
submission
```

The frontend MUST NOT contain authoritative clinical decision logic.

It may display the decision received from the backend.

## 5.2 Doctor

The doctor application is responsible for:

```text
queue
patient dossier
structured clinical information
safety
contradictions
documents
conversation
AYUSH
editing
confirmation
```

## 5.3 Admin

The admin application is responsible for:

```text
configuration
hospital/doctor management
service status
audit
QA
```

---

# 6. API Architecture

The API is versioned under:

```text
/api/v1
```

Major API domains:

```text
/auth
/intakes
/documents
/doctor
/admin
/speech
/rag
/fhir
/abdm
```

The API layer is responsible for:

- request validation;
- authentication;
- authorization;
- transport;
- response contracts;
- invoking application services.

The API layer must not become the home for complex clinical reasoning.

---

# 7. Intake Creation

The canonical intake creation operation is:

```http
POST /api/v1/intakes
```

The created `IntakeSession` must identify, as applicable:

```text
patient
hospital
doctor
workflow type
language
interaction mode
status
```

An initial ClinicalState is created before the adaptive interview begins.

When the workflow requires AYUSH assessment, the session must also have access to the AYUSH assessment context.

---

# 8. Patient Answer Processing

## Text / Touch

```http
POST /api/v1/intakes/{id}/answers
```

Pipeline:

```text
Request
 ↓
Authentication/session validation where applicable
 ↓
Input normalization
 ↓
Fact extraction
 ↓
Schema validation
 ↓
ClinicalState merge
 ↓
AYUSH state merge when relevant
 ↓
Safety
 ↓
Contradiction detection
 ↓
Adaptive candidate generation
 ↓
Scoring
 ↓
Duplicate / resolved filtering
 ↓
Sufficiency
 ↓
ASK / STOP / ESCALATE
 ↓
Persist QuestionEvent
 ↓
Response
```

## Voice

```http
POST /api/v1/intakes/{id}/voice-answer
```

Pipeline:

```text
Audio
 ↓
SpeechService
 ↓
Transcript
 ↓
Normalized patient text
 ↓
same process_intake_answer_core()
```

The voice endpoint MUST converge into the same clinical reasoning pipeline as text.

---

# 9. Clinical Intelligence Contract

The clinical intelligence layer should expose a bounded decision contract.

Conceptually:

```python
QuestionDecision:
    action: ASK | STOP | ESCALATE
    question: optional string
    target_field: optional string
    reason: optional string
```

The backend validates this contract before using it.

The frontend MUST NOT consume arbitrary raw LLM JSON as a clinical decision.

---

# 10. Fact Extraction

Fact extraction is a probabilistic step.

```text
Patient language
 ↓
LLM / Mock extractor
 ↓
typed ClinicalExtractionSchema
 ↓
validation
 ↓
domain validation
 ↓
state mutation
```

The extracted facts may include:

```text
chief complaint
symptoms
duration
severity
location
associated symptoms
medications
allergies
history
AYUSH observations
```

Extraction must preserve uncertainty and must not invent unavailable facts.

---

# 11. ClinicalState Requirements

ClinicalState is the primary structured working state.

It must remain separate from:

```text
raw conversation transcript
```

The current architecture supports fields including:

```text
chief complaint
symptoms
onset
duration
severity
location
character
radiation
associated symptoms
timing
aggravating factors
relieving factors
past history
family history
medications
allergies
investigations
AYUSH
documents
red flags
contradictions
uncertainties
canonical dimensions
resolved dimensions
exploration state
```

## State lifecycle

```text
Initialize
 ↓
Load latest state
 ↓
Extract facts
 ↓
Merge
 ↓
Evaluate safety
 ↓
Generate candidates
 ↓
Persist next state/version
```

Clinical state versions should remain auditable according to the current persistence architecture.

---

# 12. Canonical Dimension System

Equivalent concepts must map to the same canonical dimension.

Example:

```text
"How long?"
"Since when?"
"For three days?"
        ↓
symptom_duration
```

Example:

```text
"blurred vision"
"vision blur"
"difficulty seeing"
        ↓
blurred_vision
```

A candidate that maps to a sufficiently known canonical dimension must be rejected unless clarification is explicitly required.

This is a core anti-loop mechanism.

---

# 13. Adaptive Question Engine

The adaptive engine is deterministic in question-dimension selection.

Canonical pipeline:

```text
ClinicalState
+
AyushAssessment where relevant
        ↓
workflow/domain context
        ↓
relevant gaps
        ↓
candidate dimensions
        ↓
candidate scoring
        ↓
duplicate / resolved filtering
        ↓
sufficiency
        ↓
ASK / STOP / ESCALATE
```

The LLM may phrase the selected target but does not independently select the clinical dimension.

---

# 14. Candidate Scoring Requirements

Candidate scoring should consider, as appropriate:

```text
safety priority
clinical relevance
workflow relevance
information gain
newly volunteered evidence
target specificity
    -
already known
    -
semantic duplication
    -
irrelevance
```

The exact scoring weights remain implementation details and should remain deterministic/testable.

---

# 15. Information Sufficiency

Stopping is application-controlled.

The engine should stop when:

- clinically relevant information is sufficiently characterized;
- useful unresolved candidates no longer exist;
- expected information gain is too low;
- a configured safety workflow directs escalation/stop.

The LLM cannot independently terminate an interview.

---

# 16. Interview Guardrails

Global guardrails include:

```text
semantic duplicate detection
resolved-field protection
non-informative response handling
low-progress detection
hard maximum question limit
deterministic fallback
patient cancellation
provider-failure handling
```

The current implementation uses a hard maximum of **10 questions** as a safety brake.

This is a ceiling, not the target interview length.

If the maximum is reached before adequate history:

```text
LIMITED_HISTORY
```

must remain distinguishable from:

```text
COMPLETE
```

---

# 17. Open Exploration and Targeted Follow-Up

The adaptive engine should support:

```text
OPEN_EXPLORATION
TARGETED_FOLLOW_UP
SAFETY_REQUIRED
```

Open exploration may discover a new relevant symptom/domain.

Example:

```text
patient reports stomach discomfort

→ open exploration

patient adds dark stools

→ map new evidence
→ reassess safety
→ targeted follow-up if required
```

Open exploration must not become an excuse for random checklist questioning.

---

# 18. Ambiguous and Non-Informative Answers

The state model must preserve ambiguity.

Example:

```text
Question:
"Any blurred vision or light sensitivity?"

Answer:
"Yes."

Result:
AMBIGUOUS
```

Do not mark every proposition true.

Non-informative answers such as:

```text
"wtf"
"idk"
"what?"
```

must not corrupt state or create infinite loops.

The engine should rephrase, pivot, or use a viable alternative target.

---

# 19. Safety Architecture

Safety checks execute independently of the LLM.

```text
patient answer
 ↓
deterministic safety rules
 ↓
red flag / contradiction state
 ↓
question-selection constraints
 ↓
doctor priority
```

Current configured safety includes rules for selected:

```text
high-risk chest-pain combinations
critical pain severity
febrile illness with respiratory difficulty
gastrointestinal bleeding / melena
```

Safety outputs are alerts or priority-review signals, not autonomous diagnoses.

---

# 20. Contradiction Detection

Contradictions must remain explicit.

Example:

```text
Patient:
stopped medication

Document:
medication listed

Result:
INFORMATION_CONFLICT
```

The system must not silently choose one source.

Physician review resolves the conflict.

---

# 21. AYUSH Technical Architecture

## 21.1 Core Principle

AYUSH is integrated into the same adaptive engine.

```text
Unified Adaptive Engine
        |
        +-- Modern clinical candidates
        |
        +-- AYUSH candidates
```

There is no independent AYUSH chatbot or second unbounded interview loop.

## 21.2 Workflow Types

```text
GENERAL_CLINICAL
AYUSH
DUAL_SYSTEM
```

For detailed AYUSH assessment, the first concrete system is:

```text
AYURVEDA
```

The architecture remains extensible to other AYUSH systems.

---

# 22. AYUSH Assessment Model

The richer target model is:

```text
AyushAssessment
├── system
├── dimensions
├── ahara_vihara
├── evidence
├── confidence
├── uncertainties
├── overall_status
└── physician_review
```

The existing:

```text
ClinicalState.ayush
```

remains compatible as the adaptive working representation.

The richer assessment should be added additively.

---

# 23. Ayurveda Parameters

Current/core:

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha evidence
```

Expanded adaptive targets:

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

These are not a fixed questionnaire.

---

# 24. AYUSH Dimension State

AYUSH dimensions should use the same state principles as the core adaptive engine:

```text
UNKNOWN
KNOWN_TRUE
KNOWN_FALSE
AMBIGUOUS
KNOWN_WITH_VALUE
```

Each important dimension should support, where applicable:

```text
value
status
confidence
source
evidence
last_updated_turn
```

This avoids building a second incompatible state system.

---

# 25. AYUSH Adaptive Candidate Selection

An AYUSH dimension may enter the candidate pool only when:

```text
AYUSH/Ayurveda workflow active
AND
dimension relevant
AND
dimension unresolved
AND
not duplicated
AND
expected information gain is meaningful
AND
no higher-priority safety requirement blocks it
```

In `DUAL_SYSTEM`, modern and AYUSH candidates compete in the same decision process.

Safety always takes precedence.

---

# 26. AYUSH Provenance

Supported source categories:

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

A physician-confirmed value must remain distinguishable from an AI inference.

The system must not present an AI-inferred Prakriti/Vikriti classification as definitive clinical truth.

---

# 27. AYUSH Evidence

Important AYUSH findings should retain supporting evidence.

Possible evidence sources:

```text
QuestionEvent
Answer
Document
Physician edit
```

Conceptually:

```text
AYUSH dimension
 ↓
assessment value
 ↓
evidence[]
```

This supports physician verification and auditability.

---

# 28. AYUSH RAG

The AYUSH RAG subsystem is used for bounded knowledge grounding.

```text
Selected AYUSH target
 ↓
retrieve relevant reference context
 ↓
bounded question/extraction context
```

The RAG system must NOT autonomously produce:

```text
diagnosis
treatment
prescription
```

General AYUSH knowledge and patient-specific evidence must remain logically distinct.

The current implementation stores embeddings relationally and performs similarity retrieval in application code. Native vector indexing remains a future optimization.

---

# 29. AYUSH and Documents

A previous AYUSH case sheet can contribute evidence.

Pipeline:

```text
Document
 ↓
OCR
 ↓
candidate extraction
 ↓
evidence validation
 ↓
AYUSH-related candidate
 ↓
review / confirmation
```

Document evidence must not silently overwrite patient-stated information.

---

# 30. AYUSH Physician Review

The physician can:

```text
edit
confirm
reject
annotate
resolve contradiction
```

Important changes remain auditable through the existing physician review/edit/audit architecture.

The system must never present autonomous AYUSH treatment or diagnosis as a physician-approved result.

---

# 31. Speech Architecture

Voice flow:

```text
Patient microphone
 ↓
frontend audio capture
 ↓
FastAPI
 ↓
SpeechService
 ↓
Sarvam / Bhashini / fallback
 ↓
normalized text
 ↓
shared clinical engine
```

Response:

```text
question text
 ↓
SpeechService
 ↓
TTS provider
 ↓
patient audio
```

Voice and text must converge after input normalization.

---

# 32. Multilingual Requirements

The backend must support language metadata throughout the intake:

```text
language_code
```

Current verified end-to-end support includes:

```text
English
Hindi
Marathi
```

Additional language UI support may exist without implying full end-to-end speech/clinical localization.

The technical architecture must keep language handling separate from clinical reasoning.

---

# 33. Document Intelligence Architecture

```text
Upload
 ↓
validation
 ↓
SHA-256 / deduplication
 ↓
private storage
 ↓
DocumentModel
 ↓
OCR
 ↓
OCR evidence blocks
 ↓
candidate extraction
 ↓
evidence validation
 ↓
doctor review
```

## Current storage

The current prototype uses private local filesystem storage.

## Production direction

Private cloud/Supabase object storage may replace local storage without changing the logical document workflow.

---

# 34. OCR Requirements

OCR must produce evidence, not unquestionable truth.

Persist, where supported:

```text
raw OCR text
bounding boxes
confidence
page
provider
run metadata
```

Candidate extraction must be grounded in OCR evidence.

Uncertain candidates must remain reviewable.

---

# 35. Authentication and Authorization

Authentication uses the current JWT architecture.

Server-side authorization is mandatory for protected resources.

Roles include current staff/admin role distinctions.

Rules:

```text
doctor access → authorized patient scope
admin access → authorized operational scope
document access → authenticated + authorized
```

Frontend route visibility is not a security control.

---

# 36. Doctor Queue and Review

The doctor queue reads from persisted intake/session data.

Priority sorting is based on deterministic triage signals and operational ordering.

Doctor detail must expose:

```text
clinical state
safety
contradictions
documents
AYUSH
conversation
physician review state
```

---

# 37. Realtime Architecture

Current implementation supports:

```text
WebSocket
+
HTTP polling fallback
```

The backend may broadcast queue events.

The frontend may periodically refresh as a resilience mechanism.

Realtime failure must not create duplicate clinical logic or false submission states.

---

# 38. FHIR / ABDM Technical Requirements

FHIR generation should consume validated structured data.

Preferred pipeline:

```text
patient input
 ↓
structured state
 ↓
physician review/confirmation
 ↓
FHIR mapper
 ↓
FHIR R4 Bundle
 ↓
ABDM/HIS integration boundary
```

ABDM simulation/testing must not be represented as live production connectivity.

---

# 39. Data Integrity

Important mutations should be performed transactionally where practical.

The system must avoid:

```text
DB state says completed
while
critical downstream persistence failed
```

For answer processing, maintain consistency among:

```text
Answer
QuestionEvent
ClinicalState version
RedFlag/Contradiction state
next QuestionEvent
```

Question/answer relational linkage must remain explicit.

---

# 40. Provider Failure Requirements

| Failure | Required response |
|---|---|
| LLM timeout | Retry → alternate provider → deterministic fallback |
| Speech failure | Alternate speech provider → text/touch fallback |
| OCR failure | Preserve document → mark processing failure/review state |
| RAG failure | Continue without non-essential grounding where safe |
| WebSocket failure | Polling fallback |
| Database failure | Explicit error; never falsely confirm |
| Upload failure | Explicit failure; do not mark uploaded |
| Invalid structured AI output | Reject → retry/fallback |

---

# 41. Mock Provider Requirements

Mock providers must implement the same interface contracts as real providers.

```text
Mock
 ↓
same interface
 ↓
same validation
 ↓
same application logic
```

Mocks are for:

- deterministic tests;
- offline development;
- controlled demos.

Mock mode must not create a second application architecture.

---

# 42. Observability

Log technical state transitions without exposing unnecessary sensitive information.

Useful technical identifiers include:

```text
session_id
question_event_id
workflow
target_field
provider
latency
decision
```

Do not log:

- API keys;
- raw secrets;
- unnecessary full medical documents;
- model chain-of-thought.

---

# 43. Testing Requirements

## Unit tests

Cover:

```text
ClinicalState merge
canonical dimensions
question scoring
duplicate detection
sufficiency
termination
fallback
safety
contradictions
FHIR mapping
AYUSH state
```

## Integration tests

Cover:

```text
answer
→ extraction
→ state
→ next question

voice
→ transcript
→ same clinical engine

document
→ OCR
→ candidate
→ evidence validation

submit
→ doctor queue

confirm
→ FHIR
```

## AYUSH tests

Cover:

```text
AYUSH workflow
DUAL_SYSTEM
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
expanded Dashavidha dimensions
provenance
confidence
physician confirmation
RAG grounding
```

## Regression

All existing modern clinical tests must remain green after AYUSH changes.

---

# 44. Performance Requirements

The system should optimize for:

```text
fast question turnaround
low provider latency
small patient interaction burden
efficient doctor review
```

Performance claims must only be published when measured.

Do not document unsupported hard latency guarantees.

---

# 45. Security / Privacy Requirements

Technical controls must include:

- server-side RBAC;
- protected document endpoints;
- secret isolation;
- session isolation;
- input validation;
- AI output validation;
- audit logging;
- minimum necessary data exposure.

Development/demo data must be synthetic.

---

# 46. Database Direction

PostgreSQL/Supabase is the production data direction.

SQLite remains useful for local development and deterministic testing when compatible.

The application should keep persistence logic sufficiently abstract to support the selected environment without changing clinical behavior.

---

# 47. Vector Retrieval Direction

Current:

```text
embedding stored relationally
+
Python/application cosine similarity
```

Target optimization:

```text
PostgreSQL pgvector
+
native vector distance
+
HNSW/appropriate vector index
```

This is an implementation optimization, not a reason to introduce a separate vector database.

---

# 48. Technical Definition of Done

The updated technical implementation is acceptable when:

```text
[ ] Existing modern clinical flow still works
[ ] Voice and text converge to the same clinical engine
[ ] ClinicalState remains structured and persisted
[ ] Canonical dimensions prevent repeated concepts
[ ] Safety remains deterministic
[ ] Termination remains application-controlled
[ ] Provider failures have fallback behavior
[ ] Documents remain source-verifiable
[ ] Doctor handoff uses persisted backend data
[ ] AYUSH remains inside the shared adaptive engine
[ ] Ayurveda is the first detailed AYUSH assessment system
[ ] Expanded AYUSH dimensions are adaptive, not a fixed checklist
[ ] AYUSH provenance is explicit
[ ] Physician confirmation remains authoritative
[ ] Existing tests remain green
[ ] New AYUSH tests are added
[ ] No autonomous diagnosis or prescribing is introduced
```

---

# 49. Technical Priorities

## P0

```text
adaptive intake
ClinicalState
safety
doctor handoff
core AYUSH
voice/text convergence
```

## P1

```text
documents
provenance
contradictions
expanded AYUSH
doctor evidence UX
```

## P2

```text
cloud storage
native pgvector
additional AYUSH systems
deeper ABDM/HIS integration
advanced operational analytics
```

These are priorities within one product, not separate releases.

---

# 50. Architecture-to-PRD Traceability

| PRD Requirement | Technical Implementation |
|---|---|
| Adaptive intake | `adaptive_engine` + scoring + canonical state |
| One question at a time | QuestionDecision + QuestionEvent |
| Multilingual | language metadata + speech/LLM provider adapters |
| Voice/text/touch | shared `process_intake_answer_core` |
| Structured state | ClinicalStateModel |
| Safety | deterministic red-flag rules |
| Contradictions | contradiction service/model |
| Documents | DocumentModel + OCR/evidence pipeline |
| AYUSH | shared adaptive engine + AyushAssessment direction |
| Physician review | PhysicianReview / PhysicianEdit |
| FHIR | mapper + validated structured state |
| Provider resilience | adapter + fallback architecture |
| Auditability | versioned state + audit events |

---

# 51. Final Engineering Principle

> **The technical architecture should make probabilistic AI useful without allowing it to become the authority over clinical state, safety, persistence, or physician decisions.**

The strongest implementation is:

```text
AI for interpretation
+
deterministic application control
+
structured evidence
+
adaptive questioning
+
physician authority
```

and for AYUSH:

```text
ONE adaptive engine
+
Ayurveda assessment dimensions
+
evidence/provenance
+
physician review
```
