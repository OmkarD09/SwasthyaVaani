import os
import sys
import json
import time
import asyncio
import base64
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from app.core.config import settings
from app.services.providers.speech_provider import SarvamSpeechProvider

TEST_SENTENCES = [
    "I have stomach pain.",
    "I am vomiting.",
    "I have shortness of breath.",
    "My right knee hurts.",
    "I have had this pain for three days.",
    "I have not been vomiting.",
    "I don't know.",
    "I have eaten street food."
]

async def run_asr_diagnostic():
    print("==================================================================", flush=True)
    print("ASR-ONLY FORENSIC DIAGNOSTIC (SARVAM SAARAS:V3)", flush=True)
    print(f"API Key: {settings.SARVAM_API_KEY[:10]}...", flush=True)
    print("==================================================================", flush=True)

    sarvam = SarvamSpeechProvider(api_key=settings.SARVAM_API_KEY)
    
    # Step 1: Synthesize clean audio for each sentence using Sarvam Bulbul TTS (English 'en-IN')
    audio_samples = {}
    print("\n[Phase 1] Generating Clean Reference Audio via Sarvam Bulbul TTS (en-IN)...", flush=True)
    for text in TEST_SENTENCES:
        t0 = time.time()
        # Request English TTS
        tts_b64 = await sarvam.text_to_speech(text, "en")
        lat = time.time() - t0
        if tts_b64:
            audio_bytes = base64.b64decode(tts_b64)
            audio_samples[text] = audio_bytes
            print(f"   Generated '{text}' -> {len(audio_bytes)} bytes ({lat:.2f}s)", flush=True)
        else:
            print(f"   FAILED to generate TTS for '{text}'", flush=True)

    # Step 2: Test Sarvam Saaras ASR on each sentence, 3 trials each
    print("\n[Phase 2] Testing Sarvam Saaras ASR ('saaras:v3' en-IN) Across 3 Trials...", flush=True)
    
    results = []
    
    for text in TEST_SENTENCES:
        audio_bytes = audio_samples.get(text)
        if not audio_bytes:
            continue
        
        print(f"\n--- Testing Target: \"{text}\" ---", flush=True)
        
        for trial in range(1, 4):
            t0 = time.time()
            http_status = 200
            error_msg = None
            transcript = ""
            det_lang = ""
            conf = 0.0
            
            try:
                # Direct call to transcribe_audio
                res = await sarvam.transcribe_audio(audio_bytes, "en")
                lat = time.time() - t0
                transcript = res.transcript_text
                det_lang = res.detected_language
                conf = res.confidence
                provider = res.provider_name
                print(f"   Trial {trial}: Status=200 | Latency={lat:.2f}s | Output: \"{transcript}\" | Lang={det_lang}", flush=True)
            except Exception as exc:
                lat = time.time() - t0
                http_status = 502
                error_msg = str(exc)
                print(f"   Trial {trial}: FAILED ({exc}) | Latency={lat:.2f}s", flush=True)
            
            results.append({
                "spoken_sentence": text,
                "trial": trial,
                "transcript": transcript,
                "http_status": http_status,
                "latency": lat,
                "audio_bytes_len": len(audio_bytes),
                "model": "saaras:v3",
                "detected_lang": det_lang,
                "error": error_msg
            })
            
            # Avoid overwhelming rate limits
            await asyncio.sleep(0.5)

    # Step 3: Analyze the results
    print("\n==================================================================", flush=True)
    print("ASR ACCURACY & CLINICAL SAFETY ANALYSIS", flush=True)
    print("==================================================================", flush=True)
    
    total_trials = len(results)
    exact_matches = 0
    semantic_matches = 0
    dangerous_substitutions = []
    bad_transcriptions = []
    total_latency = 0.0
    failures = 0
    
    def normalize(s: str) -> str:
        import re
        return re.sub(r'[^a-zA-Z0-9]', '', s).lower()

    for r in results:
        total_latency += r["latency"]
        if r["http_status"] != 200:
            failures += 1
            bad_transcriptions.append(r)
            continue
            
        orig_norm = normalize(r["spoken_sentence"])
        trans_norm = normalize(r["transcript"])
        
        is_exact = (orig_norm == trans_norm)
        if is_exact:
            exact_matches += 1
            semantic_matches += 1
        else:
            # Check semantic match
            # E.g. "I have stomach pain" vs "I have a stomach pain"
            if ("stomach pain" in r["spoken_sentence"].lower() and "stomach pain" in r["transcript"].lower()) or \
               ("vomiting" in r["spoken_sentence"].lower() and "vomiting" in r["transcript"].lower() and "not" in r["spoken_sentence"].lower() == ("not" in r["transcript"].lower())) or \
               ("shortness of breath" in r["transcript"].lower()) or \
               ("right knee" in r["transcript"].lower()) or \
               ("three days" in r["transcript"].lower() or "3 days" in r["transcript"].lower()) or \
               ("don't know" in r["transcript"].lower() or "dont know" in r["transcript"].lower()) or \
               ("street food" in r["transcript"].lower()):
                semantic_matches += 1
            else:
                bad_transcriptions.append(r)
                
            # Dangerous substitutions check
            if "not vomiting" in r["spoken_sentence"].lower() and "not" not in r["transcript"].lower() and "vomiting" in r["transcript"].lower():
                dangerous_substitutions.append({
                    "type": "NEGATION_LOSS",
                    "spoken": r["spoken_sentence"],
                    "transcript": r["transcript"],
                    "danger": "Loss of negation converts denial into positive symptom"
                })
            if "stomach pain" in r["spoken_sentence"].lower() and ("cough" in r["transcript"].lower() or "chest" in r["transcript"].lower()):
                dangerous_substitutions.append({
                    "type": "ANATOMICAL_HALLUCINATION",
                    "spoken": r["spoken_sentence"],
                    "transcript": r["transcript"],
                    "danger": "Stomach pain converted to respiratory/chest symptom"
                })
            if "right knee" in r["spoken_sentence"].lower() and "right knee" not in r["transcript"].lower():
                dangerous_substitutions.append({
                    "type": "ANATOMICAL_DISPLACEMENT",
                    "spoken": r["spoken_sentence"],
                    "transcript": r["transcript"],
                    "danger": "Right knee misidentified"
                })

    avg_latency = total_latency / total_trials if total_trials else 0.0
    exact_match_rate = (exact_matches / total_trials) * 100 if total_trials else 0.0
    semantic_match_rate = (semantic_matches / total_trials) * 100 if total_trials else 0.0
    failure_rate = (failures / total_trials) * 100 if total_trials else 0.0

    print(f"\nTotal Trials: {total_trials}")
    print(f"Exact Match Rate: {exact_match_rate:.1f}% ({exact_matches}/{total_trials})")
    print(f"Semantic Match Rate: {semantic_match_rate:.1f}% ({semantic_matches}/{total_trials})")
    print(f"Failure Rate: {failure_rate:.1f}% ({failures}/{total_trials})")
    print(f"Average Latency: {avg_latency:.2f}s")
    print(f"Clinically Dangerous Substitutions: {len(dangerous_substitutions)}")
    
    # Save full JSON report
    report_path = backend_dir / "scratch" / "asr_diagnostic_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "summary": {
                "total_trials": total_trials,
                "exact_match_rate": exact_match_rate,
                "semantic_match_rate": semantic_match_rate,
                "failure_rate": failure_rate,
                "average_latency": avg_latency,
                "dangerous_substitutions_count": len(dangerous_substitutions)
            },
            "dangerous_substitutions": dangerous_substitutions,
            "bad_transcriptions": bad_transcriptions,
            "results": results
        }, f, indent=2, ensure_ascii=False)
    print(f"\nReport written to {report_path}", flush=True)

if __name__ == '__main__':
    asyncio.run(run_asr_diagnostic())
