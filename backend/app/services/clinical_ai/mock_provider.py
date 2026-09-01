import re
from typing import Tuple, Dict, Any, Optional
from app.schemas.clinical_state import ClinicalState, Medication, AyushState, Provenance


def extract_clinical_facts_from_answer(
    raw_answer: str,
    target_field: str,
    current_state: ClinicalState
) -> Tuple[ClinicalState, Dict[str, Any], bool]:
    """
    Extracts structured facts from patient natural language answer and updates ClinicalState.
    Handles partial answers, discrete GI dimensions, and negated symptoms.
    Returns (updated_state, extracted_dict, has_meaningful_progress).
    """
    updated_state = current_state.model_copy(deep=True)
    text = raw_answer.strip().lower()
    updated_state.raw_transcript_snippets.append(raw_answer)
    extracted: Dict[str, Any] = {}
    progress = False

    # Mark target_field as resolved if valid response provided
    if target_field and target_field not in updated_state.resolved_dimensions:
        updated_state.resolved_dimensions.append(target_field)

    # Set Chief Complaint if not already set
    if not updated_state.chief_complaint:
        updated_state.chief_complaint = raw_answer.strip()
        extracted["chief_complaint"] = raw_answer.strip()
        progress = True

    # 1. Check for Duration Signals
    indic_num_map = {
        'ek': '1', 'do': '2', 'teen': '3', 'chaar': '4', 'paanch': '5',
        'don': '2', 'doh': '2', 'tin': '3', 'char': '4', 'panch': '5',
        'एक': '1', 'दो': '2', 'दोन': '2', 'तीन': '3', 'चार': '4', 'पाच': '5'
    }
    duration_match = re.search(r'(\d+|एक|दो|दोन|तीन|चार|पाच|ek|do|teen|chaar|don)\s*(days?|din|divas|दिवस|दिन|weeks?|haft[ae]|months?|mah[ie]ne|hours?|ghant[ae]|hrs?)', text)
    if duration_match:
        val = duration_match.group(1)
        dur_num = indic_num_map.get(val, val)
        dur_str = f"{dur_num} days"
        updated_state.duration = dur_str
        extracted["duration"] = dur_str
        progress = True
    elif text in ["3 days", "2 days", "1 day", "4 days", "5 days", "3 din", "2 din"]:
        updated_state.duration = text
        extracted["duration"] = text
        progress = True
    elif "दो दिन" in text or "दोन दिवस" in text or "2 days" in text or "two days" in text:
        updated_state.duration = "2 days"
        extracted["duration"] = "2 days"
        progress = True
    elif "3 days" in text or "three days" in text:
        updated_state.duration = "3 days"
        extracted["duration"] = "3 days"
        progress = True
    elif "yesterday" in text or "kal se" in text or "कालपासून" in text or "कल से" in text:
        updated_state.duration = "1 day (since yesterday)"
        extracted["duration"] = "1 day"
        progress = True
    elif "today" in text or "aaj se" in text or "आजपासून" in text or "आज से" in text or "morning" in text or "subah" in text:
        updated_state.duration = "Since this morning (<24 hours)"
        extracted["duration"] = "Since this morning"
        progress = True

    # 2. Check for Onset
    if "sudden" in text or "achanak" in text or "ekdam" in text:
        updated_state.onset = "Sudden onset"
        extracted["onset"] = "Sudden"
        progress = True
    elif "gradual" in text or "dhire" in text or "slowly" in text:
        updated_state.onset = "Gradual onset"
        extracted["onset"] = "Gradual"
        progress = True

    # 3. Check for Severity (1-10)
    explicit_sev = re.search(r'(?:severity|pain|scale|score)\s*(?:is|of|level)?\s*([1-9]|10)\b', text) or re.search(r'\b([1-9]|10)\s*(?:out of 10|\/10)', text)
    if explicit_sev:
        val = int(explicit_sev.group(1))
        updated_state.severity = val
        extracted["severity"] = val
        progress = True
    elif target_field == "severity":
        num_match = re.search(r'\b([1-9]|10)\b', text)
        if num_match:
            val = int(num_match.group(1))
            updated_state.severity = val
            extracted["severity"] = val
            progress = True
    elif "very severe" in text or "bahut tez" in text or "unbearable" in text:
        updated_state.severity = 8
        extracted["severity"] = 8
        progress = True
    elif "mild" in text or "thoda" in text or "halka" in text:
        updated_state.severity = 3
        extracted["severity"] = 3
        progress = True

    # 4. Check for Anatomical Location / Distribution
    if "upper abdomen" in text or "upper stomach" in text or "epigastric" in text or "pet ke upar" in text:
        updated_state.location = "Upper abdomen / epigastrium"
        extracted["location"] = "Upper abdomen"
        progress = True
    elif "lower right" in text or "right lower" in text:
        updated_state.location = "Right lower abdomen"
        extracted["location"] = "Right lower abdomen"
        progress = True
    elif "right side" in text or "ek taraf" in text or "one side" in text:
        updated_state.location = "Unilateral (Right side)"
        extracted["location"] = "Unilateral (Right side)"
        progress = True
    elif "both sides" in text or "dono taraf" in text:
        updated_state.location = "Bilateral (Both sides)"
        extracted["location"] = "Bilateral (Both sides)"
        progress = True
    elif "forehead" in text or "front" in text or "matha" in text:
        updated_state.location = "Frontal / Forehead"
        extracted["location"] = "Frontal"
        progress = True
    elif "chest" in text or "chaati" in text or "seen" in text:
        updated_state.location = "Centre of chest"
        extracted["location"] = "Chest"
        progress = True
    elif "stomach" in text or "abdomen" in text or "pet" in text:
        if not updated_state.location:
            updated_state.location = "Abdomen"
            extracted["location"] = "Abdomen"
            progress = True
    elif "head" in text or "sar" in text or "sir" in text:
        if not updated_state.location:
            updated_state.location = "Head / Cranial"
            extracted["location"] = "Head"
            progress = True

    # 5. Check for Food Exposure
    food_keywords = [
        "vadapav", "vada pav", "samosa", "panipuri", "street food", "outside food",
        "hotel", "restaurant", "snack", "junk food", "stall", "bahar ka", "bhojan", "meals"
    ]
    if any(fk in text for fk in food_keywords) or (target_field == "food_exposure" and any(w in text for w in ["yes", "ha", "haan", "ate", "khaya"])):
        updated_state.food_exposure = raw_answer.strip()
        extracted["food_exposure"] = raw_answer.strip()
        if "food_exposure" not in updated_state.resolved_dimensions:
            updated_state.resolved_dimensions.append("food_exposure")
        progress = True

    # 6. Check for Stool Consistency vs Frequency (Partial & Ambiguous Answer Handling)
    if "watery" in text or "liquid" in text or "patla" in text or "loose" in text:
        updated_state.stool_consistency = "Watery"
        extracted["stool_consistency"] = "Watery"
        updated_state.dimension_status["stool_consistency"] = "RESOLVED"
        if "stool_consistency" not in updated_state.resolved_dimensions:
            updated_state.resolved_dimensions.append("stool_consistency")
        progress = True

    has_numeric_freq = bool(re.search(r'\b\d+\s*(times|baar|episodes|dast)\b', text)) or any(w in text for w in ["twice", "3 times", "4 times", "5 times", "6 times", "teen baar", "char baar", "don vela", "tin vela"])
    is_qualitative_freq = any(fm in text for fm in ["frequent", "several times", "multiple times", "a lot", "many times", "ha", "haan", "yes"])

    if has_numeric_freq:
        updated_state.stool_frequency = raw_answer.strip()
        extracted["stool_frequency"] = raw_answer.strip()
        updated_state.dimension_status["stool_frequency"] = "RESOLVED"
        if "stool_frequency" not in updated_state.resolved_dimensions:
            updated_state.resolved_dimensions.append("stool_frequency")
        progress = True
    elif is_qualitative_freq and (target_field in ["stool_frequency", "bowel_frequency"] or "frequent" in text):
        # Ambiguous qualitative frequency: If already prompted once, accept as PARTIALLY_KNOWN; otherwise keep AMBIGUOUS
        if updated_state.dimension_status.get("stool_frequency") == "AMBIGUOUS":
            updated_state.stool_frequency = "Frequent (unquantified)"
            extracted["stool_frequency"] = "Frequent (unquantified)"
            updated_state.dimension_status["stool_frequency"] = "PARTIALLY_KNOWN"
            if "stool_frequency" not in updated_state.resolved_dimensions:
                updated_state.resolved_dimensions.append("stool_frequency")
        else:
            updated_state.stool_frequency = "Frequent (unquantified)"
            extracted["stool_frequency"] = "Frequent (unquantified)"
            updated_state.dimension_status["stool_frequency"] = "AMBIGUOUS"
        progress = True

    # 7. Check for Bloating / Gas
    if "bloating" in text or "bloat" in text or "pet phool" in text or "fullness" in text or "gas" in text:
        updated_state.bloating = "Abdominal bloating present"
        extracted["bloating"] = "Present"
        if "Bloating / Gas" not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append("Bloating / Gas")
        if "bloating" not in updated_state.resolved_dimensions:
            updated_state.resolved_dimensions.append("bloating")
        progress = True

    # 8. Check for Vomiting / Nausea
    if "vomiting" in text or "vomit" in text or "ulti" in text or "nausea" in text:
        if "no" in text or "nahi" in text:
            if "vomiting" not in updated_state.negated_symptoms:
                updated_state.negated_symptoms.append("vomiting")
            extracted["negated_symptoms"] = list(set(updated_state.negated_symptoms))
            progress = True
        else:
            if "Vomiting" not in updated_state.associated_symptoms:
                updated_state.associated_symptoms.append("Vomiting")
            extracted["vomiting"] = "Present"
            progress = True

    # 9. Check for Negated Symptoms ("no", "nahi", "none")
    if target_field and text in ["no", "nahi", "none", "not having it", "nope", "nahi hai"]:
        if target_field in ["vomiting", "nausea_vomiting"]:
            updated_state.negated_symptoms.append("vomiting")
        elif target_field in ["severity", "character", "pain_location"]:
            updated_state.negated_symptoms.append("pain")
        elif target_field in ["fever", "fever_pattern"]:
            updated_state.negated_symptoms.append("fever")
        elif target_field in ["blood_in_stool"]:
            updated_state.negated_symptoms.append("blood")
        progress = True

    # 10. Check for Character (Throbbing, burning, cramping, etc.)
    if "throbbing" in text or "pulsing" in text:
        updated_state.character = "Pulsating / Throbbing pain"
        extracted["character"] = "Throbbing"
        progress = True
    elif "burning" in text or "jalan" in text or "acid" in text:
        updated_state.character = "Burning sensation with acidity"
        extracted["character"] = "Burning"
        progress = True
    elif "cramping" in text or "aithan" in text or "marod" in text:
        updated_state.character = "Colicky / Cramping pain"
        extracted["character"] = "Cramping"
        progress = True

    # 11. Check for Photophobia & Visual Aura
    if "light" in text or "roshni" in text or "sound" in text or "bright" in text:
        val = "Photophobia & Phonophobia present"
        if val not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append(val)
        extracted["photophobia"] = val
        progress = True

    if "flash" in text or "zigzag" in text or "blur" in text or "aura" in text:
        val = "Visual aura symptoms present"
        if val not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append(val)
        extracted["visual_aura"] = val
        progress = True

    # 12. Check for Volunteered Dark Stool / Melena
    dark_stool_kw = ["dark stool", "black stool", "kala dast", "kala sandas", "stools are dark", "stools have been very dark", "stools became dark", "very dark"]
    if any(k in text for k in dark_stool_kw):
        updated_state.dark_stool = True
        extracted["dark_stool"] = True
        if "Dark / Black stool" not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append("Dark / Black stool")
        updated_state.blood_in_stool = "Dark / Black stool reported"
        extracted["blood_in_stool"] = "Dark / Black stool reported"
        if "dark_stool" not in updated_state.resolved_dimensions:
            updated_state.resolved_dimensions.append("dark_stool")
        progress = True

    # 13. Check for Volunteered Dizziness / Lightheadedness
    if any(k in text for k in ["dizzy", "dizziness", "chakkar", "lightheaded"]):
        updated_state.dizziness = "Present"
        extracted["dizziness"] = "Present"
        if "Dizziness" not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append("Dizziness")
        progress = True

    # 14. Check for Volunteered Weakness / Fatigue
    if any(k in text for k in ["weak", "weakness", "kamzori", "thakan", "fatigue", "tired"]):
        updated_state.weakness = "Present"
        extracted["weakness"] = "Present"
        if "Weakness / Fatigue" not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append("Weakness / Fatigue")
        progress = True

    # 15. Check for Negative Exploration Responses
    is_neg_exploration = any(k in text for k in [
        "nothing else", "no other", "nahi aur kuch nahi", "aur kuch nahi",
        "no other symptoms", "nothing else unusual", "no other problems", "no, nothing else"
    ]) or (target_field.startswith("open_") and text in ["no", "nahi", "none", "nope", "nahi hai"])
    if is_neg_exploration:
        if "other_symptoms" not in updated_state.negated_symptoms:
            updated_state.negated_symptoms.append("other_symptoms")
        if target_field not in updated_state.explored_areas:
            updated_state.explored_areas.append(target_field)
        if target_field not in updated_state.resolved_dimensions:
            updated_state.resolved_dimensions.append(target_field)
        extracted["open_exploration"] = "Negative (no other symptoms reported)"
        progress = True

    # 16. Check for Hydration / Fluid Retention
    hydration_phrases = [
        "keep water down", "retaining fluids", "drink water", "drinking water", "drinking fluids",
        "able to drink", "can drink", "paani pee", "water intake", "vomiting water", "unable to drink",
        "fluids down", "tolerating fluids", "paani pee pa", "cannot keep water down", "drink small amounts"
    ]
    if any(hp in text for hp in hydration_phrases) or target_field == "hydration_status":
        if any(w in text for w in ["unable", "cannot", "vomiting everything", "vomiting water", "nahi ruk raha", "vomiting all"]):
            val = "Unable to retain fluids / Severe dehydration risk"
        else:
            val = "Tolerating fluids / Drinking water"
        updated_state.hydration_status = val
        extracted["hydration_status"] = val
        if "hydration_status" not in updated_state.resolved_dimensions:
            updated_state.resolved_dimensions.append("hydration_status")
        progress = True

    # 17. Partial Answers to Multi-part Questions (e.g. meal vs lying down)
    if target_field == "meal_relationship" and text in ["yes", "ha", "haan"]:
        updated_state.dimension_status["meal_relationship"] = "PARTIALLY_KNOWN"
        extracted["meal_relationship"] = "Symptoms related to meals / eating (unspecified if postprandial vs position)"
        progress = True

    # 17. Fallback capture for domain-specific open answers
    if target_field and target_field not in extracted:
        if len(text) > 0:
            extracted[target_field] = raw_answer
            progress = True

    return updated_state, extracted, progress
