import asyncio
import os
import sys

# Ensure backend directory is in sys.path
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


# Define the 15 clinical test scenarios with full patient transcripts
SCENARIOS = {
    "1. Simple headache": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "I have a throbbing headache."),
            ("distribution", "It is on the right side of my head around my temple."),
            ("photophobia", "Yes, bright sunlight and loud sounds make the headache much worse."),
            ("character", "It feels like a pulsing, throbbing pain."),
            ("nausea_vomiting", "No nausea and no vomiting."),
            ("visual_aura", "No visual flashes or aura."),
            ("severity", "The pain is about 6 out of 10."),
            ("duration", "It has been going on for 2 days."),
            ("triggers", "Stress at work and lack of sleep."),
            ("onset", "It started gradually 2 days ago.")
        ]
    },
    "2. Simple fever/cough": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "I have fever and cough."),
            ("duration", "It started 3 days ago."),
            ("cough_type", "It is a dry hacking cough with no mucus or sputum."),
            ("fever_pattern", "High fever with chills in the evening, comes and goes."),
            ("breathlessness", "No shortness of breath, I can breathe normally."),
            ("associated_bodyache", "Severe body ache and headache."),
            ("onset", "It started suddenly after getting wet in rain."),
            ("severity", "Fever was 102 degrees."),
            ("cough_throat", "Mild sore throat when swallowing."),
            ("urinary_symptoms", "No burning urination.")
        ]
    },
    "3. Simple abdominal pain": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "I have burning pain in my upper abdomen."),
            ("duration", "It has been bothering me for 4 days."),
            ("meal_relationship", "The pain gets worse after eating spicy food or when stomach is empty."),
            ("antacid_relief", "Drinking cold milk or taking antacid tablet gives temporary relief."),
            ("open_gi_exploration", "No vomiting, no loose motions, no black stool, just acidity."),
            ("radiation_to_chest", "Sometimes the burning sensation rises up to my chest and throat."),
            ("bloating", "Yes, I feel bloated and full easily."),
            ("onset", "Started gradually 4 days ago."),
            ("severity", "Pain is about 5 out of 10."),
            ("food_exposure", "I ate very oily street food last weekend.")
        ]
    },
    "4. GI with vomiting + dehydration": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "I have severe vomiting and watery loose motions."),
            ("duration", "Started 12 hours ago since early morning."),
            ("vomiting", "I have vomited 6 times today and cannot keep any water or fluids down."),
            ("hydration_status", "I am feeling extremely weak, very thirsty, dry mouth and dizzy when standing."),
            ("stool_consistency", "Completely watery diarrhea, passed 5 or 6 times."),
            ("food_exposure", "I had food from a roadside stall yesterday evening."),
            ("stool_frequency", "Going to the toilet every 1 to 2 hours."),
            ("blood_in_stool", "No blood in vomit or stool."),
            ("fever", "Mild feverish feeling."),
            ("abdominal_location", "Cramping pain all over my belly.")
        ]
    },
    "5. Musculoskeletal pain": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "My right knee is paining."),
            ("duration", "For the past 5 days."),
            ("swelling_warmth", "There is mild swelling around the knee and stiffness in the morning, no warmth."),
            ("injury_history", "No fall or twist, pain started after climbing stairs."),
            ("severity", "Pain is 6 out of 10 when putting weight on it."),
            ("character", "Dull aching pain that worsens with walking."),
            ("onset", "Gradual onset over 5 days."),
            ("open_msk_exploration", "No other joint pain, only the right knee."),
            ("location", "Right knee joint anterior aspect."),
            ("relieving_factors", "Resting and applying warm compress helps.")
        ]
    },
    "6. Multi-symptom presentation": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "I have joint pains, a skin rash on my arms, low fever, and severe fatigue."),
            ("duration", "All these symptoms started about 10 days ago."),
            ("location", "Rash is on both forearms and cheeks, joints hurting are wrists and fingers."),
            ("itching_pruritus", "The rash is mildly itchy and feels hot after sunlight exposure."),
            ("swelling_warmth", "Small joints of hands have morning stiffness for 1 hour."),
            ("fever_pattern", "Low-grade continuous fever around 99-100 F."),
            ("breathlessness", "No chest pain or breathlessness."),
            ("cough_type", "No cough."),
            ("open_general_exploration", "Feeling completely exhausted with loss of appetite."),
            ("character", "Aching joint pain and butterfly-like erythematous rash.")
        ]
    },
    "7. Respiratory presentation": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "I have difficulty breathing and chest tightness with wheezing."),
            ("duration", "Since 3 days, getting worse at night."),
            ("cough_type", "Dry coughing spells especially when lying down."),
            ("breathlessness", "Shortness of breath on walking just a few steps, audible wheezing sound."),
            ("fever", "No fever or chills."),
            ("triggers", "Triggered by cold morning air and construction dust near my house."),
            ("sputum_color", "No phlegm or sputum brought up."),
            ("chest_tightness", "Constriction across the front of chest."),
            ("onset", "Started 3 days ago."),
            ("location", "Bilateral chest.")
        ]
    },
    "8. Urinary presentation": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "Severe burning sensation when passing urine."),
            ("duration", "Started 2 days ago."),
            ("dysuria_burning", "Sharp burning pain every time I pass urine."),
            ("urinary_frequency", "Passing urine every 30-45 minutes, only small quantity each time."),
            ("hematuria_blood", "No blood seen in urine, but urine looks cloudy and dark yellow."),
            ("fever", "Mild fever with chills since last night."),
            ("flank_pain", "Mild discomfort in lower pelvic area, no back or flank pain."),
            ("onset", "Sudden onset 2 days ago."),
            ("severity", "Burning severity is 7 out of 10."),
            ("open_urinary_exploration", "No urethral discharge.")
        ]
    },
    "9. Dermatology presentation": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "Intensely itchy red rash on my chest and back."),
            ("duration", "It appeared 4 days ago."),
            ("itching_pruritus", "Very severe itching that keeps me awake at night."),
            ("location", "Starts from mid-chest and spreads to upper back."),
            ("character", "Erythematous raised bumps and wheals that come and go."),
            ("spread_progression", "Started on chest 4 days ago and spread to back yesterday."),
            ("onset", "Sudden eruption in evening."),
            ("severity", "Itching discomfort 8 out of 10."),
            ("open_dermatology_exploration", "No fever, no joint pain, no facial swelling."),
            ("triggers", "Started after taking a new medication / antibiotic.")
        ]
    },
    "10. AYUSH presentation": {
        "workflow": "AYUSH",
        "turns": [
            ("chief_complaint", "I have chronic indigestion, heaviness after eating, and irregular bowels."),
            ("duration", "Suffering from this for the past 6 months."),
            ("agni", "My appetite is sluggish and food feels sitting in stomach for hours (Mandagni)."),
            ("koshtha", "Bowel evacuation is hard, dry, and irregular, every 2-3 days (Krura koshtha)."),
            ("ahara_vihara", "I eat heavy oily fried meals late at night around 11 PM and immediately sleep."),
            ("sleep_pattern", "Disturbed sleep, waking up feeling tired and heavy in the morning."),
            ("sattva", "High work stress and constant anxiety, gets easily irritated (Avara sattva)."),
            ("ahara_shakti", "Intake capacity is low, cannot digest normal portion size."),
            ("vyayama_shakti", "Low physical endurance, gets tired climbing one flight of stairs."),
            ("satmya", "Habituated to pungent spicy foods, cannot tolerate dairy or cold items.")
        ]
    },
    "11. Complex AYUSH + modern symptom presentation": {
        "workflow": "AYUSH",
        "turns": [
            ("chief_complaint", "Severe acid reflux with burning chest (Amlapitta), insomnia, and multiple joint stiffness."),
            ("duration", "Problems started about 1 year ago and progressively worsened."),
            ("agni", "Sharp hunger initially but severe burning and sour belching immediately after meals (Tikshnagni / Vidagdha)."),
            ("koshtha", "Loose burning stools twice daily (Mrudu koshtha)."),
            ("location", "Retrosternal chest burning and bilateral knee and small finger joints."),
            ("ahara_vihara", "Irregular eating habits, high intake of tea, pickles, and tobacco."),
            ("sleep_pattern", "Insomnia, unable to sleep past 2 AM due to burning and restlessness."),
            ("sattva", "Severe emotional distress, anxiety, chronic work frustration."),
            ("swelling_warmth", "Morning joint stiffness lasting 45 minutes, swelling in finger joints."),
            ("vyayama_shakti", "Chronic physical fatigue, muscle weakness (Dhatukshaya).")
        ]
    },
    "12. Ambiguous/non-informative patient": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "I don't feel good."),
            ("general", "I don't know, just feeling sick."),
            ("general", "Not sure."),
            ("general", "Can't say."),
            ("general", "Idk."),
            ("general", "Whatever."),
            ("general", "What do you mean?"),
            ("general", "Leave it."),
            ("general", "Nothing."),
            ("general", "I don't know.")
        ]
    },
    "13. Safety/red-flag presentation": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "I have crushing chest pain that started 30 minutes ago."),
            ("radiation", "The crushing pain is radiating to my left arm, shoulder, and jaw."),
            ("sweating_diaphoresis", "Yes, I am sweating profusely, pale, and feeling dizzy and faint."),
            ("breathlessness", "Severe difficulty catching my breath."),
            ("duration", "Started 30 minutes ago while sitting."),
            ("character", "Heavy weight like an elephant sitting on my chest."),
            ("onset", "Sudden onset at rest."),
            ("severity", "10 out of 10 maximum intensity."),
            ("location", "Substernal central chest."),
            ("open_cardiac_exploration", "Nauseous and lightheaded.")
        ]
    },
    "14. Rich first answer": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "I have had a severe throbbing migraine on the left side of my head for 3 days, with intense light sensitivity, nausea, and visual aura with flashing zigzag lines, no fever, no neck stiffness, pain is 8 out of 10."),
            ("triggers", "Triggered by lack of sleep and bright computer screens."),
            ("relieving_factors", "Lying in a dark quiet room helps slightly."),
            ("medications", "Paracetamol gave no relief."),
            ("onset", "Started 3 days ago morning."),
            ("character", "Pulsating throbbing."),
            ("distribution", "Left temporal and orbital region."),
            ("open_headache_exploration", "No weakness or speech difficulty."),
            ("history", "History of similar headaches once a month."),
            ("duration", "Lasts 3 days each episode.")
        ]
    },
    "15. Minimal/vague first answer": {
        "workflow": "GENERAL_CLINICAL",
        "turns": [
            ("chief_complaint", "Pain."),
            ("location", "In my stomach."),
            ("duration", "2 days."),
            ("character", "Cramping pain."),
            ("open_gi_exploration", "A bit nauseous, no loose motions, no vomiting."),
            ("food_exposure", "Just regular home food."),
            ("severity", "Moderate pain, around 5."),
            ("meal_relationship", "Hurts more before food."),
            ("antacid_relief", "Haven't taken any medicine."),
            ("onset", "Started 2 days ago.")
        ]
    }
}


async def run_scenario_with_ceiling(scenario_name, config, max_q):
    workflow = config["workflow"]
    turns = config["turns"]
    
    state = ClinicalState()
    asked_questions = []
    
    log = []
    sufficiency_turn = None
    safety_turn = None
    max_q_reached = False
    terminated = False
    term_turn = None
    term_reason = None
    remaining_viable_at_term = []
    
    for turn_idx, (turn_field, turn_answer) in enumerate(turns, start=1):
        if turn_idx == 1:
            # First turn: populate chief complaint
            state.chief_complaint = turn_answer
            state.raw_transcript_snippets.append(turn_answer)
            # Run extraction
            state, _, _ = extract_clinical_facts_from_answer(turn_answer, "chief_complaint", state)
        else:
            # Subsequent turn: patient answers last question target field
            last_target = log[-1]["target_field"] if log else turn_field
            state, _, _ = extract_clinical_facts_from_answer(turn_answer, last_target, state)
            state.raw_transcript_snippets.append(turn_answer)

        # Check safety/red-flags
        rfs = evaluate_red_flags(state)
        state.red_flags = rfs
        if rfs and safety_turn is None:
            safety_turn = turn_idx

        # Classify domains & score candidates
        domains = classify_clinical_domains(state, workflow)
        primary_domain = domains[0] if domains else ClinicalDomain.GENERAL
        asked_targets = set(state.resolved_dimensions)
        candidates = score_candidate_dimensions(domains, state, asked_questions, asked_targets)
        viable = [c for c in candidates if not is_field_already_resolved(c["field_name"], state) and c["score"] > 0]
        
        # Check sufficiency independently
        is_suff, suff_reason = _assess_information_sufficiency(state, primary_domain, viable, turn_idx)
        if is_suff and sufficiency_turn is None:
            sufficiency_turn = turn_idx

        # Evaluate decision with ceiling = max_q
        # Note: In production code, line 252 checks total_questions_asked >= max_questions
        # Here total_questions_asked is turn_idx (how many questions/answers completed)
        if turn_idx >= max_q:
            decision_action = "STOP"
            decision_reason = f"Safety limit reached (MAX_QUESTIONS={max_q}). Marking as LIMITED_HISTORY."
            max_q_reached = True
            terminated = True
            term_turn = turn_idx
            term_reason = decision_reason
            remaining_viable_at_term = viable
            log.append({
                "turn": turn_idx,
                "action": decision_action,
                "reason": decision_reason,
                "target_field": None,
                "viable_count": len(viable),
                "top_viable": viable[:3]
            })
            break

        # Check consecutive low progress
        # If vague/non-informative answers
        non_info_phrases = ["don't know", "not sure", "can't say", "idk", "whatever", "leave it", "nothing"]
        is_non_info = any(p in turn_answer.lower() for p in non_info_phrases)
        
        if is_suff or not viable:
            decision_action = "STOP"
            decision_reason = suff_reason or f"Clinical information sufficiency achieved for {primary_domain} presentation."
            terminated = True
            term_turn = turn_idx
            term_reason = decision_reason
            remaining_viable_at_term = viable
            log.append({
                "turn": turn_idx,
                "action": decision_action,
                "reason": decision_reason,
                "target_field": None,
                "viable_count": len(viable),
                "top_viable": viable[:3]
            })
            break

        # If continuing, pick top viable candidate
        top_cand = viable[0]
        target_field = top_cand["field_name"]
        decision_action = "ASK"
        decision_reason = f"Targeting high-gain clinical dimension [{target_field}]"
        mock_q = f"Could you please describe your {target_field}?"
        asked_questions.append(mock_q)
        if target_field not in state.resolved_dimensions:
            state.resolved_dimensions.append(target_field)
            
        log.append({
            "turn": turn_idx,
            "action": decision_action,
            "reason": decision_reason,
            "target_field": target_field,
            "score": top_cand["score"],
            "reasoning_mode": top_cand.get("reasoning_mode"),
            "viable_count": len(viable),
            "top_viable": viable[:3]
        })

    return {
        "scenario": scenario_name,
        "max_q": max_q,
        "total_questions_asked": term_turn or len(log),
        "sufficiency_turn": sufficiency_turn,
        "safety_turn": safety_turn,
        "max_q_reached": max_q_reached,
        "final_action": decision_action if terminated else log[-1]["action"],
        "final_reason": term_reason or log[-1]["reason"],
        "remaining_viable_count": len(remaining_viable_at_term),
        "remaining_viable_candidates": [
            {"field": c["field_name"], "score": c["score"], "mode": c.get("reasoning_mode"), "domain": c["domain"]}
            for c in remaining_viable_at_term[:5]
        ],
        "log": log
    }


async def main():
    print("================================================================================")
    print("AUDITING ADAPTIVE INTERVIEW QUESTION CEILINGS: 10 vs 12 vs 15")
    print("================================================================================")

    results_10 = {}
    results_12 = {}
    results_15 = {}

    for name, config in SCENARIOS.items():
        res10 = await run_scenario_with_ceiling(name, config, 10)
        res12 = await run_scenario_with_ceiling(name, config, 12)
        res15 = await run_scenario_with_ceiling(name, config, 15)
        results_10[name] = res10
        results_12[name] = res12
        results_15[name] = res15

    print("\n" + "="*110)
    print(f"{'SCENARIO':<40} | {'CEIL 10':<10} | {'CEIL 12':<10} | {'CEIL 15':<10} | {'SUFF TURN':<10} | {'HIT 10?':<8} | {'REMAINING VIABLE @ 10':<20}")
    print("="*110)

    for name in SCENARIOS.keys():
        r10 = results_10[name]
        r12 = results_12[name]
        r15 = results_15[name]
        suff = str(r10["sufficiency_turn"]) if r10["sufficiency_turn"] is not None else "None"
        hit10 = "YES" if r10["max_q_reached"] else "no"
        rem_count = r10["remaining_viable_count"]
        rem_top = ", ".join([c["field"] for c in r10["remaining_viable_candidates"][:3]]) or "None"
        
        print(f"{name:<40} | {r10['total_questions_asked']:<10} | {r12['total_questions_asked']:<10} | {r15['total_questions_asked']:<10} | {suff:<10} | {hit10:<8} | {rem_count} ({rem_top})")

    print("\n" + "="*110)
    print("DEEP DIVE: SCENARIOS HITTING CEILING 10")
    print("="*110)
    for name, r10 in results_10.items():
        if r10["max_q_reached"]:
            print(f"\n>>> Scenario: {name}")
            print(f"    Termination Reason: {r10['final_reason']}")
            print(f"    Sufficiency Achieved?: {r10['sufficiency_turn']}")
            print(f"    Safety Active?: {r10['safety_turn']}")
            print(f"    Remaining Viable Candidates ({r10['remaining_viable_count']}):")
            for c in r10["remaining_viable_candidates"]:
                print(f"      - {c['field']} (score={c['score']}, mode={c['mode']}, domain={c['domain']})")

    # Output JSON summary for exact inspection
    import json
    with open(os.path.join(os.path.dirname(__file__), "ceiling_audit_results.json"), "w") as f:
        json.dump({
            "results_10": results_10,
            "results_12": results_12,
            "results_15": results_15
        }, f, indent=2)
    print("\nSaved detailed results to backend/scratch/ceiling_audit_results.json")

if __name__ == "__main__":
    asyncio.run(main())
