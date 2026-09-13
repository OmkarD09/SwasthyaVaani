# SwasthyaVaani Backend Deep Dive

This document provides a comprehensive technical overview of the SwasthyaVaani backend architecture, request flows, and AI orchestration. It is designed to equip developers and presenters with the deep contextual knowledge required to explain and defend the system's design decisions during technical evaluations.

---

## 1. Architecture Overview

SwasthyaVaani employs a modern, decoupled architecture centered around a stateless FastAPI backend that orchestrates external AI services, handles clinical state management, and ensures type-safe persistence.

```text
[ Frontend (React/Vite) ]
          │
          ▼  (REST / WebSockets)
          │
[ FastAPI Backend (app.main) ] ────────────────────────┐
          │                                            │
          ├─► [ PostgreSQL DB ] (SQLAlchemy ORM)       │
          │                                            │
          ├─► [ AI Providers ] (Groq / Gemini)         │
          │                                            │
          ├─► [ Speech Services ] (Sarvam AI / BHASHINI)
          │                                            │
          └─► [ Document OCR ] (PaddleOCR / PyMuPDF)
```

**Component Summary:**
*   **Frontend**: Captures patient voice input, displays dynamic questions, and renders the physician review dashboard.
*   **FastAPI Backend**: Acts as the central orchestrator, managing session states, triggering AI inferences, and enforcing clinical safety rules.
*   **PostgreSQL DB**: Persists relational tracking data and versioned, structured JSON blobs for clinical states and FHIR bundles.
*   **AI Providers (Groq/Gemini)**: Extracts structured clinical facts from unstructured patient conversational text.
*   **Speech Services (Sarvam)**: Converts patient audio to Indic text (Saaras ASR) and generates audio for next questions (Bulbul TTS).
*   **Document OCR**: Extracts raw text and bounding boxes locally from uploaded lab reports and prescriptions.

---

## 2. End-to-End Walkthrough: The Patient Journey

Let's trace a real patient session (e.g., presenting with stomach pain) through the system:

### Step 1: Identify & Initialize (`/api/v1/intakes`)
*   **Action**: The frontend submits patient demographics (or an ABHA ID) to `POST /api/v1/intakes`.
*   **Code Flow**: `app.api.v1.intakes.create_intake_session` receives the request.
*   **Data Movement**: It queries `Patient` by ABHA ID. It creates an `IntakeSession` (SQL) and initializes a pristine `ClinicalStateModel` (JSON blob). If the workflow is `AYUSH`, it also initializes an `AyushAssessmentModel`.

### Step 2: Converse (`/api/v1/intakes/{id}/answers/voice`)
*   **Action**: The patient speaks into the microphone ("मुझे 3 दिनों से उल्टी हो रही है"). The frontend POSTs the raw audio bytes.
*   **Code Flow**: 
    1.  `submit_voice_answer` routes the bytes to `app.services.providers.speech_provider.SarvamSpeechProvider.transcribe_audio`.
    2.  The resulting text is passed to `app.services.providers.llm_provider.extract_clinical_facts`.
    3.  The LLM returns structured JSON (e.g., `{"associated_symptoms": ["vomiting"], "duration": "3 days"}`).
    4.  The `ClinicalState` is updated and a new `ClinicalStateModel` version is saved to the DB.
*   **Data Movement**: Audio -> Sarvam API -> Text -> Groq/Gemini API -> Structured JSON -> PostgreSQL.

### Step 3: Adapt & Next Question
*   **Action**: The system must decide what to ask next.
*   **Code Flow**: `app.services.clinical_ai.adaptive_engine.evaluate_next_question` analyzes the updated `ClinicalState`. It checks `_assess_information_sufficiency()` to see if the GI domain criteria are met (e.g., if vomiting is present, hydration status *must* be known). If not sufficient, it scores candidate questions via `question_scorer.py`.
*   **Data Movement**: The selected question text is translated and converted to speech via Sarvam TTS, returning an audio URL and text to the frontend.

### Step 4: Scan Documents (`/api/v1/documents`)
*   **Action**: The patient uploads a past lab report.
*   **Code Flow**: `app.api.v1.documents.upload_document` validates the file size/MIME type. `app.services.document_intelligence.py` orchestrates `PaddleOCRProvider`.
*   **Data Movement**: PyMuPDF renders the PDF to an image -> PaddleOCR extracts bounding boxes and text blocks -> Extracted facts are stored as `DocumentCandidateModel` entities pending doctor review.

### Step 5: Summarize & Route (`/api/v1/doctor/queue`)
*   **Action**: The intake is finalized (`submit_now=True`).
*   **Code Flow**: The session status becomes `SUBMITTED`. The physician views the queue via `app.api.v1.doctor.get_queue`.

### Step 6: Consult & Export (`/api/v1/abdm/bundle/{id}`)
*   **Action**: The physician confirms the history. The system exports an ABDM-compliant FHIR bundle.
*   **Code Flow**: `app.services.fhir.mapper.map_clinical_state_to_fhir_r4` translates the `ClinicalState` Pydantic model into an official NRCES FHIR R4 Bundle. It can then be pushed to the HIP gateway via `app.api.v1.abdm.push_record_to_abdm_gateway`.

---

## 3. Module-by-Module Breakdown (`backend/app/`)

### `app/api/`
*   **Purpose**: FastAPI routing and HTTP transport layer.
*   **Key Files**: 
    *   `v1/intakes.py`: Handles session creation, voice/text answer submission, and websocket events.
    *   `v1/abdm.py`: Mocked endpoints for ABDM HIP gateway interactions and FHIR validation.
    *   `v1/documents.py`: File upload, validation, and OCR triggering.

### `app/core/`
*   **Purpose**: Application bootstrapping and global configurations.
*   **Key Files**: 
    *   `config.py`: Loads `.env` variables (API keys, database URIs).
    *   `database.py`: SQLAlchemy engine, session maker, and Base class definition.

### `app/models/`
*   **Purpose**: SQLAlchemy ORM definitions mapping to PostgreSQL tables.
*   **Key Files**: 
    *   `intake.py`: Defines `IntakeSession`, `QuestionEvent`, `Answer`, and `ClinicalStateModel`.
    *   `user.py`: Defines `Patient` and `Doctor`.
    *   `ayush.py`: Defines `AyushAssessmentModel` for specific traditional medicine tracking.

### `app/schemas/`
*   **Purpose**: Pydantic models for strict data validation, serialization, and type-hinting.
*   **Key Files**: 
    *   `clinical_state.py`: The single source of truth for the patient's medical state (e.g., `ClinicalState`, `CanonicalDimensionState`).
    *   `intake.py`: Request/Response shapes for the API (e.g., `IntakeCreateRequest`).

### `app/services/`
*   **Purpose**: Core business logic and external integrations. Calls external providers, updates schemas, and saves to models.
*   **Key Submodules**:
    *   `clinical_ai/adaptive_engine.py`: Contains the state machine logic (`evaluate_next_question`) that decides when to stop asking questions.
    *   `clinical_ai/question_scorer.py`: Ranks the clinical utility of asking specific questions based on current knowledge gaps.
    *   `providers/llm_provider.py`: The adapter connecting to Groq/Gemini to run structured entity extraction.
    *   `providers/speech_provider.py`: The adapter connecting to Sarvam AI (Saaras/Bulbul) for ASR and TTS.
    *   `providers/ocr_provider.py`: The adapter running local PaddleOCR for document parsing.

---

## 4. AI Orchestration Logic

The AI architecture is intentionally **deterministic and restrictive** to ensure clinical safety. We do not use LLMs as autonomous conversational agents.

*   **Extraction over Generation**: 
    When a patient speaks, the text is sent to Groq (`qwen/qwen3.8-27b`) or Gemini (`gemini-3.5-flash-lite`) via `llm_provider.py`. The system prompt strictly enforces a Pydantic schema (`ClinicalExtractionSchema`).
    *   **Format**: Structured JSON.
    *   **Why**: We extract specific variables (`duration`, `severity`, `location`, `negated_symptoms`, `ayush.agni`). This prevents the LLM from hallucinating a diagnosis or offering unprompted medical advice. 
*   **Deterministic Questioning**:
    Instead of asking the LLM "what should we ask next?", the `adaptive_engine.py` evaluates the `ClinicalState`. If the system detects "vomiting" in the JSON, hardcoded clinical rules demand that `hydration_status` must be asked. The actual question string is pulled from a localized dictionary in `MockLLMProvider` or generated via a highly constrained prompt.
*   **Speech (Sarvam)**: 
    Audio bytes are sent to `https://api.sarvam.ai/speech-to-text` (Saaras:v3 model) specifying the language code (e.g., `hi-IN`). Responses are normalized before being fed to the LLM.

---

## 5. Database Schema & State Management

The database utilizes a hybrid approach: relational constraints for entities, and JSONB (NoSQL-style) for rapidly evolving clinical data.

*   **`patients`**: Demographics and ABHA linkage (`abha_id`, `abha_status`).
*   **`intake_sessions`**: The core tracking table linking a patient, hospital, and doctor. Tracks the workflow state (`ACTIVE`, `SUBMITTED`).
*   **`clinical_states`**: 
    *   **Relationships**: Belongs to `IntakeSession`.
    *   **Key Field**: `state_json` (JSON type). This stores the serialized output of the Pydantic `ClinicalState`. Every turn creates a *new version* (row) of this model, acting as an event-sourced ledger of the patient's evolving condition.
*   **`ayush_assessments`**: Stores AYUSH-specific data (`assessment_json` containing Prakriti, Vikriti, Agni, Koshtha) separate from modern clinical state.
*   **`question_events` / `answers`**: Relational tables logging the exact timestamp, sequence number, and raw text of every interaction for auditability.

---

## 6. External Integrations

*   **Sarvam AI (ASR/TTS)**: 
    *   **Real vs Mocked**: Fully real HTTP integration via `httpx.AsyncClient`.
    *   **Auth**: `api-subscription-key` in headers.
    *   **Shape**: POST multipart/form-data for audio bytes, receives JSON with `"transcript"`.
*   **Document OCR (PaddleOCR/PyMuPDF)**: 
    *   **Real vs Mocked**: Real, but runs entirely locally.
    *   **Execution**: PyMuPDF renders PDF pages to PNG byte streams in-memory; PaddleOCR processes the numpy arrays to extract bounding boxes. No external network requests are made, ensuring data privacy.
*   **ABDM / FHIR**:
    *   **Real vs Mocked**: Gateway endpoints (`/abha/verify`, `/hip/push`) are heavily mocked because the actual NHA Sandbox requires whitelisted static IPs and government-issued certificates.
    *   **FHIR Generation**: The generation of the FHIR R4 Bundle (`app.services.fhir.mapper`) is **100% real and compliant**. The system maps the Pydantic `ClinicalState` into a massive nested JSON structure adhering to the NRCES NDHM specifications.

---

## 7. Known Limitations & Design Trade-offs

1.  **No Autonomous Diagnosis**: This is a strict design trade-off. The system will *never* attempt to diagnose a condition or suggest medications. It is strictly an "Intake & Triage" system. The physician remains the final decision-maker.
2.  **ABDM Mocking**: As mentioned, live ABDM sandbox integration is mocked due to hackathon infrastructural limitations (IP whitelisting, HSM certificates). The payload structures, however, are architecturally accurate.
3.  **Local OCR Constraints**: PaddleOCR runs locally on the CPU (by default) to avoid cloud processing costs and privacy concerns. This means document scanning may take several seconds for multi-page PDFs compared to a cloud API like AWS Textract.
4.  **Sequential State Processing**: Voice interactions are processed synchronously (Audio -> Text -> LLM JSON -> DB). While fine for singular sessions, extremely high concurrency would require moving the LLM extraction step to a background Celery/Redis worker queue.
