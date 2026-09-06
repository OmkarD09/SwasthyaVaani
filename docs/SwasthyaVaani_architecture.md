# SwasthyaVaani — System Architecture

> **Status:** Final target architecture for the current SwasthyaVaani evolution  
> **Purpose:** Define the system structure, boundaries, data flows, AI architecture, AYUSH architecture, safety controls, and integration model that the implementation and subsequent technical documents should follow.
>
> **Primary references:** `SwasthyaVaani_Current_Project_State.md`, `SwasthyaVaani_architecture_v2 (1).md`, original PRD/TRD/App Flow/Backend Schema/Rules, and the AYUSH Implementation Specification.
>
> **Important:** This document preserves the original SwasthyaVaani architecture and evolves it to reflect the verified current implementation and the v2 direction. It is not a greenfield rebuild.

---

# 1. Architecture Goal

SwasthyaVaani is an **AI-assisted pre-consultation clinical intake platform** for structured patient-to-doctor handoff.

The architecture supports three roles:

```text
PATIENT
DOCTOR
ADMINISTRATOR
```

The core clinical journey is:

```text
Patient
  ↓
Multilingual Voice / Text / Touch Intake
  ↓
Adaptive Clinical Interview
  ↓
Structured ClinicalState
  ↓
Safety / Validation
  ↓
Documents / Evidence
  ↓
Patient Review
  ↓
Doctor Queue
  ↓
Physician Review
  ↓
Physician Confirmation
  ↓
FHIR / ABDM-compatible output
```

The system is designed around:

```text
Probabilistic AI
        +
Deterministic application control
        +
Human physician authority
```

---

# 2. Core Architectural Principles

## 2.1 Physician Authority

```text
AI assists
   ↓
Doctor verifies
   ↓
Doctor decides
```

The system does not autonomously diagnose, prescribe, or make the final clinical decision.

## 2.2 One Adaptive Engine

Modern clinical intake and AYUSH intake use the same core reasoning infrastructure.

```text
ONE ADAPTIVE ENGINE
       |
       +-- Modern clinical dimensions
       |
       +-- AYUSH assessment dimensions
```

AYUSH is not implemented as a disconnected chatbot or independent interview loop.

## 2.3 Deterministic Control

The application, not the LLM, controls:

- safety;
- authorization;
- persistence;
- duplicate rejection;
- sufficiency;
- termination;
- question limits;
- physician confirmation.

## 2.4 Provider Abstraction

External providers are isolated behind interfaces/adapters so the platform remains testable and can operate with controlled fallbacks.

## 2.5 Evidence and Provenance

Important patient information should remain traceable to:

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

## 2.6 Modular Monolith

The current prototype remains a modular monolith.

Do not introduce microservices without a concrete operational requirement.

---

# 3. System Context

```text
                         SWASTHYAVAANI
                               |
        +----------------------+----------------------+
        |                      |                      |
   PATIENT CLIENT         DOCTOR CLIENT         ADMIN CLIENT
   Tablet / Kiosk         Desktop / Laptop     Desktop / Laptop
        |                      |                      |
        +----------------------+----------------------+
                               |
                          FASTAPI API
                               |
      +------------------------+------------------------+
      |                        |                        |
   Intake / AI             Documents                 Safety
      |                        |                        |
      +------------------------+------------------------+
                               |
                    Structured Patient Record
                               |
        +----------------------+----------------------+
        |                      |                      |
    PostgreSQL/SQLite      Private Storage         Knowledge Base
        |                                             |
        +----------------------+----------------------+
                               |
                     FHIR / ABDM Adapters
```

---

# 4. Client Architecture

## 4.1 Patient Client

Primary responsibilities:

```text
Collect
Explain
Confirm
Submit
```

The patient client handles:

- language;
- demographics;
- interaction mode;
- consent;
- voice/text/touch input;
- document upload;
- review;
- submission.

The patient client does **not** contain clinical decision logic.

## 4.2 Doctor Client

Primary responsibilities:

```text
Receive
Review
Edit
Confirm
```

The doctor client displays:

- triage priority;
- structured clinical state;
- safety alerts;
- contradictions;
- AYUSH assessment;
- documents and OCR evidence;
- conversation timeline;
- physician editing and confirmation.

The backend remains authoritative for access control and persistence.

## 4.3 Admin Client

Primary responsibilities:

```text
Configure
Monitor
Audit
```

The admin portal manages operational configuration, staff, services, QA, and audit visibility.

---

# 5. Current Technology Stack

## Frontend

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

## Persistence

```text
SQLite — local development/current prototype
PostgreSQL / Supabase — production direction
```

## AI / ML

```text
Groq
Google Gemini
PaddleOCR
Sarvam Speech
Bhashini
Embedding provider
Mock providers
```

## Interoperability

```text
FHIR R4
ABDM / NRCES India Core mapping
```

---

# 6. Logical Backend Modules

The modular monolith is organized into logical domains:

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

Within the clinical AI domain:

```text
domain_classifier
gap_analysis
question_scorer
adaptive_engine
fact extraction
```

The provider layer contains replaceable adapters for:

```text
LLM
Speech
OCR
Embeddings
```

---

# 7. End-to-End Patient Intake Flow

```text
Patient Entry
    ↓
Language
    ↓
Demographics / Patient Context
    ↓
Interaction Mode
    ↓
Consent
    ↓
Intake Session Creation
    ↓
Chief Complaint
    ↓
Adaptive Interview
    ↓
┌─────────────────────────────┐
│ Unified Adaptive Engine     │
│                             │
│ Modern Clinical Dimensions  │
│          +                  │
│ AYUSH Dimensions             │
└──────────────┬──────────────┘
               ↓
Safety / Contradictions
               ↓
Information Sufficiency
               ↓
ASK / STOP / ESCALATE
               ↓
Documents / Evidence
               ↓
Patient Review
               ↓
Submit
               ↓
Doctor Queue
```

---

# 8. Intake Request Architecture

## Text / Touch

```text
POST /api/v1/intakes/{id}/answers
        ↓
process_intake_answer_core()
```

## Voice

```text
POST /api/v1/intakes/{id}/voice-answer
        ↓
Speech Provider
        ↓
Normalized Transcript
        ↓
process_intake_answer_core()
```

Both modalities converge at the same clinical reasoning engine.

Therefore:

```text
VOICE
   \
    → same ClinicalState → same adaptive decision
   /
TEXT / TOUCH
```

---

# 9. Clinical Intelligence Pipeline

The canonical processing pipeline is:

```text
Patient Answer
      ↓
1. Input normalization
      ↓
2. Fact extraction
      ↓
3. Schema validation
      ↓
4. ClinicalState / AYUSH state merge
      ↓
5. Deterministic safety evaluation
      ↓
6. Domain / workflow classification
      ↓
7. Relevant information-gap detection
      ↓
8. Candidate dimension generation
      ↓
9. Candidate scoring / information gain
      ↓
10. Resolved-field + semantic duplicate rejection
      ↓
11. Sufficiency evaluation
      ↓
12. ASK / STOP / ESCALATE
      ↓
13. Question phrasing
      ↓
14. QuestionEvent persistence
```

The LLM is bounded to extraction and natural-language phrasing.

The application chooses the target dimension and controls termination.

---

# 10. Clinical State Architecture

The transcript is evidence, not the primary reasoning state.

```text
Raw conversation
      |
      +--> evidence
      |
      ↓
Structured ClinicalState
      |
      +--> adaptive engine
      +--> safety
      +--> summary
      +--> doctor UI
      +--> FHIR mapping
```

The current ClinicalState includes:

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

ClinicalState versions are persisted so state evolution is auditable.

---

# 11. Canonical Dimension Architecture

The adaptive engine maps aliases to canonical clinical dimensions.

Conceptually:

```text
"How long?"
"Since when?"
"for 3 days?"
       ↓
symptom_duration
```

and:

```text
blurred vision
vision blur
difficulty seeing
       ↓
blurred_vision
```

Canonical state prevents logically equivalent questions from being treated as separate unresolved fields.

Dimension state may be:

```text
UNKNOWN
KNOWN_TRUE
KNOWN_FALSE
AMBIGUOUS
KNOWN_WITH_VALUE
```

This state is used by question selection and duplicate prevention.

---

# 12. Adaptive Question Selection

The candidate pool can contain:

```text
Modern clinical candidates
        +
AYUSH candidates
```

Selection considers:

```text
Safety priority
+
clinical relevance
+
workflow relevance
+
information gain
+
new volunteered evidence
-
already known
-
duplicate
-
low-value candidate
```

Safety candidates always take precedence.

Exactly one question is delivered at a time.

---

# 13. Interview Termination

Normal termination is controlled by deterministic application logic.

Possible outcomes:

```text
ASK
STOP
ESCALATE
LIMITED_HISTORY
```

The interview can stop when:

- relevant information is sufficiently complete;
- there are no useful candidates;
- expected information gain is too low.

The system must not terminate solely because the LLM says so.

Question-limit and low-progress guardrails remain global.

The current implementation uses a hard maximum of 10 questions as a safety brake; this is a ceiling, not a target.

---

# 14. Safety Architecture

Safety executes independently of the LLM.

```text
Every patient answer
        ↓
Deterministic safety engine
        ↓
Red flag / contradiction result
        ↓
ClinicalState + safety records
        ↓
Doctor queue / review
```

Safety signals are:

```text
alerts
priority-review signals
```

not autonomous diagnoses.

Existing safety rules include configured handling for:

- high-risk chest-pain combinations;
- critical pain severity;
- fever with respiratory difficulty;
- gastrointestinal bleeding / melena.

Future safety rules must be deterministic, explicit, testable, and documented.

---

# 15. Document Intelligence Architecture

```text
Patient Upload
      ↓
File Validation
      ↓
SHA-256 / duplicate detection
      ↓
Private Storage
      ↓
DocumentModel
      ↓
OCR
      ↓
OCR Evidence Blocks
      ↓
Candidate Extraction
      ↓
Evidence Validation
      ↓
Needs Review / Candidate
      ↓
Doctor Review
```

Current implementation keeps medical documents on private local filesystem storage.

Production architecture may move storage to private cloud/Supabase storage without changing the logical document model.

OCR is treated as untrusted evidence.

Extracted candidates must be grounded in OCR evidence before being surfaced as valid candidates.

---

# 16. Document Provenance

Document-derived information should retain:

```text
document
OCR run
evidence block
candidate
confidence
review status
```

The original uploaded document is always preserved.

Document-derived facts must not silently overwrite patient-stated facts.

Contradictions remain explicit.

---

# 17. Knowledge / RAG Architecture

The RAG subsystem is separate from patient-specific evidence.

```text
Authoritative Knowledge
        ↓
KnowledgeDocument
        ↓
KnowledgeChunk
        ↓
Embedding
        ↓
Retrieval
        ↓
Bounded context
```

Current implementation uses relational storage for embeddings and performs cosine similarity retrieval in application code.

Native vector indexing such as pgvector/HNSW remains a future optimization rather than a prerequisite for the architecture.

Primary current use:

```text
AYUSH reference grounding
```

RAG must not autonomously generate:

- diagnosis;
- treatment;
- prescription.

---

# 18. AYUSH Architecture

## 18.1 Dual-System, Single Engine

AYUSH is a first-class workflow inside the same adaptive engine.

```text
                  Adaptive Engine
                       |
          +------------+------------+
          |                         |
   Modern dimensions          AYUSH dimensions
```

Workflow context:

```text
GENERAL_CLINICAL
AYUSH
DUAL_SYSTEM
```

## 18.2 AYUSH as an Umbrella

AYUSH is the broader system category.

The detailed assessment currently being implemented is primarily **Ayurveda**.

Therefore:

```text
AYUSH
  └── AYURVEDA
       ├── Prakriti
       ├── Vikriti
       ├── Agni
       ├── Koshtha
       ├── Ahara-Vihara
       └── Dashavidha parameters
```

The architecture remains extensible to other AYUSH systems without forcing Ayurveda-specific fields into every workflow.

---

# 19. Ayurveda Assessment Architecture

Current/core parameters:

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha evidence
```

Expanded target:

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

These expanded dimensions are candidate assessment targets, not a fixed questionnaire.

---

# 20. Adaptive AYUSH Questioning

AYUSH dimensions participate in the same candidate-selection pipeline.

A dimension is eligible when:

```text
AYUSH workflow active
AND
relevant
AND
unresolved
AND
not duplicated
AND
expected information gain is meaningful
AND
not blocked by safety
```

Therefore:

```text
AYUSH intake
≠
10-question checklist
```

Instead:

```text
Observed patient information
        ↓
AYUSH evidence
        ↓
candidate dimensions
        ↓
information gain
        ↓
ONE useful question
```

---

# 21. AYUSH Assessment State

The target rich assessment model is:

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

The existing `ClinicalState.ayush` representation remains compatible with this direction.

A richer `AyushAssessmentModel` can evolve additively rather than replacing working state.

---

# 22. AYUSH Provenance

AYUSH must distinguish:

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

Example:

```text
Prakriti
    value: preliminary Pitta-dominant
    source: AI_INFERRED
    confidence: 0.74
    status: NEEDS_REVIEW
```

This is not equivalent to:

```text
Prakriti
    value: Pitta-dominant
    source: PHYSICIAN_CONFIRMED
```

Evidence should remain inspectable where possible.

---

# 23. Prakriti / Vikriti Safety Boundary

The system must not present an AI-derived constitutional classification as an unquestionable clinical fact.

Preferred lifecycle:

```text
Patient observations
       ↓
Structured evidence
       ↓
Preliminary inference
       ↓
Needs physician review
       ↓
Physician confirmation
```

There is no autonomous Ayurvedic diagnosis or treatment recommendation.

---

# 24. AYUSH + RAG

For AYUSH-related questions:

```text
Selected AYUSH target
        ↓
Relevant reference retrieval
        ↓
Bounded authoritative context
        ↓
Question phrasing
```

Knowledge retrieval grounds terminology and question framing.

It does not authorize:

```text
diagnosis
treatment
prescription
```

Patient-specific evidence remains separate from general knowledge.

---

# 25. AYUSH + Documents

A prior AYUSH case sheet or related document can contribute evidence:

```text
Document
 ↓
OCR
 ↓
Candidate extraction
 ↓
Evidence validation
 ↓
AYUSH-related fact
 ↓
Review / confirmation
 ↓
AyushAssessment
```

Conflicting patient/document information must remain explicit rather than silently resolving the conflict.

---

# 26. Doctor Handoff Architecture

The patient-to-doctor boundary should contain:

```text
Patient identity/reference
Hospital
Doctor
Workflow
Language
Interaction mode
Chief complaint
ClinicalState
AYUSH assessment where relevant
Patient-confirmed information
Safety alerts
Contradictions
Documents
Provenance
Timeline
Timestamp
```

The handoff is a **structured dossier**, not merely a chat transcript.

---

# 27. Doctor Workstation

The doctor receives:

```text
Patient Context
      ↓
Triage Priority
      ↓
Clinical Summary
      ↓
Safety / Contradictions
      ↓
AYUSH Assessment
      ↓
Documents / OCR Evidence
      ↓
Conversation Timeline
      ↓
Physician Edit
      ↓
Physician Confirm
```

Current doctor-side AYUSH visualization includes:

- Agni;
- Koshtha;
- Prakriti;
- Tri-Dosha representation.

The target experience adds:

- assessment status;
- source/provenance;
- evidence;
- confidence;
- expanded Dashavidha summary;
- physician confirmation state.

---

# 28. Physician Review Architecture

Doctor actions remain explicit:

```text
Review
Edit
Confirm
```

Physician edits should retain:

```text
field
old value
new value
reason
doctor
timestamp
```

This is recorded using the existing physician review/edit/audit architecture.

---

# 29. Authentication and Authorization

Authentication uses the current JWT-based architecture.

Authorization is enforced server-side.

Roles include current staff/admin distinctions already present in the implementation.

Patient kiosk sessions are intentionally lightweight and session-scoped.

Medical document access must remain private and authorized.

Frontend role state is never considered authoritative for security decisions.

---

# 30. Realtime Architecture

Doctor queue updates support:

```text
WebSocket
+
HTTP polling fallback
```

Current backend broadcasting uses the doctor queue WebSocket.

The doctor frontend also uses periodic queue fetching as a resilient fallback.

This is a reliability feature, not competing clinical logic.

---

# 31. FHIR / ABDM Architecture

The interoperability boundary is:

```text
Physician-confirmed data
        ↓
FHIR mapping
        ↓
FHIR R4 Bundle
        ↓
ABDM / HIS adapter
```

Current implementation includes FHIR mapping and ABDM/NRCES validation/simulation paths.

Live external integration must only be claimed when actually connected and tested.

---

# 32. Data Persistence Architecture

Primary entities include:

```text
Users
Patients
Hospitals
Departments
Doctors

IntakeSessions
QuestionEvents
Answers
ClinicalStates

Documents
DocumentOCRRuns
DocumentOCREvidence
DocumentCandidates
DocumentCandidateEvidenceLinks
DocumentExtractions

RedFlags
Contradictions

PhysicianReviews
PhysicianEdits
AuditEvents

KnowledgeDocuments
KnowledgeChunks
```

ClinicalState versions are retained as immutable history in the current design.

---

# 33. Provider Architecture

External services are accessed through abstractions:

```text
LLMProvider
SpeechProvider
OCRProvider
EmbeddingProvider
```

Provider examples:

```text
Groq
Gemini
Sarvam
Bhashini
PaddleOCR
Mock providers
```

Provider failure path:

```text
Primary provider
    ↓
retry / fallback
    ↓
secondary provider or deterministic mock
    ↓
limited-history handling if necessary
```

The application remains functional during controlled provider failure.

---

# 34. Security and Privacy Boundaries

Protect:

```text
patient identity
clinical state
documents
audio/transcripts where stored
AYUSH assessment
doctor notes
audit records
```

Do not:

- expose API secrets to the browser;
- expose private medical documents without authorization;
- treat local UI state as secure clinical storage;
- silently merge records across sessions.

---

# 35. Current vs Target Architecture Status

## Current / Verified

```text
🟢 Shared adaptive engine
🟢 ClinicalState
🟢 Canonical dimension handling
🟢 Deterministic safety
🟢 Voice/text convergence
🟢 Document OCR/evidence pipeline
🟢 Doctor queue and review
🟢 Baseline AYUSH workflow
🟢 AYUSH RAG
🟢 FHIR/ABDM mapping paths
🟢 Provider abstraction
```

## Refinement / Target

```text
🟡 Rich AyushAssessmentModel
🟡 Expanded Dashavidha implementation
🟡 Full evidence-linked AYUSH review experience
🟡 Native vector indexing
🟡 Cloud/private object storage
🟡 More dynamic kiosk identity/doctor selection
```

The exact status of each item should be maintained in the current project state audit and implementation plan rather than inferred from this architecture alone.

---

# 36. Architecture Quality Rules

A change is architecturally acceptable when it:

```text
preserves existing working behavior
+
has a clear bounded responsibility
+
uses typed contracts
+
preserves provenance
+
keeps safety deterministic
+
keeps physician authority
+
does not duplicate existing reasoning loops
```

Avoid changes that:

```text
create unnecessary microservices
duplicate adaptive engines
duplicate patient records
mix general knowledge with patient evidence
move clinical logic into UI
allow unvalidated LLM output to directly control state
```

---

# 37. Canonical Architecture Diagram

```text
                              PATIENT
                                 |
                    Voice / Text / Touch
                                 |
                                 v
                         FastAPI Intake API
                                 |
                                 v
                       Input Normalization
                                 |
                                 v
                         Fact Extraction
                                 |
                                 v
                    +-----------------------+
                    | Unified Clinical State|
                    |                       |
                    | ClinicalState         |
                    | AyushAssessment       |
                    | Evidence / Provenance |
                    +-----------+-----------+
                                |
                +---------------+---------------+
                |               |               |
                v               v               v
          Safety Engine   Adaptive Engine    Documents
                              |
                  +-----------+-----------+
                  |                       |
                  v                       v
          Modern dimensions       AYUSH dimensions
                                          |
                                          v
                                  Ayurveda Assessment
                                          |
                         +----------------+----------------+
                         |                                 |
                         v                                 v
                   AYUSH RAG                       Evidence / Review
                         |                                 |
                         +----------------+----------------+
                                          |
                                          v
                               ASK / STOP / ESCALATE
                                          |
                                          v
                                   Patient Review
                                          |
                                          v
                                      Submit
                                          |
                                          v
                                   Doctor Queue
                                          |
                                          v
                               Physician Review
                                          |
                                  Edit / Confirm
                                          |
                             +------------+------------+
                             |                         |
                             v                         v
                          FHIR R4                 Audit Trail
                             |
                             v
                        ABDM / HIS
```

---

# 38. Final Architectural Principle

> **SwasthyaVaani is a structured clinical intake and handoff system in which AI interprets patient language, deterministic logic controls the workflow, evidence and uncertainty remain visible, AYUSH is integrated through the same adaptive engine, and the physician remains the final clinical authority.**

The architecture should evolve incrementally from the current working system rather than replacing it.
