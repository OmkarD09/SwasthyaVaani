import io
import pytest
from fastapi.testclient import TestClient


def test_speech_transcription_endpoint(client: TestClient):
    fake_audio = io.BytesIO(b"RIFF....WAVEfmt ....data....fake_audio_bytes")
    
    res = client.post(
        "/api/v1/speech/transcribe",
        files={"audio_file": ("test_recording.wav", fake_audio, "audio/wav")},
        data={"language_code": "hi"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["detected_language"] == "hi"
    assert len(data["transcript_text"]) > 0
    assert data["confidence"] >= 0.8
    assert "provider_name" in data


def test_speech_tts_endpoint(client: TestClient):
    res = client.post(
        "/api/v1/speech/tts",
        data={"text": "यह समस्या कितने समय से हो रही है?", "language_code": "hi"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["language_code"] == "hi"
    assert "has_audio" in data
