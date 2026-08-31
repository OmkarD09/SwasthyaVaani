from typing import Dict, Any, Optional
from app.services.providers.base import AbstractLLMProvider, ExtractionResult
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.schemas.clinical_state import ClinicalState


class MockLLMProvider(AbstractLLMProvider):
    """Deterministic, resilient mock LLM provider for zero-cost offline execution and tests."""

    async def extract_clinical_facts(
        self,
        raw_text: str,
        current_state: Any,
        language_code: str = "en",
        target_field: str = "chief_complaint"
    ) -> ExtractionResult:
        state_obj = current_state if isinstance(current_state, ClinicalState) else ClinicalState(**(current_state or {}))
        _, facts, _ = extract_clinical_facts_from_answer(raw_text, target_field, state_obj)
        return ExtractionResult(
            extracted_facts=facts,
            confidence=0.95,
            raw_response="[MockLLMProvider] Extracted via deterministic NLP rules",
            provider_name="MockLLMProvider"
        )

    async def generate_adaptive_question(
        self,
        target_field: str,
        chief_complaint: Optional[str],
        language_code: str = "en"
    ) -> str:
        if language_code == "hi":
            questions = {
                "duration": "यह समस्या कितने समय से हो रही है?",
                "severity": "1 से 10 के पैमाने पर दर्द या परेशानी कितनी तेज है?",
                "radiation": "क्या यह दर्द शरीर के किसी अन्य हिस्से में भी जाता है?",
                "associated_symptoms": "क्या आपको इसके अलावा कोई और लक्षण जैसे चक्कर या सांस लेने में परेशानी है?",
            }
            return questions.get(target_field, "कृपया अपने लक्षणों के बारे में थोड़ा और विस्तार से बताएं।")
        else:
            questions = {
                "duration": "How long have you been experiencing these symptoms?",
                "severity": "On a scale of 1 to 10, how severe is your pain or discomfort?",
                "radiation": "Does the pain spread or radiate to your arm, neck, or back?",
                "associated_symptoms": "Are you experiencing any other symptoms like shortness of breath or dizziness?",
            }
            return questions.get(target_field, "Could you share a little more detail regarding that?")


class GeminiLLMProvider(AbstractLLMProvider):
    """Google Gemini 1.5 Flash Provider adapter."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.fallback = MockLLMProvider()

    async def extract_clinical_facts(
        self,
        raw_text: str,
        current_state: Dict[str, Any],
        language_code: str = "en"
    ) -> ExtractionResult:
        if not self.api_key:
            # Safe degradation to deterministic fallback
            return await self.fallback.extract_clinical_facts(raw_text, current_state, language_code)
        
        # Real Gemini structured JSON extraction can be plugged here
        return await self.fallback.extract_clinical_facts(raw_text, current_state, language_code)

    async def generate_adaptive_question(
        self,
        target_field: str,
        chief_complaint: Optional[str],
        language_code: str = "en"
    ) -> str:
        return await self.fallback.generate_adaptive_question(target_field, chief_complaint, language_code)
