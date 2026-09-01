import json
import logging
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

from app.services.providers.base import AbstractLLMProvider, ExtractionResult
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.schemas.clinical_state import ClinicalState

logger = logging.getLogger(__name__)


class GeminiClinicalExtraction(BaseModel):
    """Structured extraction schema enforced on Gemini responses."""
    chief_complaint: Optional[str] = Field(None, description="Primary symptom or presenting medical issue")
    onset: Optional[str] = Field(None, description="Onset characteristic, e.g. sudden or gradual")
    duration: Optional[str] = Field(None, description="Duration of symptoms, e.g. 3 days, since yesterday")
    severity: Optional[int] = Field(None, ge=1, le=10, description="Pain or distress scale 1 to 10")
    location: Optional[str] = Field(None, description="Anatomical site of symptom")
    radiation: Optional[str] = Field(None, description="Radiation direction, e.g. left arm, neck, back")
    associated_symptoms: List[str] = Field(default_factory=list, description="Other accompanying symptoms")
    has_meaningful_progress: bool = Field(True, description="Whether new clinical information was provided")


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
        if "hi" in language_code.lower():
            questions = {
                "duration": "यह समस्या आपको कितने समय से हो रही है?",
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
    """Google Gemini 2.5 Flash Provider with Pydantic Structured Output and safe fallback."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.fallback = MockLLMProvider()
        self._client = None
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info("[GeminiLLMProvider] Initialized Google GenAI Gemini 2.5 Flash Client successfully.")
            except Exception as e:
                logger.error(f"[GeminiLLMProvider] Failed to initialize Google GenAI Client: {e}")

    async def extract_clinical_facts(
        self,
        raw_text: str,
        current_state: Any,
        language_code: str = "en",
        target_field: str = "chief_complaint"
    ) -> ExtractionResult:
        """
        Extracts clinical entities using Gemini 2.5 Flash with structured JSON output.
        Strict Clinical Safety: NEVER diagnose or prescribe.
        """
        if not self._client or not self.api_key:
            return await self.fallback.extract_clinical_facts(raw_text, current_state, language_code, target_field)

        prompt = f"""
You are SwasthyaVaani's clinical pre-consultation intake extractor for SIH Problem Statement 26047.
Extract structured clinical facts from the patient's statement into the requested JSON schema.

RULES:
1. NEVER output diagnoses or prescriptions.
2. Extract only factual symptom characteristics (SOCRATES framework & AYUSH metrics).
3. If a field is not mentioned, leave it null.
4. Support both English and Indic language terms (e.g., 'chhati mein dard', 'sir dard', 'tez bukhar', 'chakkar', 'jalan', 'saans phulna').

Target Field Being Answered: {target_field}
Current State Summary: {current_state}
Patient Statement ({language_code}): "{raw_text}"
"""
        try:
            from google.genai import types
            response = self._client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GeminiClinicalExtraction,
                    temperature=0.1
                )
            )

            parsed = json.loads(response.text)
            clean_facts = {k: v for k, v in parsed.items() if v is not None}

            return ExtractionResult(
                extracted_facts=clean_facts,
                confidence=0.92,
                raw_response=response.text,
                provider_name="Gemini 2.5 Flash"
            )
        except Exception as err:
            logger.warning(f"[GeminiLLMProvider] Live API call failed, using deterministic fallback: {err}")
            return await self.fallback.extract_clinical_facts(raw_text, current_state, language_code, target_field)

    async def generate_adaptive_question(
        self,
        target_field: str,
        chief_complaint: Optional[str],
        language_code: str = "en"
    ) -> str:
        """Generates dynamic, empathetic clinical follow-up question via Gemini 2.5 Flash."""
        if not self._client or not self.api_key:
            return await self.fallback.generate_adaptive_question(target_field, chief_complaint, language_code)

        lang_instruction = (
            "Ask in natural, empathetic conversational Hindi (Devanagari script)."
            if "hi" in language_code.lower()
            else "Ask in natural, empathetic conversational Marathi."
            if "mr" in language_code.lower()
            else "Ask in clear, empathetic English."
        )

        prompt = f"""
You are SwasthyaVaani, an empathetic conversational AI clinical intake assistant for an Indian outpatient clinic.
The patient presented with: "{chief_complaint or 'unspecified discomfort'}".
We now need to clarify the missing clinical dimension: '{target_field}'.

INSTRUCTIONS:
- {lang_instruction}
- Formulate a single, natural, context-aware follow-up question specifically inquiring about '{target_field}' relative to their symptom "{chief_complaint or ''}".
- Keep the question concise (under 20 words).
- Do NOT suggest any diagnoses, treatments, or medical conclusions.
- Output ONLY the question text directly, no quotes or prefix.
"""
        try:
            response = self._client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            q_text = response.text.strip().replace('"', '')
            if q_text:
                return q_text
            return await self.fallback.generate_adaptive_question(target_field, chief_complaint, language_code)
        except Exception as err:
            logger.warning(f"[GeminiLLMProvider] Dynamic question generation fallback: {err}")
            return await self.fallback.generate_adaptive_question(target_field, chief_complaint, language_code)
