# SwasthyaVaani — UI / UX Design Brief

> **Status:** Updated UI/UX source of truth
>
> **Purpose:** Define the visual language, interaction principles, patient experience, clinician experience, and AYUSH/document presentation for SwasthyaVaani.
>
> **Primary references:** Final `SwasthyaVaani_architecture.md`, updated PRD, TRD, Backend Schema, Rules, App Flow, `SwasthyaVaani_Current_Project_State.md`, and AYUSH Specification.
>
> **Important:** The existing SwasthyaVaani visual identity is preserved. This document refines the UX around the finalized architecture rather than replacing the existing design direction.

---

# 1. Product Identity

## Product

**SwasthyaVaani**

## Positioning

> AI-assisted pre-consultation clinical intake platform.

## Tagline

> **Your story, structured before the consultation.**

## Core experience

For the patient:

```text
calm
understandable
respectful
human
accessible
multilingual
```

For the doctor:

```text
structured
evidence-oriented
fast to scan
clinically useful
reviewable
```

For administrators:

```text
controlled
operational
auditable
organized
```

---

# 2. Visual Direction

Preserve the established:

> **Warm, clinical, editorial, human-centered interface.**

The interface should combine:

```text
Healthcare trust
+
Indian warmth
+
Editorial typography
+
Structured clinical information
```

Avoid:

- futuristic AI gimmicks;
- cyberpunk aesthetics;
- excessive gradients/glows;
- generic SaaS dashboard styling;
- robotic chatbot presentation;
- unnecessary 3D effects.

---

# 3. Visual System

## Primary — Deep Forest

```text
#234D40
```

Use for:

- primary controls;
- major navigation;
- headings;
- important clinician surfaces.

## Dark Forest

```text
#1B3B31
```

Use for:

- entry/welcome surfaces;
- strong contrast areas.

## Warm Amber

```text
#EABA61
```

Use for:

- selection;
- progress emphasis;
- guidance cues;
- subtle attention.

## Soft Terracotta

```text
#D48768
```

Use for:

- provenance/source cues;
- document-related metadata;
- secondary accents.

## Warm Paper

```text
#F7F4EE
```

Primary application background.

## Soft Card

```text
#FCFBF8
```

Cards and elevated surfaces.

## Primary Text

```text
#19332C
```

## Secondary Text

```text
#57756C
```

## Urgent Red

```text
#C6362F
```

Strictly reserved for:

```text
safety alerts
priority-review states
```

Never use urgent red as a generic error, decorative accent, or normal button color.

---

# 4. Typography

## Fraunces

Use for:

- major headings;
- welcome statements;
- editorial moments;
- high-level section titles.

## DM Sans

Use for:

- body text;
- buttons;
- labels;
- navigation;
- forms;
- clinical data;
- patient questions.

## DM Mono

Use selectively for:

- timestamps;
- IDs;
- tokens;
- audit metadata;
- technical identifiers;
- source references.

Patient-facing typography should generally be larger and more spacious than clinician/admin interfaces.

---

# 5. Component and Motion System

Use the existing component approach:

```text
shadcn/ui
Radix UI
Lucide React
Framer Motion
```

Use motion for:

- question transitions;
- voice states;
- uploads;
- OCR state changes;
- queue updates;
- confirmation feedback.

Avoid:

- flashy AI animations;
- glowing chatbot effects;
- excessive page motion;
- animations that slow patient interaction.

---

# 6. Patient UX Principles

Design for:

- elderly users;
- low-literacy users;
- first-time digital users;
- nervous patients;
- users unfamiliar with technical terminology;
- multilingual users.

## Rules

### One primary task at a time

Each screen should have one obvious next action.

### Large touch targets

Prefer large, clear controls over small links.

### Simple language

Prefer:

> What is troubling you today?

over:

> Enter your presenting complaint.

### Voice-first, not voice-only

Voice should be prominent while text/touch remains available.

### No clinical jargon

Do not expose:

```text
ClinicalState
information gain
candidate scoring
RAG
canonical dimensions
```

to patients.

---

# 7. Patient Entry

The entry screen should feel welcoming.

Preferred composition:

```text
Dark Forest
   ↓
SwasthyaVaani identity
   ↓
Fraunces greeting
   ↓
short explanation
   ↓
large Start action
```

Suggested copy:

> **Namaste.**  
> Let’s understand your health concern before your consultation.

---

# 8. Patient Onboarding

The standard flow is:

```text
Greeting
 ↓
Language
 ↓
Patient Details
 ↓
Interaction Mode
 ↓
Hospital / Doctor Context
 ↓
Consent
 ↓
Chief Complaint
```

Deployment configuration may preselect hospital/doctor context.

The UI should not imply that a patient can select a hospital/doctor when the kiosk is actually preconfigured.

---

# 9. Language Selection

Show native scripts prominently.

Current fully supported end-to-end languages:

```text
English
Hindi
Marathi
```

Additional supported language options may be displayed where the technical stack supports them, but the UI must not imply full localization when only partial translation/speech support exists.

Example:

```text
हिन्दी
Hindi

English
English

मराठी
Marathi
```

---

# 10. Interaction Mode

Offer:

```text
VOICE
Speak naturally

TEXT / TOUCH
Type or tap
```

The mode changes the interaction modality, not the clinical reasoning.

The patient can switch modality where supported.

---

# 11. Consent UX

Before clinical processing, explain:

- what is being collected;
- why;
- who receives it;
- role of AI;
- role of physician.

Primary actions:

```text
I Agree
Need Help
```

Declining should safely terminate/abort the session without false submission.

Do not make unsupported legal or compliance claims in patient-facing copy.

---

# 12. Chief Complaint Experience

Use an open, low-friction prompt.

Example:

> What is troubling you today?

Support:

```text
Speak
Type
Tap/select
```

The response becomes structured clinical evidence without becoming an autonomous diagnosis.

---

# 13. Adaptive Interview UX

The central patient experience is:

```text
Question
 ↓
Answer
 ↓
System processes
 ↓
Next relevant question
```

Show one primary question at a time.

Do not expose a fixed questionnaire.

Do not display:

```text
Question 4 of 10
```

as a normal progress model because the interview is adaptive.

Prefer:

```text
Health history in progress
```

or a lightweight non-numeric progress indicator.

---

# 14. Question Presentation

Patient questions should be:

- short;
- understandable;
- conversational;
- specific;
- localized;
- voice-friendly.

Avoid compound questions where possible.

Prefer:

> Are you having blurred vision?

over:

> Are you having blurred vision, pain, or sensitivity to light?

When a compound question is necessary, the system must preserve ambiguity internally.

---

# 15. Adaptive Exploration UX

The system may use:

```text
OPEN_EXPLORATION
```

to discover additional relevant concerns.

Example:

> Besides the main problem, have you noticed any other changes?

The patient should experience this as normal conversation, not as a diagnostic checklist.

A newly volunteered issue should lead to targeted follow-up only when clinically relevant.

---

# 16. Non-Informative / Confused Responses

If the patient says:

```text
I don't understand
Not sure
What?
```

the interface should remain calm.

Behavior:

```text
rephrase
or
offer simpler choices
or
switch to text/touch
or
continue with another viable question
```

Never shame the patient or display technical failure messages such as:

```text
LLM failed
candidate generation error
```

---

# 17. Voice UX

Voice states:

```text
IDLE
LISTENING
TRANSCRIBING
PROCESSING
SUCCESS
ERROR
FALLBACK
```

Visual feedback should communicate clearly:

```text
Listening...
Processing...
You said:
"..."
```

Provide a correction/retry path where appropriate.

Speech recognition is a modality service, not clinical decision logic.

---

# 18. Patient Review

Before submission, show a structured summary.

Possible sections:

```text
Main concern
Relevant history
Current symptoms
Medications
Documents
AYUSH information (when relevant)
```

Use patient-friendly language.

Allow correction where the existing workflow supports it.

Do not show hidden AI reasoning.

---

# 19. Document Upload UX

Keep upload simple:

```text
Add Medical Record
```

Support common document types such as:

```text
Prescription
Lab Report
Previous Medical Record
Relevant AYUSH Record
```

During processing show:

```text
Uploaded
Processing
Ready for review
Needs review
Failed
```

Do not imply that OCR output is automatically correct.

---

# 20. Document Review UX

When processing is complete, the patient may see a simple confirmation:

```text
Record uploaded
Your doctor can review this document.
```

Detailed OCR evidence belongs primarily on the clinician side.

---

# 21. Doctor Portal Principles

Doctor UX should optimize for:

```text
scan
verify
edit
confirm
```

The doctor should not have to read the full transcript to find the important clinical information.

Use information hierarchy:

```text
Priority
 ↓
Main concern
 ↓
Structured history
 ↓
Safety
 ↓
Evidence/Documents
 ↓
AYUSH
 ↓
Timeline
 ↓
Physician review
```

---

# 22. Doctor Queue

Queue cards should make priority obvious.

Example:

```text
PRIORITY REVIEW
Patient name
Chief concern
Waiting time
```

Urgent red is reserved for configured safety/priority signals.

Routine queue information uses the normal design system.

The queue may update through:

```text
WebSocket
+
polling fallback
```

---

# 23. Doctor Patient Header

The patient header should expose:

```text
patient identity
age/gender where available
intake token/reference
workflow
language
priority
submission state
```

Avoid overwhelming the header with every clinical field.

---

# 24. Clinical Summary

Present the structured story in a scan-friendly format.

Example:

```text
MAIN CONCERN
Headache

HISTORY
Duration
Location
Severity
Associated symptoms
Aggravating/relieving factors

SAFETY
Priority review signal if present

MEDICATIONS
...

DOCUMENTS
...

AYUSH
...
```

Values should retain provenance/status where relevant.

---

# 25. Evidence and Provenance UX

Important values should be inspectable.

Example:

```text
Medication
Atorvastatin 20 mg

Source
Previous prescription

Status
Needs review
```

For an AI-derived AYUSH value:

```text
Prakriti
Preliminary interpretation

Source
AI-inferred

Status
Needs physician review
```

The UI must distinguish:

```text
patient stated
AI inferred
document derived
physician confirmed
```

---

# 26. Doctor AYUSH Experience

The AYUSH panel appears when relevant.

Preferred structure:

```text
AYUSH ASSESSMENT
────────────────────────

System
Ayurveda

Status
Preliminary / Needs Review / Confirmed

CORE
Prakriti
Vikriti
Agni
Koshtha

AHARA-VIHARA
Diet
Sleep
Activity

DASHAVIDHA
Sara
Samhanana
Pramana
Satmya
Sattva
Ahara Shakti
Vyayama Shakti
Vaya

EVIDENCE
Sources
Supporting responses/documents
Confidence where available

PHYSICIAN REVIEW
Edit
Confirm
Reject
```

---

# 27. AYUSH Visualization

A Tri-Dosha/Dosha visualization can remain as a supporting visual element.

However:

```text
gauge
≠
diagnosis
```

The interface should not imply false numerical certainty.

When values are preliminary or AI-inferred, display the status clearly.

Evidence must remain available.

---

# 28. AYUSH Patient UX

Patients should not be expected to understand internal classification terminology.

Prefer:

> How would you describe your appetite and digestion on most days?

rather than:

> Which Agni type do you have?

unless the patient context specifically justifies the terminology.

The patient should answer naturally; the backend handles structured mapping.

---

# 29. Physician Review UX

For extracted or inferred information:

```text
Confirm
Edit
Reject
```

For contradictions:

```text
Review conflict
```

For uncertain information:

```text
Needs review
```

The UI should never imply that AI-derived information is already medically confirmed.

---

# 30. Timeline UX

The doctor can inspect:

```text
Question
Patient answer
Language
Input mode
Timestamp
Source/evidence
```

The patient's original language should remain available in the conversation timeline.

---

# 31. Safety UX

Safety alerts must be visually unmistakable.

Use:

```text
Urgent Red
```

only when the deterministic safety engine has generated a priority-review signal.

Example:

```text
PRIORITY REVIEW
Potential safety signal detected.
Physician evaluation required.
```

Do not display autonomous diagnoses.

---

# 32. Admin UX

Admin surfaces include:

```text
Dashboard
Hospitals
Departments
Doctors/staff
Workflow configuration
Service monitoring
Audit
QA
```

Admin UX should be information-dense but less patient-oriented.

---

# 33. Accessibility Requirements

Patient experience should support:

- large readable text;
- large touch targets;
- clear focus states;
- sufficient contrast;
- voice alternative;
- text/touch fallback;
- simple language;
- clear recovery paths.

Do not rely on color alone to communicate meaning.

For example:

```text
Priority
+ icon
+ label
+ color
```

---

# 34. Responsive Behavior

## Patient

Optimize for:

```text
tablet
kiosk
touch
portrait/landscape where appropriate
```

## Doctor

Optimize for:

```text
desktop
laptop
high information density
```

## Admin

Optimize for:

```text
desktop
operational dashboards
```

---

# 35. UX Architecture Rules

1. Clinical logic belongs in the backend, not components.
2. UI displays validated backend decisions.
3. Patient UI does not expose internal model reasoning.
4. Doctor UI exposes evidence and status, not chain-of-thought.
5. AYUSH remains part of the shared clinical journey.
6. AYUSH does not become a separate chatbot UI.
7. Documents remain source-verifiable.
8. Safety signals remain visually distinct.
9. Physician actions are explicit.
10. Loading/error/fallback states are understandable without technical jargon.

---

# 36. Current vs Target UX

## Current verified

```text
Patient language selection
Patient demographics
Voice/Text mode
Adaptive intake
Patient review
Document upload
Doctor queue
Doctor clinical summary
Conversation timeline
AYUSH doctor page
```

## Refinement / target

```text
more explicit provenance presentation
richer AYUSH assessment review
expanded Dashavidha presentation
stronger evidence linking
more complete cloud/storage status messaging
```

Do not imply these refinements are fully implemented until verified.

---

# 37. UX Anti-Patterns

Do NOT introduce:

```text
AI avatar
AI confidence meter pretending to be clinical certainty
fixed question counter
long questionnaire pages
diagnosis cards
prescription cards
unexplained dosha percentages
technical error messages to patients
red for ordinary UI errors
```

---

# 38. Definition of Done

```text
[ ] Patient can understand what to do next
[ ] Voice and text feel like the same clinical conversation
[ ] Adaptive questioning is visible as conversation, not a questionnaire
[ ] Patient is never exposed to internal AI reasoning
[ ] Documents have clear upload/processing status
[ ] Doctor can rapidly scan structured history
[ ] Safety signals are unmistakable
[ ] Provenance is visible for important findings
[ ] AYUSH appears only when relevant
[ ] AYUSH is presented as an assessment requiring review
[ ] Expanded AYUSH information does not overwhelm the patient
[ ] Physician can edit/confirm information
[ ] Accessibility requirements are respected
```

---

# 39. Final UX Principle

> **The patient should experience a simple conversation. The doctor should receive a structured clinical dossier.**

The complexity of:

```text
adaptive reasoning
ClinicalState
AYUSH assessment
RAG
provenance
OCR
safety
```

belongs behind the interface.

SwasthyaVaani should feel simple to the patient precisely because the system is structured underneath.
