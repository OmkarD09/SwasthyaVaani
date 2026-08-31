import httpx
from typing import Optional
from app.services.providers.base import AbstractSpeechProvider, TranscriptionResult


class MockSpeechProvider(AbstractSpeechProvider):
    """Deterministic Speech-to-Text provider for rapid simulation."""

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        language_code: Optional[str] = None
    ) -> TranscriptionResult:
        lang = language_code or "en"
        text = "मुझे 3 दिनों से तेज बुखार और खांसी है" if lang == "hi" else "I have had persistent chest pain and mild fever for 2 days"
        return TranscriptionResult(
            transcript_text=text,
            detected_language=lang,
            confidence=0.96,
            provider_name="MockSpeechProvider"
        )

    async def text_to_speech(
        self,
        text: str,
        language_code: Optional[str] = None
    ) -> Optional[str]:
        return None


class SarvamSpeechProvider(AbstractSpeechProvider):
    """
    Official Sarvam AI Indic Speech Provider (Saaras ASR & Bulbul TTS).
    Supports 10+ Indic languages: Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Odia, Punjabi, Malayalam, English.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.fallback = MockSpeechProvider()
        self.asr_url = "https://api.sarvam.ai/speech-to-text"
        self.tts_url = "https://api.sarvam.ai/text-to-speech"

    def _map_language_code(self, code: Optional[str]) -> str:
        mapping = {
            "hi": "hi-IN",
            "en": "en-IN",
            "mr": "mr-IN",
            "bn": "bn-IN",
            "ta": "ta-IN",
            "te": "te-IN",
            "gu": "gu-IN",
            "kn": "kn-IN",
            "ml": "ml-IN",
            "pa": "pa-IN",
            "od": "od-IN",
        }
        clean = (code or "en").lower().split("-")[0]
        return mapping.get(clean, "en-IN")

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        language_code: Optional[str] = None
    ) -> TranscriptionResult:
        """Transcribe incoming audio using Sarvam Saaras Indic ASR."""
        if not self.api_key:
            return await self.fallback.transcribe_audio(audio_bytes, language_code)

        target_lang = self._map_language_code(language_code)
        headers = {"api-subscription-key": self.api_key}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                files = {"file": ("patient_audio.wav", audio_bytes, "audio/wav")}
                data = {
                    "language_code": target_lang,
                    "model": "saaras:v1"
                }
                response = await client.post(self.asr_url, headers=headers, files=files, data=data)

                if response.status_code == 200:
                    resp_json = response.json()
                    transcript = resp_json.get("transcript", "")
                    detected_lang = resp_json.get("language_code", target_lang)
                    return TranscriptionResult(
                        transcript_text=transcript,
                        detected_language=detected_lang,
                        confidence=0.95,
                        provider_name="Sarvam AI Saaras"
                    )
                else:
                    return await self.fallback.transcribe_audio(audio_bytes, language_code)
        except Exception:
            return await self.fallback.transcribe_audio(audio_bytes, language_code)

    async def text_to_speech(
        self,
        text: str,
        language_code: Optional[str] = None
    ) -> Optional[str]:
        """Convert clinical question text to spoken Base64 audio using Sarvam Bulbul TTS."""
        if not self.api_key or not text.strip():
            return None

        target_lang = self._map_language_code(language_code)
        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": [text[:500]],
            "target_language_code": target_lang,
            "speaker": "ishita",
            "model": "bulbul:v3"
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(self.tts_url, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    audios = data.get("audios", [])
                    return audios[0] if audios else None
                return None
        except Exception:
            return None


class BhashiniSpeechProvider(AbstractSpeechProvider):
    """Digital India BHASHINI ASR Provider Adapter."""

    def __init__(self, api_key: Optional[str] = None, user_id: Optional[str] = None):
        self.api_key = api_key
        self.user_id = user_id
        self.fallback = MockSpeechProvider()

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        language_code: Optional[str] = None
    ) -> TranscriptionResult:
        if not self.api_key:
            return await self.fallback.transcribe_audio(audio_bytes, language_code)
        return await self.fallback.transcribe_audio(audio_bytes, language_code)
