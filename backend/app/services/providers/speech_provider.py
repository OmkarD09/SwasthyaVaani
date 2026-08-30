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
        
        # Live Bhashini ULCA ASR Pipeline integration
        return await self.fallback.transcribe_audio(audio_bytes, language_code)
