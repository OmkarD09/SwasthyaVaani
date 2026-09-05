import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.v1 import documents as documents_api
from app.core.config import settings
from app.models.document import (
    DocumentCandidateEvidenceLinkModel,
    DocumentCandidateModel,
    DocumentCandidateSetModel,
    DocumentExtractionModel,
    DocumentModel,
    DocumentOCREvidenceModel,
    DocumentOCRRunModel,
)
from app.models.intake import ClinicalStateModel, IntakeSession
from app.models.user import Doctor, Hospital, Patient
from app.schemas.document import (
    DocumentCandidateExtractionResult,
    DocumentEvidenceReference,
    HistoricalCandidate,
    LabCandidate,
    MedicationCandidate,
)
from app.services.document_intelligence import (
    AbstractDocumentExtractor,
    replace_ocr_evidence,
)
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


class EmptyDocumentExtractor(AbstractDocumentExtractor):
    provider_name = "SyntheticEmptyExtractor"
    model_name = "synthetic-empty"

    async def extract_candidates(self, extraction_input):
        return DocumentCandidateExtractionResult()


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
    monkeypatch.setattr(settings, "DOCUMENT_AUTO_PROCESS", False)
    monkeypatch.setattr(
        documents_api,
        "get_configured_document_extractor",
        lambda: EmptyDocumentExtractor(),
    )


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
    client, db, patient, filename, monkeypatch
):
    from app.core.config import settings
    monkeypatch.setattr(settings, "PROVIDER_OCR", "mock")
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
    run = db.query(DocumentOCRRunModel).filter_by(document_id=uploaded["document_id"]).one()
    block = (
        db.query(DocumentOCREvidenceModel)
        .filter_by(document_id=uploaded["document_id"])
        .one()
    )
    assert run.provider_name == "MockOCRProvider"
    assert run.provider_version == "1.0"
    assert block.ocr_run_id == run.id
    assert block.document_id == uploaded["document_id"]
    assert block.block_index == 0
    assert block.text == result["raw_ocr_text"]
    expected_ocr_confidence = 0.42 if "low_confidence" in filename else 0.94
    assert block.confidence == pytest.approx(expected_ocr_confidence)
    assert block.page_number == 1
    assert block.bounding_box_json == [0.0, 0.0, 600.0, 800.0]
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


def _synthetic_pdf(*page_lines: list[str]) -> bytes:
    import pymupdf

    document = pymupdf.open()
    for lines in page_lines:
        page = document.new_page(width=600, height=800)
        for line_number, text in enumerate(lines):
            page.insert_text((50, 80 + line_number * 40), text, fontsize=20)
    content = document.tobytes()
    document.close()
    return content


def test_paddle_provider_renders_single_page_pdf_and_preserves_metadata():
    observed_images = []

    class FakeEngine:
        def ocr(self, image, cls):
            observed_images.append(image)
            return [[[[[10, 20], [210, 20], [210, 45], [10, 45]], ("Patient: Demo Patient", 0.91)], [[[10, 60], [230, 60], [230, 85], [10, 85]], ("Paracetamol 500 mg", 0.87)]]]

    provider = PaddleOCRProvider(engine_factory=FakeEngine)
    import asyncio

    result = asyncio.run(
        provider.process_document(
            _synthetic_pdf(["Patient: Demo Patient", "Paracetamol 500 mg"]),
            "prescription.pdf",
            "application/pdf",
        )
    )

    assert len(observed_images) == 1
    assert observed_images[0].size > 0
    assert result.pages_processed == 1
    assert [block["page"] for block in result.text_blocks] == [1, 1]
    assert result.raw_text == "Patient: Demo Patient\nParacetamol 500 mg"
    assert result.text_blocks[0]["bounding_box"] == [10.0, 20.0, 210.0, 20.0, 210.0, 45.0, 10.0, 45.0]
    assert result.text_blocks[0]["confidence"] == pytest.approx(0.91)
    assert result.provider_name == "PaddleOCR"


def test_paddle_provider_preserves_two_page_pdf_provenance():
    call_count = 0

    class FakeEngine:
        def ocr(self, image, cls):
            nonlocal call_count
            call_count += 1
            text = "Page one prescription" if call_count == 1 else "Page two notes"
            return [[[[[10, 20], [210, 20], [210, 45], [10, 45]], (text, 0.9)]]]

    provider = PaddleOCRProvider(engine_factory=FakeEngine)
    import asyncio

    result = asyncio.run(
        provider.process_document(
            _synthetic_pdf(["Page one prescription"], ["Page two notes"]),
            "two-page.pdf",
            "application/pdf",
        )
    )

    assert call_count == 2
    assert result.pages_processed == 2
    assert [(block["text"], block["page"]) for block in result.text_blocks] == [
        ("Page one prescription", 1),
        ("Page two notes", 2),
    ]


def test_paddle_provider_rejects_corrupt_pdf_before_engine_initialization():
    initialized = False

    def engine_factory():
        nonlocal initialized
        initialized = True

    provider = PaddleOCRProvider(engine_factory=engine_factory)
    import asyncio

    with pytest.raises(OCRUnsupportedDocumentError, match="could not render"):
        asyncio.run(
            provider.process_document(b"%PDF-1.4 corrupt", "report.pdf", "application/pdf")
        )
    assert initialized is False


def test_paddle_provider_enforces_pdf_page_limit(monkeypatch):
    monkeypatch.setattr(settings, "DOCUMENT_MAX_PAGE_COUNT", 1)
    provider = PaddleOCRProvider(engine_factory=lambda: object())
    import asyncio

    with pytest.raises(OCRUnsupportedDocumentError, match="page-count limit"):
        asyncio.run(
            provider.process_document(
                _synthetic_pdf(["Page one"], ["Page two"]),
                "two-page.pdf",
                "application/pdf",
            )
        )


def test_paddle_provider_rejects_encrypted_pdf_without_password_attempt():
    import asyncio
    import pymupdf

    document = pymupdf.open()
    document.new_page().insert_text((50, 80), "Protected prescription")
    content = document.tobytes(
        encryption=pymupdf.PDF_ENCRYPT_AES_256,
        owner_pw="owner-password",
        user_pw="user-password",
    )
    document.close()

    provider = PaddleOCRProvider(engine_factory=lambda: object())
    with pytest.raises(OCRUnsupportedDocumentError, match="Encrypted PDF"):
        asyncio.run(
            provider.process_document(content, "protected.pdf", "application/pdf")
        )


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


@pytest.mark.parametrize(
    "confidence",
    [float("nan"), float("inf"), float("-inf"), -0.01, 1.01],
)
def test_paddle_provider_rejects_invalid_modern_confidence(confidence):
    class FakeEngine:
        def predict(self, image):
            return [
                {
                    "res": {
                        "rec_texts": ["Paracetamol 500 mg"],
                        "rec_scores": [confidence],
                        "rec_polys": [[[10, 20], [210, 20], [210, 45], [10, 45]]],
                    }
                }
            ]

    provider = PaddleOCRProvider(
        engine_factory=FakeEngine, image_decoder=lambda *_: object()
    )
    import asyncio

    with pytest.raises(OCRNormalizationError, match="finite 0..1 range"):
        asyncio.run(provider.process_document(b"image", "report.jpg", "image/jpeg"))


def test_paddle_provider_rejects_non_numeric_confidence():
    result = [
        {
            "res": {
                "rec_texts": ["Paracetamol 500 mg"],
                "rec_scores": ["0.9"],
                "rec_polys": [[[10, 20], [210, 20], [210, 45], [10, 45]]],
            }
        }
    ]

    with pytest.raises(OCRNormalizationError, match="non-numeric"):
        PaddleOCRProvider._normalize_result(result)


def test_provider_factory_selects_mock_explicitly(monkeypatch):
    monkeypatch.setattr(settings, "PROVIDER_OCR", "mock")
    assert isinstance(ProviderRegistry().get_ocr(), MockOCRProvider)


def test_provider_factory_selects_paddle_without_mock_fallback(monkeypatch):
    monkeypatch.setattr(settings, "PROVIDER_OCR", "paddle")
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


class GroundedEndpointOCRProvider(AbstractOCRProvider):
    async def process_document(self, file_bytes: bytes, filename: str, mime_type: str):
        return OCRExtractionResult(
            document_type="PRESCRIPTION",
            extracted_fields={},
            confidence_score=0.91,
            pages_processed=1,
            provider_name="SyntheticEndpointOCR",
            provider_version="test",
            raw_text="Metformin 500 mg",
            text_blocks=[
                {
                    "text": "Metformin 500 mg",
                    "page": 1,
                    "bounding_box": [1.0, 2.0, 3.0, 4.0],
                    "confidence": 0.91,
                }
            ],
        )


class RecordingDocumentExtractor(AbstractDocumentExtractor):
    provider_name = "SyntheticEndpointExtractor"
    model_name = "synthetic-grounded"

    def __init__(self):
        self.extraction_input = None

    async def extract_candidates(self, extraction_input):
        self.extraction_input = extraction_input
        evidence_id = extraction_input.evidence_blocks[0].evidence_id
        return DocumentCandidateExtractionResult(
            medications=[
                MedicationCandidate(
                    name="Metformin",
                    strength_or_dose="500 mg",
                    frequency=None,
                    duration=None,
                    source_evidence=[DocumentEvidenceReference(evidence_id=evidence_id)],
                    extraction_confidence=0.88,
                )
            ]
        )


class LabEndpointOCRProvider(AbstractOCRProvider):
    async def process_document(self, file_bytes: bytes, filename: str, mime_type: str):
        return OCRExtractionResult(
            document_type="LAB_REPORT",
            extracted_fields={},
            confidence_score=0.89,
            pages_processed=1,
            provider_name="SyntheticEndpointOCR",
            provider_version="test",
            raw_text="Hemoglobin 12.4 g/dL",
            text_blocks=[
                {
                    "text": "Hemoglobin 12.4 g/dL",
                    "page": 1,
                    "bounding_box": [5.0, 6.0, 7.0, 8.0],
                    "confidence": 0.89,
                }
            ],
        )


class LabDocumentExtractor(AbstractDocumentExtractor):
    provider_name = "SyntheticEndpointExtractor"
    model_name = "synthetic-grounded"

    async def extract_candidates(self, extraction_input):
        evidence_id = extraction_input.evidence_blocks[0].evidence_id
        return DocumentCandidateExtractionResult(
            labs=[
                LabCandidate(
                    test_name="Hemoglobin",
                    value="12.4",
                    unit="g/dL",
                    reference_range=None,
                    date=None,
                    source_evidence=[
                        DocumentEvidenceReference(evidence_id=evidence_id)
                    ],
                    extraction_confidence=0.84,
                )
            ]
        )


class UnsupportedDocumentExtractor(AbstractDocumentExtractor):
    provider_name = "SyntheticEndpointExtractor"
    model_name = "synthetic-unsupported"

    async def extract_candidates(self, extraction_input):
        evidence_id = extraction_input.evidence_blocks[0].evidence_id
        return DocumentCandidateExtractionResult(
            medications=[
                MedicationCandidate(
                    name="Metformin",
                    strength_or_dose="1000 mg",
                    source_evidence=[
                        DocumentEvidenceReference(evidence_id=evidence_id)
                    ],
                    extraction_confidence=0.5,
                )
            ]
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
    assert db.query(DocumentOCRRunModel).count() == 1
    assert db.query(ClinicalStateModel).count() == 0


def test_process_endpoint_invokes_grounded_kunal_candidate_pipeline(
    client, db, patient, monkeypatch
):
    content = b"\xff\xd8\xffsynthetic-grounded-document\xff\xd9"
    uploaded = upload(client, patient, "grounded.jpg", content, "image/jpeg").json()
    extractor = RecordingDocumentExtractor()
    client.app.dependency_overrides[get_ocr_service] = GroundedEndpointOCRProvider
    monkeypatch.setattr(
        documents_api, "get_configured_document_extractor", lambda: extractor
    )
    try:
        response = client.post(f"/api/v1/documents/{uploaded['document_id']}/process")
    finally:
        client.app.dependency_overrides.pop(get_ocr_service, None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "NEEDS_REVIEW"
    assert extractor.extraction_input is not None
    assert len(extractor.extraction_input.evidence_blocks) == 1

    candidate_set = db.query(DocumentCandidateSetModel).one()
    candidate = db.query(DocumentCandidateModel).one()
    link = db.query(DocumentCandidateEvidenceLinkModel).one()
    evidence = db.query(DocumentOCREvidenceModel).one()
    assert candidate_set.provider_name == extractor.provider_name
    assert candidate_set.model_name == extractor.model_name
    assert candidate.status == "NEEDS_REVIEW"
    assert candidate.value_json == {
        "name": "Metformin",
        "strength_or_dose": "500 mg",
        "frequency": None,
        "duration": None,
    }
    assert link.candidate_id == candidate.id
    assert link.evidence_id == evidence.id
    assert len(payload["review_candidates"]) == 1
    review = payload["review_candidates"][0]
    assert review == {
        "candidate_id": candidate.id,
        "candidate_type": "MEDICATION",
        "value": {
            "name": "Metformin",
            "strength_or_dose": "500 mg",
            "frequency": None,
            "duration": None,
        },
        "status": "NEEDS_REVIEW",
        "extraction_confidence": 0.88,
        "document_id": uploaded["document_id"],
        "evidence": [
            {
                "evidence_id": evidence.id,
                "source_text": "Metformin 500 mg",
                "page": 1,
                "bounding_box": [1.0, 2.0, 3.0, 4.0],
                "ocr_confidence": 0.91,
                "provider_name": "SyntheticEndpointOCR",
                "provider_version": "test",
            }
        ],
    }
    assert payload["extracted_facts"][0]["proposed_value"] == review["value"]
    assert payload["extracted_facts"][0]["status"] == "NEEDS_REVIEW"
    status_response = client.get(
        f"/api/v1/documents/{uploaded['document_id']}/status"
    )
    assert status_response.status_code == 200
    status_payload = status_response.json()
    assert status_payload["review_candidate_count"] == 1
    assert status_payload["review_candidates"] == [review]
    assert db.query(ClinicalStateModel).count() == 0


def test_lab_review_candidate_is_returned_without_interpretation(
    client, db, patient, monkeypatch
):
    content = b"\xff\xd8\xffsynthetic-lab-document\xff\xd9"
    uploaded = upload(
        client, patient, "lab.jpg", content, "image/jpeg", "LAB_REPORT"
    ).json()
    client.app.dependency_overrides[get_ocr_service] = LabEndpointOCRProvider
    monkeypatch.setattr(
        documents_api,
        "get_configured_document_extractor",
        lambda: LabDocumentExtractor(),
    )
    try:
        response = client.post(f"/api/v1/documents/{uploaded['document_id']}/process")
    finally:
        client.app.dependency_overrides.pop(get_ocr_service, None)

    assert response.status_code == 200
    review = response.json()["review_candidates"][0]
    assert review["candidate_type"] == "LAB"
    assert review["value"] == {
        "test_name": "Hemoglobin",
        "value": "12.4",
        "unit": "g/dL",
        "reference_range": None,
        "date": None,
    }
    assert review["evidence"][0]["source_text"] == "Hemoglobin 12.4 g/dL"
    assert not any(
        interpretation in str(review).upper()
        for interpretation in ("NORMAL", "LOW", "HIGH", "ELEVATED")
    )
    assert db.query(ClinicalStateModel).count() == 0


def test_unsupported_candidate_returns_no_partial_review_response(
    client, db, patient, monkeypatch
):
    content = b"\xff\xd8\xffsynthetic-unsupported-document\xff\xd9"
    uploaded = upload(client, patient, "unsupported.jpg", content, "image/jpeg").json()
    client.app.dependency_overrides[get_ocr_service] = GroundedEndpointOCRProvider
    monkeypatch.setattr(
        documents_api,
        "get_configured_document_extractor",
        lambda: UnsupportedDocumentExtractor(),
    )
    try:
        response = client.post(f"/api/v1/documents/{uploaded['document_id']}/process")
    finally:
        client.app.dependency_overrides.pop(get_ocr_service, None)

    assert response.status_code == 502
    assert "review_candidates" not in response.json()
    assert db.query(DocumentCandidateModel).count() == 0
    assert db.query(DocumentCandidateEvidenceLinkModel).count() == 0
    assert db.query(DocumentOCREvidenceModel).count() == 1
    assert db.query(ClinicalStateModel).count() == 0


def test_replacing_ocr_evidence_does_not_accumulate_duplicate_blocks(db, patient):
    document = DocumentModel(
        patient_id=patient.id,
        file_name="synthetic.jpg",
        storage_object_id="prescription/2026/synthetic.jpg",
        mime_type="image/jpeg",
        file_size=10,
        sha256="a" * 64,
        page_count=1,
        document_type="PRESCRIPTION",
    )
    db.add(document)
    db.commit()
    first = OCRExtractionResult(
        document_type="UNCLASSIFIED",
        extracted_fields={},
        confidence_score=0.71,
        pages_processed=1,
        provider_name="PaddleOCR",
        provider_version="3.7.0",
        raw_text="first run",
        text_blocks=[
            {
                "text": "first run",
                "confidence": 0.71,
                "page": 1,
                "bounding_box": [1.0, 2.0, 3.0, 4.0],
            }
        ],
    )
    second = first.model_copy(
        update={
            "raw_text": "replacement run",
            "confidence_score": 0.83,
            "text_blocks": [
                {
                    "text": "replacement run",
                    "confidence": 0.83,
                    "page": 1,
                    "bounding_box": [5.0, 6.0, 7.0, 8.0],
                }
            ],
        }
    )

    first_run = replace_ocr_evidence(db, document, first)
    db.commit()
    first_run_id = first_run.id
    second_run = replace_ocr_evidence(db, document, second)
    db.commit()

    assert second_run.id != first_run_id
    assert db.query(DocumentOCRRunModel).filter_by(document_id=document.id).count() == 1
    blocks = db.query(DocumentOCREvidenceModel).filter_by(document_id=document.id).all()
    assert len(blocks) == 1
    assert blocks[0].text == "replacement run"
    assert blocks[0].confidence == pytest.approx(0.83)


def test_document_candidate_contract_is_nullable_and_always_needs_review():
    source = [DocumentEvidenceReference(evidence_id="evidence-1")]
    medication = MedicationCandidate(
        source_evidence=source, extraction_confidence=0.9
    )
    lab = LabCandidate(source_evidence=source, extraction_confidence=0.8)
    history = HistoricalCandidate(source_evidence=source, extraction_confidence=0.7)

    assert medication.name is None
    assert medication.strength_or_dose is None
    assert medication.frequency is None
    assert medication.duration is None
    assert lab.reference_range is None
    assert lab.value is None
    assert history.value is None
    assert {medication.status, lab.status, history.status} == {"NEEDS_REVIEW"}
    with pytest.raises(ValidationError):
        MedicationCandidate(
            source_evidence=source,
            extraction_confidence=0.99,
            status="CONFIRMED",
        )


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
    assert db.query(DocumentOCRRunModel).count() == 0
    assert db.query(DocumentOCREvidenceModel).count() == 0
