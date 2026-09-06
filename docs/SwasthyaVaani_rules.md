# SwasthyaVaani — Engineering, AI & Clinical Safety Rules

> **Status:** Updated implementation and safety source of truth
>
> **Audience:** AI coding agents and developers.
>
> **Purpose:** Define the hard rules that must be followed when implementing, modifying, testing, reviewing, or extending SwasthyaVaani.
>
> **Related documents:**
> - `SwasthyaVaani_PRD.md` — product requirements
> - `SwasthyaVaani_TRD.md` — technical requirements
> - `SwasthyaVaani_architecture.md` — system architecture
> - `SwasthyaVaani_backend_schema.md` — persistence/data model
> - `SwasthyaVaani_appflow.md` — application behavior
> - AYUSH specification — AYUSH domain behavior
>
> **Priority:** These rules are hard constraints. Do not bypass them for convenience, demo speed, model output, or implementation simplicity.

---

# 1. General Agent Rules

1. Read the PRD, TRD, Architecture, Backend Schema, and relevant domain specification before making significant changes.
2. Inspect the existing repository before creating, replacing, or refactoring files.
3. Reuse existing components, services, schemas, utilities, providers, and patterns whenever possible.
4. Make the smallest coherent change that satisfies the requirement.
5. Do not introduce unrelated refactors.
6. Do not add features merely because an AI coding tool suggests them.
7. Preserve existing working functionality unless the requested change requires otherwise.
8. Keep domain/clinical logic out of UI components.
9. Keep provider integrations behind interfaces/adapters.
10. Keep safety, authorization, persistence, and termination deterministic where required.
11. Run relevant tests after significant changes.
12. Never claim an implementation works unless it has actually been tested.
13. Prefer additive migration over destructive rewrites.
14. Do not silently change the product boundary.
15. Do not change a working clinical workflow merely to make the implementation look more sophisticated.

---

# 2. Product Boundary Rules

SwasthyaVaani is:

> **An AI-assisted pre-consultation clinical intake and patient-to-doctor handoff platform.**

It is NOT:

- an autonomous doctor;
- an autonomous diagnostic system;
- an autonomous prescription engine;
- a replacement for a physician;
- a generic conversational chatbot;
- an autonomous Ayurvedic treatment system.

The product boundary must remain consistent across:

- code;
- prompts;
- UI;
- demo data;
- documentation;
- error messages;
- presentations.

---

# 3. Physician Authority

The fundamental product rule is:

```text
AI assists
   ↓
Doctor verifies
   ↓
Doctor decides
```

The system may:

- collect information;
- structure patient answers;
- identify configured safety signals;
- organize supporting evidence;
- draft summaries;
- prepare FHIR-compatible structures.

The system must not make the final clinical decision.

---

# 4. Clinical Safety Rules

## 4.1 No Autonomous Diagnosis

The system MUST NOT produce a final diagnosis as an autonomous clinical decision.

Do not create interfaces such as:

```text
Diagnosis: Heart Attack
Confidence: 97%
```

Prefer:

```text
Priority review signal detected.
Physician evaluation required.
```

## 4.2 No Autonomous Prescribing

The system MUST NOT decide:

- medication;
- medication dosage;
- treatment;
- prescription changes;
- treatment duration.

Medication information may be extracted or displayed with source/provenance.

## 4.3 Red Flags Are Alerts

Red flags generate:

```text
PRIORITY_REVIEW
```

or another explicitly configured alert state.

They do not automatically generate a diagnosis.

## 4.4 Safety Has Priority

If a safety-required candidate exists:

```text
SAFETY
    >
AYUSH preference
    >
general informational preference
```

Neither the LLM nor an AYUSH candidate may suppress or bypass a deterministic safety rule.

## 4.5 Contradictions Are Surfaced

If two trusted sources disagree:

```text
Source A
   vs.
Source B
```

create a contradiction/review state.

Never silently choose one.

## 4.6 Uncertainty Must Remain Visible

Do not convert:

```text
UNKNOWN
```

into:

```text
KNOWN
```

or:

```text
AMBIGUOUS
```

into:

```text
CONFIRMED
```

without valid evidence or physician confirmation.

---

# 5. LLM Rules

## 5.1 LLM Output Is Untrusted

Every structured model result passes through:

```text
LLM output
   ↓
Schema validation
   ↓
Domain/business validation
   ↓
Safety checks
   ↓
Application use
```

Never treat raw LLM JSON as trusted application state.

## 5.2 LLM Cannot Control Clinical Dimension Selection

The LLM must not independently decide which clinical dimension wins the adaptive interview.

The application determines the target using:

```text
workflow
+
domain
+
clinical state
+
information gaps
+
candidate scoring
+
safety
+
deduplication
```

The LLM may phrase the already-selected question.

## 5.3 LLM Cannot Control Termination

The application decides:

```text
ASK
STOP
ESCALATE
LIMITED_HISTORY
```

The LLM cannot independently terminate or extend the interview.

## 5.4 LLM Cannot Bypass Safety

Model output conflicting with deterministic safety rules must be rejected or constrained by the application.

## 5.5 LLM Cannot Directly Write Arbitrary Database Fields

Use:

```text
LLM
 ↓
typed schema
 ↓
validation
 ↓
domain service
 ↓
database
```

Do not use:

```text
LLM → arbitrary JSON → database
```

## 5.6 No Chain-of-Thought Exposure

Never expose internal model reasoning to patients or physicians.

Allowed:

- question text;
- structured facts;
- concise reason labels;
- source/provenance;
- confidence/status.

## 5.7 No Unsupported Invention

The model must not invent:

- symptoms;
- medications;
- dates;
- laboratory values;
- patient history;
- AYUSH assessment findings.

Unavailable information remains:

```text
UNKNOWN
```

or:

```text
NEEDS_REVIEW
```

as appropriate.

---

# 6. Adaptive Interview Rules

## 6.1 One Question at a Time

The patient receives one primary question at a time.

Do not expose a long generated questionnaire.

## 6.2 Dynamic Questioning

The next question must depend on the current structured state.

Do not implement one rigid sequence for every patient.

## 6.3 Minimum Sufficient History

Optimize for:

```text
minimum unnecessary questions
+
maximum relevant information
```

The question count is dynamic.

## 6.4 Targeted Questioning

Each generated question should map to a validated:

```text
targetField
```

or clinical objective.

## 6.5 Canonical Dimensions

Equivalent concepts must resolve to the same canonical dimension.

Example:

```text
"How long?"
"Since when?"
"For three days?"
       ↓
symptom_duration
```

Do not allow aliases to create duplicate information gaps.

## 6.6 Resolved Information Must Not Be Re-asked

If a dimension is sufficiently known:

```text
Candidate
   ↓
resolved check
   ↓
REJECT
```

unless a genuine clarification is required.

## 6.7 Semantic Duplicate Protection

Before asking:

```text
Candidate
   ↓
semantic duplicate check
   ↓
asked previously?
```

If yes:

```text
REJECT / REPLACE
```

## 6.8 Non-Informative Answers

Examples:

```text
"wtf"
"idk"
"what?"
"not sure"
```

must not corrupt state.

The engine should:

```text
rephrase
or
pivot to another viable candidate
or
safely stop if no useful continuation exists
```

## 6.9 Ambiguous Answers

For compound questions, a broad response such as:

```text
"Yes"
```

must not automatically mark every proposition as true.

Preserve:

```text
AMBIGUOUS
```

until clarified or supported.

## 6.10 Open Exploration

Open exploration is allowed when it is clinically useful.

It must:

- remain relevant to the active complaint/domain;
- be recorded as an explored area;
- allow newly volunteered symptoms to trigger targeted follow-up;
- not become random checklist questioning.

## 6.11 Targeted Follow-Up

A newly volunteered relevant finding may trigger:

```text
TARGETED_FOLLOW_UP
```

The follow-up should focus on the newly relevant dimension.

---

# 7. Adaptive Termination Rules

The system MUST have independent termination protections.

## Primary

```text
relevant information sufficiently complete
→ STOP
```

## Information Gain

```text
expected information gain too low
→ STOP
```

## No Candidate

```text
no viable useful candidates
→ STOP
```

## Safety

```text
safety-required candidate
→ cannot be blocked by normal termination logic
```

## Low Progress

Use deterministic low-progress protection.

Current prototype configuration may use:

```text
MAX_CONSECUTIVE_LOW_PROGRESS = 2
```

## Hard Question Limit

Current prototype:

```text
MAX_QUESTIONS = 10
```

This is a safety ceiling, not a target.

If the interview reaches the limit without adequate information:

```text
LIMITED_HISTORY
```

Do not falsely label it complete.

---

# 8. Deterministic Fallback Rules

If the adaptive engine cannot converge reliably:

```text
1. Load configured relevant required fields.
2. Determine unresolved fields.
3. Select validated questions mapped to unresolved fields.
4. Apply canonical/resolved/duplicate checks.
5. Apply safety rules.
6. Continue only while useful.
7. Stop at the hard limit.
8. Mark LIMITED_HISTORY if necessary.
```

Fallback behavior must exist in executable code.

It must not exist only in documentation.

---

# 9. ClinicalState Rules

## 9.1 Structured State Is Primary

Maintain:

```text
ClinicalState
```

separately from:

```text
Raw Transcript
```

## 9.2 Preserve Evidence

Important state should retain:

```text
source
source_id where applicable
confidence
status
```

## 9.3 Preserve History

When state changes materially, retain sufficient version/history information to support auditability.

## 9.4 No Silent Overwrite

When sources disagree:

```text
patient
document
AI
physician
```

do not silently overwrite one with another.

## 9.5 Canonical State Status

Use explicit state such as:

```text
UNKNOWN
KNOWN_TRUE
KNOWN_FALSE
AMBIGUOUS
KNOWN_WITH_VALUE
```

where the current domain model supports it.

---

# 10. Provenance Rules

Important information should identify origin.

Minimum categories:

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

Example:

```text
Medication: Atorvastatin 20 mg
Source: DOCUMENT
Evidence: Prescription document, page 1
Status: NEEDS_REVIEW
```

Do not manufacture provenance.

If source cannot be established:

```text
source = UNKNOWN
```

or use the appropriate unresolved status.

---

# 11. Document / OCR Rules

## 11.1 Original Document Must Be Preserved

OCR is derived evidence, not a replacement for the source file.

## 11.2 OCR Is Not Truth

OCR output must remain distinguishable from validated clinical facts.

## 11.3 Evidence-Grounded Extraction

A document-extracted candidate must be grounded in OCR evidence before being promoted as a valid candidate.

## 11.4 Uncertain Extraction Requires Review

Example:

```text
Atorvastatin ?0 mg
Status: NEEDS_REVIEW
```

## 11.5 Document States

The implementation may use states such as:

```text
PENDING
PROCESSING
COMPLETED
FAILED
NEEDS_REVIEW
```

The deployed model is authoritative.

## 11.6 Patient / Session Association

A document uploaded during an intake must remain correctly associated with:

```text
patient_id
intake_session_id
```

where applicable.

Doctor retrieval must use persisted associations rather than frontend-only filenames or mock records.

---

# 12. AYUSH Rules

## 12.1 AYUSH Is Part of the Shared Engine

Do not implement:

```text
Modern Engine
+
AYUSH Chatbot
```

Implement:

```text
Unified Adaptive Engine
      +
Modern Clinical Dimensions
      +
AYUSH Assessment Dimensions
```

## 12.2 Ayurveda Is the First Detailed AYUSH System

AYUSH is the umbrella.

The current detailed assessment is:

```text
AYURVEDA
```

Future systems may be added independently:

```text
Yoga & Naturopathy
Unani
Siddha
Homoeopathy
```

Do not force Ayurveda-specific dimensions into those systems.

## 12.3 Current Core Ayurveda Parameters

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha evidence
```

## 12.4 Expanded Parameters

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

These are adaptive information targets, not mandatory questions.

## 12.5 AYUSH Must Be Relevant

A parameter may enter the candidate pool only when:

```text
AYUSH/Ayurveda workflow active
AND
dimension relevant
AND
dimension unresolved
AND
not duplicated
AND
useful information gain
AND
not blocked by safety
```

## 12.6 No AYUSH Checklist Behavior

Never force:

```text
Prakriti
→ Vikriti
→ Sara
→ Samhanana
→ ...
```

in a fixed sequence solely because a parameter exists.

## 12.7 Patient-Stated vs AI-Inferred

Do not represent an AI inference as if the patient explicitly stated it.

Example:

```text
PATIENT_STATED:
"my appetite is strong"

AI_INFERRED:
preliminary digestive-pattern interpretation

Status:
NEEDS_REVIEW
```

## 12.8 No Autonomous AYUSH Diagnosis

Do not output:

```text
Definitive Ayurvedic diagnosis
```

from the AI alone.

## 12.9 No Autonomous AYUSH Treatment

Do not generate:

- prescriptions;
- treatment plans;
- dosing;
- therapeutic instructions

as autonomous clinical decisions.

## 12.10 AYUSH Safety Has No Special Override

AYUSH logic cannot:

```text
override medical safety
override red flags
override authorization
override physician confirmation
```

---

# 13. AYUSH Evidence Rules

For important AYUSH findings, preserve where practical:

```text
dimension
value
status
source
confidence
evidence
last_updated_turn
```

Evidence may point to:

```text
QuestionEvent
Answer
Document
PhysicianEdit
```

An AI-inferred AYUSH finding should remain:

```text
PRELIMINARY / NEEDS_REVIEW
```

until an appropriate confirmation occurs.

---

# 14. AYUSH RAG Rules

RAG may be used for:

- reference-aligned terminology;
- question framing;
- assessment context.

RAG must not be used as authorization for:

- diagnosis;
- treatment;
- prescription.

Keep:

```text
General AYUSH Knowledge
```

logically separate from:

```text
Patient-Specific Evidence
```

Do not mix unrestricted patient data and general knowledge into one undifferentiated retrieval context.

---

# 15. AI / Provider Failure Rules

## LLM failure

```text
retry
→ alternate provider
→ deterministic/mock fallback
→ limited history if necessary
```

## Speech failure

```text
alternate provider
→ text/touch fallback
```

## OCR failure

```text
preserve original document
→ mark failure/review state
```

## RAG failure

If RAG is non-essential to the immediate operation:

```text
continue without unsupported grounding
```

Do not fabricate reference context.

## WebSocket failure

```text
polling / HTTP refresh fallback
```

Never falsely report clinical completion because an auxiliary service failed.

---

# 16. Database Rules

1. Schema changes use migrations.
2. Do not casually rewrite applied migrations.
3. Preserve existing records.
4. Maintain foreign-key integrity.
5. Keep question/answer relationships explicit.
6. Keep ClinicalState version relationships explicit.
7. Keep patient/document/session associations explicit.
8. Do not use client-provided identifiers as authorization.
9. Do not store raw secrets.
10. Do not make the UI a substitute for persistence.

---

# 17. Authorization Rules

Authorization must be enforced server-side.

A user's frontend role, route, or local storage state is not authoritative.

Protected resources include:

```text
doctor records
medical documents
physician notes
audit records
administrative data
```

Patient kiosk sessions may be intentionally lightweight, but session ownership and access boundaries still must be enforced wherever applicable.

---

# 18. Doctor Review Rules

The doctor must be able to distinguish:

```text
Patient stated
AI inferred
Document derived
Physician confirmed
```

The doctor may:

```text
edit
reject
confirm
annotate
resolve contradiction
```

Important physician changes must remain auditable.

---

# 19. FHIR / Interoperability Rules

FHIR mapping should consume validated/appropriate structured data.

Preferred flow:

```text
Patient information
 ↓
structured state
 ↓
physician review/confirmation
 ↓
FHIR mapping
 ↓
FHIR R4 Bundle
```

Do not treat:

```text
raw transcript
unvalidated LLM output
```

as final clinical FHIR truth.

Do not claim a live ABDM/HIS connection unless it is actually connected and tested.

---

# 20. Multimodal Equivalence Rules

Voice and text must converge into the same clinical reasoning engine.

```text
VOICE
 → speech normalization
 → shared engine

TEXT / TOUCH
 → shared engine
```

The modality must not create a separate clinical policy.

Equivalent semantic answers should produce equivalent structured state transitions.

---

# 21. Demo / Mock Rules

Demo mode may use:

```text
MockLLMProvider
MockSpeechProvider
MockOCRProvider
synthetic database seed data
```

but:

1. Demo logic must remain isolated.
2. Demo data must be synthetic.
3. Demo mode must not redefine core clinical behavior.
4. Demo mode must not replace the real doctor handoff path with frontend-only fake data.
5. Temporary demo shortcuts must be removable without redesigning the application.
6. Do not present mock integrations as live external integrations.

---

# 22. Testing Rules

Before claiming a significant change is complete:

```text
focused tests
    ↓
integration tests where relevant
    ↓
full regression suite
```

Tests should cover:

```text
state
adaptive selection
canonical dimensions
duplicate prevention
termination
safety
voice/text equivalence
session isolation
documents
provenance
AYUSH
doctor handoff
FHIR
```

AYUSH additions must not regress modern clinical behavior.

---

# 23. No Unnecessary Complexity

Do not add:

```text
microservices
extra vector databases
unnecessary orchestration frameworks
duplicate adaptive engines
duplicate patient-state stores
```

unless there is a demonstrated requirement.

Prefer the current modular-monolith architecture.

---

# 24. Definition of Safe AI Behavior

The system is considered within the intended product boundary when:

```text
AI interprets
AI extracts
AI phrases
        ↓
Application validates
        ↓
Deterministic rules control
        ↓
Evidence remains visible
        ↓
Physician confirms
```

The system is outside the intended boundary when:

```text
LLM decides diagnosis
LLM decides treatment
LLM bypasses safety
LLM silently overwrites facts
LLM directly controls termination
LLM writes arbitrary database state
```

---

# 25. Final Engineering Rule

When in doubt, choose:

```text
less automation
+
more explicit state
+
more evidence
+
more deterministic control
+
more physician visibility
```

over:

```text
more autonomous AI behavior.
```

SwasthyaVaani is strongest when AI reduces patient/doctor information burden without taking clinical authority away from the physician.
