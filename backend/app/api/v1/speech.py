from typing import Optional
from fastapi import APIRouter, Form, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.services.providers.factory import get_speech_service

router = APIRouter(prefix="/speech", tags=["Speech & Voice"])


class TTSRequest(BaseModel):
    text: str
    language_code: Optional[str] = "hi"


class TTSResponse(BaseModel):
    text: str
    language_code: str
    audio_base64: Optional[str] = None
    provider: str


class ASRResponse(BaseModel):
    transcript: str
    detected_language: str
    confidence: float
    provider: str


@router.post("/tts", response_model=TTSResponse)
async def generate_text_to_speech(
    text: str = Form(...),
    language_code: Optional[str] = Form("hi")
):
    """Synthesize clinical question to spoken Indic audio via Sarvam Bulbul / Fallback."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    speech_service = get_speech_service()
    audio_base64 = await speech_service.text_to_speech(text, language_code)

    return TTSResponse(
        text=text,
        language_code=language_code or "hi",
        audio_base64=audio_base64,
        provider=speech_service.__class__.__name__
    )


@router.post("/asr", response_model=ASRResponse)
async def transcribe_speech_audio(
    file: UploadFile = File(...),
    language_code: Optional[str] = Form("hi")
):
    """Transcribe spoken patient audio to text via Sarvam Saaras Indic ASR."""
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file provided")

    speech_service = get_speech_service()
    result = await speech_service.transcribe_audio(audio_bytes, language_code)

    return ASRResponse(
        transcript=result.transcript_text,
        detected_language=result.detected_language,
        confidence=result.confidence,
        provider=result.provider_name
    )
