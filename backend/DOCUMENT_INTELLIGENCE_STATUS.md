# Document Intelligence checkpoint status

- Deterministic mock OCR is implemented and selected with `PROVIDER_OCR=mock`.
- `PROVIDER_OCR=paddle` never falls back to mock output. The adapter performs and
  normalizes real PaddleOCR inference for PNG and JPEG bytes when the optional
  pinned CPU PaddleOCR runtime is installed. PDF rendering remains pending and
  fails with a clear typed error.
- The validated runtime is PaddleOCR 3.7.0 with PaddlePaddle 3.3.1 on CPython
  3.12.10, Windows AMD64. No CUDA runtime is required or configured.
- Paddle recognition produces raw text proposals only; clinical interpretation is
  deliberately separate and no clinical facts are inferred by the real adapter.
- Local private file storage is implemented for development and tests.
- Supabase `medical-documents` private-bucket storage and authorized signed URLs are pending.
- Every OCR-derived proposal starts as `NEEDS_REVIEW`, regardless of confidence.
- OCR output does not update `ClinicalState`; no authorized review-to-clinical-fact
  transition is implemented in this module.

## Backend lint

Install development dependencies into the backend virtual environment, then run from
the repository root:

```powershell
backend\.venv\Scripts\python.exe -m ruff check backend/app backend/tests
```
