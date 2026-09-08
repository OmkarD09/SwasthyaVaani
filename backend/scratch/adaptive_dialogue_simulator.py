import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question, _assess_information_sufficiency
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.question_scorer import (
    score_candidate_dimensions,
    is_field_already_resolved,
    MAP_TO_CANONICAL
)
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.services.safety.red_flags import evaluate_red_flags


# Patient ground truth profiles for all 15 scenarios
PATIENT_PROFILES = {
    "1. Simple headache": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have a throbbing headache.",
        "answers": {
            "open_headache_exploration": "Mainly severe pain in my head, feeling sensitive to light and a bit nauseous, no weakness.",
            "open_general_exploration": "Just the bad headache, no other body symptoms.",
            "distribution": "It is on the right side of my head, around the temple.",
            "location": "Right temple and forehead.",
            "photophobia": "Yes, bright light and loud sounds make it significantly worse.",
            "duration": "It has been going on for 2 days now.",
            "onset": "Started gradually 2 days ago in the evening.",
            "nausea_vomiting": "Mild nausea, but no vomiting.",
            "visual_aura": "No zigzag lines or flashes before it started.",
            "character": "Throbbing and pulsing pain.",
            "severity": "It is about 6 out of 10 in pain severity.",
            "triggers": "Work stress and looking at laptop screens."
        },
        "default": "No, nothing else regarding that."
    },
    "2. Simple fever/cough": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have high fever and cough.",
        "answers": {
            "open_respiratory_exploration": "I have fever, cough, and body ache. Breathing is okay, no chest pain.",
            "open_fever_exploration": "Fever with shivering chills, severe bodyache, no rash.",
            "open_general_exploration": "Just fever and cough, nothing else.",
            "duration": "Started 3 days ago.",
            "onset": "Started suddenly after getting wet in the rain.",
            "cough_type": "It is a dry hacking cough, no phlegm or mucus.",
            "breathlessness": "No shortness of breath, I can breathe fine.",
            "fever_pattern": "Fever spikes to 102 in the evenings with shivering chills.",
            "associated_bodyache": "Yes, severe generalized bodyache and headache.",
            "cough_throat": "Mild scratchy sore throat.",
            "urinary_symptoms": "No burning when passing urine.",
            "sputum_color": "No sputum, dry cough.",
            "chest_tightness": "No chest tightness."
        },
        "default": "No, that is not present."
    },
    "3. Simple abdominal pain": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have burning stomach pain.",
        "answers": {
            "open_gi_exploration": "Burning pain in upper belly with acidity and sour burps. No vomiting or loose motions.",
            "open_general_exploration": "No other problems besides this stomach burning.",
            "problem_clarification": "Mainly burning pain and acidity in my upper stomach.",
            "abdominal_location": "Upper middle abdomen, right below the breastbone.",
            "location": "Upper abdomen / epigastrium.",
            "duration": "For the past 4 days.",
            "onset": "Gradual onset over the last 4 days.",
            "meal_relationship": "It gets worse 1 hour after eating spicy food or on an empty stomach.",
            "antacid_relief": "Drinking cold milk or taking antacid tablet relieves it temporarily.",
            "radiation_to_chest": "Yes, the burning travels up towards my chest and throat.",
            "bloating": "Yes, feeling bloated and gassy after meals.",
            "food_exposure": "Ate spicy fried street food 4 days ago.",
            "vomiting": "No vomiting.",
            "stool_frequency": "Normal bowel habits once a day.",
            "stool_consistency": "Normal formed stool, no diarrhea.",
            "blood_in_stool": "No blood and no black stool."
        },
        "default": "No, nothing unusual there."
    },
    "4. GI with vomiting + dehydration": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have severe vomiting and loose watery stools.",
        "answers": {
            "open_gi_exploration": "Continuous vomiting and watery loose motions since morning, feeling very dehydrated.",
            "duration": "Started 12 hours ago early this morning.",
            "onset": "Sudden onset around 4 AM.",
            "vomiting": "I have vomited 6 times and cannot keep any water or ORS down.",
            "hydration_status": "Severe thirst, dry mouth, weakness, and lightheadedness when standing.",
            "food_exposure": "Ate street food (pani puri and chaat) yesterday evening from an open stall.",
            "stool_consistency": "Watery liquid stool with yellow color, no blood.",
            "stool_frequency": "Passed loose motions 5 times today.",
            "abdominal_location": "Cramping pain all over my abdomen before passing stool.",
            "blood_in_stool": "No blood in stool or vomit, not dark.",
            "fever": "Mild feverish warmth, no high chills.",
            "bloating": "Yes, stomach feels gurgling and crampy."
        },
        "default": "No, nothing else."
    },
    "5. Musculoskeletal pain": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have pain in my right knee.",
        "answers": {
            "open_msk_exploration": "Pain in my right knee, swelling when walking, no other joint pain.",
            "location": "Right knee joint anterior aspect.",
            "duration": "For the past 5 days.",
            "onset": "Started gradually after walking up several flights of stairs 5 days ago.",
            "injury_history": "No direct fall, twist, or trauma.",
            "swelling_warmth": "Mild swelling around the knee cap and stiffness in the morning, no warmth or redness.",
            "severity": "Pain is 6 out of 10 on movement, 2 at rest.",
            "character": "Dull aching pain that worsens with weight-bearing.",
            "relieving_factors": "Resting and keeping knee elevated relieves it."
        },
        "default": "No other joints affected."
    },
    "6. Multi-symptom presentation": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have joint pains, a skin rash on my arms, low fever, and extreme fatigue.",
        "answers": {
            "open_general_exploration": "Multiple symptoms: joints ache, red rash across arms and cheeks, low fever, and fatigue.",
            "duration": "All these symptoms started together about 10 days ago.",
            "onset": "Gradual progression over the last 10 days.",
            "location": "Small joints in both hands, wrists, and erythematous rash on forearms and face.",
            "itching_pruritus": "The rash is mildly itchy and flares up in the sun.",
            "swelling_warmth": "Morning stiffness in finger joints for about an hour, mild swelling.",
            "fever_pattern": "Low-grade continuous fever around 99-100 F.",
            "character": "Aching stiffness in joints, raised reddish patches on skin.",
            "breathlessness": "No shortness of breath or chest pain.",
            "cough_type": "No cough.",
            "severity": "Fatigue and joint pain is about 6 out of 10.",
            "spread_progression": "Rash spread from face to both forearms over the week."
        },
        "default": "No other symptoms."
    },
    "7. Respiratory presentation": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have difficulty breathing, chest tightness, and wheezing.",
        "answers": {
            "open_respiratory_exploration": "Trouble breathing, wheezing sound when exhaling, tight chest at night. No fever.",
            "duration": "For the past 3 days.",
            "onset": "Started 3 days ago at night after exposure to dust.",
            "cough_type": "Dry irritant cough, especially when lying flat.",
            "breathlessness": "Shortness of breath on walking just 20 meters, wheezing sound audible.",
            "chest_tightness": "Constricting tightness across the chest.",
            "triggers": "Triggered by cold morning air, dust, and smoke.",
            "fever": "No fever, no chills.",
            "sputum_color": "No phlegm or sputum brought up.",
            "location": "Bilateral chest tightness."
        },
        "default": "No other respiratory complaints."
    },
    "8. Urinary presentation": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have severe burning when passing urine.",
        "answers": {
            "open_urinary_exploration": "Severe burning sensation, frequent urge to pass urine, pelvic discomfort.",
            "duration": "Started 2 days ago.",
            "onset": "Sudden onset yesterday morning.",
            "dysuria_burning": "Intense burning and sharp pain every time I pass urine.",
            "urinary_frequency": "Passing urine every 30 to 45 minutes, only small drops come out.",
            "hematuria_blood": "No visible blood in urine, but it looks cloudy and dark.",
            "fever": "Low grade fever with mild shivering.",
            "flank_pain": "No back or flank pain, just lower abdomen pressure.",
            "severity": "Burning pain is 7 out of 10."
        },
        "default": "No other urinary symptoms."
    },
    "9. Dermatology presentation": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have an intensely itchy red rash on my chest and back.",
        "answers": {
            "open_dermatology_exploration": "Red raised rash that itches terribly, spreads across chest and back. No fever.",
            "duration": "It appeared 4 days ago.",
            "onset": "Erupted suddenly in the evening 4 days ago.",
            "itching_pruritus": "Severe intense itching, especially at night, 8 out of 10.",
            "location": "Mid-chest, spreading to upper back and neck.",
            "character": "Red raised hives and bumps, warm to touch, no blisters or pus.",
            "spread_progression": "Started on central chest and spread to back over 2 days.",
            "severity": "Itching discomfort is 8 out of 10.",
            "triggers": "Started 1 day after starting a new health supplement."
        },
        "default": "No other skin lesions."
    },
    "10. AYUSH presentation": {
        "workflow": "AYUSH",
        "chief_complaint": "I have chronic indigestion, gas, and irregular bowel movements.",
        "answers": {
            "open_ayush_exploration": "Appetite is very low, gas and heaviness after eating, bowels are irregular and constipated.",
            "duration": "For the past 6 months.",
            "onset": "Gradual chronic onset over 6 months.",
            "agni": "Mandagni: very weak appetite, food feels sitting in stomach for 5-6 hours without digesting.",
            "koshtha": "Krura koshtha: hard dry stool passed once in 2-3 days with straining.",
            "ahara_vihara": "I eat irregular meals, spicy and deep fried snacks, late dinner at 11 PM and go to bed immediately.",
            "sleep_pattern": "Disturbed sleep, waking up multiple times, daytime heaviness.",
            "relieving_factors": "Warm water and fasting provides slight relief.",
            "sattva": "Moderate stress, irritability when hungry (Madhyama sattva).",
            "ahara_shakti": "Low food intake capacity (Avara ahara shakti).",
            "vyayama_shakti": "Low physical stamina, easily fatigued (Avara vyayama shakti).",
            "satmya": "Accustomed to oily and pungent foods, cannot tolerate curd or cold milk.",
            "location": "Upper abdomen and gastrointestinal tract."
        },
        "default": "Balanced / normal constitutional state."
    },
    "11. Complex AYUSH + modern symptom presentation": {
        "workflow": "AYUSH",
        "chief_complaint": "Severe acid reflux, burning chest (Amlapitta), insomnia, and multi-joint stiffness.",
        "answers": {
            "open_ayush_exploration": "Severe retrosternal burning, sour belching, sleep disturbed, and finger/knee joint stiffness.",
            "duration": "Chronic for 1 year, getting worse over the last 2 months.",
            "onset": "Gradual onset 1 year ago.",
            "agni": "Tikshnagni with Vidagdha jeerna: intense hunger but immediate acid burning and sour regurgitation.",
            "koshtha": "Mrudu koshtha: burning loose stools 2-3 times a day.",
            "ahara_vihara": "Excessive intake of tea (5 cups daily), sour pickles, fermented foods, night shifts.",
            "sleep_pattern": "Severe insomnia, restless sleep, waking at 2 AM with heart burn.",
            "sattva": "High anxiety, emotional distress, poor stress resilience (Avara sattva).",
            "ahara_shakti": "Moderate intake capacity but poor digestive assimilation.",
            "vyayama_shakti": "Severe chronic fatigue, muscle wasting and weakness.",
            "location": "Chest, stomach, knee joints, and finger joints.",
            "swelling_warmth": "Morning joint stiffness lasting 45 minutes in hands and knees.",
            "satmya": "Habituated to pungent and sour foods.",
            "relieving_factors": "Cooling drinks and milk give very short temporary relief."
        },
        "default": "No other symptoms."
    },
    "12. Ambiguous/non-informative patient": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I don't feel good.",
        "answers": {
            # Returns vague answers across all fields
        },
        "default": "I don't know, just feeling sick."
    },
    "13. Safety/red-flag presentation": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have crushing chest pain that started 30 minutes ago.",
        "answers": {
            "open_cardiac_exploration": "Heavy crushing chest pain, radiating to my left arm, cold sweating, feeling faint.",
            "radiation": "The heavy pain is radiating down my left arm, shoulder, and jaw.",
            "character": "Crushing heavy pressure like an elephant sitting on my chest.",
            "sweating_diaphoresis": "Yes, I am sweating cold sweat profusely, very pale, and feeling dizzy.",
            "breathlessness": "Yes, severe shortness of breath with chest tightness.",
            "duration": "Started 30 minutes ago while resting in a chair.",
            "onset": "Sudden acute onset at rest 30 minutes ago.",
            "severity": "10 out of 10, excruciating pressure.",
            "location": "Center of chest under breastbone."
        },
        "default": "Very severe chest distress."
    },
    "14. Rich first answer": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have had a severe throbbing migraine on the left side of my head for 3 days, with intense light sensitivity, nausea, and visual aura with flashing zigzag lines, no fever, no neck stiffness, pain is 8 out of 10.",
        "answers": {
            "triggers": "Lack of sleep and continuous laptop glare.",
            "relieving_factors": "Sleeping in a completely dark room.",
            "open_headache_exploration": "Nothing else, just this severe throbbing migraine.",
            "duration": "Started 3 days ago.",
            "distribution": "Left side of head, temple and behind eye.",
            "photophobia": "Severe photophobia and phonophobia."
        },
        "default": "Everything else was described in my first answer."
    },
    "15. Minimal/vague first answer": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "Pain.",
        "answers": {
            "clarify_problem": "I have pain in my stomach.",
            "problem_clarification": "Pain in my stomach.",
            "open_general_exploration": "Pain in my stomach, nothing else.",
            "open_gi_exploration": "Stomach pain in upper abdomen, no loose motions, no vomiting.",
            "location": "Upper abdomen.",
            "abdominal_location": "Upper stomach.",
            "duration": "Started 2 days ago.",
            "onset": "Gradual onset 2 days ago.",
            "character": "Cramping and burning sensation.",
            "severity": "Moderate pain, 5 out of 10.",
            "food_exposure": "Normal home cooked food.",
            "meal_relationship": "Hurts when I am hungry before meals."
        },
        "default": "No, just that."
    }
}


async def simulate_scenario(name, profile, max_ceiling):
    workflow = profile["workflow"]
    cc = profile["chief_complaint"]
    answers_dict = profile.get("answers", {})
    default_ans = profile.get("default", "No, nothing else.")
    
    state = ClinicalState()
    # Populate chief complaint
    state.chief_complaint = cc
    state.raw_transcript_snippets.append(cc)
    state, _, _ = extract_clinical_facts_from_answer(cc, "chief_complaint", state)
    
    asked_questions = []
    log = []
    sufficiency_turn = None
    safety_turn = None
    max_q_reached = False
    terminated = False
    term_turn = None
    term_reason = None
    remaining_viable_at_term = []
    consecutive_low_progress = 0
    
    # Run turns up to max_ceiling + 2
    for turn in range(1, max_ceiling + 5):
        # 1. Red flags check
        rfs = evaluate_red_flags(state)
        state.red_flags = rfs
        if rfs and safety_turn is None:
            safety_turn = turn

        # 2. Check max questions ceiling
        if turn > max_ceiling:
            max_q_reached = True
            terminated = True
            term_turn = turn - 1
            term_reason = f"Safety limit reached (MAX_QUESTIONS={max_ceiling}). Marking as LIMITED_HISTORY."
            # Retrieve remaining viable candidates
            domains = classify_clinical_domains(state, workflow)
            cands = score_candidate_dimensions(domains, state, asked_questions, set(state.resolved_dimensions))
            remaining_viable_at_term = [c for c in cands if not is_field_already_resolved(c["field_name"], state) and c["score"] > 0]
            break

        # 3. Check low progress guardrail
        if consecutive_low_progress >= 2:
            terminated = True
            term_turn = turn - 1
            term_reason = f"No meaningful clinical information progress detected for {consecutive_low_progress} turns. Stopping interview."
            domains = classify_clinical_domains(state, workflow)
            cands = score_candidate_dimensions(domains, state, asked_questions, set(state.resolved_dimensions))
            remaining_viable_at_term = [c for c in cands if not is_field_already_resolved(c["field_name"], state) and c["score"] > 0]
            break

        # 4. Classify domains & score candidate dimensions
        domains = classify_clinical_domains(state, workflow)
        primary_domain = domains[0] if domains else ClinicalDomain.GENERAL
        asked_targets = set(state.resolved_dimensions)
        candidates = score_candidate_dimensions(domains, state, asked_questions, asked_targets)
        viable = [c for c in candidates if not is_field_already_resolved(c["field_name"], state) and c["score"] > 0]

        # 5. Check information sufficiency
        is_suff, suff_reason = _assess_information_sufficiency(state, primary_domain, viable, turn - 1)
        if is_suff:
            if sufficiency_turn is None:
                sufficiency_turn = turn - 1
            terminated = True
            term_turn = turn - 1
            term_reason = suff_reason or f"Clinical information sufficiency achieved for {primary_domain} presentation."
            remaining_viable_at_term = viable
            break

        if not viable:
            terminated = True
            term_turn = turn - 1
            term_reason = f"Minimum Sufficient History: All relevant clinical dimensions for this complaint are resolved."
            remaining_viable_at_term = []
            break

        # 6. Select top viable candidate
        selected_candidate = viable[0]
        target_field = selected_candidate["field_name"]
        reasoning_mode = selected_candidate.get("reasoning_mode", "TARGETED_FOLLOW_UP")
        score = selected_candidate["score"]
        
        # Formulate mock question
        mock_q = f"Question {turn}: Please describe your {target_field} ({selected_candidate['label']})?"
        asked_questions.append(mock_q)
        if target_field not in state.resolved_dimensions:
            state.resolved_dimensions.append(target_field)

        # 7. Patient provides answer matching target_field from profile
        patient_reply = answers_dict.get(target_field)
        if not patient_reply:
            canon = MAP_TO_CANONICAL.get(target_field, target_field)
            patient_reply = answers_dict.get(canon, default_ans)

        # 8. Extract clinical facts from answer into state
        state, extracted, has_progress = extract_clinical_facts_from_answer(patient_reply, target_field, state)
        if has_progress:
            consecutive_low_progress = 0
        else:
            consecutive_low_progress += 1

        log.append({
            "turn": turn,
            "target_field": target_field,
            "reasoning_mode": reasoning_mode,
            "score": score,
            "viable_count": len(viable),
            "patient_reply": patient_reply,
            "top_candidates": [
                {"field": c["field_name"], "score": c["score"], "mode": c["reasoning_mode"]}
                for c in viable[:3]
            ]
        })

    return {
        "scenario": name,
        "ceiling": max_ceiling,
        "total_questions_asked": term_turn if term_turn is not None else len(log),
        "sufficiency_turn": sufficiency_turn,
        "safety_turn": safety_turn,
        "max_q_reached": max_q_reached,
        "final_reason": term_reason,
        "remaining_viable_count": len(remaining_viable_at_term),
        "remaining_viable_candidates": [
            {"field": c["field_name"], "score": c["score"], "mode": c.get("reasoning_mode"), "domain": c["domain"]}
            for c in remaining_viable_at_term[:5]
        ],
        "log": log
    }


async def main():
    print("====================================================================================================")
    print("ADAPTIVE CLINICAL DIALOGUE SIMULATION: 10 vs 12 vs 15 CEILINGS")
    print("====================================================================================================")

    res_10 = {}
    res_12 = {}
    res_15 = {}

    for name, prof in PATIENT_PROFILES.items():
        res_10[name] = await simulate_scenario(name, prof, 10)
        res_12[name] = await simulate_scenario(name, prof, 12)
        res_15[name] = await simulate_scenario(name, prof, 15)

    print("\n" + "="*125)
    print(f"{'SCENARIO':<40} | {'CEIL 10':<9} | {'CEIL 12':<9} | {'CEIL 15':<9} | {'SUFF TURN':<10} | {'HIT 10?':<8} | {'REMAINING VIABLE @ 10':<25}")
    print("="*125)

    for name in PATIENT_PROFILES.keys():
        r10 = res_10[name]
        r12 = res_12[name]
        r15 = res_15[name]
        suff = str(r10["sufficiency_turn"]) if r10["sufficiency_turn"] is not None else "None"
        hit10 = "YES" if r10["max_q_reached"] else "no"
        rem_count = r10["remaining_viable_count"]
        rem_top = ", ".join([c["field"] for c in r10["remaining_viable_candidates"][:2]]) or "None"
        print(f"{name:<40} | {r10['total_questions_asked']:<9} | {r12['total_questions_asked']:<9} | {r15['total_questions_asked']:<9} | {suff:<10} | {hit10:<8} | {rem_count} ({rem_top})")

    # Output detailed log of any scenario that reached 10 or had unresolved high-yield candidates
    print("\n" + "="*125)
    print("SCENARIO TURN BREAKDOWN")
    print("="*125)
    for name, r10 in res_10.items():
        print(f"\n--- {name} ---")
        print(f"Total Questions Asked: {r10['total_questions_asked']} | Sufficiency: {r10['sufficiency_turn']} | Safety: {r10['safety_turn']} | Max Q Reached: {r10['max_q_reached']}")
        print(f"Final Reason: {r10['final_reason']}")
        for step in r10["log"]:
            print(f"  Q{step['turn']}: [{step['target_field']}] (mode={step['reasoning_mode']}, score={step['score']}) -> '{step['patient_reply'][:50]}...'")
        if r10['remaining_viable_candidates']:
            print(f"  Remaining Viable Candidates ({r10['remaining_viable_count']}):")
            for c in r10['remaining_viable_candidates']:
                print(f"    - {c['field']} (score={c['score']}, mode={c['mode']}, domain={c['domain']})")

    import json
    with open(os.path.join(os.path.dirname(__file__), "adaptive_simulation_results.json"), "w") as f:
        json.dump({"res_10": res_10, "res_12": res_12, "res_15": res_15}, f, indent=2)

if __name__ == "__main__":
    asyncio.run(main())
