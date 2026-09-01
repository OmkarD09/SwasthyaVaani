import pytest

from app.core.config import settings
from app.services.providers.factory import (
    ProviderConfigurationError,
    ProviderRegistry,
    get_llm_service,
    get_ocr_service,
    get_speech_service,
    provider_registry,
)
from app.services.providers.llm_provider import (
    GeminiLLMProvider,
    GroqLLMProvider,
    MockLLMProvider,
)


@pytest.mark.asyncio
async def test_llm_provider_extraction():
    mock_llm = MockLLMProvider()
    res = await mock_llm.extract_clinical_facts(
        raw_text="I have had severe headache and fever for 4 days, pain is 7 out of 10",
        current_state={}
    )
    assert res.provider_name == "MockLLMProvider"
    assert res.confidence >= 0.9
    assert "headache" in res.extracted_facts.get("chief_complaint", "")
    assert res.extracted_facts.get("severity") == 7


@pytest.mark.asyncio
async def test_speech_provider_transcription():
    speech = get_speech_service()
    res = await speech.transcribe_audio(b"fake_audio_bytes", language_code="hi")
    assert res.detected_language == "hi"
    assert len(res.transcript_text) > 0


@pytest.mark.asyncio
async def test_ocr_provider_processing():
    ocr = get_ocr_service()
    res = await ocr.process_document(
        file_bytes=b"%PDF-1.4...",
        filename="prescription_may2026.pdf",
        mime_type="application/pdf"
    )
    assert res.document_type == "PRESCRIPTION"
    assert res.confidence_score >= 0.8
    assert "medications" in res.extracted_fields
    assert len(res.extracted_fields["medications"]) >= 1


@pytest.mark.asyncio
async def test_provider_factory_override():
    custom_mock = MockLLMProvider()
    provider_registry.override_llm(custom_mock)
    active = get_llm_service()
    assert active is custom_mock


@pytest.mark.parametrize(
    ("selected", "expected_type"),
    [
        ("groq", GroqLLMProvider),
        ("gemini", GeminiLLMProvider),
        ("mock", MockLLMProvider),
    ],
)
def test_patient_llm_selection_is_explicit(monkeypatch, selected, expected_type):
    monkeypatch.setattr(settings, "PROVIDER_LLM", selected)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "OMKAR_GROQ_TEST")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "OMKAR_GEMINI_TEST")
    monkeypatch.setattr(settings, "KUNAL_GROQ_API_KEY", "KUNAL_GROQ_TEST")
    monkeypatch.setattr(settings, "KUNAL_GEMINI_API_KEY", "KUNAL_GEMINI_TEST")

    provider = ProviderRegistry().get_llm()

    assert isinstance(provider, expected_type)
    if selected == "groq":
        assert provider.api_key == "OMKAR_GROQ_TEST"
    elif selected == "gemini":
        assert provider.api_key == "OMKAR_GEMINI_TEST"


def test_invalid_patient_llm_provider_fails_explicitly(monkeypatch):
    monkeypatch.setattr(settings, "PROVIDER_LLM", "invalid")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "OMKAR_GROQ_TEST")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "OMKAR_GEMINI_TEST")

    with pytest.raises(ProviderConfigurationError, match="Unsupported patient"):
        ProviderRegistry().get_llm()
