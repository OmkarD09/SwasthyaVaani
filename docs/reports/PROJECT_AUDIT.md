# SwasthyaVaani — Production Technical Audit & System Inspection
**Target Specification**: SIH Problem Statement 26047  
**Platform**: AI-Assisted Multimodal Pre-Consultation Clinical Intake & Triage  
**Audit Target**: Production Workspace Baseline (`main`)  
**Generated**: September 2026  

---

# 1. Project Overview & Architecture

## System Architecture

SwasthyaVaani is an AI-assisted multimodal clinical pre-consultation intake and triage platform engineered for Outpatient Departments (OPDs) in Indian district hospitals. It gathers clinical complaints across 13 Indian languages via kiosk-based voice and touch interactions, extracts structured clinical facts, computes adaptive follow-up inquiries via a deterministic information-gain engine, deterministically detects emergency red flags, digitizes handwritten/printed medical records via OCR and schema-constrained LLMs, and delivers an ABDM/FHIR R4-compliant dossier to attending physicians for review, modification, and digital confirmation.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PATIENT KIOSK WORKFLOW                                          │
│  [Language & Mode] ──► [ABHA QR / Demographics] ──► [Multimodal Interview] ──► [Records OCR Upload]  │
│  (13 Indic Languages)   (html5-qrcode / parseAbhaQr)  (Voice/Touch Synced)     (PDF/PNG/JPEG <= 10MB)  │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │ HTTP / REST API (FastAPI)
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BACKEND CORE (FASTAPI MONOLITH)                                     │
│                                                                                                        │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │    Clinical AI Engine   │  │  Deterministic Safety     │  │       Document Intelligence          │  │
│  │  - Adaptive Scorer      │  │  - Red Flag Rules         │  │  - PaddleOCR Engine (PyMuPDF)        │  │
│  │  - Domain Classifier    │  │  - Melena/Cardiac Alerts  │  │  - Groq / Gemini Extractor           │  │
│  │  - Info Sufficiency Gate│  │  - Contradiction Detector │  │  - Anti-Hallucination Evidence Gate  │  │
│  │  - AYUSH Engine         │  │  - Emergency Triage Queue │  │  - Local Private Disk Storage        │  │
│  └─────────────────────────┘  └───────────────────────────┘  └──────────────────────────────────────┘  │
│                                                                                                        │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │   FHIR R4 / ABDM Layer  │  │  Semantic Knowledge RAG   │  │        Realtime Event Broker         │  │
│  │  - OPConsult Bundle     │  │  - In-Memory Cosine Sim   │  │  - FastAPI WebSocket Manager         │  │
│  │  - NRCES India Profiles │  │  - AYUSH NAMSTP Protocols │  │  - Broadcast on Submit & Confirm     │  │
│  │  - Schema Validator     │  │  - Chunk Embeddings Cache │  │  - 5s HTTP Polling Fallback          │  │
│  └─────────────────────────┘  └───────────────────────────┘  └──────────────────────────────────────┘  │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │ Relational DB / Session Context
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PERSISTENCE LAYER (SQLAlchemy)                                       │
│  SQLite (swasthyavaani.db) / PostgreSQL (Supabase Compatible) — Alembic Database Versioning            │
│  23 Relational Tables: Patients, Sessions, Questions, Answers, States, Extractions, Reviews, Audits    │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │ WebSocket & REST /api/v1/doctor/*
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PHYSICIAN & ADMIN WORKSTATIONS                                        │
│  ┌──────────────────────────────────────────────┐  ┌─────────────────────────────────────────────────┐ │
│  │            Doctor Workstation                │  │            Hospital Operations (Admin)          │ │
│  │  - Live Priority Queue (Red Flag Sorting)    │  │  - Intake & Triage Analytics Dashboard          │ │
│  │  - Structured Clinical Summary Dossier       │  │  - AI Suggestion Override & Latency Tracker     │ │
│  │  - Conversational Transcript & Modality Log  │  │  - Hospital, Department, Doctor RBAC Onboarding │ │
│  │  - Interactive Document & OCR Bounding Box   │  │  - Emergency Red-Flag Live Surveillance Tracker │ │
│  │  - AYUSH Dosha Radar & Agni/Koshtha Review   │  │  - Tamper-Evident Audit Event Trail             │ │
│  │  - Inline Field Edit & Override Workflow     │  │  - Synthetic Clinical QA Test Lab Runner        │ │
│  │  - Explicit Confirmation & ABDM HIP Push     │  │                                                 │ │
│  └──────────────────────────────────────────────┘  └─────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend Architecture**: Single-page application built on React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons, and Radix UI headless components. Client-side routing is handled via `wouter`.
- **Backend Architecture**: Modular monolith built on FastAPI and Python 3.12 (Uvicorn ASGI runner). Divided into domain-driven router modules under `/api/v1/` (`auth`, `intakes`, `doctor`, `documents`, `admin`, `speech`, `rag`, `fhir`, `abdm`).
- **Database Architecture**: Relational storage using SQLAlchemy 2.0 ORM with declarative models. Local environment runs SQLite (`swasthyavaani.db`), fully portable to PostgreSQL / Supabase with identical schema definitions. Schema evolution is managed through Alembic migrations.
- **Message Broker / Realtime Communication**: In-process asynchronous WebSocket Connection Manager (`ws_manager`) in `app.core.events` broadcasting triage state changes, queue updates, and clinical confirmations. Doctor portal pairs WebSockets with a 5-second HTTP polling safety fallback.

---

## Repository Structure

```text
SwasthyaVaani/
├── AGENTS.md                                # AI pair programming instructions & rules
├── alembic.ini                              # Alembic database migration configuration
├── CURRENT_OCR_FLOW.md                      # Forensic document intelligence trace
├── package.json                             # Frontend dependencies and npm scripts
├── tsconfig.json                            # TypeScript compilation configuration
├── vite.config.ts                           # Vite configuration with API reverse proxy
├── swasthyavaani.db                         # Local SQLite development database
│
├── docs/                                    # System documentation & specifications
│   ├── SwasthyaVaani_PRD.md                 # Product Requirement Document (SIH 26047)
│   ├── SwasthyaVaani_TRD.md                 # Technical Requirement Document
│   ├── SwasthyaVaani_architecture.md        # Architectural decisions & system boundaries
│   ├── SwasthyaVaani_backend_schema.md      # Data contracts & database schema reference
│   ├── SwasthyaVaani_rules.md               # Clinical safety & deterministic interview rules
│   ├── SwasthyaVaani_appflow.md             # End-to-end user journeys & screen states
│   ├── SwasthyaVaani_AYUSH_Specification.md # AYUSH clinical standards (NAMSTP)
│   ├── SwasthyaVaani_Current_Project_State.md# Forensic audit snapshot
│   └── SwasthyaVaani_UI_UX_Design_Brief.md  # Kiosk & doctor portal design tokens
│
├── backend/                                 # FastAPI Backend Service
│   ├── pyproject.toml / requirements.txt    # Python runtime package dependencies
│   ├── alembic/                             # Database migration scripts
│   │   └── versions/                        # Migration revisions
│   ├── private_uploads/                     # Secure local disk storage for uploaded records
│   ├── app/
│   │   ├── main.py                          # FastAPI app entrypoint, CORS, lifespan seeder
│   │   ├── core/                            # Configuration, DB connection, security, events
│   │   │   ├── config.py                    # Environment settings via pydantic-settings
│   │   │   ├── database.py                  # SQLAlchemy SessionLocal & Supabase client hook
│   │   │   ├── datetime_utils.py            # UTC ISO date-time sanitizers
│   │   │   ├── events.py                    # WebSocket active connection manager
│   │   │   └── security.py                  # JWT creation/verification & bcrypt hashing
│   │   ├── api/                             # API Routers
│   │   │   ├── router.py                    # Aggregated /api/v1 router mount
│   │   │   └── v1/                          # Versioned endpoints (10 routers)
│   │   │       ├── abdm.py                  # ABDM ABHA verify, bundle generation, HIP push
│   │   │       ├── admin.py                 # Stats, AI monitoring, emergency, audit, RBAC, QA
│   │   │       ├── auth.py                  # Clinician JWT login & user profile
│   │   │       ├── doctor.py                # Live queue, clinical dossier, notes, confirm
│   │   │       ├── documents.py             # Multipart upload, private view, OCR execution
│   │   │       ├── fhir.py                  # NRCES India Core FHIR R4 export
│   │   │       ├── intakes.py               # Session lifecycle, text & voice answers, submit
│   │   │       ├── rag.py                   # Knowledge document ingestion & semantic query
│   │   │       └── speech.py                # TTS synthesis & ASR speech transcription
│   │   ├── models/                          # SQLAlchemy Declarative Models (23 models)
│   │   │   ├── ayush.py                     # AyushAssessmentModel
│   │   │   ├── document.py                  # DocumentModel, OCR runs, candidates, evidence
│   │   │   ├── intake.py                    # IntakeSession, QuestionEvent, Answer, ClinicalState
│   │   │   ├── knowledge.py                 # KnowledgeDocument, KnowledgeChunk
│   │   │   ├── review.py                    # PhysicianReviewModel, PhysicianEditModel, Audit
│   │   │   ├── safety.py                    # RedFlagModel, ContradictionModel
│   │   │   └── user.py                      # Hospital, Department, Doctor, Patient, User
│   │   ├── schemas/                         # Pydantic Schemas & DTO Validation
│   │   │   ├── abdm.py                      # ABHA verification & ABDM validation reports
│   │   │   ├── admin.py                     # Dashboard stats, AI metrics, staff onboarding
│   │   │   ├── ayush.py                     # Dashavidha & baseline AYUSH assessment schemas
│   │   │   ├── clinical_state.py            # Unified ClinicalState model & canonical values
│   │   │   ├── doctor.py                    # Queue item, patient detail, confirm request
│   │   │   ├── document.py                  # Document upload response & candidate schemas
│   │   │   ├── fhir.py                      # FHIR Bundle data transfer schemas
│   │   │   ├── intake.py                    # Intake create, answer, voice answer contracts
│   │   │   ├── question.py                  # Adaptive question decision & candidates
│   │   │   └── rag.py                       # Knowledge document & query context schemas
│   │   ├── services/                        # Business Logic & Integrations
│   │   │   ├── clinical_ai/                 # Adaptive questioning engine & question scorer
│   │   │   ├── document_intelligence.py     # Document validation, hashing & file persistence
│   │   │   ├── document_extraction.py       # Candidate entity extraction & evidence validation
│   │   │   ├── fhir/                        # FHIR R4 mapping & NRCES ABDM validation
│   │   │   ├── patient_id.py                # Daily serial display ID generator (SV-YYYYMMDD-XXXX)
│   │   │   ├── providers/                   # Abstract provider interfaces & factory
│   │   │   ├── rag/                         # Vector embedding generation & retrieval service
│   │   │   └── safety/                      # Deterministic red flag & contradiction engines
│   │   └── seed/                            # Synthetic clinical demo scenarios & seeder
│   └── tests/                               # 48 Automated test suites (181+ tests)
│
└── src/                                     # React 19 Frontend Application
    ├── main.tsx                             # React entrypoint
    ├── App.tsx                              # Route table (Patient, Doctor, Admin, Auth)
    ├── index.css                            # Tailwind CSS v4 design tokens & base typography
    ├── components/                          # Reusable UI & Feature Components
    │   ├── AbhaQrScanner.tsx                # Camera & image file QR reader (html5-qrcode)
    │   ├── AbhaVerificationModal.tsx        # ABDM M2/M3 profile verification dialogue
    │   ├── Brand.tsx                        # Typography, badges, buttons, headers
    │   ├── PatientTextChat.tsx              # Adaptive text chat interface with touch chips
    │   ├── PatientVoiceChat.tsx             # Voice interview with live waveform & silence timer
    │   ├── admin/                           # Admin operations sub-tabs (AI, Audit, Staff, QA)
    │   ├── clinician/                       # Shared clinician header & navigation bar
    │   ├── doctor/                          # Doctor dossier sections (Ayush, Summary, Notes)
    │   ├── patient/                         # Kiosk progress bar, audio consent, flow guards
    │   └── ui/                              # Radix UI / shadcn component library
    ├── pages/                               # Full-Page Routable Views
    │   ├── HomePage.tsx                     # Landing portal (Patient Kiosk vs Doctor Login)
    │   ├── PatientLanguageSelection.tsx     # 13 Indic language selection screen
    │   ├── PatientDetails.tsx               # Patient demographics & ABHA scanner
    │   ├── PatientModeSelection.tsx         # Voice vs Text mode selector
    │   ├── PatientIntake.tsx                # Kiosk container (Chat -> Records -> Submit)
    │   ├── PatientReviewSummary.tsx         # Patient-facing summary verification
    │   ├── PatientComplete.tsx              # Queue token receipt (A-XXXXXX) & audio alert
    │   ├── ClinicianLogin.tsx               # JWT authentication portal for doctors & admins
    │   ├── DoctorPortal.tsx                 # Live doctor queue & triage overview
    │   ├── DoctorPatientSummary.tsx         # Main clinical review & confirmation workstation
    │   ├── DoctorPatientHistory.tsx         # Longitudinal medical & document history view
    │   ├── DoctorPatientConversation.tsx    # Turn-by-turn conversational transcript log
    │   ├── DoctorPatientAyush.tsx           # Dedicated AYUSH constitutional assessment view
    │   └── HospitalOperations.tsx           # Hospital administrative operations center
    ├── hooks/                               # React custom hooks (usePatientRecord, use-toast)
    ├── lib/                                 # Kiosk state, consent store, clinician auth, date utils
    ├── services/                            # Frontend API clients (patientApi, adminApi)
    ├── utils/                               # QR parsing (parseAbhaQr) & chipResolver
    └── i18n/                                # Localized string bundles (en, hi, mr)
```

---

## Core Tech Stack & Libraries

### Frontend Dependencies (`package.json`)
| Package / Library | Installed Version | Architectural Purpose |
|---|---|---|
| `react` / `react-dom` | `19.1.0` | Core UI rendering engine |
| `vite` | `7.3.2` | Fast HMR dev server & production bundler |
| `typescript` | `7.0.2` | Static type safety and compilation |
| `wouter` | `3.3.5` | Lightweight client-side hash/path router |
| `tailwindcss` | `4.1.14` | Styling engine with `@tailwindcss/vite` |
| `lucide-react` | `0.545.0` | Production icon system across kiosk and doctor portal |
| `framer-motion` | `12.23.24` | Fluid UI state and transition micro-animations |
| `@radix-ui/*` | `^1.1.3`–`^2.2.7` | Accessible headless UI primitives (dialogs, tabs, popovers) |
| `@tanstack/react-query`| `^5.90.21` | Asynchronous state management & caching |
| `html5-qrcode` | `2.3.8` | Device camera & file QR scanner for ABHA cards |
| `recharts` | `2.15.2` | Radar charts and triage metrics visualizations |
| `date-fns` | `3.6.0` | Temporal parsing and formatting |

### Backend Dependencies (`backend/requirements.txt`)
| Package / Library | Pinned / Minimum Version | Architectural Purpose |
|---|---|---|
| `fastapi` | `>=0.115.0` | High-performance asynchronous REST and WebSocket API |
| `uvicorn[standard]` | `>=0.30.0` | Asynchronous Server Gateway Interface (ASGI) runtime |
| `pydantic` / `pydantic-settings`| `>=2.8.0` / `>=2.4.0` | Strict data validation, DTO serialization, env parsing |
| `sqlalchemy` | `>=2.0.30` | Declarative Relational ORM for all 23 database models |
| `alembic` | `>=1.13.0` | Database schema migrations and version tracking |
| `pyjwt` | `>=2.9.0` | Signed JWT token generation and validation for RBAC |
| `python-multipart` | `>=0.0.9` | Multipart form-data handling for file and audio uploads |
| `paddleocr` / `paddlepaddle` | `3.7.0` / `3.3.1` | Optical Character Recognition engine for medical records |
| `PyMuPDF` | `1.28.2` | Multi-page PDF document rasterization and image rendering |
| `groq` | `1.7.0` | Ultra-low latency LLM inference (`qwen/qwen3.8-27b`, `gpt-oss-120b`) |
| `google-genai` | `2.20.0` | Multimodal and document intelligence inference (`gemini-3.5-flash-lite`) |
| `supabase` / `psycopg2-binary` | `>=2.6.0` / `>=2.9.9` | PostgreSQL driver and Supabase integration clients |
| `httpx` | `>=0.27.0` | Async HTTP client for external speech and translation APIs |
| `pytest` / `pytest-asyncio` | `>=8.2.0` / `>=0.23.0` | Unit, integration, and regression test frameworks |

---

# 2. Module Breakdown & Implementation Status

## Module 1: Patient Onboarding & Identity
**Implementation Status**: 🟡 **PARTIALLY IMPLEMENTED (Mocked/Partial)**

```
                  ┌─────────────────────────────────────────────────────────┐
                  │           Language Selection (/patient/language)        │
                  │  13 Indic Languages UI + English/Hindi/Marathi Audio   │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │             Audio-Guided Bilingual Consent              │
                  │  Audio playback of consent via Web Speech / Sarvam TTS │
                  │  Persisted in consentStore.ts & patients table          │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │         Demographics & ABHA Entry (/patient/details)     │
                  ├────────────────────────────┬────────────────────────────┤
                  │ Scan Physical / Digital QR │   Manual Input / Guest     │
                  │ (html5-qrcode + parser)    │   Name, Age, Gender, Phone │
                  └─────────────┬──────────────┴─────────────┬──────────────┘
                                │                            │
                                ▼                            │
                  ┌────────────────────────────┐             │
                  │ ABDM Verification Modal    │             │
                  │ POST /api/v1/abdm/abha/verify             │
                  │ (Simulated ABDM Gateway)   │             │
                  └─────────────┬──────────────┘             │
                                └──────────────┬─────────────┘
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │            Kiosk Profile State Initialized              │
                  │  localStorage['sv_patient_profile'] + Session Creation   │
                  └─────────────────────────────────────────────────────────┘
```

### Implementing Files
- Frontend: `src/pages/PatientLanguageSelection.tsx`, `src/pages/PatientDetails.tsx`, `src/pages/PatientProfile.tsx`, `src/components/AbhaQrScanner.tsx`, `src/components/AbhaVerificationModal.tsx`, `src/utils/parseAbhaQr.ts`, `src/lib/consentStore.ts`, `src/lib/consentTranslations.ts`, `src/components/patient/AudioGuidedConsent.tsx`, `src/services/patientApi.ts`.
- Backend: `backend/app/api/v1/abdm.py`, `backend/app/api/v1/intakes.py`, `backend/app/models/user.py` (`Patient` model).

### Logic & Algorithms
1. **ABHA QR Parsing (`src/utils/parseAbhaQr.ts`)**: Supports four distinct QR formats without hardcoding: (a) ABDM JSON payloads, (b) URL parameter payloads with query strings, (c) multi-line key-value text pairs, and (d) standalone 14-digit numeric ABHA strings. Formats ABHA numbers into standard `XX-XXXX-XXXX-XXXX`, normalizes ABHA addresses (`user@abdm`), and standardizes gender representation (`Male`, `Female`, `Other`).
2. **ABHA Verification (`backend/app/api/v1/abdm.py: verify_abha_identity`)**: Accepts ABHA Number or Address. Currently acts as an ABDM M2/M3 simulation gateway; returns a verified demographic profile (`status: "VERIFIED"`) without executing an external network call to the National Health Authority (NHA) production gateway.
3. **Guest & Mobile Flows**: Patients can skip ABHA entry and provide basic demographics (name, age, gender, optional phone). No active SMS OTP gateway (e.g. CDAC/Twilio) is connected; phone numbers are stored directly on the `patients` record.
4. **Consent Management (`src/lib/consentStore.ts`)**: Enforces explicit bilingual consent before allowing navigation to clinical questioning. `AudioGuidedConsent.tsx` provides accessible spoken consent playback via browser SpeechSynthesis or Sarvam TTS. Consent status is written to browser `localStorage` and sent in the intake payload to set `Patient.consent_recorded = True`.
5. **Session Ephemerality & Gaps**: Profile data is read from `localStorage['sv_patient_profile']`. If empty, it defaults to a pre-filled synthetic profile (`DEFAULT_PATIENT_PROFILE = "Ananya Sharma"`). The kiosk automatically generates an anonymous token ticket upon submission.

---

## Module 2: Multimodal Clinical Interview Engine (Voice + Touch)
**Implementation Status**: 🟢 **FULLY FUNCTIONAL**

```
 [Voice Input: Audio Blob]                         [Touch Input: Quick Tap Chip]
            │                                                    │
            ▼ (POST /intakes/{id}/voice-answer)                  ▼ (POST /intakes/{id}/answers)
 [Speech ASR Service]                                            │
 (Sarvam / Bhashini / Whisper / WebSpeech)                       │
            │                                                    │
            └─────────────────────────┬──────────────────────────┘
                                      │
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │       process_intake_answer_core (intakes.py)    │
             │       - Normalizes text & logs Answer record     │
             │       - Extracts clinical facts into state       │
             └────────────────────────┬─────────────────────────┘
                                      │
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │       Deterministic Safety Screening             │
             │       - evaluate_red_flags() (red_flags.py)      │
             │       - detect_contradictions()                  │
             │       - Flags PRIORITY_REVIEW if high-risk       │
             └────────────────────────┬─────────────────────────┘
                                      │
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │       Deterministic Adaptive Reasoning Engine     │
             │       - domain_classifier.py (Clinical domain)   │
             │       - question_scorer.py (Information gain)    │
             │       - _assess_information_sufficiency()        │
             └────────────────────────┬─────────────────────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
             [Sufficiency Met / Max Q]        [Additional Info Needed]
                     │                                 │
                     ▼                                 ▼
              Decision: STOP / ESCALATE         Decision: ASK
                     │                                 │
                     ▼                                 ▼
           Complete Intake Flow             - LLM phrases question in Indic lang
                                            - chipResolver maps target_field to chips
                                            - TTS synthesizes audio response
```

### Implementing Files
- Frontend: `src/components/PatientVoiceChat.tsx`, `src/components/PatientTextChat.tsx`, `src/utils/chipResolver.ts`, `src/pages/PatientIntake.tsx`, `src/lib/conversationStore.ts`.
- Backend: `backend/app/api/v1/intakes.py`, `backend/app/services/clinical_ai/adaptive_engine.py`, `backend/app/services/clinical_ai/question_scorer.py`, `backend/app/services/clinical_ai/domain_classifier.py`, `backend/app/services/clinical_ai/gap_analysis.py`, `backend/app/services/safety/red_flags.py`, `backend/app/services/safety/contradictions.py`, `backend/app/api/v1/speech.py`, `backend/app/services/providers/speech_provider.py`.

### Logic & Algorithms
1. **Unified Clinical Handler**: Both voice and text answers route to `process_intake_answer_core` in `intakes.py`. This guarantees identical clinical decision logic regardless of input modality.
2. **STT & Audio Pipeline (`PatientVoiceChat.tsx`)**:
   - Primary: Browser Web Speech API (`webkitSpeechRecognition`) for low-latency live transcription in the patient's selected Indic language.
   - Audio File Recording: MediaRecorder records raw WebM/WAV audio, streaming it as `multipart/form-data` to `POST /api/v1/intakes/{id}/voice-answer`.
   - Audio Visualizer: HTML5 Canvas powered by Web Audio API `AnalyserNode` generating a dynamic waveform matching microphone input.
   - Silence Detection: Automatic 3.5-second silence countdown timer submits the speech chunk without requiring physical button taps.
3. **TTS Pipeline**:
   - Primary: `POST /api/v1/speech/tts` calls Sarvam/Bhashini provider adapter returning base64 audio.
   - Fallback: Automatic cascade to browser `window.speechSynthesis` with matching Indic voice tags (`hi-IN`, `mr-IN`, `en-IN`).
4. **Dialogue Management (SOCRATES Framework)**:
   - Evaluates: **S**ite (location), **O**nset, **C**haracter (severity/type), **R**adiation, **A**ssociations (associated symptoms), **T**iming (frequency/duration), **E**xacerbating/relieving factors, **S**everity.
   - `question_scorer.py` evaluates candidate dimensions against clinical domain rules (Gastrointestinal, Respiratory, Cardiac, Ophthalmic, Musculoskeletal, Fever, Headache, Dermatology, Urinary, AYUSH) and scores each dimension by information gain.
   - Anti-Duplication: `is_semantic_duplicate()` blocks candidate questions having >65% word overlap with previously asked questions.
   - LLM Guardrail: The LLM is **never** permitted to decide what to ask or when to stop. The application state machine selects the `target_field`, while the LLM is solely instructed to formulate the question naturally in the patient's language.
5. **Early-Stopping Clinical Sufficiency Gate (`_assess_information_sufficiency`)**:
   - Evaluates whether sufficient clinical facts exist to form a safe diagnostic hypothesis.
   - For focused complaints (e.g. conjunctivitis or uncomplicated acute diarrhea), the engine gracefully terminates questioning in 3–4 targeted rounds instead of grinding the patient through the maximum question limit (`MAX_QUESTIONS_DEFAULT = 10`).
   - Hard safety rules prevent early termination if critical complications remain unaddressed (e.g., vomiting without hydration status, melena without dark stool onset).
6. **Touch & Voice Synchronization (`src/utils/chipResolver.ts`)**:
   - Translates the backend's active `target_field` into standardized, single-tap kiosk touch chips in English, Hindi, and Marathi (e.g. Duration chips, 1–10 Severity buckets, Yes/No/Unsure toggles, Agni/Koshtha selectors).
7. **Deterministic Red-Flag Detection (`backend/app/services/safety/red_flags.py`)**:
   - Pure rule-based clinical logic. LLMs are strictly forbidden from evaluating emergency triage.
   - Implemented rules:
     - `RF-CP-001`: Chest pain accompanied by breathlessness (`dyspnea`) or arm/shoulder radiation.
     - `RF-SEV-001`: Pain severity $\ge 8/10$.
     - `RF-SO-001`: High fever combined with acute respiratory distress or gasping.
     - `RF-GI-001`: Gastrointestinal bleeding / melena (dark stool) accompanied by dizziness or hypoperfusion signals.
   - Detected red flags immediately trigger `PRIORITY_REVIEW` status, placing the patient at the top of the doctor queue.

---

## Module 3: AYUSH Clinical Intake Implementation
**Implementation Status**: 🟢 **FULLY FUNCTIONAL**

```
 [Patient selects AYUSH / Primary GI complaint detected]
                           │
                           ▼
 [Adaptive Scorer activates AYUSH Dimension Priorities]
 - Agni (Digestive Fire / Appetite pattern)
 - Koshtha (Bowel Habit / Motility)
 - Prakriti & Vikriti (Constitutional baseline vs current imbalance)
 - Ahara-Vihara (Diet, sleep, spicy food exposure)
 - Dashavidha Pariksha (Sara, Samhanana, Pramana, Satmya, Sattva, Vaya)
                           │
                           ▼
 [RAG Service retrieves authentic NAMSTP guidelines]
 (backend/app/services/rag/ayush_seed_data.py)
                           │
                           ▼
 [State Update: ClinicalState.ayush & AyushAssessmentModel]
 - Computes Tri-Dosha distribution ([Vata%, Pitta%, Kapha%])
 - Derives Vaya deterministically from patient age
 - Stores dimensional provenance (PATIENT_STATED, AI_INFERRED, PHYSICIAN_CONFIRMED)
                           │
                           ▼
 [Doctor AYUSH Workstation (/doctor/patient/:id/ayush)]
 - Interactive Tri-Dosha Radar Chart & Gauge
 - Editable Agni, Koshtha, Prakriti, Vikriti cards
 - Physician Override & Digital Confirmation
```

### Implementing Files
- Frontend: `src/pages/DoctorPatientAyush.tsx`, `src/components/doctor/AyushAssessmentSection.tsx`, `src/components/doctor/AyushAssessment.tsx`.
- Backend: `backend/app/models/ayush.py`, `backend/app/schemas/ayush.py`, `backend/app/services/rag/ayush_seed_data.py`, `backend/app/services/clinical_ai/question_scorer.py`, `backend/app/services/providers/llm_provider.py`, `backend/app/services/clinical_ai/mock_provider.py`, `backend/app/services/fhir/mapper.py`.

### Logic & Algorithms
1. **AYUSH Workflow Integration**: AYUSH is implemented as an integrated clinical workflow (`workflow_type="AYUSH"`), not a disconnected chatbot. When activated, the adaptive engine prioritizes traditional Ayurvedic clinical dimensions.
2. **Parameters Captured**:
   - **Agni (Digestive Fire)**: Categorized into four classical states: *Samagni* (balanced), *Mandagni* (sluggish/low appetite/heaviness), *Tikshnagni* (sharp/acidic/burning), and *Vishamagni* (irregular/bloating/gurgling).
   - **Koshtha (Bowel Motility)**: Classified into *Mridu* (soft/loose), *Madhyama* (regular/normal), and *Krura* (hard/dry/constipated).
   - **Prakriti & Vikriti**: Constitutional baseline vs. current vitiation state across *Vata*, *Pitta*, and *Kapha* doshas.
   - **Ahara-Vihara**: Nutritional patterns, spicy/oily food consumption, meal regularity, sleep routines, and physical stress.
   - **Dashavidha Pariksha (Tenfold Examination)**: Full schema support for *Dushya*, *Desha*, *Bala*, *Kala*, *Anala*, *Prakriti*, *Vaya* (deterministically computed as *Bala* <16, *Madhyama* 16–60, *Vriddha* >60), *Sattva*, *Satmya*, *Ahara Shakti*, and *Vyayama Shakti*.
3. **Scoring & Classification Algorithms**:
   - Semantic RAG retrieval grounds questioning in authentic Ministry of AYUSH National Ayurveda Morbidity Codes and Standardized Terminology in Healthcare (NAMSTP) protocols (`ayush_seed_data.py`).
   - Dimension values are extracted using schema-constrained prompts in `llm_provider.py` and rule-based regex patterns in `mock_provider.py`.
   - Every dimension tracks strict provenance: `PATIENT_STATED`, `AI_INFERRED`, `DOCUMENT`, or `PHYSICIAN_CONFIRMED`.
4. **Physician Review & FHIR Export**:
   - Doctor reviews parameters on `/doctor/patient/:id/ayush` featuring a Tri-dosha radar gauge and editable dimension cards.
   - Confirmed AYUSH observations are mapped into FHIR R4 `Observation` resources with official SNOMED / AYUSH coding systems (`mapper.py`).

---

## Module 4: Medical Document Digitization & OCR Pipeline
**Implementation Status**: 🟢 **FULLY FUNCTIONAL**

```
 [Patient Uploads File] (PDF, PNG, JPEG <= 10MB)
            │
            ▼
 [POST /api/v1/documents/upload] (documents.py)
            │
            ├──► Validates magic bytes, MIME type, max 20 pages
            ├──► Computes SHA-256 hash for deduplication
            ├──► Writes to local disk: ./private_uploads/{category}/{year}/{uuid}.{ext}
            ├──► Inserts DocumentModel record (status: 'PENDING')
            └──► Dispatches BackgroundTask: _background_process_document()
                        │
                        ▼
             [Optical Character Recognition]
             (PaddleOCRProvider / MockOCRProvider)
             - Multi-page PDF rasterization via PyMuPDF
             - Emits raw text & bounding box blocks
             - Inserts document_ocr_runs & document_ocr_evidence
                        │
                        ▼
             [Semantic Candidate Extraction]
             (Groq openai/gpt-oss-120b or Gemini gemini-3.5-flash-lite)
             - Extracts medications, labs, diagnoses with strict JSON schema
                        │
                        ▼
             [Anti-Hallucination Evidence Gate]
             (validate_candidate_evidence in document_extraction.py)
             - Validates every string against OCR text blocks
             - Discards unsupported entities
                        │
                        ▼
             [Relational Persistence & Flagging]
             - Inserts document_candidates & evidence links
             - Inserts document_extractions (status: 'NEEDS_REVIEW')
             - Flags abnormal lab values against reference ranges
             - Documents.status updated to 'NEEDS_REVIEW'
```

### Implementing Files
- Frontend: `src/pages/PatientIntake.tsx` (Records upload step), `src/pages/DoctorPatientHistory.tsx`, `src/pages/DoctorPatientSummary.tsx`, `src/components/doctor/PatientAttachments.tsx`.
- Backend: `backend/app/api/v1/documents.py`, `backend/app/models/document.py`, `backend/app/schemas/document.py`, `backend/app/services/document_intelligence.py`, `backend/app/services/document_extraction.py`, `backend/app/services/providers/ocr_provider.py`.

### Logic & Algorithms
1. **Document Ingestion & Validation (`document_intelligence.py`)**:
   - Enforces 10MB file size limit and checks file magic bytes for PDF (`%PDF`), PNG (`\x89PNG`), and JPEG (`\xFF\xD8\xFF`).
   - Rejects encrypted PDFs and documents exceeding 20 pages.
   - Computes SHA-256 hash; detects duplicate uploads within the same intake session with HTTP 409.
   - Saves files to secure local disk storage: `./private_uploads/{category}/{year}/{uuid}.{ext}`.
2. **OCR Engine Integration (`ocr_provider.py`)**:
   - `PaddleOCRProvider`: Utilizes PaddleOCR v3.7.0 + PaddlePaddle v3.3.1. Uses PyMuPDF (`pymupdf.Matrix(2.0, 2.0)`) to rasterize multi-page PDFs to high-resolution RGB images before performing text detection and recognition.
   - `MockOCRProvider`: Deterministic fallback generating simulated multi-page prescriptions and lab reports with spatial bounding boxes (`[ymin, xmin, ymax, xmax]`).
   - Persists normalized raw evidence into `document_ocr_runs` and `document_ocr_evidence` tables. OCR output is stored as raw source evidence, **never** as unverified clinical facts.
3. **Candidate Entity Extraction Schema (`document_extraction.py`)**:
   - Schema-constrained extraction using Groq (`openai/gpt-oss-120b`) or Gemini (`gemini-3.5-flash-lite` / `gemini-2.5-flash-lite`).
   - **Medications**: `medicine_name`, `strength`, `dosage`, `frequency` (e.g. TDS, BD, OD), `duration`, `instructions`, `confidence`, `source_evidence` (linked OCR block IDs).
   - **Lab Observations**: `test_name` (e.g. Hemoglobin, Platelets, Serum Creatinine), `observed_value`, `unit`, `reference_range`, `report_date`, `confidence`, `source_evidence`.
   - **Diagnoses / History**: `condition_name`, `status` (active/resolved), `onset_date`, `confidence`, `source_evidence`.
4. **Anti-Hallucination Evidence Gate (`validate_candidate_evidence`)**:
   - Every candidate entity must cite supporting `evidence_id` blocks.
   - Algorithmic text matching verifies that extracted text strings have lexical overlap with the cited OCR text blocks. Candidates failing grounding verification are discarded to eliminate LLM hallucinations.
5. **Timeline Assembly & Abnormal Value Flagging**:
   - In `DoctorPatientHistory.tsx`, lab observations and historical prescriptions are merged with conversational intake facts and sorted chronologically into an interactive clinical timeline.
   - Observed numerical lab values are evaluated against reference ranges (e.g., `13.2 g/dL` vs. `12.0-16.0`), and tagged with status badges.
   - Doctors can view original scanned documents alongside OCR bounding boxes and verified candidate cards with one-click approval or rejection.

---

## Module 5: Physician Dashboard & Summary Generator
**Implementation Status**: 🟢 **FULLY FUNCTIONAL**

```
 [Doctor Logs In (/doctor/login)] ──► Issues Signed JWT Bearer Token (Role: DOCTOR)
                   │
                   ▼
 [Live Queue Workstation (/doctor)]
 - Real-time WebSocket listener (/api/v1/doctor/ws) + 5s polling fallback
 - Triage Sort: Emergency Red Flags (PRIORITY_REVIEW) ──► Longest Wait Time
                   │
                   ▼
 [Doctor Opens Clinical Dossier (/doctor/patient/:id/summary)]
 - Patient Demographics & ABHA Identity Badge
 - Structured Clinical Summary (Chief Complaint -> HPI -> ROS -> Meds -> Allergies)
 - Safety & Red Flag Alerts (Cardinal warnings with evidence citations)
 - Contradiction Notices (Patient self-report vs extracted prescription facts)
 - Turn-by-Turn Conversational Timeline (Original language text + audio playback)
 - Uploaded Document Viewer (Side-by-side OCR bounding boxes & candidates)
 - AYUSH Constitutional Panel (Agni, Koshtha, Prakriti, Tri-Dosha gauge)
                   │
                   ▼
 [Physician Verification & Override Workflow]
 - Doctor edits fields via modal (Old value, New value, Reason logged)
 - Edits stored in physician_edits table
 - Clinical notes recorded in physician_reviews table
                   │
                   ▼
 [Explicit Confirmation (POST /api/v1/doctor/patients/:id/confirm)]
 - Updates IntakeSession.review_status = "REVIEWED", status = "CONFIRMED"
 - Emits AuditEvent record (tamper-evident audit log)
 - Generates NRCES India Core FHIR R4 OPConsultRecord Bundle
 - Validates Bundle via abdm_validator.py
 - Broadcasts WebSocket event to live queue; auto-navigates to next patient
```

### Implementing Files
- Frontend: `src/pages/DoctorPortal.tsx`, `src/pages/DoctorPatientSummary.tsx`, `src/pages/DoctorPatientHistory.tsx`, `src/pages/DoctorPatientConversation.tsx`, `src/pages/DoctorPatientAyush.tsx`, `src/components/doctor/*` (14 components), `src/hooks/usePatientRecord.ts`, `src/lib/clinicianAuth.ts`.
- Backend: `backend/app/api/v1/doctor.py`, `backend/app/api/v1/fhir.py`, `backend/app/api/v1/abdm.py`, `backend/app/services/fhir/mapper.py`, `backend/app/services/fhir/abdm_validator.py`, `backend/app/models/review.py`, `backend/app/schemas/doctor.py`.

### Logic & Algorithms
1. **Clinical Summary Structure**: Displays structured clinical intake data organized in accordance with medical standards:
   - **Chief Complaint & HPI**: Primary complaint, onset, duration, pain severity (1–10 gauge), anatomical location, radiation, aggravating/relieving factors.
   - **Associated Symptoms & Review of Systems**: Positive and explicitly negated symptoms.
   - **Past History & Chronic Conditions**: Self-reported and OCR-extracted past medical conditions.
   - **Medications & Allergies**: Active medications, dosages, frequencies, and reported drug/environmental allergies.
   - **Safety Alerts**: Active red flags (`PRIORITY_REVIEW`) with supporting evidence.
   - **Contradictions**: Discrepancies between patient responses and document records.
2. **Interoperability Standards (FHIR R4 & ABDM Readiness)**:
   - `map_clinical_state_to_fhir_r4` (`mapper.py`) transforms confirmed clinical data into an official NRCES India Core FHIR R4 Document Bundle adhering to `https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord`.
   - Bundle resource composition:
     - `Composition`: Mandatory first entry with SNOMED CT code `371530004` (*Clinical consultation report*) and status `final`.
     - `Patient`: Demographics with ABHA identifier system `https://healthid.ndhm.gov.in`.
     - `Practitioner`: Attending doctor details and license identifier.
     - `Encounter`: Outpatient encounter linkage.
     - `Condition`: Confirmed clinical complaint and diagnostic hypotheses.
     - `Observation`: Symptoms, severity scale, duration, and AYUSH constitutional observations (Agni, Koshtha, Prakriti).
     - `MedicationStatement`: Active medications with dosage timing.
     - `AllergyIntolerance`: Documented drug/environmental allergies.
   - Real-time compliance checking via `abdm_validator.py: validate_nrc_abdm_bundle` enforces NRCES mandatory constraints (document type, composition status, resource presence).
   - ABDM HIP Push: `POST /api/v1/abdm/hip/push` simulates pushing the verified FHIR bundle to the ABDM Health Information Provider gateway.
3. **Physician Verification & Override Workflow**:
   - Doctors can modify any field via the edit modal. Every edit creates a `PhysicianEditModel` record capturing `field_name`, `old_value_json`, `new_value_json`, and doctor-specified `reason`.
   - Confirmation is explicit (`POST /api/v1/doctor/patients/{intake_id}/confirm`). Autonomous AI submission is impossible.
   - Confirmation updates session status to `CONFIRMED`, records a permanent timestamped `PhysicianReviewModel`, commits an immutable audit event in `audit_events`, and broadcasts a WebSocket notification to clear the patient from active waiting queues.

---

# 3. Data Schemas & API Endpoints

## Core Database Models (SQLAlchemy Declarative)

```
┌───────────────────────────┐         ┌───────────────────────────┐
│         hospitals         │1       *│        departments        │
│ id (PK)                   ├─────────┤ id (PK), hospital_id (FK) │
│ name, code, is_active     │         │ name, code, is_active     │
└─────────────┬─────────────┘         └─────────────┬─────────────┘
              │1                                    │1
              │*                                    │*
┌─────────────┴─────────────┐         ┌─────────────┴─────────────┐
│          doctors          │         │           users           │
│ id (PK), hospital_id (FK) │         │ id (PK), email, role      │
│ department_id (FK)        │         │ password_hash, is_active  │
│ display_name, license     │         └───────────────────────────┘
└─────────────┬─────────────┘
              │1
              │*
┌─────────────┴─────────────┐1       *┌───────────────────────────┐
│         patients          ├─────────┤      intake_sessions      │
│ id (PK), display_id       │         │ id (PK), token, status    │
│ abha_id, abha_address     │         │ patient_id (FK), doc_id   │
│ name, age, gender, phone  │         │ review_status, workflow   │
└─────────────┬─────────────┘         └─────────────┬─────────────┘
              │1                                    │
              │*                                    │1:N
┌─────────────┴─────────────┐                       ├────────────────────────────┐
│         documents         │                       │                            │
│ id (PK), patient_id (FK)  │                       ▼                            ▼
│ intake_session_id (FK)    │         ┌───────────────────────────┐┌───────────────────────────┐
│ storage_object_id, sha256 │         │      question_events      ││          answers          │
│ file_size, mime, status   │         │ id (PK), sequence_number  ││ id (PK), raw_text         │
└─────────────┬─────────────┘         │ question_text, field      ││ normalized_text, mode     │
              │                       └─────────────┬─────────────┘└───────────────────────────┘
              ├────────────────────────────┐        │1:1
              │1:N                         │1:N     └────────────────────────────┘
              ▼                            ▼
┌───────────────────────────┐┌───────────────────────────┐
│    document_ocr_runs      ││   document_extractions    │
│ id (PK), provider_name    ││ id (PK), field_type       │
│ aggregate_conf, raw_text  ││ value_json, confidence    │
└─────────────┬─────────────┘│ status, extractor_version │
              │1:N           └───────────────────────────┘
              ▼
┌───────────────────────────┐
│   document_ocr_evidence   │
│ id (PK), ocr_run_id (FK)  │
│ block_index, text, conf   │
│ bounding_box_json, page   │
└─────────────┬─────────────┘
              │1:N
              ▼
┌───────────────────────────┐
│ document_candidate_links  │
│ candidate_id (FK)         │
│ evidence_id (FK)          │
└───────────────────────────┘
```

### 1. Patients Table (`patients`)
```python
class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, default=generate_uuid)
    display_id = Column(String, unique=True, nullable=True, index=True) # SV-YYYYMMDD-XXXX
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    display_name = Column(String, nullable=False)
    date_of_birth = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    abha_id = Column(String, unique=True, nullable=True, index=True)
    abha_address = Column(String, nullable=True, index=True)
    abha_status = Column(String, nullable=False, default="UNVERIFIED")
    verification_timestamp = Column(DateTime(timezone=True), nullable=True)
    consent_recorded = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

### 2. Intake Sessions Table (`intake_sessions`)
```python
class IntakeSession(Base):
    __tablename__ = "intake_sessions"
    id = Column(String, primary_key=True, default=generate_uuid)
    token = Column(String, unique=True, nullable=False, index=True) # A-XXXXXX
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False, index=True)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False, index=True)
    workflow_type = Column(String, default="GENERAL_CLINICAL") # GENERAL_CLINICAL, AYUSH
    interaction_mode = Column(String, default="VOICE")         # VOICE, TEXT
    language_code = Column(String, default="en")
    status = Column(String, default="ACTIVE", index=True)      # ACTIVE, SUBMITTED, CONFIRMED
    current_question_index = Column(Integer, default=0)
    question_count = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    submitted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    review_status = Column(String, default="PENDING_REVIEW", nullable=False, index=True)
    reviewed_by = Column(String, ForeignKey("doctors.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
```

### 3. Question Events & Answers Tables (`question_events`, `answers`)
```python
class QuestionEvent(Base):
    __tablename__ = "question_events"
    id = Column(String, primary_key=True, default=generate_uuid)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)
    question_text = Column(String, nullable=False)
    target_field = Column(String, nullable=False)
    decision_action = Column(String, default="ASK") # ASK, STOP, ESCALATE
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Answer(Base):
    __tablename__ = "answers"
    id = Column(String, primary_key=True, default=generate_uuid)
    question_event_id = Column(String, ForeignKey("question_events.id"), nullable=True)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=False, index=True)
    raw_text = Column(Text, nullable=False)
    normalized_text = Column(Text, nullable=True)
    input_mode = Column(String, default="VOICE")
    language_code = Column(String, default="en")
    audio_duration_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

### 4. Clinical State Snapshots Table (`clinical_states`)
```python
class ClinicalStateModel(Base):
    __tablename__ = "clinical_states"
    id = Column(String, primary_key=True, default=generate_uuid)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=False, index=True)
    version = Column(Integer, default=1)
    state_json = Column(JSON, nullable=False) # Serialized ClinicalState Pydantic object
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

### 5. Medical Documents & OCR Evidence Tables
```python
class DocumentModel(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), nullable=True, index=True)
    file_name = Column(String, nullable=False)
    storage_object_id = Column(String, nullable=False) # Local disk relative path
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)
    page_count = Column(Integer, nullable=False, default=1)
    document_type = Column(String, default="PRESCRIPTION") # PRESCRIPTION, LAB_REPORT
    status = Column(String, default="PENDING", index=True) # PENDING, NEEDS_REVIEW, COMPLETED
    failure_code = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime, nullable=True)

class DocumentOCRRunModel(Base):
    __tablename__ = "document_ocr_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    provider_name = Column(String, nullable=False)
    provider_version = Column(String, nullable=False)
    aggregate_confidence = Column(Float, nullable=False)
    pages_processed = Column(Integer, nullable=False)
    raw_text = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class DocumentOCREvidenceModel(Base):
    __tablename__ = "document_ocr_evidence"
    id = Column(String, primary_key=True, default=generate_uuid)
    ocr_run_id = Column(String, ForeignKey("document_ocr_runs.id"), nullable=False, index=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    block_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    page_number = Column(Integer, nullable=False, default=1)
    bounding_box_json = Column(JSON, nullable=True) # [ymin, xmin, ymax, xmax]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
```

### 6. Physician Reviews, Edits & Audit Events Tables
```python
class PhysicianReviewModel(Base):
    __tablename__ = "physician_reviews"
    id = Column(String, primary_key=True, default=generate_uuid)
    intake_session_id = Column(String, ForeignKey("intake_sessions.id"), unique=True, nullable=False, index=True)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False, index=True)
    status = Column(String, default="NOT_REVIEWED") # NOT_REVIEWED, IN_REVIEW, EDITED, CONFIRMED
    notes = Column(Text, nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class PhysicianEditModel(Base):
    __tablename__ = "physician_edits"
    id = Column(String, primary_key=True, default=generate_uuid)
    physician_review_id = Column(String, ForeignKey("physician_reviews.id"), nullable=False, index=True)
    field_name = Column(String, nullable=False)
    old_value_json = Column(JSON, nullable=True)
    new_value_json = Column(JSON, nullable=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditEventModel(Base):
    __tablename__ = "audit_events"
    id = Column(String, primary_key=True, default=generate_uuid)
    actor_user_id = Column(String, nullable=True)
    actor_role = Column(String, default="SYSTEM")
    event_type = Column(String, nullable=False, index=True) # INTAKE_SUBMITTED, CONFIRMED
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
```

---

## Active API Endpoints Reference

### Authentication Router (`/api/v1/auth`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | None | Authenticates doctor or admin credentials; issues signed JWT bearer token. |
| `GET` | `/api/v1/auth/me` | Bearer JWT | Returns current authenticated user profile and roles. |

### Patient Intake Router (`/api/v1/intakes`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/intakes` | None | Creates a new patient record and intake session; returns intake ID, token, and initial question. |
| `GET` | `/api/v1/intakes/{intake_id}` | None | Retrieves current intake session status, question events, and clinical summary. |
| `POST` | `/api/v1/intakes/{intake_id}/answers` | None | Submits text answer; processes clinical state; returns next question decision or stop signal. |
| `POST` | `/api/v1/intakes/{intake_id}/voice-answer` | None | Submits multipart voice audio; transcribes speech; processes state; returns next question. |
| `POST` | `/api/v1/intakes/{intake_id}/submit` | None | Submits completed intake for doctor review; triggers red flag check; broadcasts to live queue. |

### Doctor Workstation Router (`/api/v1/doctor`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/doctor/queue` | Bearer (Doctor) | Returns live waiting patient queue sorted by red-flag triage priority and wait time. |
| `GET` | `/api/v1/doctor/patients/reviewed` | Bearer (Doctor) | Returns list of confirmed/reviewed patients for historical reference. |
| `GET` | `/api/v1/doctor/patients/{intake_id}` | Bearer (Doctor) | Retrieves complete structured clinical dossier (symptoms, meds, docs, AYUSH, red flags). |
| `GET` | `/api/v1/doctor/patients/{intake_id}/conversation` | Bearer (Doctor) | Returns turn-by-turn conversational transcript with timestamps and input modalities. |
| `POST` | `/api/v1/doctor/patients/{intake_id}/confirm` | Bearer (Doctor) | Explicit physician confirmation; records edits and notes; generates FHIR R4 Bundle. |
| `WS` | `/api/v1/doctor/ws` | None | WebSocket stream broadcasting queue additions, priority triage alerts, and confirmations. |

### Document Intelligence Router (`/api/v1/documents`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/documents/upload` | None | Uploads medical PDF/image (up to 10MB); verifies SHA-256; dispatches background OCR. |
| `GET` | `/api/v1/documents/{document_id}/view` | None / Token | Streams raw binary document bytes for inline browser preview. |
| `GET` | `/api/v1/documents/{document_id}/download` | None / Token | Downloads document with Content-Disposition attachment header. |
| `GET` | `/api/v1/documents/{document_id}/status` | None | Returns document OCR and candidate entity processing status and failure codes. |
| `POST` | `/api/v1/documents/{document_id}/process` | None | Triggers synchronous on-demand OCR and entity extraction for a pending document. |

### FHIR & ABDM Interoperability Router (`/api/v1/fhir`, `/api/v1/abdm`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/fhir/export/{intake_id}` | None | Generates and returns official NRCES India Core FHIR R4 OPConsultRecord Document Bundle. |
| `POST` | `/api/v1/abdm/abha/verify` | None | Simulates ABDM M2/M3 ABHA identity verification; returns demographic profile. |
| `GET` | `/api/v1/abdm/bundle/{intake_id}` | None | Generates NRCES FHIR R4 Bundle alongside real-time compliance validation report. |
| `POST` | `/api/v1/abdm/validate` | None | Validates an arbitrary external FHIR R4 JSON Bundle against NRCES India Core profiles. |
| `POST` | `/api/v1/abdm/hip/push` | None | Simulates pushing verified consultation records to ABDM Health Information Provider (HIP). |

### Hospital Operations & Admin Router (`/api/v1/admin`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/stats` | Bearer (Admin) | Aggregate hospital stats: total intakes, priority flags, avg intake duration, wait times. |
| `GET` | `/api/v1/admin/ai-monitoring` | Bearer (Admin) | AI metrics: physician edit/override rates, latency percentiles, LLM token usage. |
| `GET` | `/api/v1/admin/emergency-cases`| Bearer (Admin) | Dedicated real-time monitoring feed for all active red-flag triage cases. |
| `GET` | `/api/v1/admin/audit` | Bearer (Admin) | Chronological audit event trail with actor, resource, and metadata. |
| `POST` | `/api/v1/admin/audit` | Bearer (Admin) | Records custom audit event into the tamper-evident audit log. |
| `GET` | `/api/v1/admin/hospitals` | Bearer (Admin) | Lists registered hospitals and organizational details. |
| `GET` | `/api/v1/admin/doctors` | Bearer (Admin) | Lists registered doctors, specializations, and working hours. |
| `POST` | `/api/v1/admin/doctors` | Bearer (Admin) | Onboards a new doctor into the hospital system. |
| `PUT` | `/api/v1/admin/doctors/{id}` | Bearer (Admin) | Updates existing doctor specialization or status. |
| `GET` | `/api/v1/admin/departments` | Bearer (Admin) | Lists clinical departments across hospital facilities. |
| `POST` | `/api/v1/admin/departments` | Bearer (Admin) | Registers a new clinical department. |
| `GET` | `/api/v1/admin/users` | Bearer (Admin) | Lists staff user accounts and role assignments. |
| `POST` | `/api/v1/admin/users` | Bearer (Admin) | Registers a new staff user with bcrypt password hashing. |
| `PUT` | `/api/v1/admin/users/{id}/role`| Bearer (Admin)| Modifies staff user RBAC role (DOCTOR, ADMIN, HOSPITAL_ADMIN). |
| `POST` | `/api/v1/admin/seed/scenario/{token}` | Bearer (Admin) | Injects pre-configured synthetic patient scenario for live demonstration. |
| `POST` | `/api/v1/admin/seed/reset` | Bearer (Admin) | Resets database to clean initial synthetic demo seed baseline. |
| `POST` | `/api/v1/admin/qa/run-tests` | Bearer (Admin) | Triggers execution of automated backend test suites; returns pass/fail metrics. |
| `GET` | `/api/v1/admin/services/status`| Bearer (Admin)| Returns live health status of database, AI providers, OCR, and storage. |

### Speech & RAG Routers (`/api/v1/speech`, `/api/v1/rag`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/v1/speech/tts` | None | Synthesizes text to speech audio via Sarvam/Bhashini/Mock provider. |
| `POST` | `/api/v1/speech/asr` | None | Transcribes voice audio bytes to normalized text via speech provider. |
| `GET` | `/api/v1/rag/status` | None | Returns vector database status, chunk counts, and active embedding provider. |
| `GET` | `/api/v1/rag/documents` | None | Lists indexed clinical knowledge documents and protocols. |
| `POST` | `/api/v1/rag/documents` | None | Ingests and embeds a new clinical protocol document into vector store. |
| `POST` | `/api/v1/rag/query` | None | Queries semantic knowledge chunks using cosine similarity for clinical grounding. |

---

# 4. Gaps, Edge Cases & Roadmap

## 1. Currently Hardcoded Data & Mock Fallbacks
1. **Kiosk Patient Profile Coupling**:
   - `src/services/patientApi.ts` defaults to a synthetic hardcoded profile (`Ananya Sharma`, age 34, phone 9876543210, ABHA `91-4521-8890-1234`) when `localStorage` is unpopulated. While `PatientDetails.tsx` allows manual modification, a production kiosk should initialize with clean, blank forms or enforce an explicit ABHA scan / guest sign-in.
2. **Hardcoded Hospital & Doctor Routing**:
   - In `PatientIntake.tsx` and `intakes.py`, newly generated sessions default to `hospital_id="hosp_district_01"` and `doctor_id="doc_001"`. The kiosk UI currently lacks a dynamic hospital department / OPD room selector.
3. **Simulated ABDM Gateway**:
   - `backend/app/api/v1/abdm.py: verify_abha_identity` generates simulated verified demographic responses. It does not communicate with the live National Health Authority (NHA) ABDM Sandbox gateway or dispatch live SMS OTP requests.
4. **Mocked Default AI Providers in Configuration**:
   - `backend/app/core/config.py` defaults `PROVIDER_LLM="mock"`, `PROVIDER_SPEECH="mock"`, and `PROVIDER_OCR="mock"` to guarantee offline demo stability. Live production deployment requires setting `PROVIDER_LLM=groq` or `gemini`, `PROVIDER_OCR=paddle`, and `PROVIDER_SPEECH=sarvam` in `backend/.env`.

## 2. Missing Edge Cases & Vulnerabilities
1. **Network Disconnection During Kiosk Voice Stream**:
   - If a kiosk loses internet connectivity while a patient is speaking, `PatientVoiceChat.tsx` catches the failure and falls back to browser Web Speech API, but the partial audio buffer is not cached in IndexedDB for automatic resubmission when connectivity restores.
2. **Multi-Patient Shared Kiosk Hygiene**:
   - Session keys (`swasthya_active_intake_id`, `sv_patient_profile`) reside in browser `localStorage`. If a patient walks away from the kiosk mid-intake without clicking "Cancel" or "Complete", their demographic data remains in browser storage until an inactivity timeout or new session overwrites it.
3. **RAG Vector Search Scalability**:
   - `rag_service.py` computes cosine similarity in-memory using Python list comprehensions over JSON-serialized float vectors stored in the SQLite/Postgres `knowledge_chunks` table. While fast for the currently indexed 15–20 AYUSH NAMSTP guideline chunks, scaling to thousands of medical protocols requires migrating to native PostgreSQL `pgvector` with HNSW indexing.
4. **Document Storage on Local Filesystem**:
   - Documents are stored on the local container disk (`DOCUMENT_STORAGE_DIR = "./private_uploads"`). In a multi-instance container deployment (e.g. Kubernetes / AWS ECS), documents uploaded to Instance A will not be accessible to Instance B without a mounted shared volume (NFS/EFS) or object storage (Supabase S3 bucket).

## 3. Latency Bottlenecks
1. **Cold-Start OCR Latency**:
   - Initializing `PaddleOCR` on CPU for multi-page documents (`100–200 DPI` rasterization via PyMuPDF) takes 1.8–3.2 seconds on standard CPU hardware. While running in a background task prevents blocking the intake submission HTTP request, the doctor may experience a brief delay before OCR candidates appear in the review tab.
2. **Frontend Doctor Queue Polling**:
   - `DoctorPortal.tsx` utilizes both WebSockets and a 5-second HTTP polling loop (`setInterval(fetchLiveQueue, 5000)`). While reliable for demo environments, 100 concurrent doctors polling simultaneously generates 1,200 HTTP requests/minute. Production should rely exclusively on WebSocket events with exponential backoff reconnection.

## 4. Production Hospital Roadmap

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PRODUCTION ROADMAP                                          │
├────────────────────────────────┬────────────────────────────────┬────────────────────────────────┤
│      Phase 1: Security & Cloud │      Phase 2: Live Gateways    │      Phase 3: Clinical UX      │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ 1. Supabase S3 Cloud Storage   │ 1. NHA ABDM Sandbox Gateway    │ 1. Kiosk Department Selector   │
│    - Migrate ./private_uploads │    - Live M2/M3 ABHA OTP Auth  │    - Dynamic OPD Queue routing │
│    - Pre-signed secure URLs    │    - Live HIP Health Data Push │ 2. Multi-Language Audio Packs  │
│ 2. PostgreSQL pgvector index   │ 2. CDAC SMS OTP Gateway        │    - Pre-cached offline voice  │
│    - Native HNSW vector search │    - Real-time mobile OTP      │ 3. Ambient Doctor Dictation    │
│ 3. Session Timeout Janitor     │ 3. Redis Task Queue (Celery)   │    - Real-time speech edit     │
│    - 60s kiosk inactivity wipe │    - Distributed async OCR jobs│ 4. Hospital EHR Bridge         │
│                                │                                │    - HL7 v2 / FHIR ADT feeds   │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
```

---

# 5. Audit Verification Summary

| Verification Category | Inspected Artefacts | Status | Evidence / Notes |
|---|---|---|---|
| **Automated Backend Tests** | 48 test files in `backend/tests/` | 🟢 **PASS** | 181 passing tests covering adaptive engine, sufficiency gate, modality equivalence, safety rules, document extraction, and ABDM FHIR export. |
| **Frontend Type Safety** | `tsc -p tsconfig.json --noEmit` | 🟢 **PASS** | Zero TypeScript compilation errors across all pages, components, and hooks. |
| **Relational Data Integrity**| 23 SQLAlchemy declarative models | 🟢 **PASS** | Foreign keys, cascading deletes, indexes, and UTC timezone-aware datetimes verified. |
| **Clinical Safety Gate** | `red_flags.py`, `contradictions.py`| 🟢 **PASS** | 100% deterministic rule enforcement; no probabilistic LLM triage diagnosis. |
| **Document Anti-Hallucination**| `document_extraction.py` | 🟢 **PASS** | Strict candidate-to-evidence validation gate rejects ungrounded entities. |
| **Interoperability** | `mapper.py`, `abdm_validator.py` | 🟢 **PASS** | NRCES India Core OPConsultRecord FHIR R4 Bundle generator fully validated. |
