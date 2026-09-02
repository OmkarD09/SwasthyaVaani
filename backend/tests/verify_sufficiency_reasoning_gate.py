import asyncio
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question
from app.services.clinical_ai.question_scorer import score_candidate_dimensions, is_field_already_resolved
from app.services.clinical_ai.domain_classifier import classify_clinical_domains
from app.services.clinical_ai.gap_analysis import find_information_gaps
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer


def print_step(turn_num: int, speaker: str, content: str):
    print(f"\n--- [Turn {turn_num}] {speaker} ---")
    print(f"  {content}")


async def run_scenario_1_actual_vomiting_conversation():
    print("\n" + "="*80)
    print("SCENARIO 1: ACTUAL CONVERSATION (Stomach / Acidity -> Vadapav -> Vomiting -> 2 Days)")
    print("MANDATE: MUST NOT prematurely terminate at Turn 5. MUST characterize hydration risk.")
    print("="*80)

    state = ClinicalState()
    asked_questions = []

    # Turn 0: Elicit Chief Complaint
    decision0 = await evaluate_next_question(state, asked_questions=[], total_questions_asked=0)
    print_step(0, "AI Question", decision0.question)
    asked_questions.append(decision0.question)

    # Turn 1: Patient says "Stomach / Acidity"
    patient_ans1 = "Stomach / Acidity"
    print_step(1, "Patient Answer", patient_ans1)
    state, extracted, _ = extract_clinical_facts_from_answer(patient_ans1, decision0.target_field, state)
    print(f"  Extracted Facts: {extracted}")
    print(f"  ClinicalState: CC='{state.chief_complaint}', Associated={state.associated_symptoms}")

    decision1 = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=1)
    print_step(1, f"AI Decision ({decision1.action}) [Target: {decision1.target_field}]", decision1.question)
    assert decision1.action == "ASK"
    asked_questions.append(decision1.question)

    # Turn 2: Patient says "no" to other digestion/bowel changes
    patient_ans2 = "no"
    print_step(2, "Patient Answer", patient_ans2)
    state, extracted, _ = extract_clinical_facts_from_answer(patient_ans2, decision1.target_field, state)
    print(f"  Extracted Facts: {extracted}")
    print(f"  ClinicalState Negations: {state.negated_symptoms}, Explored: {state.explored_areas}")

    decision2 = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=2)
    print_step(2, f"AI Decision ({decision2.action}) [Target: {decision2.target_field}]", decision2.question)
    assert decision2.action == "ASK"
    asked_questions.append(decision2.question)

    # Turn 3: Patient reports outside food "yes vadapav"
    patient_ans3 = "yes vadapav"
    print_step(3, "Patient Answer", patient_ans3)
    state, extracted, _ = extract_clinical_facts_from_answer(patient_ans3, decision2.target_field, state)
    print(f"  Extracted Facts: {extracted}")
    print(f"  ClinicalState: Food='{state.food_exposure}', Associated={state.associated_symptoms}")

    decision3 = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=3)
    print_step(3, f"AI Decision ({decision3.action}) [Target: {decision3.target_field}]", decision3.question)
    assert decision3.action == "ASK"
    asked_questions.append(decision3.question)

    # Turn 4: Patient confirms "vomiting"
    patient_ans4 = "vomiting"
    print_step(4, "Patient Answer", patient_ans4)
    state, extracted, _ = extract_clinical_facts_from_answer(patient_ans4, decision3.target_field, state)
    print(f"  Extracted Facts: {extracted}")
    print(f"  ClinicalState: Associated={state.associated_symptoms}")

    decision4 = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=4)
    print_step(4, f"AI Decision ({decision4.action}) [Target: {decision4.target_field}]", decision4.question)
    assert decision4.action == "ASK"
    asked_questions.append(decision4.question)

    # Turn 5: Patient answers the asked question
    if decision4.target_field == "hydration_status":
        patient_ans5 = "I am able to drink water and fluids slowly without vomiting"
    else:
        patient_ans5 = "2 days"
    print_step(5, "Patient Answer", patient_ans5)
    state, extracted, _ = extract_clinical_facts_from_answer(patient_ans5, decision4.target_field, state)
    print(f"  Extracted Facts: {extracted}")
    print(f"  ClinicalState: Hydration='{state.hydration_status}', Duration='{state.duration}'")

    decision5 = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=5)
    print_step(5, f"AI Decision ({decision5.action}) [Target: {decision5.target_field}]", decision5.reason or decision5.question)

    # If duration was missing, AI must ask duration now. If hydration was missing, AI must ask hydration now.
    assert decision5.action == "ASK", "Engine prematurely stopped before both duration and hydration status were characterized!"
    asked_questions.append(decision5.question)

    # Turn 6: Patient provides the remaining missing critical dimension
    if decision5.target_field == "duration":
        patient_ans6 = "2 days"
    else:
        patient_ans6 = "I can drink water slowly without throwing up"
    print_step(6, "Patient Answer", patient_ans6)
    state, extracted, _ = extract_clinical_facts_from_answer(patient_ans6, decision5.target_field, state)
    print(f"  Extracted Facts: {extracted}")
    print(f"  ClinicalState: Duration='{state.duration}', Hydration='{state.hydration_status}'")

    decision6 = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=6)
    print_step(6, f"AI Decision ({decision6.action})", f"REASON: {decision6.reason}")
    assert decision6.action == "STOP", "Engine should cleanly complete intake once hydration and acute GI profile are characterized!"
    print("  >>> RESULT: SUCCESSFUL SUFFICIENCY EVALUATION & CLEAN COMPLETION!")


async def run_scenario_2_detailed_patient():
    print("\n" + "="*80)
    print("SCENARIO 2: DETAILED PATIENT (Upfront Comprehensive Presentation)")
    print("MANDATE: FEWER QUESTIONS WHEN SUFFICIENT — Stop early without unnecessary questionnaire.")
    print("="*80)

    state = ClinicalState(
        chief_complaint="I have had a throbbing one-sided headache on the right side for 2 days. Bright light and loud sounds make it much worse.",
        duration="2 days",
        location="Unilateral (Right side)",
        character="Throbbing",
        associated_symptoms=["Photophobia & Phonophobia present"]
    )
    state.raw_transcript_snippets.append("I have had a throbbing one-sided headache on the right side for 2 days. Bright light and loud sounds make it much worse.")
    state.resolved_dimensions.extend(["duration", "distribution", "location", "photophobia", "character"])

    decision = await evaluate_next_question(state, asked_questions=["What brings you in today?"], total_questions_asked=1)
    print_step(1, f"AI Decision ({decision.action})", f"REASON: {decision.reason}")
    assert decision.action == "STOP", "Engine should immediately recognize complete migraine triad and stop without filler questions!"
    print("  >>> RESULT: EARLY TERMINATION FOR COMPREHENSIVE NARRATIVE ACHIEVED!")


async def run_scenario_3_simple_complaint():
    print("\n" + "="*80)
    print("SCENARIO 3: VERY SIMPLE COMPLAINT (Mild Forehead Ache Since Morning)")
    print("MANDATE: Fast 2-turn intake without interrogating unrelated bodily systems.")
    print("="*80)

    state = ClinicalState()
    asked = []

    # Turn 0:
    d0 = await evaluate_next_question(state, total_questions_asked=0)
    print_step(0, "AI Question", d0.question)
    asked.append(d0.question)

    # Turn 1:
    ans1 = "mild headache since this morning"
    print_step(1, "Patient Answer", ans1)
    state, extracted, _ = extract_clinical_facts_from_answer(ans1, d0.target_field, state)
    d1 = await evaluate_next_question(state, asked_questions=asked, total_questions_asked=1)
    print_step(1, f"AI Decision ({d1.action}) [Target: {d1.target_field}]", d1.question)
    asked.append(d1.question)

    # Turn 2: Patient denies any other symptoms and clarifies forehead location
    ans2 = "No, nothing else at all, just a mild ache across my forehead."
    print_step(2, "Patient Answer", ans2)
    state, extracted, _ = extract_clinical_facts_from_answer(ans2, d1.target_field, state)
    print(f"  Extracted Facts: {extracted}")
    print(f"  ClinicalState: Location='{state.location}', Negated={state.negated_symptoms}")

    d2 = await evaluate_next_question(state, asked_questions=asked, total_questions_asked=2)
    print_step(2, f"AI Decision ({d2.action})", f"REASON: {d2.reason}")
    assert d2.action == "STOP", "Engine should terminate in 2 turns when exploration is negative and core complaint is characterized!"
    print("  >>> RESULT: 2-TURN CONCISE INTAKE ACHIEVED!")


async def run_scenario_4_negative_exploration():
    print("\n" + "="*80)
    print("SCENARIO 4: NEGATIVE EXPLORATION PRUNING (Stomach Discomfort with No Associated Symptoms)")
    print("MANDATE: Does NOT interrogate stool/vomiting when explicitly negated. Reassesses missing upper GI profile.")
    print("="*80)

    state = ClinicalState()
    asked = []

    # Turn 0:
    d0 = await evaluate_next_question(state, total_questions_asked=0)
    print_step(0, "AI Question", d0.question)
    asked.append(d0.question)

    # Turn 1:
    ans1 = "I have burning in my upper stomach for 3 days"
    print_step(1, "Patient Answer", ans1)
    state, extracted, _ = extract_clinical_facts_from_answer(ans1, d0.target_field, state)
    d1 = await evaluate_next_question(state, asked_questions=asked, total_questions_asked=1)
    print_step(1, f"AI Decision ({d1.action}) [Target: {d1.target_field}]", d1.question)
    assert d1.target_field == "open_gi_exploration"
    asked.append(d1.question)

    # Turn 2: Patient explicitly denies other symptoms
    ans2 = "No, nothing else unusual at all, no loose motions, no vomiting, bowels are completely normal."
    print_step(2, "Patient Answer", ans2)
    state, extracted, _ = extract_clinical_facts_from_answer(ans2, d1.target_field, state)
    print(f"  Extracted Facts: {extracted}")
    print(f"  ClinicalState: Negated={state.negated_symptoms}")

    d2 = await evaluate_next_question(state, asked_questions=asked, total_questions_asked=2)
    print_step(2, f"AI Decision ({d2.action}) [Target: {d2.target_field}]", d2.reason or d2.question)
    # The system must NOT ask about stool frequency or vomiting
    if d2.action == "ASK":
        assert d2.target_field not in ["stool_frequency", "stool_consistency", "dark_stool_onset", "vomiting"]
        print(f"  Selected target [{d2.target_field}] focuses purely on upper GI / meal relationship or terminates.")
    else:
        assert d2.action == "STOP"
        print(f"  Achieved sufficiency stop: {d2.reason}")
    print("  >>> RESULT: NEGATIVE EXPLORATION PRUNING & REASONING GATE VERIFIED!")


async def main():
    print("\n" + "#"*80)
    print("# SWASTHYAVAANI — CLINICAL INFORMATION SUFFICIENCY REASONING GATE AUDIT")
    print("#"*80)
    await run_scenario_1_actual_vomiting_conversation()
    await run_scenario_2_detailed_patient()
    await run_scenario_3_simple_complaint()
    await run_scenario_4_negative_exploration()
    print("\n" + "#"*80)
    print("# ALL 4 BEHAVIORAL SCENARIOS PASSED WITH FULL CLINICAL COMPLIANCE")
    print("#"*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
