import logging
import math
from importlib.metadata import PackageNotFoundError, version
from numbers import Real
from typing import Any

from app.core.config import settings
from app.services.providers.base import AbstractOCRProvider, OCRExtractionResult

logger = logging.getLogger(__name__)


class OCRProviderError(RuntimeError):
    """Base error for PaddleOCR adapter failures."""


class OCRProviderConfigurationError(OCRProviderError):
    """Raised when an explicitly selected OCR provider cannot be configured."""


class OCRUnsupportedDocumentError(OCRProviderError):
    """Raised when the adapter cannot safely decode a selected document type."""


class OCRInferenceError(OCRProviderError):
    """Raised when the OCR engine fails while recognizing a decoded image."""


class OCRNormalizationError(OCRProviderError):
    """Raised when engine output cannot be represented by the provider contract."""


class MockOCRProvider(AbstractOCRProvider):
    """Deterministic OCR provider returning structured medical entities with confidence & provenance."""

    async def process_document(
        self, file_bytes: bytes, filename: str, mime_type: str
    ) -> OCRExtractionResult:
        lowered = filename.lower()
        doc_type = "PRESCRIPTION" if "presc" in lowered else "LAB_REPORT"
        low_confidence = "low_confidence" in lowered
        confidence = 0.42 if low_confidence else 0.94
        if doc_type == "PRESCRIPTION":
            raw_text = "SYNTHETIC DEMO ONLY\nMedicine: Paracetamol 650 mg\nFrequency: TDS\nDuration: 5 days"
            extracted_fields: dict[str, Any] = {
                "medications": [
                    {
                        "medicine_name": "Paracetamol",
                        "strength": "650 mg",
                        "dosage": "1 tablet",
                        "frequency": "TDS",
                        "duration": "5 days",
                        "instructions": "Synthetic demo proposal",
                        "confidence": confidence,
                        "source_text": "Paracetamol 650 mg, 1 tablet TDS for 5 days",
                        "page": 1,
                        "bounding_box": [40.0, 120.0, 420.0, 170.0],
                    }
                ]
            }
        else:
            raw_text = "SYNTHETIC DEMO ONLY\nHemoglobin 13.2 g/dL (12.0-16.0)\nReport date: 2026-08-30"
            extracted_fields = {
                "lab_observations": [
                    {
                        "test_name": "Hemoglobin",
                        "observed_value": "13.2",
                        "unit": "g/dL",
                        "reference_range": "12.0-16.0",
                        "report_date": "2026-08-30",
                        "confidence": confidence,
                        "source_text": "Hemoglobin 13.2 g/dL (12.0-16.0)",
                        "page": 1,
                        "bounding_box": [40.0, 120.0, 440.0, 170.0],
                    }
                ]
            }

        return OCRExtractionResult(
            document_type=doc_type,
            extracted_fields=extracted_fields,
            confidence_score=0.92,
            pages_processed=1,
            provider_name="MockOCRProvider",
            provider_version="1.0",
            raw_text=raw_text,
            text_blocks=[
                {
                    "text": raw_text,
                    "page": 1,
                    "bounding_box": [0.0, 0.0, 600.0, 800.0],
                    "confidence": confidence,
                }
            ],
        )


class PaddleOCRProvider(AbstractOCRProvider):
    """Lazy PaddleOCR adapter for PNG, JPEG, and rendered PDF pages."""

    def __init__(self, use_gpu: bool = False, engine_factory=None, image_decoder=None):
        self.use_gpu = use_gpu
        self._engine_factory = engine_factory
        self._image_decoder = image_decoder
        self._ocr_engine = None

    def _init_engine(self):
        if self._ocr_engine is None:
            if self._engine_factory is None:
                try:
                    from paddleocr import PaddleOCR
                except (ImportError, ModuleNotFoundError) as exc:
                    logger.error("PaddleOCR selected but its dependency is unavailable")
                    raise OCRProviderConfigurationError(
                        "PROVIDER_OCR=paddle requires PaddleOCR and PaddlePaddle; "
                        "install the approved OCR runtime dependencies"
                    ) from exc

                device = "gpu" if self.use_gpu else "cpu"
                self._engine_factory = lambda: PaddleOCR(
                    lang="en",
                    device=device,
                    enable_mkldnn=False,
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                )
            try:
                self._ocr_engine = self._engine_factory()
            except OCRProviderError:
                raise
            except Exception as exc:
                raise OCRProviderConfigurationError(
                    "PaddleOCR could not be initialized with the configured runtime"
                ) from exc
        return self._ocr_engine

    def _decode_image(self, file_bytes: bytes, mime_type: str):
        if mime_type not in {"image/png", "image/jpeg"}:
            raise OCRUnsupportedDocumentError(
                f"PaddleOCR does not support document MIME type {mime_type!r}"
            )
        if self._image_decoder is not None:
            return self._image_decoder(file_bytes, mime_type)
        try:
            import cv2
            import numpy as np
        except (ImportError, ModuleNotFoundError) as exc:
            raise OCRProviderConfigurationError(
                "PaddleOCR image decoding requires numpy and opencv-python-headless"
            ) from exc
        image = cv2.imdecode(np.frombuffer(file_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise OCRUnsupportedDocumentError(
                "PaddleOCR could not decode the supplied PNG or JPEG bytes"
            )
        return image

    def _render_pdf_pages(self, file_bytes: bytes) -> list[Any]:
        try:
            import pymupdf
        except (ImportError, ModuleNotFoundError) as exc:
            raise OCRProviderConfigurationError(
                "PaddleOCR PDF rendering requires the pinned PyMuPDF dependency"
            ) from exc

        document = None
        try:
            document = pymupdf.open(stream=file_bytes, filetype="pdf")
            if document.needs_pass:
                raise OCRUnsupportedDocumentError(
                    "Encrypted PDF documents cannot be rendered without a password"
                )
            if document.page_count < 1:
                raise OCRUnsupportedDocumentError("PDF document contains no pages")
            if document.page_count > settings.DOCUMENT_MAX_PAGE_COUNT:
                raise OCRUnsupportedDocumentError(
                    "PDF document exceeds the configured page-count limit"
                )

            rendered_pages = []
            render_matrix = pymupdf.Matrix(2.0, 2.0)
            for page in document:
                pixmap = page.get_pixmap(
                    matrix=render_matrix,
                    colorspace=pymupdf.csRGB,
                    alpha=False,
                )
                rendered_pages.append(
                    self._decode_image(pixmap.tobytes("png"), "image/png")
                )
            return rendered_pages
        except OCRProviderError:
            raise
        except Exception as exc:
            raise OCRUnsupportedDocumentError(
                "PaddleOCR could not render the supplied PDF bytes"
            ) from exc
        finally:
            if document is not None:
                document.close()

    @staticmethod
    def _flatten_box(box: Any) -> list[float]:
        try:
            return [float(coordinate) for point in box for coordinate in point]
        except (TypeError, ValueError) as exc:
            raise OCRNormalizationError(
                "PaddleOCR returned an invalid text bounding box"
            ) from exc

    @staticmethod
    def _normalize_confidence(value: Any) -> float:
        if isinstance(value, bool) or not isinstance(value, Real):
            raise OCRNormalizationError(
                "PaddleOCR returned a non-numeric text confidence"
            )
        confidence = float(value)
        if not math.isfinite(confidence) or not 0.0 <= confidence <= 1.0:
            raise OCRNormalizationError(
                "PaddleOCR returned text confidence outside the finite 0..1 range"
            )
        return confidence

    @classmethod
    def _normalize_legacy(cls, result: Any) -> list[dict[str, Any]] | None:
        if not isinstance(result, list):
            return None
        if not result:
            return []
        pages = result if isinstance(result[0], list) else [result]
        blocks = []
        for page_number, lines in enumerate(pages, start=1):
            if lines is None:
                continue
            for line in lines:
                if not isinstance(line, (list, tuple)) or len(line) != 2:
                    return None
                box, recognition = line
                if not isinstance(recognition, (list, tuple)) or len(recognition) < 2:
                    return None
                text, confidence = recognition[0], recognition[1]
                blocks.append(
                    {
                        "text": str(text),
                        "page": page_number,
                        "bounding_box": cls._flatten_box(box),
                        "confidence": cls._normalize_confidence(confidence),
                    }
                )
        return blocks

    @classmethod
    def _normalize_modern(cls, result: Any) -> list[dict[str, Any]] | None:
        items = result if isinstance(result, list) else [result]
        blocks = []
        for page_number, item in enumerate(items, start=1):
            payload = getattr(item, "json", item)
            payload = payload() if callable(payload) else payload
            if isinstance(payload, dict) and "res" in payload:
                payload = payload["res"]
            if not isinstance(payload, dict) or "rec_texts" not in payload:
                return None
            texts = payload.get("rec_texts", [])
            scores = payload.get("rec_scores", [])
            boxes = payload.get("rec_polys", payload.get("dt_polys", []))
            if not (len(texts) == len(scores) == len(boxes)):
                raise OCRNormalizationError(
                    "PaddleOCR returned mismatched text, confidence, and box counts"
                )
            for text, confidence, box in zip(texts, scores, boxes, strict=True):
                blocks.append(
                    {
                        "text": str(text),
                        "page": page_number,
                        "bounding_box": cls._flatten_box(box),
                        "confidence": cls._normalize_confidence(confidence),
                    }
                )
        return blocks

    @classmethod
    def _normalize_result(cls, result: Any) -> list[dict[str, Any]]:
        blocks = cls._normalize_legacy(result)
        if blocks is None:
            blocks = cls._normalize_modern(result)
        if blocks is None:
            raise OCRNormalizationError("PaddleOCR returned an unsupported result shape")
        return blocks

    @staticmethod
    def _provider_version() -> str:
        try:
            return version("paddleocr")
        except PackageNotFoundError:
            return "unknown"

    async def process_document(
        self, file_bytes: bytes, filename: str, mime_type: str
    ) -> OCRExtractionResult:
        if mime_type == "application/pdf":
            images = self._render_pdf_pages(file_bytes)
        else:
            images = [self._decode_image(file_bytes, mime_type)]

        engine = self._init_engine()
        blocks = []
        for page_number, image in enumerate(images, start=1):
            try:
                if hasattr(engine, "predict"):
                    result = engine.predict(image)
                elif hasattr(engine, "ocr"):
                    result = engine.ocr(image, cls=True)
                else:
                    raise OCRProviderConfigurationError(
                        "Configured PaddleOCR engine exposes no supported inference method"
                    )
            except OCRProviderError:
                raise
            except Exception as exc:
                raise OCRInferenceError("PaddleOCR inference failed") from exc

            page_blocks = self._normalize_result(result)
            for block in page_blocks:
                block["page"] = page_number
            blocks.extend(page_blocks)

        nonempty_blocks = [block for block in blocks if block["text"].strip()]
        confidence = (
            sum(block["confidence"] for block in nonempty_blocks)
            / len(nonempty_blocks)
            if nonempty_blocks
            else 0.0
        )
        return OCRExtractionResult(
            document_type="UNCLASSIFIED",
            extracted_fields={},
            confidence_score=confidence,
            pages_processed=len(images),
            provider_name="PaddleOCR",
            provider_version=self._provider_version(),
            raw_text="\n".join(block["text"] for block in nonempty_blocks),
            text_blocks=nonempty_blocks,
        )
