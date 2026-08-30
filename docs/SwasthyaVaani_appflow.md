# SwasthyaVaani — Application Flow

> **Audience:** AI coding agents and developers.
>
> **Purpose:** Define the exact application behavior, screen sequence, state transitions, branches, and data handoffs across the Patient, Doctor, and Administrator experiences.
>
> **Related documents:**
> - `PRD.md` — product requirements
> - `TRD.md` — technical requirements
> - `architecture.md` — system architecture
> - `backend_schema.md` — backend data model
> - `rules.md` — hard implementation/safety rules
>
> **Important:** This document describes one continuous SwasthyaVaani product. Evaluation dates are checkpoints, not separate product versions.

---

# 1. Global Application Flow

```text
                         SWASTHYAVAANI
                              |
          +-------------------+-------------------+
          |                   |                   |
       PATIENT              DOCTOR              ADMIN
          |                   |                   |
       Intake              Review             Management
          |                   |                   |
          +-------------------+-------------------+
                              |
                       Shared Patient Record
                              |
             +----------------+----------------+
             |                |                |
         Clinical AI      Documents         Safety
             |                |                |
             +----------------+----------------+
                              |
                      FHIR / ABDM / HIS
```

The product has three roles but two primary clinical journeys:

```text
Patient → Doctor
```

and:

```text
Administrator → platform configuration
```

---

# 2. Patient Flow — Master Sequence

```text
/PATIENT START
      ↓
Greeting
      ↓
Hospital Selection / Confirmation
      ↓
Doctor Selection
      ↓
Language Selection
      ↓
Interaction Mode
      ↓
Consent
      ↓
ABHA / Health ID (optional/integration-ready)
      ↓
Chief Complaint
      ↓
Adaptive Clinical Interview
      ↓
Core AYUSH Questions When Relevant
      ↓
Basic Document Upload / Scan
      ↓
Clinical Summary
      ↓
Patient Review
      ↓
Confirm?
   ┌──┴──┐
  NO    YES
  ↓      ↓
Edit   Submit
  ↓      ↓
Review  Doctor Queue
```

---

# 3. Patient Start

## Route

```text
/patient/start
```

## UI

Show:

- SwasthyaVaani branding;
- tagline;
- simple introduction;
- Start button;
- accessibility option;
- language/help option if needed.

Recommended copy:

> **Welcome to SwasthyaVaani**  
> Let’s collect your health history before your consultation.

Primary action:

```text
START
```

## On Start

Transition to:

```text
PATIENT_HOSPITAL_SELECTION
```

---

# 4. Hospital Selection

## Route

```text
/patient/hospital
```

## Behavior

Provide:

```text
Search hospital
+
Hospital list
```

Patient selects one hospital.

### Deployment mode

If the device is configured for a specific hospital:

```text
hospital = preconfigured
→ skip selection
→ go to doctor selection
```

## Output

```text
hospital_id
```

Then transition:

```text
PATIENT_DOCTOR_SELECTION
```

---

# 5. Doctor Selection

## Route

```text
/patient/doctor
```

## Display

For each doctor:

- name;
- specialty/department;
- optional availability/status.

Example:

```text
Dr. A
General Medicine

Dr. B
Ayurveda

Dr. C
General Medicine
```

Patient selects doctor.

## Output

```text
doctor_id
```

Then transition:

```text
PATIENT_LANGUAGE_SELECTION
```

---

# 6. Language Selection

## Route

```text
/patient/language
```

## Initial language options

```text
हिन्दी
English
```

Architecture must support:

```text
Marathi
Tamil
Other supported languages
```

## Output

```text
language_code
```

Then transition:

```text
PATIENT_INTERACTION_MODE
```

---

# 7. Interaction Mode

## Route

```text
/patient/mode
```

Display two major choices:

```text
🎙 VOICE
Speak naturally

⌨ TEXT / TOUCH
Type or select options
```

The mode can be changed later where appropriate.

## Output

```text
interaction_mode
```

Possible values:

```text
VOICE
TEXT
TOUCH
MIXED
```

Then transition:

```text
PATIENT_CONSENT
```

---

# 8. Consent

## Route

```text
/patient/consent
```

## Display

Explain:

- why information is collected;
- who uses it;
- AI assists information organization;
- doctor makes clinical decisions.

Actions:

```text
I AGREE
NEED HELP
```

## Branch

### I Agree

```text
consent = true
→ continue
```

### Need Help

Show simple explanation/help.

Return to consent.

### Decline

```text
status = PATIENT_ABORTED
```

End the session safely.

---

# 9. ABHA / Health ID Check-In

## Route / Component

Can be part of:

```text
/patient/consent
```

or a separate check-in step.

## UI

```text
ABHA / Health ID

[ Enter ID ]

or

[ Scan QR ]
```

This functionality is integration-ready and must not block the demo/local workflow if live ABDM connectivity is unavailable.

## Branch

### Available and verified

Store verified health-ID reference according to integration requirements.

### Unavailable

Continue with a local patient/session identifier.

Never collect Aadhaar unless an explicitly verified requirement and lawful workflow requires it.

---

# 10. Intake Session Creation

Before clinical questioning begins:

```text
POST /api/intakes
```

Create:

```text
IntakeSession
ClinicalState
session preferences
```

Initial state:

```text
ACTIVE
```

Store:

```text
patient_id
hospital_id
doctor_id
workflow_id
language_code
interaction_mode
```

---

# 11. Chief Complaint

## Route

```text
/patient/intake
```

## Initial state

Prompt:

> **What is troubling you today?**

Available interaction:

```text
🎙 Speak
⌨ Type
👆 Touch / Options
```

Example:

> “Mujhe teen din se pet mein dard hai.”

---

# 12. Speech Input Flow

```text
Tap microphone
      ↓
LISTENING
      ↓
Capture audio
      ↓
TRANSCRIBING
      ↓
Speech provider
      ↓
Transcript
      ↓
Patient sees transcript
      ↓
Correct?
```

### Branch

```text
Correct
→ continue

Incorrect
→ retry / text edit
```

Provider order can be:

```text
BHASHINI
→ Sarvam
→ Whisper
→ text/touch fallback
```

Provider selection must happen through `SpeechService`.

---

# 13. Initial Clinical Extraction

After the first complaint:

```text
Patient text
   ↓
Clinical AI extraction
   ↓
schema validation
   ↓
ClinicalState update
```

Example:

```json
{
  "chiefComplaint": "abdominal pain",
  "duration": "3 days"
}
```

The application must not treat the complaint as a diagnosis.

---

# 14. Adaptive Interview State

The system now enters:

```text
ASKING
```

Core loop:

```text
ClinicalState
      ↓
Required/relevant fields
      ↓
Resolved fields
      ↓
Missing information
      ↓
Candidate questions
      ↓
Duplicate check
      ↓
Information-gain check
      ↓
Safety check
      ↓
Decision
```

Decision:

```text
ASK
STOP
ESCALATE
```

Exactly one question is shown to the patient at a time.

---

# 15. Adaptive Question Screen

## UI

```text
SwasthyaVaani

[Current Question]

🎙 Tap to speak

or

[Touch / Type]

[Change language]
[Change mode]
```

Show a lightweight progress indication.

Do not show a fixed questionnaire count.

Prefer:

```text
History progress
```

rather than:

```text
Question 4 of 10
```

when the final count is dynamic.

---

# 16. Adaptive Question Branch

After every answer:

```text
Answer received
      ↓
Update state
      ↓
Check safety
      ↓
Check information gaps
      ↓
Check termination
```

### If more information is required

```text
ASK
→ show next question
```

### If sufficient

```text
STOP
→ proceed to post-interview processing
```

### If possible safety escalation

```text
ESCALATE
→ create safety event
→ continue or stop according to configured workflow
```

---

# 17. Anti-Loop Flow

Before asking a question:

```text
Candidate question
      ↓
Already asked?
   YES → reject
   NO
      ↓
Target field already resolved?
   YES → reject
   NO
      ↓
Expected information gain sufficient?
   NO → stop / alternative
   YES
      ↓
ASK
```

After each answer:

```text
state_before
     ↓
state_after
     ↓
meaningful progress?
```

If no meaningful progress for:

```text
MAX_CONSECUTIVE_LOW_PROGRESS = 2
```

then:

```text
STOP
```

---

# 18. Maximum Question Safety Brake

Default prototype configuration:

```text
MAX_QUESTIONS = 15
```

This is NOT the normal completion rule.

If reached:

```text
status = LIMITED_HISTORY
```

Then:

```text
Stop questioning
→ generate best validated summary
→ clearly mark limited history
→ physician review required
```

Never treat the hard limit as proof that the history is complete.

---

# 19. Adaptive Interview Fallback

If adaptive gap analysis is unreliable:

```text
Load workflow required fields
       ↓
Find unresolved fields
       ↓
Ask validated mapped questions
       ↓
Deduplicate
       ↓
Stop when sufficient
OR
MAX_QUESTIONS reached
```

The fallback is deterministic.

The LLM does not control the state machine.

---

# 20. Core AYUSH Branch

If the selected workflow is AYUSH or the validated workflow requires AYUSH fields:

```text
General Clinical Information
        +
Core AYUSH Question Set
```

The adaptive engine can ask core AYUSH questions as part of the same interview.

Potential areas include:

```text
Prakriti
Vikriti
Agni
Koshtha
Ahara-Vihara
Other PS-required AYUSH parameters
```

The exact question set must come from validated domain requirements.

Do not create unsupported medical conclusions from the answers.

The early product must include the core AYUSH questioning path, but deeper AYUSH analytics/visualization can be added later.

---

# 21. Red-Flag Branch

After every relevant answer:

```text
ClinicalState
      ↓
Safety Rule Engine
      ↓
Rule match?
```

### No

Continue normal interview.

### Yes

Create:

```text
RedFlag
```

Set:

```text
priority = PRIORITY_REVIEW
```

Patient UI:

> **Your responses should be reviewed by a healthcare professional.**

Do not display an autonomous diagnosis.

Doctor receives:

```text
PRIORITY REVIEW
Observed evidence
Source
Rule ID/reason
```

---

# 22. Contradiction Branch

At relevant state updates:

```text
New fact
   +
Existing fact
   ↓
Conflict?
```

### No

Continue.

### Yes

Create:

```text
Contradiction
```

Example:

```text
Patient:
"I stopped Metformin."

Previous document:
Metformin 500 mg

→ INFORMATION CONFLICT
```

Continue the workflow.

Do not automatically resolve the conflict.

---

# 23. Interview Completion

Interview ends when:

```text
Sufficient information
OR
Low information gain
OR
No progress
OR
No valid next question
OR
MAX_QUESTIONS reached
OR
Patient stops
OR
Service failure prevents safe continuation
```

Transition:

```text
INTERVIEW_COMPLETE
```

or:

```text
LIMITED_HISTORY
```

---

# 24. Post-Interview Summary Generation

Input:

```text
Validated ClinicalState
+
validated facts
+
relevant alerts
+
provenance
```

Flow:

```text
ClinicalState
      ↓
Summary generator
      ↓
Schema validation
      ↓
Patient summary
```

Summary must NOT introduce unsupported facts.

---

# 25. Document Flow

After or during intake:

```text
/patient/documents
```

Prompt:

> **Do you have any previous prescriptions or reports?**

Options:

```text
📷 Take Photo
📁 Upload File
Skip
```

---

# 26. Document Upload

```text
Frontend
 ↓
Upload API
 ↓
Validate file
 ↓
Supabase Storage
 ↓
Document metadata record
```

Status:

```text
UPLOADED
```

---

# 27. Document Processing

```text
Document
 ↓
OCR
 ↓
Layout understanding
 ↓
Medical extraction
 ↓
Validation
 ↓
Confidence
 ↓
Provenance
 ↓
ClinicalState / Timeline
```

Document states:

```text
UPLOADED
OCR_PROCESSING
OCR_COMPLETED
EXTRACTING
EXTRACTED
NEEDS_REVIEW
CONFIRMED
FAILED
```

---

# 28. Basic OCR Requirement

The early implementation only needs to demonstrate controlled/sample documents.

Example:

```text
Prescription image
      ↓
OCR
      ↓
Atorvastatin 20 mg
      ↓
Date
      ↓
Confidence
      ↓
Source document
```

If OCR fails:

```text
Document retained
→ extraction marked unavailable
→ doctor can inspect original
```

---

# 29. Patient Review

Route:

```text
/patient/review
```

Show:

```text
Chief complaint
Duration
Symptoms
Medication
Allergies
Relevant history
AYUSH fields where applicable
```

Every editable field can show provenance/status where useful.

Actions:

```text
EDIT
CONFIRM
```

---

# 30. Patient Review Branch

### Edit

```text
Edit field
 ↓
Save
 ↓
Recalculate summary if needed
 ↓
Return to review
```

### Confirm

```text
PATIENT_CONFIRMED
→ proceed to submission
```

---

# 31. Submit to Doctor

Patient clicks:

```text
SUBMIT
```

Backend:

```text
Validate patient/session
        ↓
Validate patient review
        ↓
Persist submission transaction
        ↓
Assign selected doctor
        ↓
Create queue state
        ↓
Commit
        ↓
Publish queue event
```

Only after successful persistence:

```text
SUBMITTED
```

---

# 32. Privacy Cleanup After Submission

Optional demo interaction:

```text
Submit
 ↓
10-second countdown
 ↓
clear temporary client-side state
 ↓
"Temporary session data cleared"
```

Example:

```ts
setTimeout(() => {
  sessionStorage.clear();
}, 10_000);
```

This is only temporary client-side cleanup.

It is NOT proof of DPDP compliance.

Persistent backend data follows separate retention/access policies.

---

# 33. Patient Completion

Route:

```text
/patient/complete
```

Display:

> **Your health history is ready.**

> Your information has been sent to the healthcare team for review.

Action:

```text
DONE
```

Do not expose internal AI details.

---

# 34. Doctor Flow — Master Sequence

```text
Doctor Login
     ↓
Dashboard
     ↓
Patient Queue
     ↓
Open Patient
     ↓
Structured Summary
     ↓
Priority / Safety Review
     ↓
Timeline
     ↓
Documents
     ↓
Evidence / Provenance
     ↓
Edit
     ↓
Confirm
     ↓
FHIR-compatible Output
```

---

# 35. Doctor Login

Route:

```text
/doctor/login
```

Authenticate.

Backend determines role.

```text
role != DOCTOR
→ reject
```

Successful authentication:

```text
/doctor/dashboard
```

---

# 36. Doctor Dashboard

Show:

```text
Patients Waiting
History Ready
Priority Review
```

Queue item:

```text
Token
Patient
Complaint
Submitted time
Status
Priority
```

Example:

```text
#42
Chest pain
⚠ Priority

#43
Fever
History ready

#44
Joint pain
AYUSH
```

---

# 37. Real-Time Queue Update

Preferred:

```text
Patient submit
   ↓
FastAPI
   ↓
persist
   ↓
WebSocket event
   ↓
Doctor dashboard
```

Fallback:

```text
polling
```

If WebSocket fails, doctor queue must still function.

---

# 38. Open Patient

Route:

```text
/doctor/patients/:patientId
```

Backend verifies:

```text
authenticated doctor
+
authorized patient record
```

Then load:

```text
Patient
IntakeSession
ClinicalState
Facts
Alerts
Documents
Timeline
Review
```

---

# 39. Doctor Patient Summary

Primary screen sections:

```text
Patient Header
Chief Complaint
History
Associated Symptoms
Medications
Allergies
Investigations
AYUSH
Red Flags
Contradictions
Timeline
Documents
Evidence
Review
```

Top state:

```text
AI DRAFT — NOT YET REVIEWED
```

After confirmation:

```text
PHYSICIAN CONFIRMED
```

---

# 40. Evidence Flow

Doctor selects:

```text
Atorvastatin 20 mg
```

Show:

```text
Confidence: High
Source: Prescription_01.pdf
Page: 1
```

For patient response:

```text
Duration: 3 days
Source: Patient answer
```

Allow opening the source where available.

---

# 41. Timeline Flow

```text
Patient History
      +
Documents
      +
Current Intake
      +
Confirmed events
      ↓
Chronological Timeline
```

Example:

```text
2024 — Diagnosis
2025 — Prescription
2026 — Lab Report
Today — Current Complaint
```

Click event:

```text
→ detail + evidence
```

---

# 42. Document Viewer Flow

Doctor selects document:

```text
Document thumbnail
      ↓
Document viewer
      +
Extracted fields
      +
Source highlighting where supported
```

Doctor can review extraction.

---

# 43. Red-Flag Doctor Flow

If a red flag exists:

```text
PRIORITY REVIEW
```

Show:

```text
Observed:
Chest pain
Breathlessness
Left-arm radiation

Source:
Patient responses

Reason:
Configured safety rule
```

Actions:

```text
REVIEW
```

Do not present the alert as a definitive diagnosis.

---

# 44. Contradiction Doctor Flow

Show:

```text
⚠ INFORMATION CONFLICT

Patient:
"I stopped Metformin."

Previous record:
Metformin 500 mg

Status:
Needs physician confirmation
```

Actions:

```text
Review
Edit
Resolve by physician
```

The physician explicitly decides the final state.

---

# 45. Doctor Edit Flow

```text
AI Draft
   ↓
Doctor edits
   ↓
Validate update
   ↓
Persist
   ↓
Create PhysicianEdit
   ↓
Create AuditEvent
   ↓
Update UI
```

Never silently overwrite important information.

---

# 46. Doctor Confirmation Flow

Doctor clicks:

```text
CONFIRM
```

Backend:

```text
authorize doctor
 ↓
validate current state
 ↓
persist confirmation
 ↓
create PhysicianReview
 ↓
create AuditEvent
 ↓
status = PHYSICIAN_CONFIRMED
```

After confirmation:

```text
FHIR generation may run
```

---

# 47. FHIR Flow

```text
PHYSICIAN_CONFIRMED
      ↓
Validated ClinicalState
      ↓
FHIR mapper
      ↓
FHIR R4 resources
      ↓
FHIR validation
      ↓
FHIR bundle/payload
```

Potential resources:

```text
Patient
Encounter
Observation
Condition
MedicationStatement
Composition
```

Do not generate final FHIR directly from raw LLM output.

---

# 48. Admin Flow

```text
Admin Login
    ↓
Admin Dashboard
    ↓
+------------------+
|                  |
Hospitals       Doctors
    |              |
Departments     Assignments
    |
Workflows
    |
Languages / Providers
    |
System Status
    |
Audit
```

---

# 49. Admin — Hospital Flow

```text
Admin
 ↓
Hospitals
 ↓
List
 ↓
Add / Edit
 ↓
Activate / Deactivate
```

Server verifies:

```text
role = ADMIN
```

---

# 50. Admin — Doctor Flow

```text
Admin
 ↓
Doctors
 ↓
Add/Edit
 ↓
Specialty
 ↓
Department
 ↓
Hospital
 ↓
Activate/Deactivate
```

---

# 51. Admin — Workflow Flow

Configure:

```text
GENERAL_CLINICAL
AYUSH
```

Potential configurable values:

```text
required fields
question priorities
MAX_QUESTIONS
MAX_CONSECUTIVE_LOW_PROGRESS
language availability
provider availability
```

Safety-critical rules must be versioned and controlled.

---

# 52. Admin — Provider Status

Display:

```text
LLM          ONLINE / ERROR
Speech       ONLINE / ERROR
OCR          ONLINE / ERROR
Database     ONLINE / ERROR
Integration  ONLINE / ERROR
```

These are operational indicators, not clinical claims.

---

# 53. Error Flow — Universal

Every async operation should have:

```text
IDLE
 ↓
LOADING
 ↓
SUCCESS
```

or:

```text
LOADING
 ↓
ERROR
 ↓
RETRY / FALLBACK
```

Never leave a user in an indefinite loading state.

---

# 54. Speech Failure Flow

```text
Voice
 ↓
Provider error
 ↓
Retry once
 ↓
Alternative provider
 ↓
Text / Touch fallback
```

The patient session remains active where safe.

---

# 55. LLM Failure Flow

```text
LLM request
 ↓
Failure
 ↓
Retry once
 ↓
Deterministic required-field fallback
 ↓
If unsafe/unavailable
 → LIMITED_HISTORY
```

Do not fabricate an answer.

---

# 56. OCR Failure Flow

```text
Upload succeeds
 ↓
OCR fails
 ↓
Document remains stored
 ↓
Extraction unavailable
 ↓
Doctor can inspect original document
```

Do not delete the source document because OCR failed.

---

# 57. Patient Cancellation Flow

```text
Patient cancels
 ↓
PATIENT_ABORTED
 ↓
stop AI loop
 ↓
clean temporary client state
 ↓
return to start / exit
```

Do not continue background questioning after cancellation.

---

# 58. Authorization Failure Flow

```text
Request
 ↓
Authenticate
 ↓
Authorize role
 ↓
Authorize resource
```

Failure:

```text
401 Unauthorized
```

or:

```text
403 Forbidden
```

Do not reveal whether an unauthorized resource exists when that would leak sensitive information.

---

# 59. Navigation Rules

## Patient

The patient should generally move forward through the flow.

Back navigation may be allowed for:

- correcting non-submitted choices;
- returning to previous review steps.

Do not allow a back-navigation action to create duplicate intake sessions.

## Doctor

Doctor can navigate freely among:

```text
Queue
Patient
Timeline
Documents
Review
```

## Admin

Admin can navigate freely among configuration sections.

---

# 60. State Consistency Rules

A screen is not authoritative simply because it displays a state.

Backend is authoritative for:

- submission;
- doctor assignment;
- permissions;
- physician confirmation;
- persisted clinical data;
- document access.

Frontend is responsible for presentation and temporary UI state.

---

# 61. Duplicate Submission Prevention

When patient clicks Submit:

```text
disable button
 ↓
submit request
 ↓
show processing
```

Backend must make submission idempotent or safely reject duplicate submission.

Do not create two doctor queue items from double-clicks.

---

# 62. Refresh / Resume Rules

If the patient refreshes during an active session:

```text
load authorized active session
→ restore ClinicalState
→ restore current workflow state
```

Do not create a new session automatically.

If no resumable session exists:

```text
start new session
```

Doctor refresh:

```text
reload queue / current patient
```

Admin refresh:

```text
reload current configuration page
```

---

# 63. Final Patient → Doctor Data Handoff

The data crossing the boundary should include:

```text
Patient identity/reference
Hospital
Doctor
Workflow
Language
Interaction mode
Chief complaint
Structured ClinicalState
Patient-confirmed information
Relevant alerts
Contradictions
Documents
Provenance
Timestamp
```

Do not send unnecessary raw data.

---

# 64. Final System Flow

```text
                         PATIENT
                            |
                      Start Session
                            |
                  Hospital / Doctor
                            |
                    Language / Mode
                            |
                          Consent
                            |
                      Chief Complaint
                            |
                     Adaptive Engine
                            |
          +-----------------+-----------------+
          |                 |                 |
       Clinical           AYUSH           Documents
       Questions         Questions            |
          |                 |                 |
          +-----------------+-----------------+
                            |
                     Safety / Validation
                            |
                       Patient Review
                            |
                         Submit
                            |
                    Selected Doctor
                            |
                       Doctor Queue
                            |
                   Structured Summary
                            |
             +--------------+--------------+
             |              |              |
          Evidence       Alerts        Timeline
             |              |              |
             +--------------+--------------+
                            |
                       Doctor Edit
                            |
                     Doctor Confirm
                            |
                       FHIR Mapping
                            |
                    ABDM / HIS Adapter
```

---

# 65. Final Flow Invariants

These must always remain true:

1. Patient chooses/has a validated hospital context.
2. Patient chooses/has a validated doctor context.
3. Consent occurs before clinical data collection.
4. Interaction supports voice and text/touch.
5. Questions are dynamically selected.
6. Questions are asked one at a time.
7. Interview termination is controlled by the application.
8. Adaptive questioning has deterministic fallback.
9. Core AYUSH questions can participate in the adaptive interview when relevant.
10. Basic document OCR is part of the product flow.
11. Red flags are alerts, not diagnoses.
12. Contradictions are surfaced, not auto-resolved.
13. Important facts retain provenance.
14. Patient can review/correct before submission.
15. Doctor receives the selected patient's intake without manual re-entry.
16. Doctor can edit and explicitly confirm.
17. FHIR is generated only from validated/confirmed structured data.
18. External provider failure has a fallback.
19. Admin configuration cannot bypass server-side authorization.
20. Evaluation dates do not create separate product flows.

---

# 66. Agent Navigation Rule

When implementing a requested UI or backend feature, the agent should identify:

```text
1. Which role?
2. Which route?
3. Which state?
4. Which data enters the screen?
5. Which user actions are possible?
6. What state changes?
7. What backend operation is required?
8. What error/fallback branches exist?
9. What happens next?
```

Do not implement a screen as an isolated mockup if it participates in an existing flow.

---

# 67. Final Principle

> **Every screen must exist because it advances a real patient, doctor, or administrator state.**

Avoid decorative screens, dead-end prototype pages, duplicate flows, and AI-generated UI that is not connected to the actual application state.
