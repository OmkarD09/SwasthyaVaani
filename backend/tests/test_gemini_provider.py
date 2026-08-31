import pytest
from app.services.providers.llm_provider import GeminiLLMProvider, GeminiClinicalExtraction, MockLLMProvider


@pytest.mark.asyncio
async def test_gemini_provider_fallback_when_no_api_key():
    provider = GeminiLLMProvider(api_key=None)
    res = await provider.extract_clinical_facts(
        raw_text="मुझे 2 दिनों से तेज बुखार है, दर्द 8/10 है",
        current_state={},
        language_code="hi"
    )
    assert res.provider_name == "MockLLMProvider"
    assert res.extracted_facts.get("severity") == 8
    assert res.extracted_facts.get("duration") == "2 days"


@pytest.mark.asyncio
async def test_gemini_clinical_extraction_schema_validation():
    sample_json = {
        "chief_complaint": "Chest discomfort and sweating",
        "onset": "Sudden",
        "duration": "4 hours",
        "severity": 9,
        "radiation": "Left shoulder",
        "associated_symptoms": ["Nausea", "Sweating"],
        "has_meaningful_progress": True
    }
    obj = GeminiClinicalExtraction(**sample_json)
    assert obj.severity == 9
    assert obj.radiation == "Left shoulder"
    assert len(obj.associated_symptoms) == 2


@pytest.mark.asyncio
async def test_gemini_question_generation_fallback():
    provider = GeminiLLMProvider(api_key=None)
    q_hi = await provider.generate_adaptive_question(
        target_field="severity",
        chief_complaint="Chest pain",
        language_code="hi"
    )
    assert "1 से 10" in q_hi

    q_en = await provider.generate_adaptive_question(
        target_field="severity",
        chief_complaint="Chest pain",
        language_code="en"
    )
    assert "scale of 1 to 10" in q_en
