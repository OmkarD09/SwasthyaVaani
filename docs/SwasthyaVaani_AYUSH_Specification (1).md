# SwasthyaVaani — AYUSH Assessment Specification

> **Status:** Updated AYUSH domain source of truth
>
> **Purpose:** Define how AYUSH assessment works inside SwasthyaVaani, how Ayurveda is represented, how adaptive questioning works, how evidence/provenance is preserved, and how physicians review the resulting assessment.
>
> **Primary references:** Final `SwasthyaVaani_architecture.md`, updated PRD, TRD, Backend Schema, Rules, App Flow, `SwasthyaVaani_Current_Project_State.md`, and Architecture v2.
>
> **Important:** This document defines AYUSH assessment behavior. It does not authorize autonomous diagnosis or treatment.

---

# 1. AYUSH Product Objective

SwasthyaVaani should support AYUSH as a structured assessment pathway within the same adaptive intake engine used for modern clinical history.

The objective is:

```text
collect relevant AYUSH evidence
+
minimize unnecessary patient burden
+
preserve provenance and uncertainty
+
prepare physician-reviewable information
```

It is not:

```text
AI Ayurvedic diagnosis
```

or:

```text
fixed AYUSH questionnaire
```

---

# 2. Architectural Principle

## Dual-System, Single Engine

AYUSH is a first-class workflow inside the shared adaptive engine.

```text
                    Unified Adaptive Engine
                              |
              +---------------+---------------+
              |                               |
      Modern Clinical Dimensions        AYUSH Dimensions
```

There is no separate AYUSH chatbot and no independent AYUSH question loop.

The same mechanisms govern both:

- information-gap detection;
- candidate generation;
- information-gain scoring;
- duplicate prevention;
- canonical state;
- safety;
- termination;
- question limits;
- modality equivalence.

---

# 3. AYUSH as an Umbrella

AYUSH is the broader workflow category.

Target extensibility:

```text
AYUSH
├── Ayurveda
├── Yoga & Naturopathy
├── Unani
├── Siddha
└── Homoeopathy
```

The current detailed assessment model is primarily:

```text
AYURVEDA
```

Therefore, Ayurveda-specific parameters must not be represented as universal AYUSH parameters.

Future AYUSH systems may introduce their own domain-specific assessment models while reusing the same adaptive infrastructure.

---

# 4. AYUSH Workflow Types

The intake supports:

```text
GENERAL_CLINICAL
AYUSH
DUAL_SYSTEM
```

## 4.1 GENERAL_CLINICAL

The adaptive candidate pool is focused on modern clinical dimensions.

AYUSH parameters are excluded unless the product explicitly activates an AYUSH context.

## 4.2 AYUSH

AYUSH dimensions participate in the adaptive candidate pool.

For the current detailed pathway:

```text
system = AYURVEDA
```

## 4.3 DUAL_SYSTEM

Modern clinical and Ayurveda candidates may compete in the same adaptive candidate pool.

```text
Modern candidates
+
AYUSH candidates
        ↓
common scoring
        ↓
one question
```

Safety always has higher priority.

---

# 5. Current Implemented AYUSH Baseline

The current system already supports an integrated AYUSH workflow with:

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha representation/evidence
AYUSH RAG grounding
Doctor AYUSH view
```

These capabilities must remain backward-compatible while the richer assessment model is introduced.

---

# 6. Expanded Ayurveda Assessment

The target Ayurveda assessment includes:

## Core

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha evidence
```

## Dashavidha expansion

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

Together with the existing core dimensions, this provides a richer Ayurveda assessment structure.

---

# 7. Dashavidha Is an Assessment Model, Not a Checklist

The system must NOT execute:

```text
Q1 Prakriti
Q2 Vikriti
Q3 Sara
Q4 Samhanana
Q5 Pramana
...
```

for every patient.

Instead:

```text
Patient information
       ↓
Known AYUSH state
       ↓
Relevant unresolved AYUSH dimensions
       ↓
Candidate scoring
       ↓
ONE useful question
```

A parameter may remain:

```text
UNKNOWN
```

without being a failure.

The goal is relevant evidence, not maximum field completion.

---

# 8. AYUSH Candidate Eligibility

An AYUSH dimension can enter the candidate pool only when:

```text
AYUSH/Ayurveda workflow active
AND
dimension relevant
AND
dimension unresolved
AND
dimension not duplicated
AND
expected information gain meaningful
AND
not blocked by safety
```

The engine should also consider:

```text
patient burden
recently explored areas
newly volunteered evidence
```

---

# 9. Adaptive Question Selection

AYUSH candidates are evaluated using the same general scoring framework as modern clinical candidates.

Conceptually:

```text
Candidate score =
    safety priority
  + workflow relevance
  + clinical/assessment relevance
  + information gain
  + newly volunteered evidence
  - already known
  - duplicate
  - low-value
```

Exact weights remain an implementation detail.

Do not create an independent AYUSH scoring algorithm unless a demonstrated requirement justifies it.

---

# 10. Question Language

AYUSH questions should be understandable to the patient.

Prefer:

> “How would you describe your appetite and digestion on most days?”

over:

> “What is your Agni type?”

unless the patient is expected to understand the terminology.

Internal concepts such as:

```text
Agni
Koshtha
Prakriti
Vikriti
```

may remain structured backend dimensions while patient-facing phrasing stays natural.

---

# 11. Open Exploration in AYUSH

AYUSH may use open exploration to discover useful information.

Example:

> “Besides your main concern, have you noticed any recurring changes in your appetite, digestion, sleep, food habits, or daily routine?”

The response becomes evidence.

It does not automatically confirm every dimension mentioned.

If the patient introduces something new:

```text
new observation
       ↓
dimension mapping
       ↓
state update
       ↓
recalculate candidates
```

---

# 12. Targeted AYUSH Follow-Up

When a relevant AYUSH observation is discovered:

```text
new evidence
     ↓
target dimension
     ↓
targeted question
```

The engine should avoid broad repetition once the relevant area is established.

---

# 13. Core AYUSH Dimensions

## 13.1 Prakriti

Represents constitutional information collected as part of the Ayurveda assessment.

The system may collect evidence relevant to constitutional tendencies.

Important rule:

```text
patient observations ≠ definitive constitutional diagnosis
```

AI-derived interpretations remain preliminary/reviewable.

## 13.2 Vikriti

Represents current-state observations relative to the patient's reported baseline.

The engine should preserve the distinction between:

```text
usual state
```

and:

```text
recent/current change
```

## 13.3 Agni

The assessment may capture digestive/appetite patterns relevant to the existing Agni field.

The stored result must retain source/status.

## 13.4 Koshtha

The assessment may capture relevant bowel-pattern information.

The result must remain structured and evidence-linked where possible.

## 13.5 Ahara-Vihara

Structured lifestyle context may include:

```text
diet / meal pattern
sleep
activity
other notable lifestyle factors
```

These fields should be captured only when relevant.

---

# 14. Expanded Dashavidha Dimensions

## 14.1 Sara

The system may collect structured observations relevant to tissue/overall quality.

Do not infer a definitive classification from one isolated descriptor.

## 14.2 Samhanana

The system may capture relevant body-frame/structural descriptors.

Avoid unnecessary physical questions when useful information already exists.

## 14.3 Pramana

The system may use known demographic/physical information where appropriate.

Do not ask for information that is already available from the patient profile unless clarification is necessary.

## 14.4 Satmya

The system may capture relevant habituation information such as foods, routines, seasons, or environments that the patient reports as suitable/unsuitable.

## 14.5 Sattva

The system may capture relevant self-described coping/resilience information where the workflow requires it.

Do not turn this into an unsupported mental-health diagnosis.

## 14.6 Ahara Shakti

May capture appetite and meal/digestive capacity observations.

Avoid duplicating Agni questions where the existing evidence already sufficiently characterizes the relevant dimension.

## 14.7 Vyayama Shakti

May capture physical activity/exertion tolerance when useful.

Do not force an exercise question into unrelated short encounters.

## 14.8 Vaya

Where supported by patient age/life-stage data, the engine should prefer deriving the relevant context instead of asking the patient to repeat known demographic information.

---

# 15. Dimension State

AYUSH dimensions should use the same state semantics as the shared clinical state architecture:

```text
UNKNOWN
KNOWN_TRUE
KNOWN_FALSE
AMBIGUOUS
KNOWN_WITH_VALUE
```

Where applicable, also retain:

```text
confidence
source
evidence
last_updated_turn
```

An unknown field is not equivalent to a negative finding.

---

# 16. Provenance

AYUSH values must distinguish source.

Minimum categories:

```text
PATIENT_STATED
AI_INFERRED
DOCUMENT
PHYSICIAN_CONFIRMED
```

Example:

```text
Agni
Value: preliminary irregular digestive pattern
Source: AI_INFERRED
Status: NEEDS_REVIEW
Evidence: question events 12, 14
```

A physician-confirmed value is a separate state of evidence.

---

# 17. Evidence Model

Evidence may come from:

```text
patient answers
question events
documents
document extraction
physician edits
```

Conceptually:

```text
AYUSH Dimension
      ↓
Assessment Value
      ↓
Evidence[]
```

The goal is to allow the physician to inspect why a finding appears in the assessment.

---

# 18. Prakriti / Vikriti Inference Rule

The system must not treat one isolated answer as enough for a definitive classification.

Preferred lifecycle:

```text
observed evidence
      ↓
structured observations
      ↓
preliminary inference
      ↓
NEEDS_REVIEW
      ↓
physician confirmation
```

If the evidence is insufficient:

```text
UNKNOWN
```

or:

```text
INCOMPLETE
```

is preferable to fabricated certainty.

---

# 19. Dosha Representation

A Dosha visualization may be used in the doctor portal.

However:

```text
visualization
≠
diagnosis
```

If numeric distribution is shown, the underlying calculation and uncertainty must be defensible.

Do not invent precise percentages simply to populate a gauge.

A qualitative or preliminary representation is preferable when the evidence does not justify numerical precision.

---

# 20. AYUSH RAG

The existing AYUSH RAG provides reference grounding.

Use it for:

```text
terminology
question framing
reference-aligned assessment context
```

Do not use RAG as a substitute for deterministic safety or physician decision-making.

RAG must not autonomously produce:

```text
diagnosis
treatment
prescription
```

---

# 21. Knowledge vs Patient Evidence

Keep:

```text
AYUSH reference knowledge
```

separate from:

```text
patient-specific evidence
```

Reference documents explain the assessment context.

Patient records provide patient-specific facts.

They must not be merged into an unrestricted undifferentiated knowledge source.

---

# 22. AYUSH + Documents

Previous Ayurvedic/AYUSH records may contribute evidence:

```text
document
 ↓
OCR
 ↓
candidate extraction
 ↓
evidence validation
 ↓
AYUSH-related fact
 ↓
needs review / confirmation
```

Document-derived values must not silently overwrite patient statements.

Where sources conflict:

```text
CONTRADICTION
→ physician review
```

---

# 23. AYUSH + Safety

AYUSH questioning is subordinate to platform-wide safety.

Priority:

```text
Safety
   >
clinical/urgent follow-up
   >
AYUSH assessment preference
   >
low-value contextual questioning
```

If a patient response triggers an existing red-flag rule, the safety workflow takes precedence.

AYUSH must never suppress:

- red flags;
- urgent review;
- contradiction handling;
- authorization;
- physician confirmation.

---

# 24. AYUSH + Modern Clinical Interview

In `DUAL_SYSTEM`:

```text
modern candidates
+
AYUSH candidates
```

can compete within one candidate pool.

Example:

```text
Patient complaint
     ↓
modern candidate: symptom duration
AYUSH candidate: appetite pattern
     ↓
common information-gain evaluation
     ↓
select one
```

The system must not force:

```text
modern question
AND
AYUSH question
```

in the same turn.

---

# 25. Termination

AYUSH does not have an independent termination mechanism.

Use the global interview rules:

```text
sufficient relevant information
→ STOP

no useful candidate
→ STOP

low expected information gain
→ STOP

safety-required candidate
→ continue/escale according to safety rules

hard question ceiling
→ LIMITED_HISTORY
```

This avoids an unbounded secondary AYUSH interview.

---

# 26. Voice and Text

AYUSH uses the same modality-independent clinical reasoning.

```text
Voice
 ↓
STT
 ↓
shared engine
```

```text
Text / Touch
 ↓
shared engine
```

Equivalent semantic answers should produce equivalent AYUSH state updates.

Patient-facing language may be Hindi, Marathi, English, or another supported language.

Doctor-facing structured AYUSH information is normalized into the system's clinical presentation language.

---

# 27. Doctor-Facing AYUSH Panel

The doctor should see, where relevant:

```text
AYUSH Assessment
────────────────────────

System
Ayurveda

Assessment Status
Preliminary / Needs Review / Confirmed

Core Assessment
Prakriti
Vikriti
Agni
Koshtha

Ahara-Vihara
Diet
Sleep
Activity

Dashavidha Pariksha
Sara
Samhanana
Pramana
Satmya
Sattva
Ahara Shakti
Vyayama Shakti
Vaya

Evidence / Provenance
Source
Confidence
Supporting responses/documents

Physician Review
Edit
Confirm
Reject
```

The current visual design may be retained and progressively enriched.

---

# 28. Physician Confirmation

The physician remains the final authority.

Physician actions:

```text
review
edit
confirm
reject
annotate
resolve contradiction
```

Changes should remain auditable.

---

# 29. Data Persistence

The system should maintain:

```text
ClinicalState.ayush
```

for compatibility with current adaptive behavior.

The richer target is:

```text
AyushAssessmentModel
```

which can carry:

```text
system
dimensions
evidence
confidence
uncertainties
review state
```

Migration should be additive.

---

# 30. API Behavior

Existing intake APIs remain the primary entry points:

```text
POST /api/v1/intakes/{id}/answers
POST /api/v1/intakes/{id}/voice-answer
```

AYUSH processing happens inside the shared intake pipeline.

Do not create a separate AYUSH chat API without a concrete architectural requirement.

Doctor retrieval should expose AYUSH through the existing patient dossier or a narrowly scoped endpoint if required by the current implementation.

---

# 31. AI Boundaries

The AI may:

```text
extract observations
interpret language
propose structured candidate values
phrase questions
draft summaries
```

The AI may not:

```text
declare definitive AYUSH diagnosis
prescribe treatment
control safety
control authorization
control termination
silently confirm values
```

---

# 32. Testing Requirements

## Workflow tests

```text
GENERAL_CLINICAL
AYUSH
DUAL_SYSTEM
```

## Core AYUSH

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
```

## Expanded

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

## Behavioral

```text
AYUSH candidate selection
modern vs AYUSH candidate competition
duplicate prevention
resolved-field prevention
ambiguous answers
non-informative answers
early termination
question ceiling
safety precedence
voice/text equivalence
session isolation
```

## Evidence

```text
patient-stated provenance
AI-inferred provenance
document provenance
physician confirmation
contradiction handling
```

## Doctor

```text
AYUSH retrieval
evidence display
physician edit
physician confirmation
audit
```

---

# 33. Acceptance Criteria

The AYUSH implementation is acceptable when:

```text
[ ] AYUSH runs inside the shared adaptive engine
[ ] No second AYUSH interview loop exists
[ ] Ayurveda is explicitly identified as the first detailed AYUSH system
[ ] Existing Prakriti/Vikriti/Agni/Koshtha behavior remains compatible
[ ] Ahara-Vihara is structured
[ ] Expanded Dashavidha dimensions can participate adaptively
[ ] Expanded dimensions are not mandatory questions for every patient
[ ] Known information is not repeatedly requested
[ ] Patient-stated vs AI-inferred information is distinguishable
[ ] Evidence can be traced where practical
[ ] Uncertainty remains visible
[ ] Safety always takes priority
[ ] RAG remains bounded to knowledge grounding
[ ] No autonomous diagnosis/treatment is introduced
[ ] Doctor can review/edit/confirm AYUSH information
[ ] Physician actions remain auditable
[ ] Voice and text use the same reasoning pipeline
[ ] Existing modern clinical tests remain green
[ ] AYUSH-specific tests pass
```

---

# 34. Implementation Status Model

Maintain a clear distinction:

## Verified current

```text
AYUSH workflow
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Dosha representation
AYUSH RAG
doctor AYUSH view
shared adaptive integration
```

## Target expansion

```text
richer AyushAssessmentModel
expanded Dashavidha dimensions
evidence-linked AYUSH review
stronger provenance
additional AYUSH systems
```

Do not claim target expansion as implemented until verified.

---

# 35. Future AYUSH Systems

After the Ayurveda pathway is robust, the same infrastructure may support:

```text
Yoga & Naturopathy
Unani
Siddha
Homoeopathy
```

Each should get its own domain model and relevant assessment dimensions.

Do not duplicate the adaptive engine.

---

# 36. Final AYUSH Design Principle

> **SwasthyaVaani should collect AYUSH evidence intelligently, not administer an AYUSH questionnaire.**

The best result is:

```text
relevant evidence
+
minimal unnecessary questioning
+
traceable inference
+
clear uncertainty
+
physician review
```

not:

```text
maximum number of AYUSH fields completed
```

---

# 37. Final Domain Boundary

```text
Patient
   ↓
Natural language / voice
   ↓
Shared adaptive engine
   ↓
AYUSH evidence
   ↓
Structured Ayurveda assessment
   ↓
Safety + provenance
   ↓
Doctor review
   ↓
Physician confirmation
```

AYUSH strengthens the SwasthyaVaani patient-to-doctor handoff without turning the platform into an autonomous Ayurvedic practitioner.
