# SwasthyaVaani — UI / UX Design Brief

> **Audience:** AI coding/design agents and frontend developers.
>
> **Purpose:** This document defines the visual language and UX principles for SwasthyaVaani. Use it together with `PRD.md`, `TRD.md`, `architecture.md`, `appflow.md`, `backend_schema.md`, and `rules.md`.
>
> **Important:** A small frontend prototype already exists. Treat the existing implementation as a starting point and preserve useful patterns/components rather than blindly regenerating the UI.

---

# 1. Product Identity

## Product

**SwasthyaVaani**

## Positioning

> AI-assisted pre-consultation clinical intake platform.

## Tagline

> **Your story, structured before the consultation.**

## Core product idea

The patient should feel that SwasthyaVaani is:

- calm;
- understandable;
- respectful;
- human;
- trustworthy;
- easy to use.

The doctor should feel that it is:

- structured;
- information-dense;
- clinically useful;
- fast to scan;
- evidence-oriented.

The administrator should feel that it is:

- controlled;
- operational;
- organized;
- auditable.

---

# 2. Visual Direction

The product visual identity is intentionally different from a generic blue hospital dashboard.

Use a:

> **Warm, clinical, editorial, human-centered interface.**

The visual language should combine:

```text
Healthcare trust
+
Indian warmth
+
Editorial typography
+
Structured clinical information
```

Avoid making the application look:

- futuristic;
- robotic;
- cyberpunk;
- overly corporate;
- like a generic SaaS admin template;
- like an AI chatbot demo.

---

# 3. Color Palette

Use these colors consistently.

## Primary — Deep Forest

```text
#234D40
```

Use for:

- primary buttons;
- headings;
- clinician surfaces;
- major navigation;
- important interface controls.

## Dark Forest

```text
#1B3B31
```

Use for:

- entry-screen backgrounds;
- darker navigation surfaces;
- strong visual contrast areas;
- selected dark sections.

## Primary Highlight — Warm Amber

```text
#EABA61
```

Use for:

- selected states;
- guidance accents;
- primary highlights;
- progress emphasis;
- subtle attention cues.

Do not use it as a full-page background.

## Secondary Accent — Soft Terracotta

```text
#D48768
```

Use for:

- source/provenance cues;
- secondary accents;
- document-related metadata;
- supporting highlights.

## Main Background — Warm Paper

```text
#F7F4EE
```

Use as the primary app background.

This should feel warmer than pure white.

## Card / Elevated Surface — Soft Card

```text
#FCFBF8
```

Use for:

- cards;
- panels;
- forms;
- modals;
- elevated surfaces.

## Primary Text — Ink Green

```text
#19332C
```

Use for:

- main body text;
- important labels;
- patient questions;
- clinician-facing information.

## Secondary Text — Muted Sage

```text
#57756C
```

Use for:

- secondary labels;
- supporting descriptions;
- metadata;
- helper text.

## Urgent Red

```text
#C6362F
```

### STRICT RULE

Reserve this color **strictly for priority-review/safety alerts**.

Do not use it for:

- normal errors;
- decorative accents;
- buttons;
- generic warnings;
- branding.

A normal application error should use a neutral/amber treatment rather than the urgent red.

---

# 4. Color Usage Rules

Preferred hierarchy:

```text
Warm Paper
    ↓
Soft Card
    ↓
Deep Forest
    ↓
Warm Amber / Terracotta
    ↓
Urgent Red only when clinically required
```

Do not flood the interface with accent colors.

The strongest colors should communicate the strongest meaning.

### Example

Normal:

```text
Deep Forest button
```

Selected:

```text
Warm Amber accent
```

Source:

```text
Soft Terracotta cue
```

Urgent:

```text
Urgent Red
```

---

# 5. Typography

Use exactly these font roles where available.

## Fraunces

Use for:

- display headings;
- large editorial statements;
- major section titles;
- welcome statements;
- emotionally human product moments.

Purpose:

> Gives SwasthyaVaani a distinctive, human personality.

Do not use Fraunces for dense tables or long body text.

---

## DM Sans

Use for:

- body text;
- labels;
- buttons;
- forms;
- navigation;
- clinical information;
- patient questions;
- all normal UI copy.

Purpose:

> Clean, readable, practical interface typography.

This should be the primary UI font.

---

## DM Mono

Use for:

- patient tokens;
- timestamps;
- IDs;
- technical metadata;
- source identifiers;
- audit/event details;
- structured machine-like values.

Purpose:

> Adds a subtle clinical/structured feel.

Do not overuse it.

---

# 6. UI Component & Animation System

## UI Component System

Use:

- shadcn/ui — primary component system
- Radix UI — accessible primitives used by shadcn/ui
- Lucide React — icon system
- Framer Motion — subtle interface animations and transitions

### shadcn/ui

Use for:

- Buttons
- Cards
- Dialogs
- Inputs
- Selects
- Tabs
- Toasts
- Tooltips
- Badges

Do not create custom versions of components that already exist
in shadcn/ui unless there is a clear design requirement.

### Framer Motion

Use for subtle:

- page transitions
- adaptive question transitions
- voice-state transitions
- upload/OCR states
- doctor queue updates
- confirmation feedback

Avoid:

- flashy animations
- excessive motion
- glowing AI effects
- distracting 3D effects

# 7. Typography Hierarchy

Recommended hierarchy:

```text
Fraunces
  ↓
Page / Hero Heading

DM Sans
  ↓
Section heading
  ↓
Body
  ↓
Labels / Buttons

DM Mono
  ↓
Metadata / IDs / timestamps
```

Patient-facing typography should generally be larger than doctor/admin typography.

---



# 8. Patient Experience — UX Principles

The patient interface is the most human part of the product.

Design for:

- elderly users;
- low-literacy users;
- nervous patients;
- users who may not be comfortable with technology;
- multilingual users.

## Rules

### One task at a time

Do not overwhelm the patient with multiple competing actions.

### Large touch targets

Controls should be comfortably tappable.

Prefer:

```text
large button
```

over:

```text
small text link
```

### Simple language

Say:

> What is troubling you today?

Not:

> Enter your presenting complaint.

### Voice-first, not voice-only

Voice should be prominent, but a text/touch fallback must always exist.

### Visible progress

Show that the patient is moving forward without implying a fixed number of questions.

Prefer:

> Health history in progress

over:

> Question 4 of 12

when the interview is dynamic.

---

# 9. Patient Entry Experience

The first screen should feel warm and human.

Suggested composition:

```text
Dark Forest background
        +
SwasthyaVaani identity
        +
Fraunces greeting
        +
short explanation
        +
large Start button
```

Example:

> **Namaste.**  
> Let’s understand your health concern before your consultation.

Primary CTA:

```text
Start
```

Avoid excessive illustrations.

---

# 10. Patient Onboarding Flow

The visual sequence should be:

```text
Greeting
 ↓
Hospital
 ↓
Doctor
 ↓
Language
 ↓
Voice / Text
 ↓
Consent
 ↓
ABHA / Health ID where available
 ↓
Chief Complaint
```

Each step should feel like part of the same guided experience.

Use a consistent top-level progress indicator.

---

# 11. Hospital Selection UX

The hospital selector should feel like a simple check-in.

Components:

```text
Search
Hospital cards
Selected state
Continue button
```

Selected hospital:

- Deep Forest border/surface;
- subtle Warm Amber selection indicator.

If the kiosk is preconfigured for one hospital:

> Skip the selection screen and show the configured hospital as confirmed.

---

# 12. Doctor Selection UX

Doctor cards should show:

```text
Doctor name
Specialty
Department
Optional availability
```

Example:

```text
Dr. Anjali Sharma
General Medicine

[ Select ]
```

Avoid excessive biographical information.

The goal is selection, not profile browsing.

---

# 13. Language Selection UX

Language cards should be large and obvious.

Example:

```text
हिन्दी
Hindi

English
English

मराठी
Marathi
```

Use native script prominently.

Optional speaker icon:

```text
🔊
```

to preview pronunciation.

---

# 14. Interaction Mode UX

Show two equally understandable options:

```text
┌─────────────────────┐
│ 🎙                   │
│ Voice               │
│ Speak naturally     │
└─────────────────────┘

┌─────────────────────┐
│ ⌨ / 👆              │
│ Text / Touch        │
│ Type or select      │
└─────────────────────┘
```

Do not imply that voice is mandatory.

---

# 15. Consent UX

Consent must feel simple, not like a legal document dump.

Structure:

```text
Why we collect
↓
Who can see it
↓
AI's role
↓
Doctor's role
↓
I Agree
```

Use progressive disclosure for details.

Never place unsupported legal claims such as:

> 100% DPDP compliant

on the interface.

---

# 16. Chief Complaint UX

This is the gateway into the AI experience.

Main message:

> **What is troubling you today?**

Primary:

```text
🎙 Tap to speak
```

Secondary:

```text
Type instead
```

After speech:

```text
You said:

"Mujhe teen din se pet mein dard hai."

[Correct]
[Continue]
```

Make transcription correction easy.

---

# 17. Adaptive Question Screen — HERO UX

This is the most important patient screen.

Do NOT make it look like:

- a form;
- a survey;
- a traditional chatbot;
- a 20-question wizard.

It should feel like:

> a calm conversation with a focused digital assistant.

Suggested layout:

```text
             SwasthyaVaani

        [Current Question]

       "Where exactly do
        you feel the pain?"

              🎙

        Tap to speak

    ─────────────────────

    You can also type
```

Only one major question should dominate the screen.

---

# 18. Adaptive Question Interaction

When the patient answers:

```text
Listening
 ↓
Transcribing
 ↓
Answer recognized
 ↓
Next question
```

Use a subtle transition.

Do not use flashy animations.

The user should feel:

> "The system understood me and decided what to ask next."

---

# 19. Voice UI

Voice states:

```text
IDLE
LISTENING
TRANSCRIBING
SUCCESS
ERROR
FALLBACK
```

### Listening

Use:

- gentle waveform;
- microphone state;
- subtle animation.

Do not use a giant glowing AI orb.

### Transcribing

Show:

> Understanding your response...

### Failure

Show:

> We couldn't hear that clearly.

Actions:

```text
Try again
Use text instead
```

---

# 20. Adaptive Interview Progress UI

Do not show a fixed question counter.

Use concepts such as:

```text
History progress
```

or:

```text
Building your health history
```

Possible subtle states:

```text
Getting started
Gathering details
Almost complete
Ready to review
```

This preserves the dynamic nature of the interview.

---

# 21. Minimum Sufficient History UX

When the engine believes enough relevant information has been gathered:

Do not say:

> Questionnaire completed.

Prefer:

> **We have enough information to prepare your history.**

Then move to review.

---

# 22. Patient Document UX

After interview:

> **Do you have any previous medical reports or prescriptions?**

Actions:

```text
📷 Take photo
📁 Upload file
Skip
```

Show document cards with:

```text
filename
type
upload status
processing status
```

Do not overload the patient with extraction details.

---

# 23. OCR Processing UX

Use a simple processing progression:

```text
Document uploaded
      ↓
Reading document
      ↓
Finding medical information
      ↓
Ready to review
```

For uncertainty:

> Some information could not be read clearly.

Do not pretend OCR is perfect.

---

# 24. Patient Review UX

Title:

> **Here's what we understood**

Use simple cards:

```text
Main concern
Chest pain

Started
Yesterday

Other symptoms
Breathlessness
```

Each section should support:

```text
Edit
```

and a clear final:

```text
Confirm & Send
```

The patient must have a chance to correct important information.

---

# 25. Submission UX

Before submit:

```text
Everything looks correct?

[ Back & Edit ]

[ Confirm & Send ]
```

After submit:

```text
Sending to Dr. Sharma...
```

Then:

> **Your health history is ready.**

> Your information has been sent to the healthcare team for review.

---

# 26. Privacy Cleanup UX

If the prototype demonstrates temporary browser cleanup:

```text
Submission complete
        ↓
10-second privacy countdown
        ↓
Temporary session data cleared
```

Use neutral language.

Do NOT say:

> DPDP compliance achieved.

The visual demonstrates client-side cleanup only.

---

# 27. Doctor Experience — UX Principles

The doctor's interface is fundamentally different.

It should feel:

- fast;
- dense;
- structured;
- quiet;
- professional.

Avoid giant marketing-style cards.

The doctor should be able to answer:

> Who is the patient?

> Why are they here?

> What important information was collected?

> What needs my attention?

> Where did this information come from?

within seconds.

---

# 28. Doctor Dashboard

Suggested top-level layout:

```text
┌─────────────────────────────────────────────┐
│ Dashboard                  Dr. Sharma       │
├─────────────────────────────────────────────┤
│ Waiting 14   History Ready 8   Priority 2  │
├─────────────────────────────────────────────┤
│ Patient Queue                              │
│                                             │
│ #42  Chest pain       ⚠ Priority            │
│ #43  Fever            History ready         │
│ #44  Joint pain       AYUSH                 │
└─────────────────────────────────────────────┘
```

Use DM Mono for:

- token;
- timestamp;
- technical metadata.

---

# 29. Doctor Patient Summary — HERO UX

This should be the strongest clinician screen.

Structure:

```text
Patient Header
        ↓
Priority / status
        ↓
Chief Complaint
        ↓
Structured History
        ↓
Medications / Allergies
        ↓
Investigations
        ↓
Timeline
        ↓
Documents / Evidence
        ↓
Review / Confirm
```

Avoid forcing the physician to read a conversation transcript first.

---

# 30. AI Draft State

Always make the status obvious.

Before review:

```text
AI DRAFT — NOT YET REVIEWED
```

After confirmation:

```text
PHYSICIAN CONFIRMED
```

Use Deep Forest / neutral treatment for confirmed state.

Use subtle amber/neutral treatment for draft.

---

# 31. Source / Provenance UX

When the doctor hovers/clicks:

```text
Atorvastatin 20 mg
```

show:

```text
Source
Prescription_01.pdf

Page 1

Confidence
High
```

Soft Terracotta is the preferred visual cue for provenance.

Do not make provenance visually louder than the actual clinical information.

---

# 32. Timeline UX

Use a vertical timeline for desktop.

```text
2024
Diagnosis

2025
Prescription

2026
Lab report

TODAY
Current complaint
```

Click event:

```text
→ detail
→ source
```

Use DM Mono for dates/timestamps.

---

# 33. Red-Flag UX

Urgent Red:

```text
#C6362F
```

ONLY.

Example:

```text
┌─────────────────────────────────────┐
│ ⚠ PRIORITY REVIEW                   │
│                                     │
│ Chest pain                          │
│ Breathlessness                      │
│ Left-arm radiation                  │
│                                     │
│ Physician review required           │
└─────────────────────────────────────┘
```

Do not use animated flashing red.

Do not create a diagnosis.

---

# 34. Contradiction UX

Contradictions should be visually distinct from red flags.

Use neutral/amber styling rather than urgent red.

Example:

```text
⚠ Information conflict

Patient:
"I stopped Metformin."

Previous record:
Metformin 500 mg

Needs physician confirmation.
```

Actions:

```text
Review
Resolve
Dismiss
```

The doctor explicitly decides.

---

# 35. Document Viewer UX

Preferred desktop composition:

```text
┌───────────────────┬──────────────────────┐
│ Extracted Facts   │ Original Document    │
│                   │                      │
│ Atorvastatin      │   prescription.pdf   │
│ 20 mg             │                      │
│ Confidence: High  │   [highlight]        │
│                   │                      │
│ Source: Page 1    │                      │
└───────────────────┴──────────────────────┘
```

This should make source verification fast.

---

# 36. Doctor Review UX

Use:

```text
AI DRAFT
   ↓
Edit
   ↓
Confirm
```

Primary confirmation action:

> **Confirm Clinical History**

Do not call it:

> Approve AI Diagnosis

because SwasthyaVaani is not making a diagnosis.

---

# 37. AYUSH UX

AYUSH should feel integrated, not decorative.

Example navigation:

```text
Clinical History
AYUSH History
Documents
Timeline
```

Use the same design system.

Do not create a separate "Ayurveda-themed" application with leaves, ornaments, and decorative illustrations.

The interface should remain clinical and structured.

---

# 38. Administrator UX

Admin interface may be more conventional.

Use:

- tables;
- filters;
- status chips;
- forms;
- side navigation;
- audit views.

Admin should manage:

```text
Hospitals
Doctors
Departments
Workflows
Languages
Services
Audit
```

Do not give admin UI unnecessary patient-facing visual softness.

---

# 39. Cards and Surfaces

Use:

```text
Background: #F7F4EE
Card:       #FCFBF8
```

Cards should have:

- subtle borders;
- modest radius;
- restrained shadows.

Avoid excessive floating-card UI.

The application should feel like one coherent surface rather than dozens of disconnected cards.

---

# 40. Buttons

Primary button:

```text
Background: #234D40
Text: light/neutral
```

Primary hover/selected treatment can use a darker forest shade.

Secondary buttons:

- neutral card/background;
- forest border/text.

Selected states:

```text
Warm Amber #EABA61
```

Urgent:

```text
Urgent Red #C6362F
```

Do not use red for ordinary destructive UI unless the action genuinely represents serious data loss/risk.

---

# 41. Forms

Patient forms:

- one or a few fields at once;
- large inputs;
- clear labels;
- generous spacing.

Doctor/admin forms:

- denser layouts;
- grouped sections;
- keyboard-friendly controls.

Never use tiny medical form controls for the kiosk.

---

# 42. Icons

Use **Lucide React**.

Preferred style:

- simple;
- outlined;
- consistent stroke width.

Avoid mixing many icon libraries.

Do not use emojis as the primary icon system in the production UI.

---

# 43. Animation

Animation should communicate state, not decorate.

Good:

- voice waveform;
- question transition;
- upload processing;
- save/confirm;
- queue update.

Bad:

- floating particles;
- glowing AI effects;
- large page transitions;
- unnecessary 3D effects.

---

# 44. Responsive Behavior

## Patient

Primary target:

```text
Tablet / kiosk
```

Design around touch first.

## Doctor

Primary target:

```text
Desktop / laptop
```

Secondary:

```text
Tablet
```

## Admin

Primary target:

```text
Desktop
```

Never simply shrink the desktop dashboard into a phone layout without redesigning information density.

---

# 45. Accessibility

Minimum expectations:

- sufficient contrast;
- large touch targets;
- clear focus states;
- semantic labels;
- keyboard navigation where relevant;
- screen-reader-friendly structure where practical;
- readable typography;
- avoid color-only meaning.

Color should reinforce meaning, not be the only way meaning is communicated.

---

# 46. Component Design System

Create reusable components around the design language.

Suggested primitives:

```text
Button
Card
Input
Select
Badge
Modal
Tabs
Toast
Dialog
Tooltip
```

Product-specific components:

```text
VoiceButton
LanguageCard
HospitalCard
DoctorCard
QuestionCard
TranscriptCard
PatientSummaryCard
DocumentCard
SourceBadge
ConfidenceBadge
AlertBanner
ContradictionCard
Timeline
PatientQueue
ReviewEditor
AYUSHPanel
StatusChip
```

---

# 47. Component State Rules

Every reusable async component should consider:

```text
default
hover
focus
active
disabled
loading
success
error
warning
```

Critical product components should also support:

```text
needs_review
priority
confirmed
```

---

# 48. Responsive Patient Layout

Recommended desktop/tablet composition:

```text
┌────────────────────────────────────┐
│ SwasthyaVaani       Progress       │
│                                    │
│                                    │
│       Current Question             │
│                                    │
│             🎙                     │
│                                    │
│        Tap to speak                │
│                                    │
│      or type / touch               │
│                                    │
└────────────────────────────────────┘
```

Keep the central interaction visually dominant.

---

# 49. Responsive Doctor Layout

Recommended:

```text
┌──────────────┬────────────────────────────────┐
│ Navigation   │ Patient / Queue               │
│              ├────────────────────────────────┤
│ Dashboard    │ Summary                        │
│ Patients     │                                │
│ Priority     │ History      Alerts            │
│ Timeline     │                                │
│ Documents    │ Timeline     Documents         │
│ Review       │                                │
└──────────────┴────────────────────────────────┘
```

Use information hierarchy instead of oversized decorative cards.

---

# 50. Empty States

Empty states should explain the next action.

Example doctor queue:

> **No patients waiting**

> New completed intakes will appear here.

Avoid:

> Nothing here.

---

# 51. Error States

Errors should be calm and actionable.

Example:

> **We couldn't process that document.**

> The original document is still available for review.

Actions:

```text
Try again
Continue
```

Do not use urgent red unless the issue is truly a priority clinical alert.

---

# 52. Loading States

Every async operation needs a visible state.

Examples:

```text
Understanding response...
Reading document...
Preparing history...
Sending to doctor...
```

Avoid indefinite spinners.

For long operations, use progress/status messaging.

---

# 53. Empty / Failure / Fallback Design Principle

Every important screen should answer:

```text
What is happening?
What can I do?
What happens next?
```

This is especially important for elderly/low-literacy patient users.

---

# 54. Visual Hierarchy Rule

Use the strongest visual emphasis for the user's most important action.

Patient:

```text
Current question
        ↓
Speak / answer
```

Doctor:

```text
Clinical summary
        ↓
Priority alerts
        ↓
Evidence
        ↓
Review
```

Admin:

```text
Configuration
        ↓
Status
        ↓
Audit
```

---

# 55. Do Not Generate UI in Isolation

When an AI coding/design agent is asked to create a screen:

1. Read `appflow.md`.
2. Identify the screen's entry state.
3. Identify the data it consumes.
4. Identify possible user actions.
5. Identify next states.
6. Implement loading/error/fallback states.
7. Reuse the existing design system.
8. Connect it to the actual application state.

A beautiful isolated screen is not useful if it does not participate in the application flow.

---

# 56. Existing Frontend Rule

A frontend prototype already exists.

When modifying it:

```text
Inspect current implementation
        ↓
Identify useful existing components
        ↓
Preserve working interactions
        ↓
Refine / extend
```

Do not automatically delete and regenerate the whole frontend.

If existing UI conflicts with this design brief, prefer incremental migration toward this visual system.

---

# 57. Implementation Tokens

Use centralized design tokens.

Example:

```css
:root {
  --forest: #234D40;
  --forest-dark: #1B3B31;
  --amber: #EABA61;
  --terracotta: #D48768;
  --paper: #F7F4EE;
  --card: #FCFBF8;
  --ink: #19332C;
  --sage: #57756C;
  --urgent: #C6362F;
}
```

Centralize font definitions too.

Avoid scattering raw hex values across components.

---

# 58. UX Acceptance Checklist

## Patient

- [ ] Patient understands what to do without technical knowledge.
- [ ] One major task is presented at a time.
- [ ] Voice and text/touch are clearly available.
- [ ] Language selection is obvious.
- [ ] Dynamic interview does not look like a fixed questionnaire.
- [ ] Patient can correct transcription.
- [ ] Patient can review/correct the summary.
- [ ] Loading/error/fallback states are understandable.
- [ ] Urgent alerts use red only when clinically appropriate.

## Doctor

- [ ] Patient queue is immediately scannable.
- [ ] Chief complaint is prominent.
- [ ] AI draft vs physician-confirmed state is obvious.
- [ ] Evidence/source can be inspected.
- [ ] Red flags are visually distinct.
- [ ] Contradictions are separate from urgent alerts.
- [ ] Timeline is easy to scan.
- [ ] Editing and confirmation are obvious.

## Admin

- [ ] Configuration is organized.
- [ ] Status is visible.
- [ ] Audit events are accessible.
- [ ] Role boundaries are clear.

---

# 59. Visual QA Rules for Agents

Before considering a UI feature complete, the agent should verify:

```text
✓ colors use design tokens
✓ typography follows font roles
✓ no arbitrary accent colors
✓ urgent red used only for priority alerts
✓ patient controls are touch-friendly
✓ desktop doctor UI is scannable
✓ no placeholder lorem ipsum
✓ no fake clinical claims
✓ loading/error/fallback states exist
✓ keyboard/focus behavior works where relevant
✓ existing components were reused where possible
```

---

# 60. Final Design Principle

> **SwasthyaVaani should feel less like a chatbot and more like a calm clinical companion that prepares a patient's story for a doctor.**

The visual system should communicate:

```text
Human warmth
      +
Clinical structure
      +
Trust
      +
Accessibility
      +
Evidence
```

The product should look distinctive enough to be memorable in an SIH demo, but restrained enough that a real patient and doctor could plausibly use it.
