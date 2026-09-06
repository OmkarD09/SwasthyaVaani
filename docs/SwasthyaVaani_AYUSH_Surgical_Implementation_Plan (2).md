# SwasthyaVaani — AYUSH Surgical Implementation Plan

> **Purpose:** Translate the AYUSH Implementation Specification into the smallest coherent set of repository changes.
>
> **Status:** Implementation-ready plan; do not treat this document as permission to modify code by itself.
>
> **Primary references:**
> - `docs/SwasthyaVaani_Current_Project_State.md`
> - `docs/SwasthyaVaani_AYUSH_Implementation_Spec.md`
> - `SwasthyaVaani_architecture_v2 (1)`

---

## 1. Implementation Objective

Upgrade the existing AYUSH capability without rebuilding the SwasthyaVaani adaptive engine.

The target is:

```text
Existing shared adaptive engine
            +
stronger AYUSH assessment model
            +
adaptive Ayurveda dimensions
            +
evidence/provenance
            +
physician review
            +
robust tests
```

Do not replace the existing modern-clinical workflow.

---

## 2. Non-Negotiable Constraints

1. Preserve the existing adaptive engine architecture.
2. Preserve current modern clinical behavior.
3. AYUSH remains inside the shared adaptive engine.
4. Do not create a separate AYUSH chatbot.
5. Do not create a second independent question loop.
6. Keep deterministic safety and termination authoritative.
7. Do not let the LLM decide which clinical dimension wins.
8. Do not allow autonomous AYUSH diagnosis or treatment.
9. Preserve current working APIs wherever possible.
10. Preserve backward compatibility with `ClinicalState.ayush`.
11. Prefer additive migrations and adapters over destructive schema rewrites.
12. Do not remove working tests; expand them.
13. Avoid unrelated refactors.

---

# 3. Current Baseline To Preserve

According to the current project audit, the repository already has:

```text
AYUSH workflow
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha representation
AYUSH RAG grounding
Doctor AYUSH page
shared adaptive engine
ClinicalState.ayush
```

The current adaptive architecture already performs deterministic:

```text
domain detection
candidate scoring
duplicate filtering
sufficiency
termination
safety
```

The implementation effort should extend these mechanisms rather than replace them.

---

# 4. Exact Areas To Inspect Before Editing

Before any code change, inspect these actual current files/modules:

```text
backend/app/schemas/clinical_state.py
backend/app/services/clinical_ai/adaptive_engine.py
backend/app/services/clinical_ai/question_scorer.py
backend/app/services/clinical_ai/gap_analysis.py
backend/app/services/clinical_ai/domain_classifier.py
backend/app/services/rag/rag_service.py
backend/app/services/rag/ayush_seed_data.py
backend/app/api/v1/intakes.py
backend/app/api/v1/doctor.py
backend/app/models/intake.py
backend/app/models/*
backend/app/alembic/versions/*
src/pages/DoctorPatientAyush.tsx
src/pages/DoctorPatientSummary.tsx
```

Also locate current tests covering:

```text
AYUSH
adaptive selection
modality equivalence
session isolation
doctor patient detail
RAG
clinical state
```

Do not assume these paths are unchanged; verify them.

---

# 5. Implementation Architecture

## 5.1 Keep ClinicalState as the adaptive working state

The adaptive engine should continue consuming the existing:

```text
ClinicalState
```

including its current AYUSH representation.

## 5.2 Introduce richer AYUSH assessment as an additive layer

Target:

```text
ClinicalState
    └── ayush
          └── current adaptive AYUSH state

AyushAssessment
    ├── system
    ├── dimensions
    ├── evidence
    ├── confidence
    ├── uncertainties
    ├── review_status
    └── physician_review
```

Do not remove existing fields simply to introduce the richer model.

---

# 6. Data Model Changes

## Phase A — Extend schemas first

Create or extend a typed AYUSH schema.

Minimum conceptual shape:

```python
AyushAssessment:
    system
    dimensions
    ahara_vihara
    evidence
    uncertainties
    overall_status
```

Each dimension should support conceptually:

```text
value
status
confidence
source
evidence
last_updated_turn
```

Reuse the existing canonical dimension state pattern wherever practical.

### Sources

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

### Assessment status

```text
INCOMPLETE
PRELIMINARY
NEEDS_REVIEW
PHYSICIAN_CONFIRMED
```

Do not force all fields to be strings if the existing typed architecture already supports better structures.

---

# 7. Ayurveda Dimensions To Support

## Existing baseline

Preserve:

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha information
```

## Expanded dimensions

Add adaptive support for:

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

The engine must NOT automatically ask all ten Dashavidha parameters.

---

# 8. Dimension Activation Logic

Each AYUSH dimension should become a candidate only when:

```text
AYUSH/AYURVEDA workflow active
AND
dimension relevant
AND
dimension unresolved
AND
dimension not duplicated
AND
expected information gain is meaningful
AND
no higher-priority safety candidate blocks it
```

Illustrative:

```text
Patient data
    ↓
Known dimensions
    ↓
Unresolved AYUSH dimensions
    ↓
Candidate scoring
    ↓
ONE selected target
```

---

# 9. Important Scoring Rule

Do not create a completely separate AYUSH scorer.

Extend the existing scoring architecture so that:

```text
modern candidate
+
AYUSH candidate
```

can participate in a common candidate pool where appropriate.

Illustrative scoring components:

```text
Safety priority
Clinical relevance
Workflow relevance
Information gain
New volunteered evidence
    -
Already known
    -
Duplicate
    -
Low-value candidate
```

Safety must always override informational preference.

---

# 10. Workflow Rules

## GENERAL_CLINICAL

```text
AYUSH candidates excluded
```

unless the current product intentionally supports explicit patient activation; verify existing behavior before editing.

## AYUSH

```text
AYUSH candidate pool enabled
Ayurveda assessment context enabled
```

## DUAL_SYSTEM

```text
Modern + AYUSH candidate pools
        ↓
common ranking
        ↓
one question
```

Do not create two turns per cycle.

---

# 11. Inference Rules

The system should distinguish:

```text
what patient explicitly stated
```

from:

```text
what AI inferred from multiple observations
```

Example:

```text
PATIENT_STATED:
"my appetite is strong"

AI_INFERRED:
possible digestive-pattern characterization

STATUS:
NEEDS_REVIEW
```

Do not silently convert an AI inference into a physician-confirmed assessment.

---

# 12. Evidence Model

For each important AYUSH assessment value, retain links where available to:

```text
QuestionEvent
Answer
Document
Physician edit/confirmation
```

The doctor must be able to trace an important inference back to supporting evidence.

Recommended conceptual structure:

```text
AYUSH Dimension
    ↓
Assessment value
    ↓
Evidence[]
    ├── question event
    ├── patient answer
    └── document fact
```

---

# 13. Prakriti / Vikriti Handling

Do not treat a single patient answer as enough to make a definitive constitutional classification.

Preferred lifecycle:

```text
Observed evidence
    ↓
Preliminary structured interpretation
    ↓
AI_INFERRED
    ↓
NEEDS_REVIEW
    ↓
PHYSICIAN_CONFIRMED
```

If sufficient evidence does not exist:

```text
status = UNKNOWN / INCOMPLETE / NEEDS_REVIEW
```

Do not fabricate a classification.

---

# 14. Dosha Visualization

The current doctor visualization can remain.

However, it should display:

```text
assessment status
source/provenance
confidence where available
evidence availability
```

A percentage/gauge must never be presented as an unquestionable clinical fact.

If the existing system cannot justify precise percentages, use a qualitative or explicitly preliminary representation rather than inventing numeric certainty.

---

# 15. RAG Changes

Keep the existing AYUSH RAG pipeline.

Refine its role to:

```text
AYUSH target selected
      ↓
retrieve relevant authoritative context
      ↓
provide bounded context to phrasing/extraction
```

RAG must not select:

```text
diagnosis
treatment
prescription
```

Patient-specific evidence remains separate from general AYUSH knowledge.

---

# 16. Intake API Changes

Prefer to keep:

```text
POST /api/v1/intakes/{id}/answers
POST /api/v1/intakes/{id}/voice-answer
```

as the entry points.

Both should continue to converge on:

```text
process_intake_answer_core
```

AYUSH enrichment should happen inside the same shared flow.

Do not add separate:

```text
/api/ayush/chat
```

or equivalent unless a concrete integration requirement proves it necessary.

---

# 17. Persistence Changes

When a session is AYUSH-enabled:

```text
answer
→ extraction
→ ClinicalState AYUSH update
→ AyushAssessment update
```

Persistence should occur in the same transaction boundary where practical.

Do not leave ClinicalState persisted while AyushAssessment silently fails without surfacing the failure.

---

# 18. Doctor API Changes

The doctor patient detail response should expose enough information for:

```text
AYUSH overview
+
dimension values
+
source
+
confidence
+
evidence
+
review state
```

Do not create a duplicate patient-detail API merely for the sake of AYUSH.

Use the existing dossier API where practical.

---

# 19. Doctor UI Changes

Enhance:

```text
src/pages/DoctorPatientAyush.tsx
```

to present:

### AYUSH system

```text
Ayurveda
```

### Assessment status

```text
Preliminary
Needs Review
Physician Confirmed
```

### Core dimensions

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
```

### Dashavidha

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

### Evidence

For important fields:

```text
source
confidence
supporting evidence
```

### Review

```text
Confirm
Edit
Reject
Add note
```

Use existing doctor design patterns.

Do not redesign the whole doctor portal.

---

# 20. Physician Confirmation

Extend the existing physician review mechanism.

When a doctor confirms or edits an AYUSH value:

```text
old value
new value
field
reason
doctor
timestamp
```

should remain auditable using the existing physician edit/audit architecture.

---

# 21. Document Integration

If an OCR/document extraction produces an AYUSH-related candidate:

```text
OCR
 ↓
candidate extraction
 ↓
evidence validation
 ↓
AYUSH candidate fact
 ↓
NEEDS_REVIEW / CONFIRMED
```

Never silently override:

```text
PATIENT_STATED
```

with:

```text
DOCUMENT
```

Create an explicit contradiction when required by the existing safety/contradiction architecture.

---

# 22. Voice/Text Requirement

The same semantic patient answer must produce the same AYUSH state transition for:

```text
VOICE
TEXT
TOUCH
```

Only input normalization differs.

Test:

```text
Hindi voice answer
≈
Hindi text answer
```

for equivalent AYUSH facts.

---

# 23. Testing Plan

Before coding completion, add tests for:

### Core state

```text
AYUSH state initialization
dimension update
provenance
confidence
status
```

### Adaptive selection

```text
AYUSH workflow
DUAL_SYSTEM
AYUSH candidate ranking
modern vs AYUSH competition
resolved-field rejection
duplicate rejection
```

### Dashavidha

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

### Safety

```text
red flag beats AYUSH candidate
AYUSH cannot suppress escalation
```

### Modality

```text
voice/text equivalence
```

### Persistence

```text
ClinicalState persistence
AyushAssessment persistence
session isolation
```

### Doctor

```text
AYUSH retrieved
evidence retrieved
physician confirmation persisted
physician edit audited
```

---

# 24. Regression Requirements

Before merging:

```text
ALL existing tests pass
+
new AYUSH tests pass
```

Do not accept:

```text
AYUSH works
but
existing modern clinical behavior regressed
```

Run focused AYUSH tests first, then the complete backend suite.

---

# 25. Implementation Order

Use this order:

```text
1. Inspect current AYUSH code
        ↓
2. Extend typed AYUSH schemas
        ↓
3. Add/extend persistence
        ↓
4. Extend adaptive candidate dimensions
        ↓
5. Add provenance/evidence handling
        ↓
6. Connect extraction
        ↓
7. Connect existing RAG
        ↓
8. Update doctor API
        ↓
9. Update doctor AYUSH UI
        ↓
10. Add tests
        ↓
11. Run regression suite
        ↓
12. Manual end-to-end AYUSH scenario
```

Do not start by editing the UI.

---

# 26. Manual Acceptance Scenario

Run at least these:

## Scenario A — Ayurveda

```text
Select AYUSH / Ayurveda
→ complaint
→ adaptive AYUSH questions
→ Agni/Koshtha/core AYUSH
→ selected expanded dimensions where useful
→ complete
→ doctor sees evidence-linked assessment
```

## Scenario B — Dual system

```text
DUAL_SYSTEM
→ clinical complaint
→ modern + AYUSH candidate pool
→ one question at a time
→ no unnecessary AYUSH interrogation
→ doctor receives unified dossier
```

## Scenario C — Voice

```text
Hindi voice
→ transcription
→ shared engine
→ AYUSH state
→ Hindi next question
→ English doctor-facing structured information
```

## Scenario D — Document evidence

```text
Upload AYUSH case document
→ OCR
→ evidence
→ candidate
→ doctor review
```

---

# 27. Definition of Done

AYUSH upgrade is complete only when:

```text
[ ] Existing modern clinical tests remain green
[ ] AYUSH remains in shared adaptive engine
[ ] Ayurveda is represented as a concrete AYUSH system
[ ] Existing baseline AYUSH fields remain compatible
[ ] Expanded dimensions can participate adaptively
[ ] Not every dimension is forced into every interview
[ ] Patient-stated vs AI-inferred is distinguishable
[ ] Evidence/provenance is persisted
[ ] Physician confirmation is persisted
[ ] Existing AYUSH RAG remains bounded
[ ] Doctor can review expanded AYUSH information
[ ] Voice/text converge to same reasoning engine
[ ] Safety can override AYUSH questioning
[ ] No autonomous diagnosis/treatment is introduced
[ ] Tests cover the new behavior
[ ] Full regression suite passes
```

---

# 28. Files That May Need Modification

Do not modify all of these automatically. Verify actual dependencies first.

Likely backend:

```text
backend/app/schemas/clinical_state.py
backend/app/models/intake.py
backend/app/services/clinical_ai/question_scorer.py
backend/app/services/clinical_ai/adaptive_engine.py
backend/app/services/clinical_ai/gap_analysis.py
backend/app/services/clinical_ai/domain_classifier.py
backend/app/services/providers/llm_provider.py
backend/app/services/rag/rag_service.py
backend/app/services/rag/ayush_seed_data.py
backend/app/api/v1/intakes.py
backend/app/api/v1/doctor.py
backend/app/api/v1/documents.py
```

Likely migrations:

```text
backend/alembic/versions/<new_additive_migration>.py
```

Likely frontend:

```text
src/pages/DoctorPatientAyush.tsx
src/pages/DoctorPatientSummary.tsx
relevant doctor components
```

Likely tests:

```text
backend/tests/<existing AYUSH/adaptive test modules>
backend/tests/<new focused AYUSH integration tests>
```

Modify only what actual dependency tracing proves necessary.

---

# 29. Things Explicitly Out of Scope

Do NOT use this upgrade to:

```text
replace FastAPI
replace React/Vite
replace PostgreSQL/SQLite architecture
introduce microservices
introduce another vector database
rewrite the adaptive engine
rewrite the entire doctor portal
replace provider abstraction
change modern clinical logic
implement autonomous diagnosis
implement autonomous treatment
claim live ABDM integration if it is not live
```

---

# 30. Final Principle

The implementation should make this true:

> **AYUSH is not an additional questionnaire. It is a structured assessment capability that participates intelligently in the same adaptive clinical interview.**

The strongest result is not "all AYUSH fields filled."

The strongest result is:

```text
Relevant evidence
+
minimal unnecessary questioning
+
traceable inference
+
safe boundaries
+
clear physician review
```
