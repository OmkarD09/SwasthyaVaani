# SwasthyaVaani: End-to-End LLM Provider Clinical Performance Benchmark

## 1. Executive Summary & Benchmark Purpose

During hackathon review for **SIH Problem Statement 26047**, a key technical evaluation was requested:
> **"How do you evaluate and compare your primary LLM (Groq) against your fallback LLM (Gemini) and your deterministic fallback (Mock LLM) within the real SwasthyaVaani patient intake clinical conversation?"**

Rather than relying on generic synthetic LLM leaderboards (such as MMLU or HumanEval), this benchmarking system evaluates providers **directly within the SwasthyaVaani clinical intake state-machine and conversation engine**.

The exact same standardized patient scenarios, linguistic conditions, clinical state representations, and evaluation metrics are executed independently across:
1. **Groq (Primary Provider)**: `qwen/qwen3.8-27b` with Groq fallback architectures.
2. **Gemini (Fallback Provider)**: `gemini-3.5-flash-lite` via Google GenAI SDK.
3. **Deterministic Mock (Zero-Cost / Offline Fallback)**: Deterministic heuristic NLP & rule-based decision trees.

---

## 2. Executive Comparison Table

The following table presents actual measured performance across the standard benchmark test suite:

| Metric Category | Metric Dimension | Deterministic Mock | Groq (Primary) | Gemini (Fallback) |
|:---|:---|:---:|:---:|:---:|
| **Clinical Extraction** | Overall Extraction F1 | **45.3%** | **60.5%** | **63.9%** |
| | Chief Complaint & Duration Extraction | 75.0% | 87.5% | 87.5% |
| | Negation & Denial Resolution | 66.7% | 83.3% | 83.3% |
| **Question Quality** | Relevant Question Rate | **100.0%** | **100.0%** | **100.0%** |
| | Redundant Question Rate | **0.0%** | **0.0%** | **0.0%** |
| | Avg Questions per Completed Intake | 1.5 | 1.6 | 1.4 |
| **Conversation Flow** | Clinical Efficiency Yield | 0.83 facts/turn | 1.06 facts/turn | **1.17 facts/turn** |
| | Sufficiency Stopping Compliance | 100.0% | 100.0% | 100.0% |
| **Multilingual NLU** | English Dialogues (F1) | 39.9% | 66.3% | **72.2%** |
| | Pure Hindi Devanagari (F1) | **54.4%** | 50.8% | 50.0% |
| | Mixed Hindi-English / Hinglish (F1) | **80.0%** | 66.7% | 66.7% |
| **Clinical Safety** | Safety Gating Pass Rate | 88.0% | **100.0%** | 88.0% |
| | Cardiac Warning Trigger (`RF-CP-001`) | Triggered | **Triggered** | **Triggered** |
| | Severe Pain Trigger (`RF-SEV-001`) | Missed | **Triggered** | Missed |
| | Contradiction Detection Rate | **100.0%** | **100.0%** | **100.0%** |
| **AYUSH Domain** | AYUSH Extraction Accuracy (`agni`, `koshtha`, `ahara`) | 33.3% | 33.3% | **66.7%** |
| **Latency Breakdown** | Avg Total Turnaround Latency | **1 ms** | 4,908 ms | 4,617 ms |
| | Fact Extraction Latency | 0 ms | 4,224 ms | 3,823 ms |
| | Adaptive Question Generation Latency | **1 ms** | **684 ms** | 794 ms |
| **Reliability** | Reliability / Completion Rate | **100.0%** | **100.0%** | **100.0%** |
| | API Errors / HTTP Exceptions | 0 | 0 | 0 |
| **Composite Rating** | **Overall Composite Score (0 - 100)** | **67.2** | **68.8** | **67.7** |

---

## 3. Key Findings & Architecture Trade-Offs

### 1. Groq as Primary Provider
- **Generation Speed**: Groq demonstrates the fastest generative question formulation (**684 ms** vs Gemini's 794 ms), delivering high-empathy, concise (<20 words) questions in Hindi, Marathi, and English.
- **Safety Extraction Precision**: Groq scored **100% on safety gating**, successfully extracting both the anatomical radiation ('left arm') and pain intensity ('9/10') in Scenario E, causing the deterministic safety engine to fire both `RF-CP-001` and `RF-SEV-001`.
- **Primary Model Choice**: `qwen/qwen3.8-27b` on Groq delivers accurate Devanagari Hindi question formulation and concise conversational turns.

### 2. Gemini as Fallback Provider
- **Extraction Depth**: Gemini achieved the highest overall extraction F1 (**63.9%**), excelling in structured AYUSH constitutional attributes (**66.7%**) and English clinical dialogues (**72.2%**).
- **JSON Schema Strictness**: Gemini's `response_schema` enforcement guarantees valid JSON, preventing malformed payload errors.
- **Rate-Limit Profile**: On free-tier tiers, Gemini can encounter RPM limits during rapid bursts, which validates SwasthyaVaani's design of having Groq as primary and Mock as local fallback.

### 3. Deterministic Mock as Fail-Safe
- **Zero Cost & Sub-Millisecond Speed**: Runs in **1 ms** with zero cloud dependencies or API keys.
- **Reliable Baseline**: Provides robust heuristic extraction (45.3% F1) and deterministic multilingual question sequences, ensuring that rural clinics or low-connectivity environments are never blocked.

---

## 4. Architectural Distinction: Provider Interpretation vs. Deterministic System Safety

A core requirement of the benchmark is **clinical attribution separation**:

```
+-------------------------------------------------------------------------+
|                        PATIENT RAW INPUT                                |
|        "I've had severe chest pain since this morning, pain is 9/10"    |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                  LLM PROVIDER LAYER (Groq / Gemini)                     |
|  - Natural Language Understanding & Entity Extraction                   |
|  - Output: { chief_complaint: "chest pain", severity: 9, ... }         |
|  - Adaptive Question Formulation in Hindi/English                       |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|              DETERMINISTIC SAFETY ENGINE (System Layer)                 |
|  - evaluate_red_flags(state) -> Fires RF-CP-001, RF-SEV-001             |
|  - detect_contradictions(state) -> Flags medication stoppage conflicts  |
|  - _assess_information_sufficiency() -> Safe early stopping             |
+-------------------------------------------------------------------------+
```

### Safety Attribution Guarantee
- **We do NOT claim**: *"Groq detected the red flag."*
- **We accurately state**: *"Groq extracted the clinical entities (chest pain, severity 9, arm radiation), which allowed SwasthyaVaani's deterministic rule engine (`red_flags.py`) to trigger safety alerts RF-CP-001 and RF-SEV-001."*

---

## 5. Test Scenarios Evaluated

| Scenario Code | Title | Linguistic Modality | Clinical Goal |
|:---|:---|:---|:---|
| **Scenario A** | Simple Headache | English | Multi-turn SOCRATES exploration (onset, severity, location, light sensitivity) |
| **Scenario B** | Hindi Headache | Pure Hindi (Devanagari) | Indic language comprehension and Devanagari question generation |
| **Scenario C** | Mixed Language | Hinglish (Hindi-English) | Code-switched clinical extraction (headache + dizziness) |
| **Scenario D** | Fever Efficiency | Hindi-English | Non-redundancy check (verifies duration is not asked if already stated) |
| **Scenario E** | Chest Pain Red Flag | English | Emergency cardiac triage & deterministic safety rule gating (`RF-CP-001`) |
| **Scenario F** | Contradictions | English | Cross-turn contradiction detection (medication discontinuation vs document) |
| **Scenario G** | Existing Context | English | Pre-loaded medical history (Hypertension, Amlodipine) context preservation |
| **Scenario H** | AYUSH Assessment | English | Ayurvedic assessment of Agni (Manda), Koshtha (Krura), Ahara-Vihara |

---

## 6. How to Run the Benchmark

From the `backend/` directory:

```bash
# 1. Run all providers across all scenarios (1 run each)
venv\Scripts\python.exe benchmark.py --providers all --runs 1

# 2. Run multi-run statistical evaluation (e.g. 3 runs)
venv\Scripts\python.exe benchmark.py --providers groq,gemini,mock --runs 3

# 3. Run specific scenarios (e.g. Scenarios A, B, and E)
venv\Scripts\python.exe benchmark.py --providers groq,gemini --scenarios A,B,E

# 4. Custom output artifact paths
venv\Scripts\python.exe benchmark.py --output ../artifacts/benchmark_results.json --report ../artifacts/benchmark_report.md

# 5. Automated Pytest suite
venv\Scripts\python.exe -m pytest tests/test_benchmark.py
```

---

## 7. Storage & Artifact Locations

- **CLI Benchmark Runner**: [`backend/benchmark.py`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/benchmark.py)
- **Benchmarking Core Package**: [`backend/app/services/benchmarking/`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/benchmarking/)
  - `scenarios.py`: Scenario definitions A through H
  - `conversation_sim.py`: Isolated multi-turn simulation engine
  - `metrics.py`: Clinical metrics & composite scoring
  - `runner.py`: Provider orchestrator
  - `reporter.py`: Markdown & JSON generators
- **Automated Tests**: [`backend/tests/test_benchmark.py`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/tests/test_benchmark.py)
- **Machine-Readable JSON Results**: `artifacts/benchmark_results.json`
- **Full Markdown Report with Transcripts**: `artifacts/benchmark_report.md`

---

## 8. Environmental Limitations

1. **Network & Endpoint Variability**: Live provider latencies depend on local internet connectivity and geographical distance to `api.groq.com` and Google Cloud endpoints.
2. **Quota Throttling**: Live generative AI services enforce request rate limits, highlighting the importance of the built-in Mock provider fallback during connectivity lapses.
