# SwasthyaVaani — Product Requirements Document

> **Status:** Updated product source of truth
>
> **Purpose:** Define what SwasthyaVaani is, what it must do, what it must not do, and how the product should evolve from the verified current implementation toward the finalized architecture.
>
> **Primary references:** `SwasthyaVaani_Current_Project_State.md`, final `SwasthyaVaani_architecture.md`, original PRD, TRD, App Flow, Backend Schema, Rules, and AYUSH Implementation Specification.
>
> **Important:** This is an evolution of the existing SwasthyaVaani product, not a greenfield replacement.

---

## 0. Project Identity

```yaml
project_name: SwasthyaVaani
problem_statement: "SIH 2026 PS 26047 — Patient Case-Taking Software"
product_type: "AI-assisted pre-consultation clinical intake platform"
primary_value: "Intelligent first-mile clinical data collection and structured patient-to-doctor handoff"
roles:
  - patient
  - doctor
  - administrator
tagline: "Your story, structured before the consultation."
```

### Product definition

SwasthyaVaani collects a patient's health story before consultation, adaptively asks only relevant follow-up questions, structures patient-reported and supporting-record information, surfaces deterministic safety signals, and delivers a physician-reviewable clinical dossier.

The platform supports modern clinical history and an AYUSH pathway within the same adaptive intake architecture.

### Core principle

```text
AI assists
    ↓
Doctor verifies
    ↓
Doctor decides
```

SwasthyaVaani is not intended to replace the physician.

---

# 1. Product Goals

1. Collect useful patient history before consultation.
2. Reduce the information burden placed on the physician during the first minutes of a consultation.
3. Support voice, text, and touch-based patient interaction.
4. Support Indian-language patient interaction.
5. Ask adaptive, context-aware questions instead of a universal fixed questionnaire.
6. Minimize unnecessary questioning through Minimum Sufficient History.
7. Preserve a structured ClinicalState rather than relying on raw conversation alone.
8. Capture supporting evidence from previous medical records.
9. Preserve provenance and uncertainty.
10. Surface configured deterministic red-flag and contradiction signals.
11. Support an integrated AYUSH workflow, with Ayurveda as the first detailed AYUSH assessment profile.
12. Provide a structured, editable, physician-reviewable handoff.
13. Preserve a chronological patient timeline where data is available.
14. Provide FHIR-compatible interoperability boundaries.
15. Keep external AI/speech/OCR providers replaceable.
16. Keep the platform useful during controlled provider failures.

---

# 2. Core Product Value Proposition

The core problem is not that doctors lack access to another chatbot.

The problem is that a patient often reaches the consultation with:

```text
unstructured story
+
incomplete history
+
language barriers
+
old documents
+
uncertain medication/history information
```

SwasthyaVaani transforms this into:

```text
patient story
    ↓
adaptive questioning
    ↓
structured clinical state
    ↓
supporting evidence
    ↓
safety signals
    ↓
physician-reviewable dossier
```

The product therefore focuses on **clinical intake and handoff**, not autonomous clinical decision-making.

---

# 3. Non-Goals

SwasthyaVaani must NOT:

- autonomously diagnose disease;
- prescribe medication or treatment;
- replace a physician;
- make final clinical decisions;
- silently invent missing clinical facts;
- silently resolve conflicting sources;
- claim perfect handwriting recognition;
- force every Indian language into the initial scope;
- force every disease or specialty into the initial scope;
- use real patient records for development/demo without an approved controlled workflow;
- claim live ABDM/HIS connectivity unless an actual tested integration exists;
- claim regulatory compliance solely from UI or documentation;
- expose internal model reasoning/chain-of-thought;
- allow an LLM to control safety, authorization, persistence, or final termination.

---

# 4. User Roles

## 4.1 Patient

The patient can:

- start an intake;
- provide demographics;
- select/confirm the relevant hospital context;
- select/confirm the doctor or clinic context when the deployment supports it;
- select language;
- select voice/text/touch interaction;
- provide consent;
- describe the chief complaint naturally;
- answer adaptive questions;
- answer relevant AYUSH questions;
- upload supporting medical records;
- review captured information;
- correct information;
- submit the intake.

## 4.2 Doctor

The doctor can:

- authenticate;
- view a prioritized intake queue;
- open a patient dossier;
- review structured clinical information;
- review evidence and provenance;
- inspect red flags and contradictions;
- inspect previous medical documents;
- inspect the conversation timeline;
- review AYUSH information where applicable;
- edit or reject AI-derived information;
- add clinical notes;
- confirm the record.

## 4.3 Administrator

The administrator can:

- manage hospitals;
- manage departments;
- manage doctors/staff;
- configure supported workflows;
- inspect service health;
- inspect QA and audit information;
- manage operational settings according to authorization.

---

# 5. Primary Product Journeys

## Patient → Doctor

```text
Patient entry
   ↓
Patient context
   ↓
Language
   ↓
Interaction mode
   ↓
Consent
   ↓
Chief complaint
   ↓
Adaptive history
   ↓
AYUSH assessment when relevant
   ↓
Document upload
   ↓
Patient review
   ↓
Submit
   ↓
Doctor queue
   ↓
Doctor review
   ↓
Doctor confirmation
```

## Administrator

```text
Authentication
   ↓
Operations
   ↓
Configuration
   ↓
Monitoring
   ↓
Audit
```

---

# 6. Patient Experience

The patient experience must feel:

- simple;
- calm;
- respectful;
- multilingual;
- voice-friendly;
- accessible;
- non-technical.

The patient should not need to understand concepts such as:

```text
ClinicalState
information gain
canonical dimension
RAG
provenance
```

The system should translate those internal concepts into natural patient-facing interaction.

---

# 7. Adaptive Intake Experience

The central experience is conversational but structured.

```text
Patient answer
    ↓
System understands
    ↓
Relevant information identified
    ↓
One useful next question
    ↓
Patient answer
    ↓
Repeat until sufficient
```

The interface should communicate progress without implying a fixed question count.

Prefer:

```text
Health history in progress
```

over:

```text
Question 4 of 10
```

because the interview is intentionally dynamic.

---

# 8. Voice, Text, and Touch

Voice and text/touch are different input modalities over the same clinical engine.

```text
VOICE
  ↓
Speech recognition
  ↓
normalized text
  ↓
shared clinical engine

TEXT / TOUCH
  ↓
normalized text/selection
  ↓
shared clinical engine
```

The clinical state and question-selection behavior should remain semantically equivalent for equivalent answers.

---

# 9. Language Support

The product is designed for Indian multilingual interaction.

Current verified end-to-end support includes:

```text
English
Hindi
Marathi
```

The architecture permits additional Indian languages.

A language may have partial UI translation while still using a common clinical reasoning backend; documentation must distinguish language-selection support from fully localized end-to-end support.

---

# 10. Consent

Clinical information collection requires an explicit consent step in the intended patient journey.

The user should be informed:

- what information is being collected;
- why it is being collected;
- who will receive it;
- that AI assists information organization;
- that a healthcare professional remains responsible for clinical decisions.

Consent UX must not make unsupported legal/compliance claims.

---

# 11. Patient Identity and Context

The final product should avoid coupling patient identity to arbitrary client-side mock profiles.

The system should prefer:

```text
patient/session context
    ↓
backend persistence
    ↓
authorized doctor retrieval
```

Demo defaults may exist for controlled demonstrations, but must be clearly isolated from production identity handling.

---

# 12. Clinical Intake

The patient may provide a natural-language complaint such as:

> "My stomach has been burning since yesterday."

The system should structure what is actually stated.

Example:

```json
{
  "chief_complaint": "stomach burning",
  "duration": "since yesterday"
}
```

This remains patient-reported information.

It is not automatically a diagnosis.

---

# 13. Adaptive Clinical Interview Requirements

The interview must:

1. ask one meaningful question at a time;
2. use the current structured state;
3. identify relevant information gaps;
4. prioritize higher-value questions;
5. avoid resolved information;
6. prevent semantic duplicates;
7. handle ambiguous answers;
8. handle non-informative answers;
9. support open exploration;
10. support targeted follow-up;
11. respect safety rules;
12. stop when sufficient;
13. avoid arbitrary questioning.

The interview must not behave like a static universal checklist.

---

# 14. Minimum Sufficient History

Minimum Sufficient History means:

```text
minimum necessary questions
+
maximum relevant information
```

The question count is dynamic.

A simple complaint may finish quickly.

A complex presentation may require more questions.

The product must optimize for information quality, not maximum question count.

---

# 15. Adaptive Question Safety

The application, not the LLM, controls:

```text
question target
duplicate rejection
sufficiency
termination
question ceiling
safety escalation
```

The LLM may phrase a question after a validated target has been selected.

---

# 16. Clinical State

The platform maintains a structured `ClinicalState` separately from the raw conversation.

ClinicalState can contain:

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
AYUSH state
documents
red flags
contradictions
uncertainties
canonical dimensions
```

The exact implementation may extend these fields as validated requirements evolve.

---

# 17. Evidence and Provenance

Important information should communicate its origin.

Supported conceptual sources:

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

A doctor should be able to distinguish:

```text
patient explicitly reported X
```

from:

```text
AI inferred X from multiple observations
```

and:

```text
physician confirmed X
```

Uncertainty must remain visible.

---

# 18. Safety and Red Flags

Safety is a deterministic application responsibility.

Every relevant patient answer may be evaluated against configured safety rules.

A safety result may produce:

```text
PRIORITY_REVIEW
```

or another explicitly configured review state.

It must not produce an autonomous diagnosis.

The current product includes deterministic rules for configured high-risk combinations, including critical pain severity, selected chest-pain combinations, febrile respiratory difficulty, and gastrointestinal bleeding/melena signals.

---

# 19. Contradictions

When information sources disagree, the system should surface the conflict.

Example:

```text
Patient:
"Stopped medicine."

Previous record:
Medicine listed as active.

Result:
INFORMATION CONFLICT
```

The system should not silently choose one source.

The physician resolves the conflict.

---

# 20. Document Intelligence

Patients can provide supporting documents such as:

- prescriptions;
- laboratory reports;
- previous medical records;
- relevant AYUSH records.

Product flow:

```text
Upload
 ↓
Validation
 ↓
Private storage
 ↓
OCR
 ↓
Evidence blocks
 ↓
Candidate extraction
 ↓
Evidence validation
 ↓
Doctor review
```

The original document must remain available for physician inspection.

OCR is not considered clinical truth.

---

# 21. Doctor Handoff

The product's main output is a structured dossier rather than a transcript alone.

The dossier may contain:

```text
Patient context
Chief complaint
Structured symptoms
History dimensions
Medications
Allergies
Investigations
Safety signals
Contradictions
AYUSH assessment
Supporting documents
OCR evidence
Conversation timeline
Provenance
Uncertainty
```

The doctor remains the final authority.

---

# 22. AYUSH Product Requirements

AYUSH is a first-class pathway inside SwasthyaVaani's adaptive intake.

It must not be implemented as:

```text
separate chatbot
```

or:

```text
fixed AYUSH form
```

Instead:

```text
shared adaptive engine
        +
AYUSH assessment dimensions
```

---

# 23. AYUSH Workflow Modes

The product supports conceptually:

```text
GENERAL_CLINICAL
AYUSH
DUAL_SYSTEM
```

### GENERAL_CLINICAL

Modern clinical dimensions are prioritized.

### AYUSH

AYUSH assessment dimensions participate in adaptive questioning.

For the detailed current implementation, the AYUSH system profile is Ayurveda.

### DUAL_SYSTEM

Modern clinical and Ayurveda assessment dimensions can compete in the same adaptive candidate pool where relevant.

Safety remains higher priority than either pathway.

---

# 24. AYUSH System Model

AYUSH is the umbrella category.

The detailed assessment currently being developed is primarily Ayurveda-specific.

Target extensibility:

```text
AYUSH
├── Ayurveda
├── Yoga & Naturopathy
├── Unani
├── Siddha
└── Homoeopathy
```

The product must not falsely imply that Ayurveda-specific dimensions are universal to all AYUSH systems.

---

# 25. Ayurveda Assessment

The current baseline includes:

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha evidence
```

The expanded target includes:

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

The expanded parameters are adaptive information targets, not a mandatory question list.

---

# 26. AYUSH Adaptive Behavior

An AYUSH parameter becomes eligible when:

```text
AYUSH/Ayurveda workflow active
AND
parameter relevant
AND
parameter unresolved
AND
not duplicated
AND
information gain is meaningful
AND
not blocked by safety
```

Therefore:

```text
AYUSH intake
≠
"ask all ten Dashavidha questions"
```

The patient burden remains a product consideration.

---

# 27. AYUSH Assessment Status

AYUSH findings should support states such as:

```text
UNKNOWN
AMBIGUOUS
PRELIMINARY
NEEDS_REVIEW
PHYSICIAN_CONFIRMED
```

A value inferred by AI must not appear equivalent to a physician-confirmed assessment.

---

# 28. AYUSH Evidence Model

A useful AYUSH assessment should be traceable.

Example:

```text
Prakriti
Value: preliminary interpretation
Source: AI_INFERRED
Confidence: available when justified
Evidence:
  - patient responses
  - structured observations
Status: NEEDS_REVIEW
```

Evidence should remain inspectable by the physician where feasible.

---

# 29. AYUSH RAG

The AYUSH knowledge base can ground:

- terminology;
- question framing;
- assessment context.

It must not autonomously determine:

- diagnosis;
- treatment;
- prescription.

General AYUSH knowledge and patient-specific evidence must remain logically separated.

---

# 30. Doctor AYUSH Experience

When AYUSH is relevant, the doctor should see:

```text
AYUSH Assessment
    ↓
System: Ayurveda
    ↓
Core findings
    ↓
Dashavidha summary
    ↓
Ahara-Vihara
    ↓
Evidence / provenance
    ↓
Assessment status
    ↓
Physician review
```

A Dosha visualization may be used as a supporting visualization, but it must not be the sole source of clinical meaning.

---

# 31. Physician Review

The physician can:

- edit;
- confirm;
- reject;
- add notes;
- resolve contradictions;
- correct AI-derived AYUSH information.

Important physician changes should remain auditable.

---

# 32. AI Product Boundary

AI may assist with:

```text
language understanding
fact extraction
question phrasing
structured summary drafting
```

AI must not independently control:

```text
authorization
safety rules
final diagnosis
prescription
termination
physician confirmation
database writes
```

---

# 33. Provider Independence

The platform must not depend on one external AI provider for the entire product.

The architecture supports replaceable providers for:

```text
LLM
Speech
OCR
Embeddings
```

Controlled mock providers must remain available for tests and development.

---

# 34. Failure Behavior

External provider failure should result in:

```text
retry
→ alternate provider / deterministic fallback
→ limited-history or safe completion where appropriate
```

The product must not lose already persisted patient information because an external provider failed.

---

# 35. Doctor Queue

Submitted cases are prioritized according to deterministic triage signals and operational rules.

The queue should make high-priority cases visible without presenting them as diagnoses.

Example:

```text
PRIORITY REVIEW
```

rather than:

```text
Heart attack confirmed
```

---

# 36. Patient Timeline

Where data exists, the doctor should be able to see a chronological view containing:

```text
current intake
previous documents
patient-reported history
confirmed events
```

Each event should link to source evidence where practical.

---

# 37. Interoperability

The product should provide a FHIR R4-compatible mapping boundary.

The preferred flow is:

```text
patient input
→ structured/validated data
→ physician confirmation
→ FHIR mapping
→ external integration
```

ABDM/HIS connectivity is an integration boundary; a simulated/test endpoint must not be represented as a live production connection.

---

# 38. Privacy and Security Requirements

The product must protect:

- patient identity;
- clinical state;
- uploaded documents;
- doctor notes;
- AYUSH assessment;
- audit records.

Requirements:

- server-side authorization;
- role-based access;
- protected document retrieval;
- session isolation;
- secret management;
- auditability;
- synthetic demo data.

Client-side local state is not considered a secure clinical record.

---

# 39. Product Constraints

The following remain important implementation constraints:

```text
smallest coherent change
reuse existing components
no unrelated refactors
domain logic outside UI
typed AI outputs
deterministic safety
physician authority
provider abstraction
```

The product should evolve incrementally.

---

# 40. Current Implementation Baseline

According to the verified current-state audit, the current system already has:

```text
🟢 shared adaptive engine
🟢 ClinicalState
🟢 canonical dimension tracking
🟢 deterministic safety
🟢 voice/text convergence
🟢 document OCR and evidence linking
🟢 doctor queue and review
🟢 baseline AYUSH workflow
🟢 AYUSH RAG grounding
🟢 doctor AYUSH visualization
🟢 provider abstraction
🟢 FHIR/ABDM mapping paths
```

The current system also has known refinement areas such as:

```text
🟡 kiosk patient identity coupling
🟡 relational JSON vector retrieval rather than native pgvector
🟡 polling fallback in doctor queue
🟡 local private document storage rather than cloud storage
🟡 seeded hospital/doctor kiosk context
```

These are implementation realities, not reasons to redefine the product.

---

# 41. AYUSH Product Evolution

The AYUSH roadmap is:

```text
Current baseline
    ↓
Stronger structured assessment state
    ↓
Expanded adaptive Ayurveda dimensions
    ↓
Evidence/provenance
    ↓
Physician confirmation
    ↓
Stronger doctor visualization
    ↓
Future additional AYUSH systems
```

Do not introduce placeholder functionality just to claim broader coverage.

---

# 42. Accessibility

The patient experience should support:

- elderly users;
- low-literacy users;
- first-time digital users;
- multilingual users;
- touch-first users;
- voice users.

Requirements include:

- readable typography;
- large touch targets;
- simple language;
- one major task at a time;
- voice plus text/touch fallback;
- clear loading/error states.

---

# 43. Success Metrics

Only report metrics that are actually measured.

## Adaptive intake

- average questions per intake;
- median intake time;
- relevant-field capture rate;
- redundant-question rate;
- premature-stop rate;
- limited-history rate.

## Documents

- extraction precision/recall;
- evidence-grounding rate;
- uncertain extraction rate.

## Safety

- controlled-case red-flag performance;
- contradiction detection performance.

## Doctor

- physician correction rate;
- review time.

## AYUSH

- AYUSH eligible-case completeness;
- percentage of eligible cases with relevant AYUSH information captured;
- physician correction/confirmation rate for AYUSH findings.

---

# 44. Acceptance Criteria

## Patient

- [ ] Language can be selected.
- [ ] Demographics can be captured.
- [ ] Interaction mode can be selected.
- [ ] Consent is presented before clinical collection.
- [ ] Chief complaint can be given naturally.
- [ ] One question is shown at a time.
- [ ] Questions adapt to the current state.
- [ ] Duplicate questions are prevented.
- [ ] Non-informative answers do not create loops.
- [ ] Interview can terminate safely.
- [ ] Relevant AYUSH workflow can activate.
- [ ] Supporting records can be uploaded.
- [ ] Patient can review/correct.
- [ ] Patient can submit.

## Doctor

- [ ] Submitted intake appears in the queue.
- [ ] Structured clinical information is visible.
- [ ] Safety signals are visible.
- [ ] Contradictions are visible.
- [ ] Documents are available.
- [ ] Evidence/provenance can be inspected.
- [ ] AYUSH information is visible when relevant.
- [ ] Physician can edit.
- [ ] Physician can confirm.
- [ ] Confirmation is auditable.

## AYUSH

- [ ] AYUSH is part of the shared adaptive engine.
- [ ] Ayurveda is represented as the first detailed AYUSH system.
- [ ] Core AYUSH dimensions work.
- [ ] Expanded dimensions can be introduced adaptively.
- [ ] Patient-stated and AI-inferred values remain distinguishable.
- [ ] Evidence is retained where available.
- [ ] Physician review is explicit.
- [ ] AYUSH cannot override safety.
- [ ] AYUSH does not autonomously diagnose or prescribe.

## Documents

- [ ] Upload works.
- [ ] Original document is preserved.
- [ ] OCR can run or deterministic mock path exists.
- [ ] Candidates are validated against evidence.
- [ ] Doctor can inspect source documents.

## Interoperability

- [ ] Physician-confirmed data can be mapped to FHIR-compatible structures.
- [ ] Live integration is never claimed without verified connectivity.

---

# 45. Development Priority

The following is implementation priority, not separate product versions.

## P0 — Core

```text
patient flow
adaptive intake
state
safety
doctor queue
doctor review
core AYUSH
```

## P1 — Depth

```text
documents
provenance
contradictions
timeline
multilingual/voice resilience
expanded AYUSH
```

## P2 — Integration

```text
cloud storage
native vector indexing
additional AYUSH systems
deeper ABDM/HIS integration
advanced analytics
```

All remain part of one SwasthyaVaani product.

---

# 46. Evaluation Checkpoints

Evaluation dates are checkpoints, not product versions.

All functionality belongs to the same SwasthyaVaani architecture and product scope.

The documented state must distinguish:

```text
implemented
partially implemented
planned
```

rather than presenting checkpoint milestones as separate products.

---

# 47. Product Decision Rules

When adding a new feature, ask:

1. Does it reduce patient burden?
2. Does it improve structured clinical handoff?
3. Does it preserve physician authority?
4. Does it preserve provenance and uncertainty?
5. Does it fit the shared adaptive architecture?
6. Does it add real value rather than AI complexity?
7. Can it be tested deterministically where necessary?

If not, it should not be added merely for demonstration value.

---

# 48. Final Product Definition

> **SwasthyaVaani is an AI-assisted pre-consultation clinical intake platform that adaptively converts a patient's story, supporting records, and relevant AYUSH information into a structured, evidence-aware, safety-screened dossier for physician review.**

Its core differentiator is:

```text
intelligent first-mile clinical data collection
+
structured patient-to-doctor handoff
```

not:

```text
AI chatbot
```

and not:

```text
autonomous doctor
```

---

# 49. Final Product Boundary

```text
PATIENT
  ↓
Communicates story
  ↓
SWASTHYAVAANI
  ↓
Understands + structures + asks relevant questions
  ↓
Safety / evidence / provenance
  ↓
DOCTOR
  ↓
Reviews + edits + confirms
  ↓
Clinical decision
```

This boundary is mandatory across the product, codebase, UI, prompts, demos, and documentation.

---

# 50. Documentation Alignment

This PRD is the product-level source of truth.

Related documents define:

```text
Architecture → how the system is structured
TRD → how it is technically built
Backend Schema → how data is persisted
Rules → hard implementation/safety constraints
App Flow → exact user/system transitions
AYUSH Specification → detailed AYUSH behavior
UI/UX → experience and visual behavior
Implementation Plan → delivery sequence
README → project-facing overview
```

All downstream documents must remain consistent with this PRD.

