# SwasthyaVaani — Implementation & Evolution Plan

> **Status:** Updated implementation roadmap
>
> **Purpose:** Define the implementation sequence for evolving the verified current SwasthyaVaani system toward the finalized architecture, with particular focus on the AYUSH expansion.
>
> **Primary references:** Final `SwasthyaVaani_architecture.md`, updated PRD, updated TRD, Backend Schema, Rules, App Flow, UI/UX, AYUSH Specification, and `SwasthyaVaani_Current_Project_State.md`.
>
> **Important:** SwasthyaVaani is already a functioning prototype. This is an evolution/hardening plan, not a greenfield build plan.

---

# 1. Implementation Strategy

Use **incremental vertical slices** and preserve working functionality.

```text
Current Working System
        ↓
Target Architecture
        ↓
Focused Change
        ↓
Unit / Integration Tests
        ↓
Manual Acceptance
        ↓
Regression
        ↓
Documentation Alignment
```

Do not rebuild already-working subsystems merely to make the architecture look newer.

---

# 2. Current Baseline

The verified current system already supports:

```text
Patient intake
Voice + text convergence
Adaptive clinical questioning
ClinicalState
Canonical dimension handling
Safety / red flags
Contradictions
Document upload
OCR / evidence linking
Doctor queue
Doctor dossier
Physician review
AYUSH workflow
AYUSH baseline assessment
AYUSH RAG
FHIR / ABDM mapping paths
Provider abstraction
Admin operations
```

The current implementation should therefore be treated as the foundation.

---

# 3. Main Evolution Areas

The current architectural evolution focuses on:

```text
A. Documentation consistency
B. AYUSH assessment depth
C. AYUSH evidence/provenance
D. Richer AYUSH persistence
E. Doctor AYUSH review experience
F. Test coverage / regression
G. Selected infrastructure refinements
```

No unrelated platform rewrite is required.

---

# 4. Implementation Principles

1. Preserve existing working modern clinical behavior.
2. Use the existing adaptive engine as the central reasoning mechanism.
3. Add AYUSH dimensions to the existing candidate framework.
4. Keep deterministic safety and termination authoritative.
5. Keep AI outputs typed and validated.
6. Preserve patient-stated vs AI-inferred distinctions.
7. Preserve document evidence.
8. Preserve physician authority.
9. Prefer additive migrations.
10. Test every meaningful behavior change.
11. Do not optimize infrastructure before the product behavior is stable.
12. Avoid speculative features.

---

# 5. Phase 0 — Baseline Freeze

Before implementation changes:

```text
[ ] Backup current database / seed state where needed
[ ] Confirm current branch/commit
[ ] Confirm existing documentation revisions
[ ] Run focused AYUSH tests
[ ] Run full backend regression suite
[ ] Record baseline test count/result
[ ] Confirm local development environment
```

Baseline should be recorded before modifying the adaptive engine or AYUSH data structures.

The current-state audit reports 181 backend tests passing; this baseline should be re-run before major changes.

---

# 6. Phase 1 — Architectural / Documentation Freeze

The following documents define the target behavior:

```text
Architecture
PRD
TRD
Backend Schema
Rules
App Flow
AYUSH Specification
UI/UX
```

Before code changes, ensure the repository contains the current versions of these documents.

These documents should describe the same target behavior.

---

# 7. Phase 2 — AYUSH Data Contract

First implementation target:

```text
AyushAssessment
```

The model should support:

```text
system
status
dimensions
ahara_vihara
evidence
confidence
uncertainties
physician_review
```

The existing:

```text
ClinicalState.ayush
```

remains compatible.

Do not remove the current representation immediately.

---

# 8. Phase 3 — AYUSH Dimension Model

Preserve current baseline:

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha evidence
```

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

The parameters must not become a mandatory checklist.

---

# 9. Phase 4 — AYUSH Adaptive Integration

Extend the existing candidate architecture so the adaptive engine can evaluate:

```text
modern candidate
+
AYUSH candidate
```

within the same decision process.

Conceptually:

```text
ClinicalState
+
AyushAssessment
        ↓
workflow/domain context
        ↓
candidate generation
        ↓
information gain
        ↓
duplicate/resolved checks
        ↓
safety
        ↓
one question
```

Do not create:

```text
second AYUSH loop
```

or:

```text
separate AYUSH chatbot
```

---

# 10. Phase 5 — AYUSH Provenance and Evidence

Implement explicit source/status handling.

Minimum source types:

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

Minimum useful assessment metadata:

```text
value
status
source
confidence
evidence
last_updated_turn
```

Example:

```text
Prakriti
Value: preliminary Pitta-dominant
Source: AI_INFERRED
Status: NEEDS_REVIEW
Evidence: QuestionEvents 12, 14
```

Do not manufacture confidence.

---

# 11. Phase 6 — AYUSH RAG Refinement

Preserve the current AYUSH knowledge/RAG implementation.

Clarify and enforce its role:

```text
AYUSH target
 ↓
retrieve relevant reference context
 ↓
bounded grounding
 ↓
question phrasing / assessment context
```

RAG cannot become:

```text
diagnosis engine
treatment engine
prescription engine
```

Keep patient-specific evidence separate from general knowledge.

---

# 12. Phase 7 — Persistence

Add the richer AYUSH persistence model using an additive migration.

Preferred direction:

```text
IntakeSession
   ├── ClinicalState
   └── AyushAssessment
```

The current `ClinicalState.ayush` remains available to the adaptive engine during transition.

Migration requirements:

```text
[ ] existing rows preserved
[ ] null-safe migration
[ ] no destructive field removal
[ ] doctor API compatibility
[ ] seed compatibility
[ ] tests for old + new records
```

---

# 13. Phase 8 — Doctor AYUSH Experience

Enhance the existing AYUSH doctor page rather than replacing it.

Display:

```text
System
Assessment status
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dashavidha summary
Evidence
Source
Confidence where justified
Physician review state
```

Keep the existing visual language.

A Dosha visualization can remain, but should not imply false numerical certainty.

---

# 14. Phase 9 — Document / AYUSH Evidence Integration

If a document contains relevant AYUSH information:

```text
Upload
 ↓
OCR
 ↓
candidate extraction
 ↓
evidence validation
 ↓
AYUSH candidate fact
 ↓
review
```

Do not automatically overwrite patient-stated information.

Conflicting values become explicit review items.

---

# 15. Phase 10 — Physician Review

Extend the existing physician review mechanism to AYUSH values.

Doctor actions:

```text
Confirm
Edit
Reject
Annotate
Resolve contradiction
```

Audit:

```text
field
old value
new value
doctor
timestamp
reason where available
```

Physician confirmation remains authoritative.

---

# 16. Phase 11 — Testing

## Unit Tests

Add/extend tests for:

```text
AYUSH state
dimension state
canonical mapping
candidate scoring
duplicate prevention
sufficiency
provenance
```

## Integration Tests

Test:

```text
answer
→ AYUSH extraction
→ state update
→ next question
```

and:

```text
voice
→ transcript
→ same AYUSH engine
```

## Doctor Tests

Test:

```text
AYUSH retrieval
evidence retrieval
physician edit
physician confirmation
audit
```

---

# 17. Phase 12 — AYUSH Scenario Matrix

Use controlled synthetic scenarios.

## Scenario A — AYUSH

```text
workflow = AYUSH
system = Ayurveda
complaint
→ adaptive AYUSH questions
→ core fields
→ expanded fields when useful
→ stop when sufficient
```

## Scenario B — Dual System

```text
workflow = DUAL_SYSTEM
complaint
→ modern + AYUSH candidates
→ one shared candidate pool
→ one question at a time
→ safety precedence
```

## Scenario C — Voice

```text
Hindi voice
→ STT
→ shared engine
→ AYUSH state
→ Hindi question
→ doctor receives structured data
```

## Scenario D — Document

```text
AYUSH record upload
→ OCR
→ evidence
→ candidate
→ physician review
```

---

# 18. Phase 13 — Regression Protection

After every meaningful adaptive-engine modification:

```text
focused AYUSH tests
        ↓
adaptive tests
        ↓
modality tests
        ↓
safety tests
        ↓
document tests
        ↓
doctor API tests
        ↓
full suite
```

No AYUSH change should be merged if it breaks modern clinical behavior without an explicitly approved architecture decision.

---

# 19. Phase 14 — Current Infrastructure Refinements

These should happen only after the clinical/AYUSH behavior is stable.

## Priority candidates

```text
1. Private cloud/Supabase document storage
2. Native pgvector/vector indexing
3. More dynamic kiosk hospital/doctor context
4. Realtime queue refinement
```

Do not let infrastructure optimization delay the clinical behavior upgrade.

---

# 20. Phase 15 — Documentation Synchronization

After verified implementation:

```text
Implementation
     ↓
Test evidence
     ↓
Update current-state status
     ↓
Update architecture implementation labels
     ↓
Update implementation plan
     ↓
Update README
```

The documentation must never claim:

```text
implemented
```

before code/test verification exists.

---

# 21. Demo Readiness

Maintain controlled synthetic demos for:

```text
Modern clinical case
AYUSH/Ayurveda case
Dual-system case
Hindi voice case
Document/OCR case
Red-flag case
Contradiction case
```

The demos must use the real persistence and doctor handoff path wherever possible.

Avoid frontend-only fake cases.

---

# 22. Definition of Done — AYUSH Upgrade

```text
[ ] AYUSH remains in the shared adaptive engine
[ ] Ayurveda is explicit as the first detailed AYUSH system
[ ] Existing core AYUSH behavior remains compatible
[ ] Expanded dimensions participate adaptively
[ ] No fixed Dashavidha questionnaire
[ ] Patient-stated / AI-inferred / document / physician-confirmed are distinct
[ ] Evidence is traceable where practical
[ ] Richer AYUSH assessment is persisted
[ ] Doctor can inspect AYUSH evidence
[ ] Doctor can edit/confirm/reject
[ ] Physician actions are audited
[ ] RAG remains bounded
[ ] Safety remains deterministic
[ ] No autonomous diagnosis/treatment
[ ] Voice/text remain semantically aligned
[ ] Existing modern clinical tests remain green
[ ] New AYUSH tests pass
```

---

# 23. Definition of Done — Overall Platform

```text
[ ] Architecture docs match implementation
[ ] PRD matches product behavior
[ ] TRD matches technical behavior
[ ] Backend Schema matches persistent models
[ ] Rules match actual hard constraints
[ ] App Flow matches runtime transitions
[ ] AYUSH specification matches implemented behavior
[ ] UI/UX matches actual interaction
[ ] README is current
[ ] Known limitations are documented
```

---

# 24. Recommended Order of Actual Coding Work

Use this exact sequence:

```text
1. Baseline tests
2. AYUSH schema/data contract
3. Additive persistence
4. AYUSH candidate dimensions
5. Shared scoring integration
6. Provenance/evidence
7. RAG refinement
8. Doctor AYUSH API
9. Doctor AYUSH UI
10. Physician review/audit
11. Document → AYUSH evidence
12. Focused tests
13. Full regression
14. Manual synthetic scenarios
15. Infrastructure refinements
```

Do not reorder this to start with UI.

---

# 25. Ownership Model

Suggested technical ownership remains compatible with the current team split:

```text
Omkar
→ backend integration
→ persistence/API contracts
→ cross-module integration

Ishwari
→ ClinicalState
→ adaptive engine
→ AYUSH assessment
→ scoring/provenance rules

Ishita
→ patient UX
→ voice
→ multilingual interaction

Jaskeerat
→ doctor dashboard
→ AYUSH review experience
→ realtime/polling

Kunal
→ documents
→ OCR
→ document-derived evidence

Rohan
→ admin
→ QA
→ regression
→ synthetic scenarios/demo validation
```

Cross-team contracts remain important:

```text
Clinical AI Contract
        ↓
Backend Contract
        ↓
Patient / Doctor / Document Consumers
        ↓
Integration / QA
```

---

# 26. Change-Control Rule

Before adding a new architectural capability:

```text
Does it solve a real requirement?
        ↓
Does it fit existing architecture?
        ↓
Does it preserve safety?
        ↓
Does it preserve physician authority?
        ↓
Can it be tested?
```

If not, do not add it merely for technical novelty.

---

# 27. Final Implementation Principle

> **Evolve the working SwasthyaVaani system; do not rebuild it.**

The implementation should become more capable while preserving:

```text
existing patient experience
+
existing adaptive engine
+
existing safety
+
existing doctor workflow
```

The AYUSH upgrade should add:

```text
deeper assessment
+
better evidence
+
stronger provenance
+
better physician review
```

without turning SwasthyaVaani into a rigid questionnaire or autonomous clinical system.
