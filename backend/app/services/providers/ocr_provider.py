import io
import logging
from typing import Dict, Any, Optional, List
from app.services.providers.base import (
    AbstractOCRProvider, OCRExtractionResult, NormalizedOCRResult, OCRBlock
)
from app.services.document_intelligence.extractor import DocumentIntelligenceExtractor

logger = logging.getLogger(__name__)


class MockOCRProvider(AbstractOCRProvider):
    """Deterministic OCR provider returning structured medical entities with confidence & provenance."""

    async def process_document(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str
    ) -> OCRExtractionResult:
        if not file_bytes:
            raise ValueError("Document file payload is empty")

        doc_type = "PRESCRIPTION" if any(w in filename.lower() for w in ["presc", "rx", "medicine"]) else "LAB_REPORT"
        
        extracted_fields: Dict[str, Any] = {
            "facility_name": "District Hospital OPD 02",
            "date": "2026-05-12",
            "medications": [
                {"name": "Paracetamol 650mg", "dosage": "650mg", "frequency": "TDS (Thrice daily)", "duration": "5 days", "confidence": 0.94},
                {"name": "Amoxicillin 500mg", "dosage": "500mg", "frequency": "BD (Twice daily)", "duration": "7 days", "confidence": 0.88}
            ],
            "lab_observations": [
                {"test_name": "Hemoglobin", "value": "13.2 g/dL", "unit": "g/dL", "flag": "NORMAL", "reference_range": "12.0 - 16.5 g/dL", "confidence": 0.96},
                {"test_name": "ESR", "value": "24 mm/hr", "unit": "mm/hr", "flag": "ELEVATED", "reference_range": "0.0 - 20.0 mm/hr", "confidence": 0.91}
            ],
            "patient_name": "Rohan Sharma",
            "doctor_name": "Dr. Amit Patil"
        }

        blocks = [
            OCRBlock(text="District Hospital OPD 02", confidence=0.98, page_number=1),
            OCRBlock(text="Patient: Rohan Sharma  Date: 2026-05-12", confidence=0.95, page_number=1),
            OCRBlock(text="Rx: Paracetamol 650mg TDS for 5 days", confidence=0.94, page_number=1),
            OCRBlock(text="Amoxicillin 500mg BD for 7 days", confidence=0.88, page_number=1),
            OCRBlock(text="Dr. Amit Patil", confidence=0.96, page_number=1),
        ]

        normalized = NormalizedOCRResult(
            raw_text="District Hospital OPD 02\nPatient: Rohan Sharma  Date: 2026-05-12\nRx: Paracetamol 650mg TDS for 5 days\nAmoxicillin 500mg BD for 7 days\nDr. Amit Patil",
            blocks=blocks,
            average_confidence=0.94,
            pages_processed=1,
            provider_name="MockOCRProvider"
        )

        return OCRExtractionResult(
            document_type=doc_type,
            extracted_fields=extracted_fields,
            confidence_score=0.92,
            pages_processed=1,
            provider_name="MockOCRProvider",
            raw_text=normalized.raw_text,
            blocks=blocks,
            normalized_ocr=normalized,
            review_status="PROCESSED"
        )


class PaddleOCRProvider(AbstractOCRProvider):
    """
    PaddleOCR provider adapter for Document OCR & Evidence Extraction pipeline.
    Transforms raw PaddleOCR bounding box predictions into NormalizedOCRResult and structured OCRExtractionResult.
    Fails explicitly if PaddleOCR engine is unavailable when requested.
    """

    def __init__(self, use_gpu: bool = False, lang: str = "en"):
        self.use_gpu = use_gpu
        self.lang = lang
        self._ocr_engine = None
        self._initialized = False

    def _init_engine(self):
        if not self._initialized:
            try:
                from paddleocr import PaddleOCR
                self._ocr_engine = PaddleOCR(use_angle_cls=True, lang=self.lang, use_gpu=self.use_gpu)
                self._initialized = True
                logger.info(f"[PaddleOCRProvider] Initialized PaddleOCR engine (lang={self.lang}, use_gpu={self.use_gpu})")
            except ImportError as err:
                logger.error(f"[PaddleOCRProvider] PaddleOCR dependency not installed: {err}")
                raise RuntimeError(
                    "PaddleOCR engine is selected (PROVIDER_OCR=paddle) but 'paddleocr' is not installed. "
                    "Please install dependencies or set PROVIDER_OCR=mock."
                ) from err
            except Exception as err:
                logger.error(f"[PaddleOCRProvider] Failed to load PaddleOCR engine: {err}")
                raise RuntimeError(f"PaddleOCR initialization failed: {str(err)}") from err

    async def process_document(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str
    ) -> OCRExtractionResult:
        """
        Processes document bytes through PaddleOCR inference and normalizes into clinical entities.
        """
        if not file_bytes:
            raise ValueError("Document file payload is empty")

        self._init_engine()

        try:
            # 1. Convert file bytes to image array
            images = self._load_images_from_bytes(file_bytes, mime_type)
            if not images:
                raise ValueError(f"Could not decode image from file {filename} ({mime_type})")

            all_blocks: List[OCRBlock] = []
            raw_text_parts: List[str] = []

            for page_idx, img in enumerate(images, start=1):
                ocr_output = self._ocr_engine.ocr(img, cls=True)
                page_blocks = self._parse_paddle_output(ocr_output, page_number=page_idx)
                all_blocks.extend(page_blocks)
                for b in page_blocks:
                    raw_text_parts.append(b.text)

            full_raw_text = "\n".join(raw_text_parts)
            avg_conf = (
                sum(b.confidence for b in all_blocks) / len(all_blocks)
                if all_blocks else 0.0
            )

            normalized = NormalizedOCRResult(
                raw_text=full_raw_text,
                blocks=all_blocks,
                average_confidence=round(avg_conf, 2),
                pages_processed=len(images),
                provider_name="PaddleOCR",
                metadata={"filename": filename, "mime_type": mime_type}
            )

            # 2. Extract structured clinical facts via DocumentIntelligenceExtractor
            return DocumentIntelligenceExtractor.extract_from_normalized_ocr(
                normalized=normalized,
                filename=filename,
                mime_type=mime_type
            )

        except Exception as e:
            if isinstance(e, (ValueError, RuntimeError)):
                raise
            logger.error(f"[PaddleOCRProvider] OCR Inference error on {filename}: {e}", exc_info=True)
            raise RuntimeError(f"PaddleOCR document processing failed: {str(e)}") from e

    def _load_images_from_bytes(self, file_bytes: bytes, mime_type: str) -> List[Any]:
        """Loads PIL/numpy images from raw byte payload."""
        images = []
        try:
            from PIL import Image
            import numpy as np

            if "pdf" in mime_type.lower() or file_bytes.startswith(b"%PDF"):
                # Handle PDF pages
                try:
                    import fitz  # PyMuPDF
                    doc = fitz.open(stream=file_bytes, filetype="pdf")
                    for page in doc:
                        pix = page.get_pixmap()
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        images.append(np.array(img))
                except ImportError:
                    # Fallback to single page decode or PIL
                    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
                    images.append(np.array(img))
            else:
                img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
                images.append(np.array(img))
        except Exception as err:
            logger.warning(f"[PaddleOCRProvider] Image loading fallback: {err}")
            # If PIL fails on non-standard format, try bytes buffer directly
            images.append(file_bytes)
        return images

    @classmethod
    def _parse_paddle_output(cls, ocr_output: Any, page_number: int = 1) -> List[OCRBlock]:
        """
        Normalizes PaddleOCR return structure:
        [ [ [ [[x1, y1], [x2, y2], [x3, y3], [x4, y4]], (text, confidence) ], ... ] ]
        """
        blocks: List[OCRBlock] = []
        if not ocr_output:
            return blocks

        for page in ocr_output:
            if not page:
                continue
            for line in page:
                try:
                    box = line[0]  # Bounding box coords
                    text, conf = line[1]  # (text, conf)
                    blocks.append(
                        OCRBlock(
                            text=str(text).strip(),
                            confidence=float(conf),
                            bounding_box=box if isinstance(box, list) else None,
                            page_number=page_number
                        )
                    )
                except (IndexError, TypeError, ValueError) as err:
                    logger.debug(f"[PaddleOCRProvider] Skipping malformed OCR line {line}: {err}")
                    continue

        return blocks
