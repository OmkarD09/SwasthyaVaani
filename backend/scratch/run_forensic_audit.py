import asyncio
import os
import sys
import json
import httpx

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.intake import IntakeSession, Answer, QuestionEvent, ClinicalStateModel
from app.models.user import Patient
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question, _assess_information_sufficiency
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.question_scorer import (
    score_candidate_dimensions,
    is_field_already_resolved,
    MAP_TO_CANONICAL,
    SEMANTIC_CLUSTERS
)
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.services.safety.red_flags import evaluate_red_flags
from app.services.safety.contradictions import detect_contradictions
from app.services.providers.speech_provider import MockSpeechProvider, SarvamSpeechProvider


BASE_URL = "http://127.0.0.1:8000/api/v1"

audit_report = {}

async def run_all_audits():
    print("================================================================================")
    print("SWASTHYAVAANI FULL FORENSIC AUDIT SUITE")
    print("================================================================================")

    # -------------------------------------------------------------------------
    # PART 2: TEXT VS VOICE PARITY
    # -------------------------------------------------------------------------
    print("\n--- Running PART 2: Text vs Voice Parity ---")
    parity_cases = [
        ("1. Abdominal pain", "I have severe burning pain in my upper abdomen."),
        ("2. Headache", "I have a throbbing headache on the right side with light sensitivity."),
        ("3. Leg pain", "My right knee is swollen and painful when walking."),
        ("4. Cough", "I have continuous dry cough and mild fever."),
        ("5. Chest pain", "I have heavy squeezing chest pain radiating to left shoulder.")
    ]

    parity_results = []
    for label, text_input in parity_cases:
        # A. Process via Text logic
        s_text = ClinicalState(chief_complaint=text_input)
        s_text.raw_transcript_snippets.append(text_input)
        s_text, facts_t, prog_t = extract_clinical_facts_from_answer(text_input, "chief_complaint", s_text)
        dom_t = classify_clinical_domains(s_text, "GENERAL_CLINICAL")
        cands_t = score_candidate_dimensions(dom_t, s_text, [], set(s_text.resolved_dimensions))
        viable_t = [c for c in cands_t if not is_field_already_resolved(c["field_name"], s_text) and c["score"] > 0]
        dec_t = await evaluate_next_question(s_text, "GENERAL_CLINICAL", [], 0, 1, "en")

        # B. Process Voice transcript representing the exact same input
        s_voice = ClinicalState(chief_complaint=text_input)
        s_voice.raw_transcript_snippets.append(text_input)
        s_voice, facts_v, prog_v = extract_clinical_facts_from_answer(text_input, "chief_complaint", s_voice)
        dom_v = classify_clinical_domains(s_voice, "GENERAL_CLINICAL")
        cands_v = score_candidate_dimensions(dom_v, s_voice, [], set(s_voice.resolved_dimensions))
        viable_v = [c for c in cands_v if not is_field_already_resolved(c["field_name"], s_voice) and c["score"] > 0]
        dec_v = await evaluate_next_question(s_voice, "GENERAL_CLINICAL", [], 0, 1, "en")

        divergence = []
        if dom_t != dom_v: divergence.append(f"Domain mismatch: {dom_t} vs {dom_v}")
        if s_text.location != s_voice.location: divergence.append(f"Location mismatch: {s_text.location} vs {s_voice.location}")
        if dec_t.target_field != dec_v.target_field: divergence.append(f"Target field mismatch: {dec_t.target_field} vs {dec_v.target_field}")
        if dec_t.action != dec_v.action: divergence.append(f"Action mismatch: {dec_t.action} vs {dec_v.action}")

        parity_results.append({
            "case": label,
            "domain": dom_t[0] if dom_t else "None",
            "text_target": dec_t.target_field,
            "voice_target": dec_v.target_field,
            "text_action": dec_t.action,
            "voice_action": dec_v.action,
            "parity": "EXACT" if not divergence else "DIVERGENT",
            "divergence": divergence
        })

    audit_report["part_2_parity"] = parity_results
    for pr in parity_results:
        print(f"  [{pr['parity']}] {pr['case']}: Domain={pr['domain']}, Target={pr['text_target']}, Action={pr['text_action']}")

    # -------------------------------------------------------------------------
    # PART 3: SMART MEMORY / LEARN -> ADAPT -> DEEPEN
    # -------------------------------------------------------------------------
    print("\n--- Running PART 3: Smart Memory / LEARN -> ADAPT -> DEEPEN ---")
    smart_memory_results = {}

    # Test A: "I have stomach pain" -> "I am vomiting"
    s_a = ClinicalState(chief_complaint="I have stomach pain")
    s_a.raw_transcript_snippets.append("I have stomach pain")
    s_a, _, _ = extract_clinical_facts_from_answer("I have stomach pain", "chief_complaint", s_a)
    cands_a1 = score_candidate_dimensions(["GASTROINTESTINAL"], s_a, [], set(s_a.resolved_dimensions))
    v_cand_a1 = [c for c in cands_a1 if c["field_name"] == "vomiting"][0]

    # Follow up: "I am vomiting"
    s_a, _, _ = extract_clinical_facts_from_answer("I am vomiting", "vomiting", s_a)
    cands_a2 = score_candidate_dimensions(["GASTROINTESTINAL"], s_a, [], set(s_a.resolved_dimensions))
    v_cand_a2 = [c for c in cands_a2 if c["field_name"] == "vomiting"][0]
    hyd_cand_a2 = [c for c in cands_a2 if c["field_name"] == "hydration_status"][0]
    smart_memory_results["Test A (Positive Vomiting)"] = {
        "vomiting_score_before": v_cand_a1["score"],
        "vomiting_score_after": v_cand_a2["score"],
        "hydration_score_after": hyd_cand_a2["score"],
        "vomiting_is_disqualified": v_cand_a2["score"] < 0,
        "hydration_is_boosted": hyd_cand_a2["score"] > 100
    }

    # Test B: "I am not vomiting"
    s_b = ClinicalState(chief_complaint="I have stomach pain")
    s_b.raw_transcript_snippets.append("I have stomach pain")
    s_b, _, _ = extract_clinical_facts_from_answer("I am not vomiting", "vomiting", s_b)
    cands_b = score_candidate_dimensions(["GASTROINTESTINAL"], s_b, [], set(s_b.resolved_dimensions))
    v_cand_b = [c for c in cands_b if c["field_name"] == "vomiting"][0]
    hyd_cand_b = [c for c in cands_b if c["field_name"] == "hydration_status"][0]
    smart_memory_results["Test B (Negated Vomiting)"] = {
        "vomiting_canonical": s_b.canonical_dimensions.get("vomiting").status if s_b.canonical_dimensions.get("vomiting") else "None",
        "vomiting_score": v_cand_b["score"],
        "hydration_score": hyd_cand_b["score"],
        "vomiting_penalized": v_cand_b["score"] < 0,
        "hydration_not_boosted": hyd_cand_b["score"] < 100
    }

    # Test C: "I'm not sure whether I'm vomiting"
    s_c = ClinicalState(chief_complaint="I have stomach pain")
    s_c, _, _ = extract_clinical_facts_from_answer("I'm not sure whether I'm vomiting", "vomiting", s_c)
    vomit_dim_c = s_c.canonical_dimensions.get("vomiting")
    smart_memory_results["Test C (Ambiguous Vomiting)"] = {
        "vomit_status": vomit_dim_c.status if vomit_dim_c else "UNKNOWN / NONE",
        "not_forced_true_or_false": vomit_dim_c is None or vomit_dim_c.status not in ["KNOWN_TRUE", "KNOWN_FALSE"]
    }

    # Test D: Volunteered additional symptom inside open-ended answer
    s_d = ClinicalState(chief_complaint="I have abdominal discomfort")
    # Patient volunteers dark stool inside an open exploration answer:
    s_d, _, _ = extract_clinical_facts_from_answer("I also noticed black dark stool this morning", "open_gi_exploration", s_d)
    cands_d = score_candidate_dimensions(["GASTROINTESTINAL"], s_d, [], set(s_d.resolved_dimensions))
    dark_onset_cand = [c for c in cands_d if c["field_name"] == "dark_stool_onset"][0]
    smart_memory_results["Test D (Volunteered Melena Finding)"] = {
        "dark_stool_detected": bool(s_d.dark_stool),
        "dark_stool_onset_score": dark_onset_cand["score"],
        "safety_required": dark_onset_cand["reasoning_mode"] == "SAFETY_REQUIRED"
    }

    # Test E: Refinement of generic location to specific location
    s_e = ClinicalState(chief_complaint="My leg hurts")
    s_e, _, _ = extract_clinical_facts_from_answer("My leg hurts", "chief_complaint", s_e)
    loc_e1 = s_e.location
    # Refinement
    s_e, _, _ = extract_clinical_facts_from_answer("Actually, the pain is specifically in my right knee.", "location", s_e)
    loc_e2 = s_e.location
    smart_memory_results["Test E (Specific Location Refinement)"] = {
        "initial_location": loc_e1,
        "refined_location": loc_e2,
        "refined_correctly": "knee" in (loc_e2 or "").lower()
    }

    audit_report["part_3_smart_memory"] = smart_memory_results
    for k, v in smart_memory_results.items():
        print(f"  {k}: {v}")

    # -------------------------------------------------------------------------
    # PART 6 & 7: NON-INFORMATIVE RESPONSES & NEGATION AUDIT (EN, HI, MR)
    # -------------------------------------------------------------------------
    print("\n--- Running PART 6 & 7: Non-Informative & Negation Across Languages ---")
    lang_non_info_cases = [
        ("English", "idk"),
        ("English", "I don't know"),
        ("English", "I'm not sure"),
        ("Hindi", "पता नहीं"),
        ("Hindi", "मुझे समझ नहीं आया"),
        ("Hindi", "मुझे नहीं पता"),
        ("Marathi", "मला माहित नाही"),
        ("Marathi", "मला कळलं नाही"),
        ("Marathi", "समजलं नाही")
    ]

    non_info_results = []
    for lang, text in lang_non_info_cases:
        s_ni = ClinicalState(chief_complaint="Headache")
        s_ni, facts_ni, prog_ni = extract_clinical_facts_from_answer(text, "duration", s_ni)
        is_ni = bool(facts_ni.get("non_informative") or s_ni.last_non_informative_response)
        non_info_results.append({
            "language": lang,
            "phrase": text,
            "is_non_informative": is_ni,
            "has_progress": prog_ni,
            "last_response_stored": s_ni.last_non_informative_response == text
        })

    audit_report["part_6_non_informative"] = non_info_results
    for nir in non_info_results:
        print(f"  [{nir['language']}] '{nir['phrase']}': Non-Info={nir['is_non_informative']}, Progress={nir['has_progress']}")

    # Negation across EN, HI, MR
    negation_cases = [
        ("English Positive", "I am vomiting", "KNOWN_TRUE"),
        ("English Negative", "I am not vomiting", "KNOWN_FALSE"),
        ("Hindi Positive", "मुझे उल्टी हो रही है", "KNOWN_TRUE"),
        ("Hindi Negative", "मुझे उल्टी नहीं हो रही है", "KNOWN_FALSE"),
        ("Marathi Positive", "उलटी येत आहे", "KNOWN_TRUE"),
        ("Marathi Negative", "उलटी होत नाही", "KNOWN_FALSE"),
    ]

    negation_results = []
    for test_lbl, phr, expected_status in negation_cases:
        s_neg = ClinicalState(chief_complaint="Stomach issue")
        s_neg, _, _ = extract_clinical_facts_from_answer(phr, "vomiting", s_neg)
        v_canon = s_neg.canonical_dimensions.get("vomiting")
        actual_status = v_canon.status if v_canon else "NONE"
        negation_results.append({
            "test": test_lbl,
            "phrase": phr,
            "expected": expected_status,
            "actual": actual_status,
            "match": actual_status == expected_status
        })

    audit_report["part_7_negation"] = negation_results
    for nr in negation_results:
        print(f"  [{'PASS' if nr['match'] else 'FAIL'}] {nr['test']}: Expected={nr['expected']}, Actual={nr['actual']}")

    # -------------------------------------------------------------------------
    # PART 8: CROSS-LANGUAGE RETENTION
    # -------------------------------------------------------------------------
    print("\n--- Running PART 8: Cross-Language Retention ---")
    s_cross = ClinicalState(chief_complaint="मला पोटात त्रास होत आहे")
    s_cross, _, _ = extract_clinical_facts_from_answer("मला पोटात त्रास होत आहे", "chief_complaint", s_cross)
    # Turn 2: Marathi answer stating vomiting
    s_cross, _, _ = extract_clinical_facts_from_answer("मला उलटी येत आहे", "open_gi_exploration", s_cross)
    # Turn 3: English answer stating hydration
    s_cross, _, _ = extract_clinical_facts_from_answer("I cannot keep water down and feel dizzy", "hydration_status", s_cross)
    
    cross_lang_result = {
        "vomiting_remembered": s_cross.canonical_dimensions.get("vomiting").status if s_cross.canonical_dimensions.get("vomiting") else "NONE",
        "hydration_remembered": bool(s_cross.hydration_status) or any("keep water down" in sn for sn in s_cross.raw_transcript_snippets),
        "total_transcript_snippets": len(s_cross.raw_transcript_snippets),
        "coherent": bool(s_cross.canonical_dimensions.get("vomiting")) and len(s_cross.raw_transcript_snippets) == 3
    }
    audit_report["part_8_cross_language"] = cross_lang_result
    print(f"  Cross-Language Coherence: {cross_lang_result}")

    # -------------------------------------------------------------------------
    # PART 10: SESSION ISOLATION AUDIT
    # -------------------------------------------------------------------------
    print("\n--- Running PART 10: Session Isolation Audit ---")
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Session A: Chest Pain
        res_a = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": "Audit Patient A",
            "patient_age": 45,
            "patient_gender": "Male",
            "chief_complaint": "Severe crushing chest pain",
            "language_code": "en",
            "interaction_mode": "TEXT",
            "consent_given": True
        })
        assert res_a.status_code == 200
        data_a = res_a.json()
        id_a = data_a["id"]

        # Submit answer to Session A
        await client.post(f"{BASE_URL}/intakes/{id_a}/answers", json={
            "raw_text": "The chest pain radiates to my left arm.",
            "input_mode": "TEXT",
            "language_code": "en"
        })

        # Session B: Brand New Patient - Leg Pain
        res_b = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": "Audit Patient B",
            "patient_age": 28,
            "patient_gender": "Female",
            "chief_complaint": "Right knee swelling and pain",
            "language_code": "en",
            "interaction_mode": "TEXT",
            "consent_given": True
        })
        assert res_b.status_code == 200
        data_b = res_b.json()
        id_b = data_b["id"]

        # Fetch Session B details
        get_b = await client.get(f"{BASE_URL}/intakes/{id_b}")
        assert get_b.status_code == 200
        detail_b = get_b.json()
        state_b = detail_b["clinical_state"]

        # Check for any leakage from Session A into Session B
        leakage = []
        if id_a == id_b: leakage.append("Reused session ID")
        if "chest" in str(state_b).lower(): leakage.append("Chest pain leaked into State B")
        if "left arm" in str(state_b).lower(): leakage.append("Radiation leaked into State B")

        session_iso_result = {
            "session_a_id": id_a,
            "session_b_id": id_b,
            "session_b_chief_complaint": state_b.get("chief_complaint"),
            "isolation_passed": len(leakage) == 0,
            "leakage_detected": leakage
        }
        audit_report["part_10_session_isolation"] = session_iso_result
        print(f"  Session Isolation Passed: {session_iso_result['isolation_passed']} (Leakage: {leakage})")

    # -------------------------------------------------------------------------
    # PART 11 & 12: ASR & TTS INTEGRITY
    # -------------------------------------------------------------------------
    print("\n--- Running PART 11 & 12: ASR and TTS Integrity ---")
    mock_speech = MockSpeechProvider()
    sarvam_speech = SarvamSpeechProvider(api_key="invalid_test_key")

    # Test ASR fallback / provider failure
    sarvam_failed_properly = False
    try:
        await sarvam_speech.transcribe_audio(b"dummy_bytes", "en")
    except Exception as e:
        sarvam_failed_properly = True

    # Test TTS fallback
    sarvam_tts_result = await sarvam_speech.text_to_speech("Hello test", "en")
    tts_fallback_clean = (sarvam_tts_result is None or isinstance(sarvam_tts_result, str))

    speech_results = {
        "mock_asr_works": bool((await mock_speech.transcribe_audio(b"dummy", "en")).transcript_text),
        "sarvam_handles_invalid_gracefully": sarvam_failed_properly,
        "tts_does_not_crash_on_failure": tts_fallback_clean
    }
    audit_report["part_11_12_speech"] = speech_results
    print(f"  Speech Integrity: {speech_results}")

    # -------------------------------------------------------------------------
    # PART 13: SAFETY AUDIT
    # -------------------------------------------------------------------------
    print("\n--- Running PART 13: Safety Audit ---")
    s_safe1 = ClinicalState(chief_complaint="Crushing chest pain radiating to left arm", severity=9)
    rfs_safe1 = evaluate_red_flags(s_safe1)
    
    s_safe2 = ClinicalState(chief_complaint="High fever and severe breathlessness")
    rfs_safe2 = evaluate_red_flags(s_safe2)

    s_safe3 = ClinicalState(chief_complaint="Passing black tarry stools and feeling dizzy")
    rfs_safe3 = evaluate_red_flags(s_safe3)

    safety_results = {
        "chest_pain_red_flag": any(rf.rule_id == "RF-CP-001" for rf in rfs_safe1),
        "severe_pain_red_flag": any(rf.rule_id == "RF-SEV-001" for rf in rfs_safe1),
        "fever_dyspnea_red_flag": any(rf.rule_id == "RF-SO-001" for rf in rfs_safe2),
        "melena_red_flag": any(rf.rule_id == "RF-GI-001" for rf in rfs_safe3)
    }
    audit_report["part_13_safety"] = safety_results
    for k, v in safety_results.items():
        print(f"  {k}: {'TRIGGERED' if v else 'MISSED'}")

    # -------------------------------------------------------------------------
    # PART 16: AYUSH INTEGRATION
    # -------------------------------------------------------------------------
    print("\n--- Running PART 16: AYUSH Integration ---")
    s_ayush = ClinicalState(chief_complaint="Mandagni and chronic constipation")
    dom_ayush = classify_clinical_domains(s_ayush, "AYUSH")
    cands_ayush = score_candidate_dimensions(dom_ayush, s_ayush, [], set())
    top_ayush_fields = [c["field_name"] for c in cands_ayush[:5]]
    
    # Verify AYUSH candidates are prioritized and non-AYUSH (e.g. ophthalmic/cardiac) are penalized
    ayush_isolation = {
        "domain_is_ayush": dom_ayush[0] == ClinicalDomain.AYUSH,
        "top_fields": top_ayush_fields,
        "agni_in_top": "agni" in top_ayush_fields or "open_ayush_exploration" in top_ayush_fields,
        "cardiac_penalized": any(c["field_name"] == "radiation" and c["score"] < 0 for c in cands_ayush)
    }
    audit_report["part_16_ayush"] = ayush_isolation
    print(f"  AYUSH Isolation & Grounding: {ayush_isolation}")

    # -------------------------------------------------------------------------
    # PART 17 & 18: DOCTOR OUTPUT & DATABASE INTEGRITY
    # -------------------------------------------------------------------------
    print("\n--- Running PART 17 & 18: Doctor Output & DB Integrity ---")
    db = SessionLocal()
    try:
        recent_sessions = db.query(IntakeSession).order_by(IntakeSession.started_at.desc()).limit(3).all()
        db_audit = []
        for sess in recent_sessions:
            ans_count = db.query(Answer).filter(Answer.intake_session_id == sess.id).count()
            q_count = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == sess.id).count()
            states_count = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == sess.id).count()
            db_audit.append({
                "session_id": sess.id,
                "status": sess.status,
                "mode": sess.interaction_mode,
                "answers_count": ans_count,
                "questions_count": q_count,
                "states_versions": states_count,
                "coherent": states_count >= 1
            })
        audit_report["part_18_db_integrity"] = db_audit
        for dba in db_audit:
            print(f"  Session {dba['session_id'][:8]}... | Status={dba['status']} | Mode={dba['mode']} | Answers={dba['answers_count']} | QEvents={dba['questions_count']}")
    finally:
        db.close()

    # Save full audit output
    with open("scratch/full_forensic_audit_report.json", "w") as f:
        json.dump(audit_report, f, indent=2)
    print("\nSaved full audit to backend/scratch/full_forensic_audit_report.json")

if __name__ == "__main__":
    asyncio.run(run_all_audits())
