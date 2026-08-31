import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.models.document import DocumentExtractionModel, DocumentModel
from app.models.intake import ClinicalStateModel, IntakeSession
from app.models.user import Doctor, Hospital, Patient
from app.services.providers.base import AbstractOCRProvider, OCRExtractionResult
from app.services.providers.factory import ProviderRegistry, get_ocr_service
from app.services.providers.ocr_provider import (
    MockOCRProvider,
    OCRNormalizationError,
    OCRProviderConfigurationError,
    OCRUnsupportedDocumentError,
    PaddleOCRProvider,
)

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def patient(db):
    item = Patient(id="demo-patient-a", display_name="Demo Patient A")
    db.add(item)
    db.commit()
    return item


@pytest.fixture
def intake(db, patient):
    hospital = Hospital(id="demo-hospital", name="Demo Hospital", code="DEMO")
    doctor = Doctor(
        id="demo-doctor",
        hospital_id=hospital.id,
        display_name="Demo Doctor",
        specialization="Demo",
    )
    item = IntakeSession(
        id="demo-intake-a",
        token="DEMO-1",
        patient_id=patient.id,
        hospital_id=hospital.id,
        doctor_id=doctor.id,
    )
    db.add_all([hospital, doctor, item])
    db.commit()
    return item


@pytest.fixture(autouse=True)
def private_storage(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "DOCUMENT_STORAGE_DIR", str(tmp_path / "private"))
    monkeypatch.setattr(settings, "DOCUMENT_MAX_FILE_SIZE_BYTES", 10 * 1024 * 1024)
    monkeypatch.setattr(settings, "DOCUMENT_MAX_PAGE_COUNT", 20)


def upload(
    client: TestClient,
    patient: Patient,
    name: str,
    content: bytes,
    mime: str,
    doc_type="PRESCRIPTION",
    intake_session_id=None,
):
    data = {"patient_id": patient.id, "document_type": doc_type}
    if intake_session_id:
        data["intake_session_id"] = intake_session_id
    return client.post(
        "/api/v1/documents/upload",
        data=data,
        files={"file": (name, content, mime)},
    )


@pytest.mark.parametrize(
    ("name", "content", "mime"),
    [
        (
            "synthetic_prescription.pdf",
            (FIXTURES / "synthetic_prescription.pdf").read_bytes(),
            "application/pdf",
        ),
        (
            "synthetic.png",
            b"\x89PNG\r\n\x1a\n" + b"\x00" * 4 + b"IHDR" + b"synthetic",
            "image/png",
        ),
        ("synthetic.jpg", b"\xff\xd8\xffsynthetic-demo\xff\xd9", "image/jpeg"),
    ],
)
def test_allowed_file_content_is_accepted(client, db, patient, name, content, mime):
    response = upload(client, patient, name, content, mime)
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "PENDING"
    assert len(data["file_hash"]) == 64
    assert data["storage_path"].split("/")[-1].split(".")[0] != Path(name).stem
    stored = db.query(DocumentModel).filter_by(id=data["document_id"]).one()
    assert stored.sha256 == data["file_hash"]


def test_spoofed_extension_and_unsupported_content_are_rejected(client, patient):
    response = upload(
        client, patient, "looks-valid.pdf", b"not a pdf", "application/pdf"
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "UNSUPPORTED_FILE"


def test_mime_mismatch_is_rejected(client, patient):
    content = (FIXTURES / "synthetic_prescription.pdf").read_bytes()
    response = upload(client, patient, "synthetic.png", content, "image/png")
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "MIME_MISMATCH"


def test_oversized_file_is_rejected_without_large_fixture(client, patient, monkeypatch):
    monkeypatch.setattr(settings, "DOCUMENT_MAX_FILE_SIZE_BYTES", 16)
    response = upload(
        client, patient, "oversized.pdf", b"%PDF-1.4" + b"x" * 20, "application/pdf"
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "FILE_TOO_LARGE"


def test_page_limit_is_enforced(client, patient, monkeypatch):
    monkeypatch.setattr(settings, "DOCUMENT_MAX_PAGE_COUNT", 1)
    content = b"%PDF-1.4\n/Type /Page\n/Type /Page\n%%EOF"
    response = upload(client, patient, "two-pages.pdf", content, "application/pdf")
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOO_MANY_PAGES"


def test_unsafe_original_filename_cannot_escape_storage(client, patient, tmp_path):
    content = (FIXTURES / "synthetic_prescription.pdf").read_bytes()
    response = upload(client, patient, "../../escape.pdf", content, "application/pdf")
    assert response.status_code == 202
    data = response.json()
    assert ".." not in data["storage_path"]
    assert data["file_name"] == "escape.pdf"
    assert not (tmp_path / "escape.pdf").exists()


def test_duplicate_hash_within_intake_is_rejected(client, patient, intake):
    content = (FIXTURES / "synthetic_prescription.pdf").read_bytes()
    assert (
        upload(
            client,
            patient,
            "first.pdf",
            content,
            "application/pdf",
            intake_session_id=intake.id,
        ).status_code
        == 202
    )
    duplicate = upload(
        client,
        patient,
        "second.pdf",
        content,
        "application/pdf",
        intake_session_id=intake.id,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["code"] == "DUPLICATE_DOCUMENT"


@pytest.mark.parametrize(
    "filename", ["synthetic_prescription.pdf", "low_confidence_prescription.pdf"]
)
def test_all_extractions_require_review_and_retain_provenance(
    client, db, patient, filename
):
    content = (FIXTURES / "synthetic_prescription.pdf").read_bytes() + filename.encode()
    uploaded = upload(client, patient, filename, content, "application/pdf").json()
    response = client.post(f"/api/v1/documents/{uploaded['document_id']}/process")
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "NEEDS_REVIEW"
    assert result["extracted_facts"]
    assert all(fact["status"] == "NEEDS_REVIEW" for fact in result["extracted_facts"])
    fact = result["extracted_facts"][0]
    assert fact["original_source_text"]
    assert fact["document_id"] == uploaded["document_id"]
    assert fact["source_page"] == 1
    assert fact["bounding_box"]
    assert fact["engine_name"] == "MockOCRProvider"
    stored = (
        db.query(DocumentExtractionModel)
        .filter_by(document_id=uploaded["document_id"])
        .one()
    )
    assert stored.status == "NEEDS_REVIEW"
    assert db.query(ClinicalStateModel).count() == 0


def test_paddle_ocr_requires_real_backend(monkeypatch):
    monkeypatch.setitem(sys.modules, "paddleocr", None)
    provider = PaddleOCRProvider(image_decoder=lambda *_: object())

    with pytest.raises(OCRProviderConfigurationError, match="PaddleOCR"):
        import asyncio

        asyncio.run(
            provider.process_document(
                file_bytes=b"\xff\xd8\xffsynthetic-demo\xff\xd9",
                filename="prescription.jpg",
                mime_type="image/jpeg",
            )
        )


def test_paddle_provider_uses_real_bytes_and_normalizes_engine_confidence():
    supplied = b"\x89PNG\r\n\x1a\nactual-private-object-bytes"
    decoded_image = object()
    observed = {}

    def decode(file_bytes, mime_type):
        observed["bytes"] = file_bytes
        observed["mime_type"] = mime_type
        return decoded_image

    class FakeEngine:
        def ocr(self, image, cls):
            observed["image"] = image
            observed["cls"] = cls
            return [
                [
                    [
                        [[10, 20], [110, 20], [110, 45], [10, 45]],
                        ("Hemoglobin 13.2 g/dL", 0.73),
                    ]
                ]
            ]

    provider = PaddleOCRProvider(
        engine_factory=FakeEngine, image_decoder=decode
    )
    import asyncio

    result = asyncio.run(
        provider.process_document(supplied, "report.png", "image/png")
    )

    assert observed == {
        "bytes": supplied,
        "mime_type": "image/png",
        "image": decoded_image,
        "cls": True,
    }
    assert result.raw_text == "Hemoglobin 13.2 g/dL"
    assert result.confidence_score == pytest.approx(0.73)
    assert result.text_blocks[0]["confidence"] == pytest.approx(0.73)
    assert result.text_blocks[0]["bounding_box"] == [
        10.0,
        20.0,
        110.0,
        20.0,
        110.0,
        45.0,
        10.0,
        45.0,
    ]
    assert result.provider_name == "PaddleOCR"
    assert result.extracted_fields == {}


def test_paddle_provider_rejects_pdf_before_engine_initialization():
    initialized = False

    def engine_factory():
        nonlocal initialized
        initialized = True

    provider = PaddleOCRProvider(engine_factory=engine_factory)
    import asyncio

    with pytest.raises(OCRUnsupportedDocumentError, match="PDF rendering"):
        asyncio.run(
            provider.process_document(b"%PDF-1.4", "report.pdf", "application/pdf")
        )
    assert initialized is False


def test_paddle_provider_rejects_malformed_engine_output():
    class FakeEngine:
        def predict(self, image):
            return {"unexpected": "shape"}

    provider = PaddleOCRProvider(
        engine_factory=FakeEngine, image_decoder=lambda *_: object()
    )
    import asyncio

    with pytest.raises(OCRNormalizationError, match="unsupported result shape"):
        asyncio.run(provider.process_document(b"image", "report.jpg", "image/jpeg"))


def test_provider_factory_selects_mock_explicitly(monkeypatch):
    monkeypatch.setenv("PROVIDER_OCR", "mock")
    assert isinstance(ProviderRegistry().get_ocr(), MockOCRProvider)


def test_provider_factory_selects_paddle_without_mock_fallback(monkeypatch):
    monkeypatch.setenv("PROVIDER_OCR", "paddle")
    selected = ProviderRegistry().get_ocr()
    assert isinstance(selected, PaddleOCRProvider)
    assert not isinstance(selected, MockOCRProvider)


class FailingOCRProvider(AbstractOCRProvider):
    async def process_document(self, file_bytes: bytes, filename: str, mime_type: str):
        raise RuntimeError("synthetic provider failure")


class CapturingOCRProvider(AbstractOCRProvider):
    def __init__(self):
        self.file_bytes = None

    async def process_document(self, file_bytes: bytes, filename: str, mime_type: str):
        self.file_bytes = file_bytes
        return OCRExtractionResult(
            document_type="UNCLASSIFIED",
            extracted_fields={},
            confidence_score=0.61,
            pages_processed=1,
            provider_name="BoundaryTestOCR",
            provider_version="test",
            raw_text="recognized raw text",
            text_blocks=[],
        )


def test_processing_passes_exact_stored_bytes_to_provider(client, db, patient):
    content = b"\xff\xd8\xffexact-stored-image-bytes\xff\xd9"
    uploaded = upload(client, patient, "scan.jpg", content, "image/jpeg").json()
    provider = CapturingOCRProvider()
    client.app.dependency_overrides[get_ocr_service] = lambda: provider
    try:
        response = client.post(f"/api/v1/documents/{uploaded['document_id']}/process")
    finally:
        client.app.dependency_overrides.pop(get_ocr_service, None)
    assert response.status_code == 200
    assert response.json()["status"] == "NEEDS_REVIEW"
    assert provider.file_bytes == content
    assert db.query(DocumentExtractionModel).count() == 0
    assert db.query(ClinicalStateModel).count() == 0


def test_processing_failure_sets_safe_status(client, db, patient):
    content = (FIXTURES / "synthetic_lab_report.pdf").read_bytes()
    uploaded = upload(
        client,
        patient,
        "synthetic_lab_report.pdf",
        content,
        "application/pdf",
        "LAB_REPORT",
    ).json()
    client.app.dependency_overrides[get_ocr_service] = lambda: FailingOCRProvider()
    try:
        response = client.post(f"/api/v1/documents/{uploaded['document_id']}/process")
    finally:
        client.app.dependency_overrides.pop(get_ocr_service, None)
    assert response.status_code == 502
    stored = db.query(DocumentModel).filter_by(id=uploaded["document_id"]).one()
    assert stored.status == "PROCESSING_FAILED"
    assert db.query(DocumentExtractionModel).count() == 0
