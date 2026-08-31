from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from app.services.providers.base import AbstractSpeechProvider, TranscriptionResult
from app.services.providers.factory import get_speech_service

router = APIRouter(prefix="/speech", tags=["Speech & Voice"])


@router.post("/transcribe", response_model=TranscriptionResult)
async def transcribe_audio_endpoint(
    audio_file: UploadFile = File(...),
    language_code: Optional[str] = Form("en"),
    speech_service: AbstractSpeechProvider = Depends(get_speech_service)
):
    """
    Transcribes uploaded patient voice recording into normalized clinical text.
    Uses configured SpeechService (Sarvam, Bhashini, or Mock fallback).
    """
    if not audio_file:
        raise HTTPException(status_code=400, detail="No audio file provided")

    try:
        audio_bytes = await audio_file.read()
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio payload")

        result = await speech_service.transcribe_audio(
            audio_bytes=audio_bytes,
            language_code=language_code
        )
        return result
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Speech transcription failed: {str(err)}"
        )


@router.post("/tts")
async def text_to_speech_endpoint(
    text: str = Form(...),
    language_code: Optional[str] = Form("hi"),
    speech_service: AbstractSpeechProvider = Depends(get_speech_service)
):
    """
    Synthesizes spoken audio for clinical intake questions using Sarvam AI Bulbul TTS.
    Returns Base64 audio payload for immediate client playback.
    """
    audio_base64 = await speech_service.text_to_speech(text=text, language_code=language_code)
    return {
        "text": text,
        "language_code": language_code,
        "audio_base64": audio_base64,
        "has_audio": audio_base64 is not None
    }
