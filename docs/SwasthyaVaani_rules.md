# SwasthyaVaani — Engineering & AI Agent Rules

> **Audience:** AI coding agents and developers.
>
> **Purpose:** Hard rules that must be followed when implementing, modifying, testing, or reviewing SwasthyaVaani.
>
> **Related documents:**
> - `PRD.md` — product requirements
> - `TRD.md` — technical requirements
> - `architecture.md` — system architecture
>
> These rules are higher-priority implementation constraints. Do not bypass them for convenience.

---

# 1. General Agent Rules

1. Read `PRD.md`, `TRD.md`, and `architecture.md` before making significant changes.
2. Inspect the existing repository before creating or replacing files.
3. Reuse existing components, services, types, utilities, and patterns whenever possible.
4. Make the smallest coherent change that satisfies the requirement.
5. Do not introduce unrelated refactors.
6. Do not add features merely because an AI coding tool suggests them.
7. Preserve existing working functionality unless the requested change requires otherwise.
8. Keep domain logic out of UI components.
9. Keep provider integrations behind interfaces/adapters.
10. Keep product behavior deterministic where safety, authorization, persistence, or termination is involved.
11. Run relevant tests after significant changes.
12. Never claim that an implementation works unless it has actually been tested.

---

# 2. Product Boundary Rules

SwasthyaVaani is:

> **An AI-assisted pre-consultation clinical intake platform.**

It is NOT:

- an autonomous doctor;
- an autonomous diagnostic system;
- an autonomous prescription engine;
- a replacement for a physician;
- a generic chatbot.

Always preserve this boundary in:

- code;
- UI;
- prompts;
- demo data;
- documentation;
- error messages;
- presentations.

---

# 3. Clinical Safety Rules

## Rule 3.1 — No autonomous diagnosis

The system MUST NOT produce a final diagnosis as a clinical decision.

Do not create UI such as:

```text
Diagnosis: Heart Attack
Confidence: 97%
```

Prefer:

```text
Potential red-flag combination detected.
Physician review required.
```

## Rule 3.2 — No autonomous prescribing

The system MUST NOT decide:

- medication;
- dosage;
- treatment;
- prescription changes.

If medication information is extracted, show it as information with source/provenance.

## Rule 3.3 — Physician remains authoritative

Final clinical decisions belong to the physician.

The product should communicate:

```text
AI assists
   ↓
Doctor verifies
   ↓
Doctor decides
```

## Rule 3.4 — Red flags are alerts, not diagnoses

Red-flag detection may generate:

```text
PRIORITY_REVIEW
```

It must not generate a diagnosis.

## Rule 3.5 — Contradictions are surfaced, not resolved automatically

If:

```text
Patient: "I stopped Metformin."
Record:  Metformin 500 mg
```

create a contradiction requiring review.

Never silently choose one source.

## Rule 3.6 — Uncertainty must remain visible

Never convert:

```text
uncertain
```

into:

```text
certain
```

without validation or physician confirmation.

---

# 4. LLM Rules

## Rule 4.1 — LLM output is untrusted

Treat every LLM response as untrusted input.

Every structured response must pass:

```text
LLM output
   ↓
Schema validation
   ↓
Business-rule validation
   ↓
Safety checks
   ↓
Application use
```

## Rule 4.2 — LLM cannot control termination

The LLM may recommend:

```text
ASK
STOP
ESCALATE
```

but the application decides whether that action is actually permitted.

## Rule 4.3 — LLM cannot bypass safety rules

Even if the model produces a conflicting instruction, deterministic application rules take precedence.

## Rule 4.4 — LLM cannot directly write arbitrary database fields

Use typed schemas/DTOs.

Do not:

```text
LLM → raw JSON → database
```

Use:

```text
LLM
 ↓
Pydantic/schema validation
 ↓
domain validation
 ↓
database
```

## Rule 4.5 — Do not expose chain-of-thought

Never display internal model reasoning to patients or doctors.

Show only:

- the relevant question;
- structured information;
- concise reason labels where appropriate;
- confidence/provenance.

## Rule 4.6 — Avoid unsupported factual invention

The model must not invent:

- symptoms;
- medications;
- dates;
- diagnoses;
- laboratory values;
- patient history.

If a fact is unavailable:

```text
unknown
```

or:

```text
needs review
```

---

# 5. Adaptive Question Rules

## Rule 5.1 — One question at a time

Never present the patient with a long AI-generated questionnaire.

## Rule 5.2 — Dynamic questioning

The next question must depend on the current structured clinical state.

Do not build a single fixed sequence for all patients.

## Rule 5.3 — Minimum Sufficient History

Prefer:

```text
minimum questions
+
maximum relevant information
```

Do not artificially force every patient through the same number of questions.

## Rule 5.4 — No repeated questions

Before asking:

```text
Candidate question
   ↓
Semantic duplicate check
   ↓
Already asked?
```

If yes:

```text
reject
```

## Rule 5.5 — Do not ask for already-resolved information

If:

```text
duration = 3 days
confidence = HIGH
```

do not ask:

> "How long have you had this?"

again unless the system explicitly needs clarification.

## Rule 5.6 — Question must map to a target

Every generated question SHOULD map to:

```text
targetField
```

or a validated clinical objective.

Avoid free-floating conversational questions.

---

# 6. Adaptive Interview Termination Rules

The system MUST use multiple termination mechanisms.

## Primary

Stop when relevant required information is sufficiently complete.

## Secondary

Stop when expected information gain is too low.

## Duplicate

Reject/retry duplicate questions.

## Low-progress

Recommended:

```text
MAX_CONSECUTIVE_LOW_PROGRESS = 2
```

## Emergency limit

Recommended initial prototype:

```text
MAX_QUESTIONS = 15
```

This is a safety brake, not the normal stopping mechanism.

If reached before completion:

```text
status = LIMITED_HISTORY
```

Never:

```text
status = COMPLETE
```

just because the limit was reached.

## Model failure

```text
retry once
→ deterministic required-field fallback
→ limited-history stop if needed
```

## Patient cancellation

```text
PATIENT_ABORTED
```

---

# 7. Deterministic Fallback Rules

If adaptive gap analysis does not converge reliably:

```text
1. Load configured required fields.
2. Determine unresolved fields.
3. Select validated questions mapped to unresolved fields.
4. Apply deduplication.
5. Continue until required fields are sufficiently covered.
6. Stop at MAX_QUESTIONS.
7. Mark LIMITED_HISTORY if still incomplete.
```

The fallback MUST be implemented in code.

It must not exist only in documentation.

---

# 8. Clinical State Rules

## Rule 8.1 — Structured state is primary

The system should maintain:

```text
ClinicalState
```

separately from:

```text
RawTranscript
```

## Rule 8.2 — Preserve evidence

Important state values should retain:

```text
sourceType
sourceId
confidence
```

where practical.

## Rule 8.3 — Do not overwrite without provenance

When a value changes, preserve enough information to know:

```text
previous value
new value
source
reason/status
```

where the workflow requires it.

---

# 9. Provenance Rules

Important information must be traceable to an origin.

Valid source types:

```text
PATIENT_ANSWER
DOCUMENT
AI_DERIVED
PHYSICIAN
```

Example:

```text
Atorvastatin 20 mg
Source: Prescription_01.pdf
Page: 1
Confidence: High
```

Do not manufacture source metadata.

If source is unknown:

```text
source = UNKNOWN
```

and mark the fact appropriately.

---

# 10. Document / OCR Rules

## Rule 10.1 — OCR is not truth

OCR output is raw extracted text.

It must be validated before becoming a trusted structured fact.

## Rule 10.2 — Preserve original document

Never discard the original uploaded document just because OCR completed.

## Rule 10.3 — Track extraction status

Use states such as:

```text
UPLOADED
OCR_PROCESSING
OCR_COMPLETED
EXTRACTED
NEEDS_REVIEW
CONFIRMED
FAILED
```

## Rule 10.4 — Uncertain extraction requires review

Example:

```text
Atorvastatin ?0 mg
Status: NEEDS_REVIEW
```

Never silently guess.

## Rule 10.5 — Do not claim universal handwriting recognition

The prototype may support controlled/sample documents.

Do not advertise perfect handwriting OCR.

---

# 11. Document Security Rules

1. Validate upload size.
2. Validate/inspect file type.
3. Normalize filenames.
4. Use generated/non-guessable storage object IDs.
5. Protect document access with server-side authorization.
6. Avoid unrestricted public file URLs.
7. Do not place sensitive medical content in query strings.
8. Do not log entire uploaded documents.

---

# 12. Red-Flag Rules

## Rule 12.1 — Use deterministic rules

For high-impact safety patterns, prefer explicit/configurable rules over unrestricted LLM decisions.

Example:

```text
IF chest_pain
AND breathlessness
AND arm_radiation
THEN PRIORITY_REVIEW
```

## Rule 12.2 — Keep rules versioned

Each safety rule should have an identifier/version.

Example:

```text
RF-CP-001-v1
```

## Rule 12.3 — Preserve evidence IDs

A red flag should reference the observations/answers that triggered it.

## Rule 12.4 — Never convert rule output into diagnosis

Output:

```text
Potential red-flag combination detected.
```

Not:

```text
Patient has myocardial infarction.
```

---

# 13. Contradiction Rules

Contradiction detection must:

- compare relevant structured facts;
- identify conflicting sources;
- create a review item;
- preserve both values;
- preserve both sources.

It must NOT:

- choose a winner automatically;
- delete the older value;
- silently overwrite the patient statement;
- silently overwrite the historical record.

---

# 14. Physician Verification Rules

## Rule 14.1

Every AI-generated clinical summary begins as:

```text
AI_DRAFT
```

## Rule 14.2

Doctor must be able to:

- edit;
- correct;
- reject;
- confirm.

## Rule 14.3

After confirmation:

```text
PHYSICIAN_CONFIRMED
```

## Rule 14.4

Only physician-confirmed structured data should be treated as final clinical output for FHIR export.

---

# 15. FHIR Rules

1. Map from validated/confirmed structured data.
2. Never map raw LLM output directly to FHIR.
3. Validate generated FHIR resources.
4. Keep FHIR integration behind an adapter.
5. Do not fabricate production ABDM connectivity.
6. Clearly label sandbox/mock integrations.

Potential resources:

```text
Patient
Encounter
Observation
Condition
MedicationStatement
Composition
```

Use only the resources that are actually applicable.

---

# 16. Authentication and Authorization Rules

## Rule 16.1

Frontend route hiding is not authorization.

Authorization MUST happen server-side.

## Rule 16.2

Minimum role boundaries:

```text
PATIENT
→ own session/records

DOCTOR
→ authorized patient records

ADMIN
→ administrative/configuration resources
```

## Rule 16.3

Never trust:

- client-provided role;
- client-provided patient ID;
- client-provided doctor ID;
- client-provided confidence.

Validate permissions against authenticated identity and server-side data.

---

# 17. Provider Rules

All external providers MUST use adapters.

## Speech

```text
Bhashini
Sarvam
Whisper
Mock
```

## LLM

```text
Primary
Secondary
Mock
```

## OCR

```text
PaddleOCR
Mock
```

The application should depend on:

```text
SpeechService
LLMService
OCRService
```

not directly on vendor-specific APIs.

---

# 18. API Key and Secret Rules

NEVER:

- put secret keys in frontend code;
- commit `.env` files containing real secrets;
- expose provider credentials through API responses;
- hardcode credentials in source code.

Use:

```text
.env
server-side environment variables
secret management
```

Commit only:

```text
.env.example
```

---

# 19. Privacy Rules

## Must

- minimize collected data;
- isolate sessions;
- protect documents;
- enforce RBAC;
- audit important actions;
- avoid sensitive data in logs;
- use synthetic demo data.

## Must not

Claim:

> "DPDP compliant"

based solely on:

```ts
sessionStorage.clear()
```

Client-side cleanup is only one privacy measure.

If a 10-second cleanup demonstration is used:

```text
Submit
 ↓
10-second countdown
 ↓
temporary client state cleanup
 ↓
"Temporary session data cleared"
```

Do not call this proof of regulatory compliance.

---

# 20. Logging Rules

Log system events, not unnecessary sensitive content.

Allowed examples:

```text
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

Avoid logging:

- full medical histories;
- raw patient audio;
- full raw transcripts;
- complete document contents.

unless explicitly required for a controlled test/demo environment.

---

# 21. Frontend Rules

## Patient UI

Must be:

- touch-first;
- accessible;
- low cognitive load;
- voice-friendly;
- multilingual-ready;
- simple.

Avoid:

- dense forms;
- long paragraphs;
- unnecessary fields;
- confusing navigation.

## Doctor UI

Must be:

- information-dense;
- quickly scannable;
- evidence-oriented;
- editable;
- clinically calm.

## Admin UI

Must be:

- structured;
- management-oriented;
- audit-friendly.

---

# 22. UI State Rules

Represent important backend states explicitly.

Patient:

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
LIMITED_HISTORY
PATIENT_ABORTED
ERROR
FALLBACK
```

Doctor:

```text
NEW
AI_DRAFT
PRIORITY_REVIEW
NEEDS_VERIFICATION
PHYSICIAN_CONFIRMED
```

Do not infer critical clinical state from styling alone.

---

# 23. Loading / Error Rules

Every asynchronous operation must have:

```text
loading
success
error
retry/fallback
```

Examples:

### Speech

```text
LISTENING
TRANSCRIBING
SUCCESS
FAILED → TEXT/TAP FALLBACK
```

### OCR

```text
PROCESSING
SUCCESS
FAILED → SOURCE DOCUMENT AVAILABLE
```

### LLM

```text
PROCESSING
SUCCESS
FAILED → RETRY/FALLBACK
```

Do not leave users staring at an indefinite spinner.

---

# 24. Demo Reliability Rules

A deterministic demo mode is mandatory.

It must allow the team to reproduce:

### Case A

```text
Chest pain
+
Breathlessness
+
Left-arm radiation
→ PRIORITY_REVIEW
```

### Case B

```text
Fever
→ shorter adaptive interview
```

### Case C

```text
AYUSH workflow
→ core AYUSH question path
```

### Case D

```text
Prescription
→ OCR
→ extraction
→ provenance
→ doctor review
```

The demo must not depend entirely on internet availability.

---

# 25. Mock Data Rules

Use fictional data only.

Examples:

```text
Patient: Demo Patient 01
Patient ID: DEMO-001
Doctor: Dr. Demo
Hospital: Demo General Hospital
```

Do not use real patient names, IDs, phone numbers, addresses, medical records, or credentials.

---

# 26. Database Rules

1. Use PostgreSQL/Supabase.
2. Use migrations for schema changes.
3. Do not modify production-like schemas manually without a migration.
4. Use foreign keys where appropriate.
5. Use indexes for commonly queried fields.
6. Keep clinical state structured.
7. Preserve audit events for important changes.
8. Avoid storing large binary documents directly in relational tables.

---

# 27. Realtime Rules

WebSockets are optional.

If used:

```text
persist first
→ publish event
→ update doctor UI
```

Never:

```text
publish event
→ assume persistence succeeded
```

If WebSocket fails:

```text
polling
```

must remain possible.

---

# 28. Performance Rules

- Avoid unnecessary network requests.
- Debounce search fields.
- Do not re-render large doctor dashboards unnecessarily.
- Use pagination for large lists.
- Load documents on demand where practical.
- Show progress for long AI/OCR operations.
- Measure actual latency before claiming performance improvements.

---

# 29. Code Quality Rules

Use:

- clear names;
- small functions;
- typed interfaces;
- explicit return types for important services;
- reusable components;
- centralized configuration;
- domain-specific modules.

Avoid:

- giant components;
- duplicated business logic;
- magic strings scattered across files;
- hidden side effects;
- unnecessary abstraction layers.

---

# 30. Testing Rules

Every safety-critical or stateful feature must have automated tests.

Required tests include:

### Adaptive engine

- sufficient information stop;
- duplicate question rejection;
- low-progress stop;
- max-question behavior;
- deterministic fallback;
- patient cancellation.

### Safety

- red-flag rules;
- contradiction detection;
- no autonomous diagnosis.

### Documents

- extraction validation;
- uncertainty handling;
- provenance.

### Auth

- unauthorized patient access;
- unauthorized doctor access;
- unauthorized admin access.

### FHIR

- mapping;
- schema validation.

---

# 31. Change Management Rules

Before changing architecture:

1. Check `PRD.md`.
2. Check `TRD.md`.
3. Check `architecture.md`.
4. Check whether existing functionality already solves the problem.
5. Prefer incremental changes.

If a requested change conflicts with a documented safety or security rule:

```text
Do not silently override.
```

The conflict must be surfaced to the project owner.

---

# 32. Feature Addition Rules

A feature belongs in the implementation only when it:

- addresses PS 26047;
- improves patient experience;
- improves physician usefulness;
- improves safety;
- improves interoperability;
- or provides measurable value.

Otherwise:

```text
Future Feature
```

Do not expand scope just because the implementation is technically possible.

---

# 33. External API Rules

Never assume an external API:

- is always available;
- is free;
- has unlimited quota;
- returns the same schema forever.

Wrap external calls in providers.

Handle:

```text
timeout
rate limit
authentication failure
invalid response
service unavailable
network error
```

with explicit fallback behavior.

---

# 34. Medical Content Rules

Use only:

- validated project/domain requirements;
- appropriately sourced medical terminology;
- controlled test cases;
- physician/domain-reviewed content where needed.

Do not invent medical facts for UI examples unless explicitly marked as fictional/demo.

Do not claim clinical efficacy without measured evidence.

---

# 35. Metrics Rules

Only show metrics that the team has actually measured.

Bad:

```text
92% more efficient
```

when never tested.

Good:

```text
Prototype test: median intake time = X seconds
n = Y synthetic cases
```

Every reported metric should have:

```text
definition
test set/sample
measurement method
```

---

# 36. Git Rules

Use focused commits.

Examples:

```text
feat(intake): add adaptive question engine
feat(safety): add red flag rule engine
feat(documents): add prescription extraction
feat(doctor): add physician confirmation
fix(intake): prevent duplicate questions
test(safety): add chest pain rule coverage
```

Avoid huge opaque commits.

---

# 37. AI Agent Workflow

Before implementation:

```text
Read PRD
↓
Read TRD
↓
Read architecture
↓
Inspect repository
↓
Identify affected modules
↓
Plan smallest coherent change
```

During:

```text
Implement
↓
Validate types/schemas
↓
Run tests
↓
Inspect behavior
```

After:

```text
Lint
↓
Type check
↓
Tests
↓
E2E critical path
↓
Report changes + limitations
```

---

# 38. Critical-Path Rule

When time is limited, prioritize:

```text
Patient intake
        ↓
Adaptive question engine
        ↓
Core AYUSH path
        ↓
Basic document OCR
        ↓
Doctor summary
        ↓
Red flags
        ↓
Contradictions
        ↓
Physician confirmation
```

Only after the above is stable should the team spend substantial time on:

- advanced charts;
- deeper admin features;
- elaborate analytics;
- extra integrations;
- cosmetic refinements.

---

# 39. Final Hard Rules

The following are absolute for the current project:

```text
1. No autonomous diagnosis.
2. No autonomous prescribing.
3. Physician remains the final decision-maker.
4. LLM output is untrusted.
5. LLM never independently controls termination.
6. Adaptive questions are dynamic.
7. MAX_QUESTIONS is a safety brake, not the normal stop rule.
8. Low-progress and duplicate-question guards must exist.
9. Deterministic fallback must exist.
10. Core AYUSH questioning must be supported.
11. Basic OCR must be supported.
12. Red flags use deterministic/configurable rules.
13. Contradictions are surfaced, never silently resolved.
14. Important extracted facts retain provenance.
15. Physician confirmation is explicit.
16. FHIR comes from validated/confirmed structured data.
17. ABHA is an integration point, not a hard dependency for demo mode.
18. External providers are replaceable.
19. API secrets never enter frontend code.
20. Synthetic data only for development/demo.
21. Client-side storage cleanup is not DPDP compliance.
22. No fake production ABDM/HIS integrations.
23. No fabricated metrics.
24. No unnecessary microservices.
25. Do not add features outside the PRD without explicit approval.
```

---

# 40. Final Engineering Principle

> **Keep the AI probabilistic, but keep product control deterministic.**

The AI can interpret, extract, and propose.

The application decides:

```text
Is the output valid?
Is the question allowed?
Is it repetitive?
Is enough information collected?
Should the interview stop?
Did a safety rule trigger?
Can the data be persisted?
Has the physician confirmed it?
```

This separation is the core safety and engineering rule of SwasthyaVaani.
