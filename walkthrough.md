# Walkthrough — Department & OPD Triage Routing

We have implemented the end-to-end **Department & OPD Triage Routing** feature across both the FastAPI backend and React frontend to resolve the hospital OPD routing gap for SwasthyaVaani.

---

## Changes Implemented

### 1. Backend: Department Router & Clinical Taxonomy Engine
- **File**: [department_router.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/clinical_ai/department_router.py)
  - Defined 8 canonical department codes:
    - `DEPT_EMERGENCY`: "Emergency & Trauma" / "Aatyayika Chikitsa" (Priority 1)
    - `DEPT_GEN_MED`: "General Medicine" / "Kayachikitsa"
    - `DEPT_ORTHO_SHALYA`: "Orthopedics & Joint Care" / "Shalya Tantra"
    - `DEPT_ENT_EYE`: "Eye & ENT" / "Shalakya Tantra"
    - `DEPT_PEDS`: "Child Health & Pediatrics" / "Kaumarbhritya"
    - `DEPT_GYNEC`: "Women's Health & Maternity" / "Prasuti Tantra & Stri Roga"
    - `DEPT_DERM`: "Skin & Dermatology" / "Twak Roga"
    - `DEPT_PANCHAKARMA`: "Panchakarma & Detox" / "Panchakarma"
  - Implemented `DEPARTMENT_METADATA` with English names, Hindi translations, authentic AYUSH equivalents, priority levels, and Lucide icons.
  - Implemented `DOMAIN_TO_DEPARTMENT` mapping matching clinical domains (`CARDIAC`, `RESPIRATORY_DISTRESS`, `MUSCULOSKELETAL`, `OPHTHALMIC`, `FEVER`, `DERMATOLOGY`, `PANCHAKARMA`, etc.) to department codes.
  - Implemented `resolve_department_route(...)` with strict clinical hierarchy:
    1. **Immediate Override**: Safety red flags force-route to `DEPT_EMERGENCY`.
    2. **Acute Emergency Escalation**: Domains like `CARDIAC`, `RESPIRATORY_DISTRESS`, `TRAUMA` escalate to `DEPT_EMERGENCY`.
    3. **Pediatric Rule**: Age < 14 routes to `DEPT_PEDS` (unless acute cardiac/trauma).
    4. **Auto Triage**: Routes based on detected clinical domain when code is `"AUTO"` or unassigned.
    5. Preserves explicit patient choice when safe.

### 2. Backend: Database Schema & API Endpoints
- **Database Schema**:
  - Added `department_id` foreign key column to `intake_sessions` in database models and schemas:
    - [models/intake.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/models/intake.py)
    - [schemas/intake.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/schemas/intake.py)
    - [schemas/doctor.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/schemas/doctor.py)
- **API Endpoint `GET /api/v1/departments/public`**:
  - [api/v1/departments.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/api/v1/departments.py)
  - Registered in [api/router.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/api/router.py).
  - Returns active departments with enriched metadata and real-time active on-duty doctor counts. Auto-seeds canonical departments if needed.
- **Intake Dynamic Assignment & Rerouting**:
  - [api/v1/intakes.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/api/v1/intakes.py)
  - Added `get_on_duty_doctor_for_dept(db, department_code_or_id, hospital_id)`.
  - In `create_intake_session`: Assigns matching department and on-duty doctor based on `department_code`.
  - In `submit_intake_for_review`: Dynamically evaluates `resolve_department_route(...)`. If rerouted (e.g., chest pain -> emergency), updates `session.department_id`, reassigns `session.doctor_id` to an on-duty clinician in the new department, writes an audit log event (`DEPARTMENT_ROUTED`), and emits the updated department in the WebSocket event.
- **Doctor Workstation APIs**:
  - [api/v1/doctor.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/api/v1/doctor.py)
  - In `get_doctor_queue`, `get_reviewed_patients`, and `get_patient_clinical_detail`: Batch fetches department records and populates `department_id`, `department_code`, `department_name`, and `ayush_opd_tag`.

### 3. Frontend: Kiosk Department Selection Page
- **Page Component**: [PatientDepartmentSelection.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/pages/PatientDepartmentSelection.tsx)
  - Bilingual (English & Hindi) accessible selection interface with high-contrast UI.
  - **Auto Triage Assistant banner**: "Not Sure? Auto Triage Assistant" / "मुझे नहीं पता (स्वतः विभाग चयन)" card for low-literacy patients that sets department to `"AUTO"` and lets Clinical AI decide during the interview.
  - Grid of 8 department cards with bilingual titles, Lucide icons, on-duty doctor counts, and AYUSH badges (`🌿 Kayachikitsa`, `🌿 Shalya Tantra`, `🌿 Shalakya Tantra`, etc.).
  - Saves selection via `setStoredDepartment(code)` to `localStorage.getItem("sv_selected_department_code")`.
- **Navigation & Storage**:
  - [kioskState.ts](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/lib/kioskState.ts): Added `getStoredDepartment()` and `setStoredDepartment(code)`.
  - [App.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/App.tsx): Registered route `/patient/department`.
  - [PatientDetails.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/pages/PatientDetails.tsx): Submitting details now navigates to `/patient/department`.
  - [PatientModeSelection.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/pages/PatientModeSelection.tsx): Back button routes to `/patient/department`.
  - [PatientIntake.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/pages/PatientIntake.tsx), [PatientTextChat.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/components/PatientTextChat.tsx), [PatientVoiceChat.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/components/PatientVoiceChat.tsx): Passes `department_code: getStoredDepartment()` in `POST /api/v1/intakes`.

### 4. Frontend: Doctor Workstation Queue Filtering
- **Workstation UI**: [DoctorPortal.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/pages/DoctorPortal.tsx)
  - Added Department Filter Dropdown above queue table:
    - `🏥 All Departments (Hospital-Wide)`
    - `🚨 Emergency Triage Only`
    - Individual departments (General Medicine, Orthopedics, Eye & ENT, Pediatrics, etc.)
  - Dynamic filtering logic matching `department_id`, `department_code`, or emergency status.
  - Active filter banner allowing one-click filter reset.
  - Rendered department badge (with `Building2` icon) and AYUSH OPD tag badge on each patient queue card and in the right-side patient summary panel.

---

## Verification & Test Results

### 1. Backend Automated Tests
Ran pytest suite for department routing:
```bash
venv\Scripts\python.exe -m pytest tests/test_department_router.py -v
```
**Results**:
- `test_red_flag_emergency_override` PASSED
- `test_pediatric_age_override` PASSED
- `test_acute_emergency_domain_escalation` PASSED
- `test_auto_domain_routing` PASSED
- `test_explicit_patient_selection_preserved` PASSED
- `test_department_metadata_integrity` PASSED
- `test_get_departments_public_api` PASSED
- `test_intake_creation_and_reroute_on_submit` PASSED
**Summary**: **8 passed in 7.94s (100% pass rate)**.

### 2. Frontend TypeScript & Production Build
Ran TypeScript typecheck and Vite build:
```bash
npx tsc --noEmit
npm run build
```
**Results**:
- `npx tsc --noEmit`: 0 errors.
- `vite build`: Successfully bundled client environment into `dist/public/` with zero errors.

---

# Walkthrough — Kiosk Hygiene & DPDP Privacy Compliance

We have implemented the full **Kiosk Hygiene & DPDP Privacy Compliance** overhaul across the React frontend and FastAPI backend.

This resolves the multi-patient shared kiosk hygiene risk, eliminates hardcoded fallback profiles (e.g., "Ananya Sharma"), implements an audio-visual inactivity timeout watcher, and enforces session ephemerality as mandated by the Digital Personal Data Protection (DPDP) Act 2023.

---

## Changes Implemented

### 1. Frontend: Session Purge Utility & Ephemeral Storage
- **File**: [kioskSessionManager.ts](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/lib/kioskSessionManager.ts)
  - Defined `KIOSK_STORAGE_KEYS` covering all sensitive keys: `sv_patient_profile`, `swasthya_active_intake_id`, `swasthya_intake_token`, `swasthya_active_token`, `swasthya_active_patient_id`, `sv_selected_department_code`, `swasthya_consent_state`, `swasthya_voice_mode`, `conversation_transcript_cache`, `swasthya_last_submission`, `swasthya_chat_history`, `swasthya_uploaded_doc_name`, etc.
  - Implemented `terminateActiveMedia()`:
    - Stops all audio/video tracks on active `MediaStream` objects.
    - Closes active `AudioContext` instances.
    - Cancels active browser speech synthesis (`window.speechSynthesis.cancel()`).
  - Implemented `purgeKioskSession(reason)`:
    - Fires non-blocking `POST /api/v1/intakes/{intake_id}/abort` with `keepalive: true` to notify backend when an intake session was abandoned or timed out.
    - Clears all `KIOSK_STORAGE_KEYS` from both `localStorage` and `sessionStorage`.
    - Invokes `terminateActiveMedia()`.
    - Dispatches `'kiosk-session-purged'` event to reset reactive UI components.
  - Implemented `isSessionActive()` to detect unfinalized intake sessions in storage.

### 2. Frontend: Eradication of Hardcoded Fallback Profiles
- **File**: [patientApi.ts](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/services/patientApi.ts)
  - Eradicated `DEFAULT_PATIENT_PROFILE = "Ananya Sharma"` from the default state.
  - Introduced `BLANK_PATIENT_PROFILE` with empty strings.
  - `patientApi.getProfile()` now returns a pristine blank profile when no data has been entered, ensuring no previous patient data or fake profile leaks to public kiosk users.

### 3. Frontend: Isolated Demo/Presentation Quick Fill Helper
- **File**: [DemoProfileQuickFill.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/components/patient/DemoProfileQuickFill.tsx)
  - Dedicated component for evaluator/judge testing and live hackathon demonstrations.
  - Only visible in development (`import.meta.env.DEV`), when `VITE_ENABLE_DEMO_PRESETS === 'true'`, or when `localStorage.getItem('sv_enable_demo_presets') === 'true'`.
  - Injected into [PatientDetails.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/pages/PatientDetails.tsx) to allow single-click demo population during presentations without polluting production kiosk defaults.

### 4. Frontend: Inactivity Watcher Hook & Accessible Modal
- **Hook**: [useKioskIdleTimer.ts](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/hooks/useKioskIdleTimer.ts)
  - Attaches throttled event listeners for `mousedown`, `mousemove`, `touchstart`, `keydown`, `scroll`.
  - Configurable `idleTimeoutMs` (60 seconds) and `countdownDurationSec` (15 seconds).
  - Triggers countdown warning when inactive, and purges session via `purgeKioskSession('IDLE_TIMEOUT')` upon countdown expiry.
- **Component**: [KioskInactivityModal.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/components/patient/KioskInactivityModal.tsx)
  - Accessible dialog overlay with large countdown badge.
  - Plays a gentle synthetic Web Audio two-tone chime (440Hz -> 660Hz) upon warning display.
  - Bilingual copy (English & Hindi) clearly informing the patient of DPDP Act data protection.
  - Primary button ("I am still here / मैं यहीं हूँ") resets the timer.
  - Secondary button ("Exit / Clear / सत्र समाप्त करें") executes immediate session purge and returns to language selection.
- **Global Mounting**: [App.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/App.tsx)
  - Mounted `KioskInactivityWatcher` wrapping active intake routes (`/patient/*` except `/patient/language` and `/patient/complete`).
  - Automatically redirects to `/patient/language` on timeout or manual abort.
- **Completion Page Purge**: [PatientComplete.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/pages/PatientComplete.tsx)
  - Updated `handleDone` and the 30-second kiosk auto-return timer to call `purgeKioskSession('INTAKE_COMPLETED')` before returning to `/patient/language`.

### 5. Backend: Intake Abort Endpoint & DPDP Audit Logging
- **Schemas**: [schemas/intake.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/schemas/intake.py)
  - `IntakeAbortRequest`: Accepts `reason` (`IDLE_TIMEOUT`, `USER_CANCELLED`, `PRIVACY_PURGE`, `OTHER`).
  - `IntakeAbortResponse`: Returns `status="SESSION_PURGED"`, `intake_session_id`, `previous_status`, `reason`, `purged_at`.
- **API Endpoint**: [api/v1/intakes.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/api/v1/intakes.py)
  - Added `POST /api/v1/intakes/{intake_id}/abort`.
  - Transitions session status to `"ABANDONED"` for any unsubmitted session.
  - Inserts an immutable audit event in `audit_events` with `event_type="SESSION_PURGED_PRIVACY"`, `actor_role="PATIENT_KIOSK"`, `resource_type="intake_session"`, and metadata containing the abort reason and timestamps.
  - Ensures abandoned sessions are excluded from the clinician queue in [api/v1/doctor.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/api/v1/doctor.py).

---

## Verification & Test Results

### 1. Backend Automated Tests (`test_kiosk_hygiene.py`)
```bash
venv\Scripts\python.exe -m pytest tests/test_kiosk_hygiene.py -v
```
**Results**:
- `test_kiosk_idle_timeout_abort`: PASSED (Transitions to ABANDONED, creates SESSION_PURGED_PRIVACY audit event)
- `test_kiosk_user_cancelled_abort`: PASSED (Handles manual patient cancellation)
- `test_aborted_session_excluded_from_doctor_queue`: PASSED (Aborted sessions do not leak to doctor queue)
- `test_abort_nonexistent_session_returns_404`: PASSED (Returns 404 for invalid session ID)
**Summary**: **4 passed in 11.33s (100% pass rate)**.

### 2. Backend Regression Suite (`test_department_router.py` + `test_api_endpoints.py`)
```bash
venv\Scripts\python.exe -m pytest tests/test_department_router.py tests/test_api_endpoints.py -v
```
**Summary**: **11 passed in 14.89s (100% pass rate)**.

### 3. Frontend TypeScript Compilation
```bash
npx tsc --noEmit
```
**Summary**: **0 errors (clean compilation)**.

---

# Walkthrough — ABDM Gateway Dual-Mode Architecture & Interoperability Defense

We have implemented the complete **ABDM Gateway Dual-Mode Architecture & Interoperability Defense** module across the FastAPI backend and React frontend.

This establishes an enterprise Gateway Adapter Pattern that bridges real National Health Authority (NHA) ABDM Sandbox APIs (M1 & M2 compliance) with an offline, high-availability simulation fallback, guaranteeing zero downtime during live demonstrations while verifying genuine compliance against NRCES India Core specifications.

---

## Changes Implemented

### 1. Backend: Pluggable ABDM Gateway Adapter Architecture
- **Adapter Contract**: [gateway_adapter.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/abdm/gateway_adapter.py)
  - Abstract base class `AbdmGatewayInterface` defining:
    - `get_session_token()`
    - `init_auth(abha_id, auth_mode)`
    - `confirm_auth(txn_id, otp)`
    - `verify_abha(abha_identifier)`
    - `push_hip_health_data(bundle, care_context_id)`
    - `check_gateway_health()`
- **Live NHA Sandbox Adapter**: [live_gateway.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/abdm/live_gateway.py)
  - Targets NHA Sandbox (`https://dev.abdm.gov.in` / `gateway.ndhm.gov.in`).
  - Implements session generation via `POST /v0.5/sessions`, Auth Init via `POST /v0.5/users/auth/init`, OTP Confirmation via `POST /v0.5/users/auth/confirmWithMobileOtp`, and M2 HIP push notification adhering to `POST /v0.5/data-flow/on-transfer-records`.
  - Resilient 5.0s timeout with structured error handling.
- **High-Availability Simulator**: [simulated_gateway.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/abdm/simulated_gateway.py)
  - Zero external network dependency.
  - Realistic transaction IDs (`txn-sim-[uuid]`).
  - Accepts 6-digit OTP code (`123456` or any 6-digit code).
  - Returns fully populated, NRCES-compliant demographic profiles.
  - Instantaneous (<50ms) HIP bundle push generating `TX-ABDM-SIM-[uuid]` receipts.
- **Gateway Factory**: [gateway_factory.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/abdm/gateway_factory.py)
  - Reads `settings.ABDM_GATEWAY_MODE`.
  - Automatically falls back from `"sandbox"` to `"simulation"` if `ABDM_CLIENT_ID` or `ABDM_CLIENT_SECRET` is missing.
  - Exposes testing hooks `set_abdm_gateway_override` and `reset_abdm_gateway`.

### 2. Backend: Settings & Configuration
- **File**: [config.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/core/config.py)
  - Added configuration parameters:
    - `ABDM_GATEWAY_MODE: str = "simulation"`
    - `ABDM_GATEWAY_BASE_URL: str = "https://dev.abdm.gov.in"`
    - `ABDM_CLIENT_ID: Optional[str] = None`
    - `ABDM_CLIENT_SECRET: Optional[str] = None`
    - `ABDM_FACILITY_ID: str = "IN-MH-100234"`
    - `ABDM_HIP_ID: str = "SWASTHYA_VAANI_HIP_01"`

### 3. Backend: Enhanced ABDM REST Endpoints
- **File**: [api/v1/abdm.py](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/api/v1/abdm.py)
  - `GET /api/v1/abdm/gateway/status`: Returns gateway mode, base URL, auth status, facility ID, and latency.
  - `POST /api/v1/abdm/abha/auth/init`: Initiates 2-step OTP authentication via active gateway.
  - `POST /api/v1/abdm/abha/auth/confirm`: Verifies 6-digit OTP and returns authenticated patient profile.
  - `POST /api/v1/abdm/abha/verify`: Direct ABHA profile verification.
  - `GET /api/v1/abdm/bundle/{intake_id}?preview=true`: Supports pre-confirmation bundle inspection.
  - `POST /api/v1/abdm/hip/push`: Validates generated FHIR R4 Bundle with `abdm_validator.py`, transfers to ABDM HIP network, and logs immutable `ABDM_HIP_PUSH_SUCCESS` in `audit_events`.

### 4. Frontend: ABDM Gateway Indicator & Dual-Mode Modal
- **Component**: [AbhaVerificationModal.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/components/AbhaVerificationModal.tsx)
  - Displays gateway health badge: `🟢 Live NHA Sandbox` vs `🟡 High-Availability Staging Simulator`.
  - Dual-mode verification tabs:
    1. **ABDM Online OTP Auth**: 2-step flow with Step 1 (Request OTP) and Step 2 (Enter OTP code) with visible evaluator demo tip (`Use OTP 123456`).
    2. **Health Card QR Scanner**: Physical and digital health ID card camera scanner.
  - Directly applies verified demographic records to the patient intake form.
- **Physician Confirmation Drawer**: [DoctorPatientSummary.tsx](file:///c:/Users/ACER/Downloads/SwasthyaVaani/src/pages/DoctorPatientSummary.tsx)
  - Updated action button to **"Confirm & Push to ABDM"**.
  - Interactive Pre-Confirmation Dialog with tabs:
    - `📋 NRCES Compliance`: Shows 100% compliant validation against `https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle`, Target Facility ID (`IN-MH-100234`), and Care Context ID.
    - `📄 FHIR Composition`: JSON viewer and copy button for the Composition header.
    - `📦 Full Bundle JSON`: JSON viewer and copy button for the full FHIR R4 Document Bundle.
  - Post-Confirmation Receipt: Displays ABDM Transaction ID (`TX-ABDM-...`), Transfer ID, Care Context ID, and Gateway Mode.

---

## Verification & Test Results

### 1. Backend ABDM Gateway Test Suite (`test_abdm_gateway.py` + `test_abdm_fhir.py`)
```bash
venv\Scripts\python.exe -m pytest tests/test_abdm_gateway.py tests/test_abdm_fhir.py -v
```
**Results**:
- `test_simulated_gateway_auth_flow`: PASSED
- `test_simulated_gateway_hip_push`: PASSED
- `test_gateway_factory_switching`: PASSED
- `test_abdm_api_status_endpoint`: PASSED
- `test_abdm_2step_auth_api`: PASSED
- `test_abdm_hip_push_and_audit`: PASSED
- `test_abha_verification_endpoint`: PASSED
- `test_nrces_bundle_validation_success`: PASSED
- `test_nrces_validator_catches_invalid_bundle`: PASSED
- `test_abdm_hip_push`: PASSED
**Summary**: **10 passed in 20.65s (100% pass rate)**.

### 2. Full Regression Test Suite (`test_kiosk_hygiene.py` + `test_department_router.py`)
```bash
venv\Scripts\python.exe -m pytest tests/test_kiosk_hygiene.py tests/test_department_router.py -v
```
**Summary**: **12 passed in 19.18s (100% pass rate)**.

### 3. Frontend TypeScript Compilation
```bash
npx tsc --noEmit
```
**Summary**: **0 errors (clean compilation)**.


