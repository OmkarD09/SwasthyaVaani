import os
import sys
import json
import time
import asyncio
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.intake import IntakeSession, QuestionEvent, Answer, ClinicalStateModel
from app.models.user import Patient
from app.services.providers.factory import provider_registry
from app.services.providers.llm_provider import GroqLLMProvider, GeminiLLMProvider, MockLLMProvider, GROQ_PRIMARY_MODEL, GROQ_FALLBACK_MODELS, GEMINI_PRIMARY_MODEL, GEMINI_FALLBACK_MODELS
from app.services.providers.speech_provider import SarvamSpeechProvider
from app.services.clinical_ai.adaptive_engine import ClinicalState

async def test_live_provider_endpoints():
    print("==================================================================", flush=True)
    print("LIVE PROVIDER DIAGNOSTIC PROBE (TESTING RATE LIMITS & ERRORS)", flush=True)
    print("==================================================================", flush=True)
    
    # 1. Test Sarvam ASR / TTS
    print(f"1. Probing Sarvam Speech Provider (Key: {settings.SARVAM_API_KEY[:8]}...)", flush=True)
    sarvam = SarvamSpeechProvider(api_key=settings.SARVAM_API_KEY)
    t0 = time.time()
    tts_res = await sarvam.text_to_speech("नमस्ते, आप कैसे हैं?", "hi")
    t_tts = time.time() - t0
    if tts_res:
        print(f"   [Sarvam TTS] SUCCESS (Status=200, Latency={t_tts:.2f}s, AudioLength={len(tts_res)} chars)", flush=True)
    else:
        print(f"   [Sarvam TTS] FAILED / Returned None (Latency={t_tts:.2f}s)", flush=True)

    # 2. Test Groq LLM Models
    print(f"\n2. Probing Groq LLM Models (Key: {settings.GROQ_API_KEY[:8]}...)", flush=True)
    groq = GroqLLMProvider(api_key=settings.GROQ_API_KEY)
    test_models = [GROQ_PRIMARY_MODEL] + GROQ_FALLBACK_MODELS
    for m in test_models:
        t0 = time.time()
        import httpx
        headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": m,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 10
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                lat = time.time() - t0
                print(f"   [Groq Model '{m}'] HTTP {res.status_code} | Latency: {lat:.2f}s | Response: {res.text[:100]}", flush=True)
        except Exception as e:
            print(f"   [Groq Model '{m}'] EXCEPTION: {e}", flush=True)

    # 3. Test Gemini LLM Models
    print(f"\n3. Probing Gemini LLM Models (Key: {settings.GEMINI_API_KEY[:8]}...)", flush=True)
    gemini = GeminiLLMProvider(api_key=settings.GEMINI_API_KEY)
    gem_models = [GEMINI_PRIMARY_MODEL] + GEMINI_FALLBACK_MODELS
    for gm in gem_models:
        t0 = time.time()
        try:
            from google.genai import types
            if gemini._client:
                resp = gemini._client.models.generate_content(
                    model=gm,
                    contents="ping"
                )
                lat = time.time() - t0
                print(f"   [Gemini Model '{gm}'] SUCCESS | Latency: {lat:.2f}s | Response: {resp.text[:60]}", flush=True)
            else:
                print(f"   [Gemini Model '{gm}'] Client not initialized!", flush=True)
        except Exception as ge:
            lat = time.time() - t0
            print(f"   [Gemini Model '{gm}'] EXCEPTION: {ge} (Latency: {lat:.2f}s)", flush=True)

async def forensic_audit_most_recent_session():
    db = SessionLocal()
    try:
        # Get the top most recent Voice session
        recent_sessions = db.query(IntakeSession).filter(IntakeSession.interaction_mode == "VOICE").order_by(IntakeSession.started_at.desc()).limit(3).all()
        for target_session in recent_sessions:
            pat = db.query(Patient).filter(Patient.id == target_session.patient_id).first() if target_session.patient_id else None
            pname = pat.display_name if pat else "Unknown"
            print("\n==================================================================", flush=True)
            print(f"FORENSIC AUDIT OF SESSION {target_session.id} (#{target_session.token})", flush=True)
            print(f"Patient: {pname} | Lang: {target_session.language_code} | Workflow: {target_session.workflow_type}", flush=True)
            print(f"Started: {target_session.started_at} | Submitted: {target_session.submitted_at} | Status: {target_session.status}", flush=True)
            print("==================================================================", flush=True)
            
            q_events = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == target_session.id).order_by(QuestionEvent.sequence_number.asc()).all()
            answers = db.query(Answer).filter(Answer.intake_session_id == target_session.id).order_by(Answer.created_at.asc()).all()
            states = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == target_session.id).order_by(ClinicalStateModel.version.asc()).all()
            
            print(f"Turn Count (Answers): {len(answers)} | QuestionEvents: {len(q_events)} | State Versions: {len(states)}", flush=True)
            
            # Map turns
            for idx, a in enumerate(answers):
                matching_qe = next((q for q in q_events if q.id == a.question_event_id), None)
                state_before = states[idx].state_json if idx < len(states) else {}
                state_after = states[idx+1].state_json if idx+1 < len(states) else {}
                
                target_field = matching_qe.target_field if matching_qe else "chief_complaint"
                
                print(f"\n-------------------------------------------------------------", flush=True)
                print(f"TURN {idx+1}:", flush=True)
                print(f"  ASR Input Mode: {a.input_mode}", flush=True)
                print(f"  ASR Transcript Received: \"{a.raw_text}\"", flush=True)
                print(f"  Target Field Prompted: '{target_field}'", flush=True)
                if matching_qe:
                    print(f"  Prompted Question Text: \"{matching_qe.question_text}\"", flush=True)
                else:
                    print(f"  Prompted Question Text: [Initial Greeting / CC Prompt]", flush=True)
                
                # Now test extraction with both Groq and Mock on this exact turn
                groq_llm = GroqLLMProvider(api_key=settings.GROQ_API_KEY)
                st_obj = ClinicalState(**state_before)
                t0 = time.time()
                ext_res = await groq_llm.extract_clinical_facts(a.raw_text, st_obj, target_session.language_code, target_field)
                lat = time.time() - t0
                
                print(f"  Live Extraction Test on Raw Transcript:", flush=True)
                print(f"    Provider Used: {ext_res.provider_name} (Latency: {lat:.2f}s)", flush=True)
                print(f"    Extracted Facts: {ext_res.extracted_facts}", flush=True)
                print(f"    State Delta After Turn:", flush=True)
                print(f"      CC: {state_after.get('chief_complaint')}")
                print(f"      Domain: {state_after.get('domain')}")
                print(f"      Duration: {state_after.get('duration')}")
                print(f"      Severity: {state_after.get('severity')}")
                print(f"      Onset: {state_after.get('onset')}")
                print(f"      Symptoms: {state_after.get('symptoms')}")
                print(f"      Negated: {state_after.get('negated_symptoms')}")
                print(f"      Resolved Dims: {state_after.get('resolved_dimensions')}")
                print(f"      AYUSH Dims: {state_after.get('ayush')}")
                print(f"      Canonical Dims: {state_after.get('canonical_dimensions')}")
                
    finally:
        db.close()

async def main():
    await test_live_provider_endpoints()
    await forensic_audit_most_recent_session()

if __name__ == '__main__':
    asyncio.run(main())
