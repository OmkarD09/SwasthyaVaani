# SwasthyaVaani — Team Integration Contracts & Developer Guide

This document defines the authoritative API endpoints, Pydantic contracts, database schemas, and integration boundaries for each member of the SwasthyaVaani SIH team.

---

## 🏛️ System Architecture Overview

```text
                                       ┌──────────────────────────────────┐
                                       │       SWASTHYAVAANI BACKEND      │
                                       │      (FastAPI + PostgreSQL)      │
                                       └─────────────────┬────────────────┘
                                                         │
         ┌──────────────────────────────┬────────────────┼──────────────────────────────┬──────────────────────────────┐
         │                              │                │                              │                              │
         ▼                              ▼                ▼                              ▼                              ▼
┌──────────────────┐           ┌──────────────────┐ ┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│   ISHWARI (AI)   │           │   ISHITA (VOICE) │ │JASKEERAT (DOCTOR)│           │   KUNAL (DOCS)   │           │    ROHAN (QA)    │
│  Clinical Engine │           │  Patient Kiosk   │ │ Clinician Portal │           │ PaddleOCR / AI   │           │ Admin & Testing  │
└──────────────────┘           └──────────────────┘ └──────────────────┘           └──────────────────┘           └──────────────────┘
```

---

## 1. Ishwari — Clinical AI & Adaptive Logic Lead

### Responsibilities
- Adaptive interview logic (`ClinicalState`, information gaps, question selection).
- Semantic duplicate question detection.
- AYUSH Dosha, Agni, and Koshtha clinical heuristics.
- Clinical safety guardrails (max 15 questions, max 2 low-progress stops).

### Files to Work In
- [`backend/app/services/clinical_ai/gap_analysis.py`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/clinical_ai/gap_analysis.py): Gap identification engine.
- [`backend/app/services/clinical_ai/adaptive_engine.py`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/clinical_ai/adaptive_engine.py): Next question decision logic.
- [`backend/app/services/providers/llm_provider.py`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/providers/llm_provider.py): `GeminiLLMProvider` prompt templates.

### Core Schemas (`app/schemas/clinical_state.py`)
```python
class ClinicalState(BaseModel):
    chief_complaint: Optional[str] = None
    onset: Optional[str] = None
    duration: Optional[str] = None
    severity: Optional[int] = None # 1-10
    location: Optional[str] = None
    radiation: Optional[str] = None
    associated_symptoms: List[str] = []
    medications: List[Medication] = []
    ayush: Optional[AyushState] = None

class QuestionDecision(BaseModel):
    action: Literal["ASK", "STOP", "RED_FLAG_ESCALATE"]
    target_field: Optional[str] = None
    question: Optional[str] = None
    confidence_score: float = 1.0
    rationale: str
```

### Safety Rules
- **NEVER** output autonomous diagnoses or prescriptions.
- Always use the deterministic question bank as a fallback if the LLM provider fails or times out.

---

## 2. Ishita — Patient Experience & Voice Interaction Lead

### Responsibilities
- Patient Kiosk 4-step wizard UI (`src/App.tsx`).
- Voice recording, audio visualizer, and microphone states.
- Multilingual UI (Hindi, English, Bengali, Marathi, Telugu, Tamil).
- One-question-at-a-time conversational UX.

### Key API Endpoints to Call
| Action | Method | Endpoint | Request Body |
| :--- | :--- | :--- | :--- |
| **Start Intake** | `POST` | `/api/v1/intakes` | `{"patient_name": "...", "workflow_type": "GENERAL_CLINICAL", "language_code": "hi"}` |
| **Submit Answer** | `POST` | `/api/v1/intakes/{id}/answers` | `{"raw_text": "...", "input_mode": "VOICE", "language_code": "hi"}` |
| **Finish Intake** | `POST` | `/api/v1/intakes/{id}/submit` | `{}` |

### Live Response from Answer Endpoint
```json
{
  "intake_session_id": "c1f7a0...",
  "decision": {
    "action": "ASK",
    "target_field": "duration",
    "question": "यह समस्या कितने समय से हो रही है?"
  },
  "extracted_facts": {
    "chief_complaint": "छाती में दर्द",
    "severity": 7
  }
}
```

---

## 3. Jaskeerat — Doctor Workstation Lead

### Responsibilities
- Clinician Dashboard (`src/pages/ClinicianDashboard.tsx`).
- Live triage queue with red-flag priority banners.
- Dynamic SOCRATES cards & Ayurveda Prakriti/Agni distribution gauges.
- Doctor edit & confirmation workflow with instant FHIR sync.

### Key API & WebSocket Endpoints
| Action | Protocol / Method | Endpoint | Purpose |
| :--- | :--- | :--- | :--- |
| **Live Queue Stream** | `WebSocket` | `ws://localhost:8000/api/v1/doctor/ws` | Push notifications on patient check-in (`QUEUE_UPDATED`) |
| **Fetch Queue List** | `GET` | `/api/v1/doctor/queue` | Returns prioritized queue list with red-flag tags |
| **Patient Record** | `GET` | `/api/v1/doctor/patients/{id}` | Detailed clinical state, timeline, and documents |
| **Confirm & Sync** | `POST` | `/api/v1/doctor/patients/{id}/confirm` | Confirms summary and generates FHIR R4 Bundle |

### WebSocket Event Format
```json
{
  "event": "QUEUE_UPDATED",
  "action": "PATIENT_SUBMITTED",
  "token": "A-028",
  "message": "New patient #A-028 submitted to triage queue."
}
```

---

## 4. Kunal — Document OCR & Evidence Extraction Lead

### Responsibilities
- File upload pipeline (PDF, JPG, PNG).
- PaddleOCR / Document AI extractor for prescriptions and lab reports.
- Confidence scoring and `NEEDS_REVIEW` flags on ambiguous handwriting.
- Storing files in Supabase Storage (`medical-documents` bucket).

### Files to Work In
- [`backend/app/services/providers/ocr_provider.py`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/providers/ocr_provider.py): Concrete PaddleOCR implementation.
- [`backend/app/api/v1/documents.py`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/api/v1/documents.py): Document upload handler.

### Upload Endpoint Contract
- **Endpoint:** `POST /api/v1/documents/upload` (`multipart/form-data`)
- **Parameters:**
  - `file`: `UploadFile` (binary)
  - `patient_id`: string
  - `intake_session_id`: string
  - `document_type`: `"PRESCRIPTION"` | `"LAB_REPORT"` | `"DISCHARGE_SUMMARY"`
- **Response:**
```json
{
  "document_id": "doc-8812...",
  "storage_path": "prescriptions/2026/doc-8812.pdf",
  "status": "PROCESSED",
  "extractions": [
    {
      "field_name": "Paracetamol 650mg",
      "field_type": "MEDICATION",
      "value_json": {"dose": "650mg", "frequency": "TDS"},
      "confidence": 0.94,
      "needs_review": false
    }
  ]
}
```

---

## 5. Rohan — Integration, Admin & QA Lead

### Responsibilities
- System health & performance metrics.
- Hospital and doctor onboarding management.
- Live security audit logs (`/api/v1/admin/audit`).
- Regression testing and demo test scenarios.

### Useful Commands for QA
```powershell
# 1. Run full backend automated test suite (24 tests)
$env:PYTHONPATH="backend"; .\backend\venv\Scripts\pytest backend/tests -v

# 2. Run frontend build verification
npm run build

# 3. Apply database migrations to Supabase
$env:PYTHONPATH="backend"; .\backend\venv\Scripts\alembic upgrade head
```

### Seed Scenarios for SIH Demos
1. **`Token #A-027` (Sunita Verma, 45F):** Cardiac Red-Flag demonstration (Chest tightness + arm radiation → Priority Triage).
2. **`Token #A-021` (Ramesh Patel, 58M):** AYUSH Stream (Chronic knee pain + Vata-Kapha Prakriti + Agni Manda).
3. **`Token #SV-2048` (Meena Kumari, 34F):** General OPD consultation (Acute bronchitis + old prescription attachment).

---

## 6. Omkar — Backend Architecture & System Integrator Lead

### Responsibilities
- Core FastAPI orchestration, security, and CORS.
- Live Supabase PostgreSQL database models & Alembic migrations.
- ABDM & NRCES India FHIR R4 Bundle compliance.
- Dependency injection provider registry (`get_llm_service()`, `get_speech_service()`, `get_ocr_service()`).
