from typing import Dict, Any
from app.services.providers.base import AbstractOCRProvider, OCRExtractionResult


class MockOCRProvider(AbstractOCRProvider):
    """Deterministic OCR provider returning structured medical entities with confidence & provenance."""

    async def process_document(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str
    ) -> OCRExtractionResult:
        doc_type = "PRESCRIPTION" if "presc" in filename.lower() else "LAB_REPORT"
        
        extracted_fields: Dict[str, Any] = {
            "facility_name": "District Hospital OPD 02",
            "date": "2026-05-12",
            "medications": [
                {"name": "Paracetamol 650mg", "dosage": "TDS", "duration": "5 days", "confidence": 0.94},
                {"name": "Amoxicillin 500mg", "dosage": "BD", "duration": "7 days", "confidence": 0.88}
            ],
            "lab_observations": [
                {"test_name": "Hemoglobin", "value": "13.2 g/dL", "flag": "NORMAL", "confidence": 0.96},
                {"test_name": "ESR", "value": "24 mm/hr", "flag": "ELEVATED", "confidence": 0.91}
            ],
            "needs_review_flags": []
        }

        return OCRExtractionResult(
            document_type=doc_type,
            extracted_fields=extracted_fields,
            confidence_score=0.92,
            pages_processed=1,
            provider_name="MockOCRProvider"
        )


class PaddleOCRProvider(AbstractOCRProvider):
    """PaddleOCR / Document AI adapter for Kunal's pipeline."""

    def __init__(self, use_gpu: bool = False):
        self.use_gpu = use_gpu
        self.fallback = MockOCRProvider()

    async def process_document(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str
    ) -> OCRExtractionResult:
        # PaddleOCR pipeline integration
        return await self.fallback.process_document(file_bytes, filename, mime_type)
