import re
from typing import Any

from app.schemas.clinical_state import ClinicalState


def extract_clinical_facts_from_answer(
    raw_answer: str,
    target_field: str,
    current_state: ClinicalState
) -> tuple[ClinicalState, dict[str, Any], bool]:
    """
    Generalized Domain-Independent Clinical Fact Extractor.
    Extracts structured facts across Ophthalmic, GI, Respiratory, Neuro, MSK, Fever, Urinary, Dermatology domains.
    Updates explicit canonical dimension states (KNOWN_TRUE, KNOWN_FALSE, KNOWN_WITH_VALUE).
    Returns (updated_state, extracted_dict, has_meaningful_progress).
    """
    updated_state = current_state.model_copy(deep=True)
    text = raw_answer.strip().lower()
    vague_phrases = ["don't know", "do not know", "not sure", "unsure", "can't say", "cannot say", "cant say"]
    is_vague_answer = text in vague_phrases or any(p in text for p in vague_phrases)
    updated_state.raw_transcript_snippets.append(raw_answer)
    extracted: dict[str, Any] = {}
    progress = False

    # 0. Check for Non-Informative / Confused / Frustrated responses
    non_info_phrases = [
        "wtf", "what the fuck", "idk", "i don't know", "i dont know", "what", "what?", "what do you mean",
        "kya", "samajh nahi aaya", "pata nahi", "nahi pata", "malum nahi", "not sure", "unsure",
        "???", "leave it", "skip", "whatever", "why ask again", "stop asking",
        "पता नहीं", "मुझे नहीं पता", "मुझे समझ नहीं आया", "समझ नहीं आया",
        "मला माहित नाही", "मला माहिती नाही", "समजलं नाही", "नाही माहिती"
    ]
    if text in non_info_phrases or any(text == p for p in non_info_phrases):
        updated_state.last_non_informative_response = raw_answer.strip()
        return updated_state, {"non_informative": True}, False

    # Mark target_field as resolved if a valid, non-vague response was provided
    if target_field and not is_vague_answer and target_field not in updated_state.resolved_dimensions:
        updated_state.resolved_dimensions.append(target_field)

    # 1. Chief Complaint
    if not updated_state.chief_complaint:
        updated_state.chief_complaint = raw_answer.strip()
        extracted["chief_complaint"] = raw_answer.strip()
        progress = True

        # Domain initializers
        if any(w in text for w in ["red eye", "red eyes", "eye", "eyes", "aankh", "डोळे"]):
            updated_state.location = "Eyes"
            updated_state.set_canonical_dimension("red_eye", "KNOWN_TRUE", value=raw_answer.strip())
            updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Eyes")
        elif any(w in text for w in ["headache", "head ache", "sir dard", "sar dard"]):
            updated_state.location = "Head"
            updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Head")
        elif any(w in text for w in ["stomach", "abdomen", "pet", "acidity"]):
            updated_state.location = "Abdomen"
            updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Abdomen")
        elif any(w in text for w in ["cough", "khansi", "khokla"]):
            updated_state.location = "Chest / Respiratory"
            updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Chest")
        elif any(w in text for w in ["knee", "joint", "ghutna", "sandhi"]):
            updated_state.location = "Knee / Joint"
            updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Knee")

    # 2. Location / Distribution Updates (Can occur on any turn)
    if "upper abdomen" in text or "upper stomach" in text or "epigastric" in text or "pet ke upar" in text:
        updated_state.location = "Upper abdomen / epigastrium"
        extracted["location"] = "Upper abdomen"
        updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Upper abdomen")
        progress = True
    elif "lower right" in text or "right lower" in text:
        updated_state.location = "Right lower abdomen"
        extracted["location"] = "Right lower abdomen"
        updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Right lower abdomen")
        progress = True
    elif "right side" in text or "ek taraf" in text or "one side" in text:
        updated_state.location = "Unilateral (Right side)"
        extracted["location"] = "Unilateral (Right side)"
        updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Unilateral (Right side)")
        progress = True
    elif "both sides" in text or "dono taraf" in text:
        updated_state.location = "Bilateral (Both sides)"
        extracted["location"] = "Bilateral (Both sides)"
        updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Bilateral (Both sides)")
        progress = True
    elif "forehead" in text or "front" in text or "matha" in text:
        updated_state.location = "Frontal / Forehead"
        extracted["location"] = "Frontal"
        updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Frontal")
        progress = True
    elif text in ["stomach", "pet", "abdomen", "in stomach", "in the stomach"]:
        updated_state.location = "Abdomen / Stomach"
        extracted["location"] = "Abdomen / Stomach"
        updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value="Abdomen / Stomach")
        if "abdominal_location" not in updated_state.resolved_dimensions:
            updated_state.resolved_dimensions.append("abdominal_location")
        progress = True
    elif "knee" in text or "ghutna" in text:
        loc = "Right knee" if "right" in text else "Left knee" if "left" in text else "Knee"
        updated_state.location = loc
        extracted["location"] = loc
        updated_state.set_canonical_dimension("location", "KNOWN_WITH_VALUE", value=loc)
        progress = True

    # 3. Universal Duration & Onset
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
        updated_state.set_canonical_dimension("symptom_duration", "KNOWN_WITH_VALUE", value=dur_str)
        updated_state.set_canonical_dimension("symptom_onset", "KNOWN_WITH_VALUE", value=f"{dur_str} ago")
        progress = True
    elif text in ["10 days", "3 days", "2 days", "1 day", "4 days", "5 days", "3 din", "2 din", "10 din"]:
        updated_state.duration = text
        extracted["duration"] = text
        updated_state.set_canonical_dimension("symptom_duration", "KNOWN_WITH_VALUE", value=text)
        updated_state.set_canonical_dimension("symptom_onset", "KNOWN_WITH_VALUE", value=f"{text} ago")
        progress = True
    elif "yesterday" in text or "kal se" in text or "कालपासून" in text or "कल से" in text:
        updated_state.duration = "1 day (since yesterday)"
        extracted["duration"] = "1 day"
        updated_state.set_canonical_dimension("symptom_duration", "KNOWN_WITH_VALUE", value="1 day")
        updated_state.set_canonical_dimension("symptom_onset", "KNOWN_WITH_VALUE", value="Yesterday")
        progress = True
    elif "today" in text or "aaj se" in text or "morning" in text or "subah" in text:
        updated_state.duration = "Since this morning (<24 hours)"
        extracted["duration"] = "Since this morning"
        updated_state.set_canonical_dimension("symptom_duration", "KNOWN_WITH_VALUE", value="<24 hours")
        updated_state.set_canonical_dimension("symptom_onset", "KNOWN_WITH_VALUE", value="This morning")
        progress = True

    # 4. Universal Severity (1-10)
    explicit_sev = re.search(r'(?:severity|pain|scale|score)\s*(?:is|of|level)?\s*([1-9]|10)\b', text) or re.search(r'\b([1-9]|10)\s*(?:out of 10|\/10)', text)
    if explicit_sev:
        val = int(explicit_sev.group(1))
        updated_state.severity = val
        extracted["severity"] = val
        updated_state.set_canonical_dimension("severity", "KNOWN_WITH_VALUE", value=val)
        progress = True
    elif target_field == "severity":
        num_match = re.search(r'\b([1-9]|10)\b', text)
        if num_match:
            val = int(num_match.group(1))
            updated_state.severity = val
            extracted["severity"] = val
            updated_state.set_canonical_dimension("severity", "KNOWN_WITH_VALUE", value=val)
            progress = True
    elif "very severe" in text or "bahut tez" in text or "unbearable" in text:
        updated_state.severity = 8
        extracted["severity"] = 8
        updated_state.set_canonical_dimension("severity", "KNOWN_WITH_VALUE", value=8)
        progress = True
    elif "mild" in text or "thoda" in text or "halka" in text:
        updated_state.severity = 3
        extracted["severity"] = 3
        updated_state.set_canonical_dimension("severity", "KNOWN_WITH_VALUE", value=3)
        progress = True

    # Sensation / Character
    if any(w in text for w in ["burning sensation", "burning", "jalan", "sharp", "throbbing", "squeezing", "cramp"]):
        updated_state.character = raw_answer.strip()
        extracted["character"] = raw_answer.strip()
        updated_state.set_canonical_dimension("character", "KNOWN_WITH_VALUE", value=raw_answer.strip())
        progress = True

    # 5. Ophthalmic Findings
    if any(w in text for w in ["blurred vision", "blurry", "vision blur", "blurring", "dhundhla"]):
        if "no" in text and ("blur" in text or "vision" in text):
            updated_state.set_canonical_dimension("blurred_vision", "KNOWN_FALSE")
        else:
            updated_state.set_canonical_dimension("blurred_vision", "KNOWN_TRUE", value="Blurred vision present")
            val = "Blurred vision"
            if val not in updated_state.associated_symptoms:
                updated_state.associated_symptoms.append(val)
            extracted["blurred_vision"] = "Present"
            progress = True

    if any(w in text for w in ["water is coming from my eyes", "watering", "tearing", "water from eyes", "aankh se paani"]):
        if "no" in text and "water" in text:
            updated_state.set_canonical_dimension("eye_watering", "KNOWN_FALSE")
        else:
            updated_state.set_canonical_dimension("eye_watering", "KNOWN_TRUE", value="Excessive eye watering")
            val = "Eye watering"
            if val not in updated_state.associated_symptoms:
                updated_state.associated_symptoms.append(val)
            extracted["eye_watering"] = "Present"
            progress = True

    if any(w in text for w in ["light sensitivity", "sensitive to light", "bright light", "photophobia", "roshni"]):
        if "no" in text and ("light" in text or "roshni" in text):
            updated_state.set_canonical_dimension("light_sensitivity", "KNOWN_FALSE")
        else:
            updated_state.set_canonical_dimension("light_sensitivity", "KNOWN_TRUE", value="Light sensitivity present")
            val = "Light sensitivity (Photophobia)"
            if val not in updated_state.associated_symptoms:
                updated_state.associated_symptoms.append(val)
            extracted["light_sensitivity"] = "Present"
            progress = True

    if any(w in text for w in ["eye discharge", "discharge", "pus", "mucus", "sticky eyes", "gidd"]):
        if "no" in text and "discharge" in text:
            updated_state.set_canonical_dimension("eye_discharge", "KNOWN_FALSE")
        else:
            updated_state.set_canonical_dimension("eye_discharge", "KNOWN_TRUE", value="Eye discharge present")
            val = "Eye discharge"
            if val not in updated_state.associated_symptoms:
                updated_state.associated_symptoms.append(val)
            extracted["eye_discharge"] = "Present"
            progress = True

    if any(w in text for w in ["one eye", "both eyes", "right eye", "left eye", "dono aankh", "ek aankh"]):
        lat_val = "Bilateral (Both eyes)" if ("both" in text or "dono" in text) else "Unilateral"
        updated_state.set_canonical_dimension("eye_laterality", "KNOWN_WITH_VALUE", value=lat_val)
        extracted["eye_laterality"] = lat_val
        progress = True

    neg_vomit_terms = [
        "no vomit", "no vomiting", "not vomiting", "not vomit",
        "i am not vomiting", "i'm not vomiting", "haven't vomited", "have not vomited",
        "without vomiting", "vomiting: no", "vomit: no", "no nausea", "not nauseous",
        "ulti nahi", "ulti nahit", "उलटी नाही", "उल्टी नहीं", "उलट्या नाहीत",
        "उलटी होत नाही", "उलटी नाही होत", "उलटी येत नाही", "मला उलटी होत नाही",
        "उलट्या होत नाहीत", "मळमळ नाही"
    ]
    is_neg_vomit = any(w in text for w in neg_vomit_terms) or (
        target_field in ["vomiting", "nausea_vomiting"]
        and text in ["no", "nope", "nahi", "nahin", "nahi hai", "नाही", "नाहीत", "नहीं", "नहीं है"]
    )
    is_uncertain_vomit = any(u in text for u in [
        "not sure", "unsure", "don't know", "dont know", "can't say", "cannot say",
        "cant say", "pata nahi", "malum nahi", "samajh nahi",
        "पता नहीं", "मुझे नहीं पता", "मला माहित नाही", "समजलं नाही"
    ])

    if not is_uncertain_vomit:
        if is_neg_vomit:
            updated_state.set_canonical_dimension("vomiting", "KNOWN_FALSE", value=False)
            if "vomiting" not in updated_state.negated_symptoms:
                updated_state.negated_symptoms.append("vomiting")
            # Remove any conflicting positive vomiting from associated_symptoms
            updated_state.associated_symptoms = [
                s for s in updated_state.associated_symptoms
                if not any(t in str(s).lower() for t in ["vomiting", "vomit", "ulti", "उलटी", "उल्टी", "मळमळ"])
            ]
            extracted["negated_symptoms"] = updated_state.negated_symptoms
            progress = True
        elif any(w in text for w in ["vomiting", "vomit", "ulti", "nausea", "emesis", "उलटी", "उल्टी", "मळमळ", "जी मिचलाना"]):
            updated_state.set_canonical_dimension("vomiting", "KNOWN_TRUE", value=True)
            if "Vomiting" not in updated_state.associated_symptoms:
                updated_state.associated_symptoms.append("Vomiting")
            # Positive and negative facts cannot silently coexist
            updated_state.negated_symptoms = [
                ns for ns in updated_state.negated_symptoms
                if not any(t in str(ns).lower() for t in ["vomiting", "vomit", "ulti", "उलटी", "उल्टी", "मळमळ"])
            ]
            extracted["vomiting"] = "Present"
            progress = True

    food_keywords = ["vadapav", "vada pav", "samosa", "panipuri", "street food", "outside food", "hotel", "snack", "bahar ka", "bhojan"]
    if any(fk in text for fk in food_keywords) or (target_field == "food_exposure" and any(w in text for w in ["yes", "ha", "haan", "ate", "khaya"])):
        updated_state.food_exposure = raw_answer.strip()
        extracted["food_exposure"] = raw_answer.strip()
        updated_state.set_canonical_dimension("food_exposure", "KNOWN_WITH_VALUE", value=raw_answer.strip())
        if "food_exposure" not in updated_state.resolved_dimensions:
            updated_state.resolved_dimensions.append("food_exposure")
        progress = True

    if "watery" in text or "liquid" in text or "patla" in text or "loose" in text:
        updated_state.stool_consistency = "Watery"
        extracted["stool_consistency"] = "Watery"
        updated_state.set_canonical_dimension("stool_consistency", "KNOWN_WITH_VALUE", value="Watery")
        progress = True

    has_numeric_freq = bool(re.search(r'\b\d+\s*(times|baar|episodes)\b', text)) or any(w in text for w in ["twice", "3 times", "4 times"])
    is_qualitative_freq = any(fm in text for fm in ["frequent", "several times", "multiple times", "a lot", "many times"])
    if has_numeric_freq:
        updated_state.stool_frequency = raw_answer.strip()
        extracted["stool_frequency"] = raw_answer.strip()
        updated_state.set_canonical_dimension("stool_frequency", "KNOWN_WITH_VALUE", value=raw_answer.strip())
        updated_state.dimension_status["stool_frequency"] = "RESOLVED"
        progress = True
    elif is_qualitative_freq and not has_numeric_freq:
        updated_state.stool_frequency = "Frequent (unquantified)"
        updated_state.dimension_status["stool_frequency"] = "AMBIGUOUS"
        updated_state.set_canonical_dimension("stool_frequency", "AMBIGUOUS", value="Frequent (unquantified)")
        extracted["stool_frequency"] = "Frequent (unquantified)"
        progress = True

    if target_field == "meal_relationship" or any(w in text for w in ["after food", "after meal", "lying down"]):
        if text in ["yes", "ha", "haan"]:
            updated_state.set_canonical_dimension("meal_relationship", "AMBIGUOUS", value="Partially affirmed")
            updated_state.dimension_status["meal_relationship"] = "PARTIALLY_KNOWN"
            extracted["meal_relationship"] = "Partially affirmed"
            progress = True

    hydration_phrases = ["keep water down", "retaining fluids", "drink water", "drinking water", "drinking fluids", "able to drink", "tolerating fluids", "paani pee"]
    if any(hp in text for hp in hydration_phrases) or target_field == "hydration_status":
        val = "Unable to retain fluids / Severe dehydration risk" if any(w in text for w in ["unable", "cannot", "vomiting water"]) else "Tolerating fluids / Drinking water"
        updated_state.hydration_status = val
        extracted["hydration_status"] = val
        updated_state.set_canonical_dimension("hydration_status", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # Dark Stool / Melena
    if any(w in text for w in ["dark stool", "black stool", "kala dast", "kala sandas", "stools are dark"]) or (any(w in text for w in ["dark", "black", "kala"]) and any(s in text for s in ["stool", "sandas", "dast", "tatti", "motion", "pot"])):
        updated_state.dark_stool = True
        extracted["dark_stool"] = True
        updated_state.set_canonical_dimension("dark_stool", "KNOWN_TRUE")
        if "Dark / Black stool" not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append("Dark / Black stool")
        progress = True

    # Dizziness & Weakness
    if any(w in text for w in ["dizzy", "dizziness", "chakkar", "lightheaded"]):
        updated_state.dizziness = "Present"
        updated_state.set_canonical_dimension("dizziness", "KNOWN_TRUE")
        if "Dizziness" not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append("Dizziness")
        extracted["dizziness"] = "Present"
        progress = True

    if any(w in text for w in ["weak", "weakness", "kamzori", "fatigue", "thakan"]):
        updated_state.weakness = "Present"
        updated_state.set_canonical_dimension("weakness", "KNOWN_TRUE")
        if "Weakness / Fatigue" not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append("Weakness / Fatigue")
        extracted["weakness"] = "Present"
        progress = True

    # 7. Respiratory, Urinary, Dermatology Findings
    if "dry cough" in text or "wet cough" in text or "khansi" in text:
        ctype = "Wet / Productive" if "wet" in text or "balgam" in text else "Dry hacking"
        extracted["cough_type"] = ctype
        updated_state.set_canonical_dimension("cough_type", "KNOWN_WITH_VALUE", value=ctype)
        progress = True

    if "shortness of breath" in text or "breathless" in text or "saans phulna" in text:
        extracted["breathlessness"] = "Present"
        updated_state.set_canonical_dimension("breathlessness", "KNOWN_TRUE")
        if "Breathlessness" not in updated_state.associated_symptoms:
            updated_state.associated_symptoms.append("Breathlessness")
        progress = True

    is_dysuria = any(w in text for w in ["dysuria", "peshab me jalan", "burning pee"]) or ("burning" in text and any(u in text for u in ["urin", "pee", "peshab", "mutra"]))
    if is_dysuria:
        if "no" in text and ("burn" in text or "jalan" in text):
            updated_state.set_canonical_dimension("dysuria_burning", "KNOWN_FALSE")
        else:
            extracted["dysuria_burning"] = "Present"
            updated_state.set_canonical_dimension("dysuria_burning", "KNOWN_TRUE", value="Burning urination present")
            if "Burning urination (Dysuria)" not in updated_state.associated_symptoms:
                updated_state.associated_symptoms.append("Burning urination (Dysuria)")
            progress = True

    if "itching" in text or "khujli" in text or "itchy" in text:
        extracted["itching_pruritus"] = "Present"
        updated_state.set_canonical_dimension("itching_pruritus", "KNOWN_TRUE")
        progress = True

    # 8. Open Exploration Handling
    is_neg_exploration = any(k in text for k in [
        "nothing else", "no other", "nahi aur kuch nahi", "aur kuch nahi", "no other symptoms", "no, nothing else"
    ]) or (target_field.startswith("open_") and text in ["no", "nahi", "none", "nope", "nahi hai"])

    if is_neg_exploration:
        if "other_symptoms" not in updated_state.negated_symptoms:
            updated_state.negated_symptoms.append("other_symptoms")
        updated_state.set_canonical_dimension("open_exploration", "KNOWN_FALSE")
        if target_field not in updated_state.explored_areas:
            updated_state.explored_areas.append(target_field)
        extracted["open_exploration"] = "Negative (no other symptoms reported)"
        progress = True
    elif target_field.startswith("open_") or target_field == "open_exploration":
        # If open exploration was answered positively with symptoms:
        updated_state.set_canonical_dimension("open_exploration", "KNOWN_TRUE")
        if target_field not in updated_state.explored_areas:
            updated_state.explored_areas.append(target_field)
        progress = True

    # 9. AYUSH Core and Expanded Dashavidha Dimensions Extraction
    from app.schemas.clinical_state import AyushState

    # agni
    indic_agni_terms = ["appetite", "bhookh", "agni", "digestion is", "digest", "भूख", "पाचन", "मंदाग्नि", "अपच", "पेट भारी", "भूक"]
    if target_field == "agni" or any(w in text for w in indic_agni_terms):
        if any(w in text for w in [
            "low appetite", "poor appetite", "slow digestion", "manda", "kam bhookh", "bhookh kam",
            "loss of appetite", "भूख कम", "कम भूख", "पाचन धीमा", "मंद", "अपच", "भारी रहता", "भूक कमी", "भूक मंद"
        ]):
            val = "Manda"
        elif any(w in text for w in [
            "sharp", "excessive", "tikshna", "bahut bhookh", "high appetite", "intense hunger",
            "तीक्ष्ण", "बहुत भूख", "तेज भूख", "तीव्र भूक"
        ]):
            val = "Tikshna"
        elif any(w in text for w in [
            "irregular", "sometimes high sometimes low", "visham", "kabhi kam kabhi jyada", "unpredictable",
            "विषम", "कभी कम कभी ज्यादा", "अनियमित भूक"
        ]):
            val = "Vishama"
        elif any(w in text for w in [
            "normal", "regular", "good appetite", "sama", "theek bhookh",
            "सम", "सामान्य भूख", "ठीक भूख", "चांगली भूक"
        ]):
            val = "Sama"
        else:
            val = raw_answer.strip()

        extracted["agni"] = val
        if not updated_state.ayush:
            updated_state.ayush = AyushState()
        updated_state.ayush.agni = val
        updated_state.set_canonical_dimension("agni", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # koshtha
    indic_koshtha_terms = [
        "bowel", "koshtha", "constipat", "hard stool", "soft stool", "motion habit",
        "कब्ज", "शौच", "मल", "कोष्ठ", "बद्धकोष्ठता", "संडास"
    ]
    if target_field == "koshtha" or any(w in text for w in indic_koshtha_terms):
        if any(w in text for w in [
            "hard", "constipated", "krura", "hard stool", "kabz", "sakht", "कब्ज", "सख्त", "सख्त शौच", "कठीण", "क्रूर", "बद्धकोष्ठता"
        ]):
            val = "Krura"
        elif any(w in text for w in [
            "soft", "loose", "mridu", "frequent", "patla", "मृदु", "पतला", "पातळ शौच", "पातळ संडास"
        ]):
            val = "Mridu"
        elif any(w in text for w in [
            "regular", "normal", "madhyam", "medium", "मध्यम", "सामान्य शौच", "नियमित"
        ]):
            val = "Madhyam"
        else:
            val = raw_answer.strip()

        extracted["koshtha"] = val
        if not updated_state.ayush:
            updated_state.ayush = AyushState()
        updated_state.ayush.koshtha = val
        updated_state.set_canonical_dimension("koshtha", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # ahara_vihara
    indic_ahara_terms = [
        "oily food", "spicy food", "diet", "lifestyle", "ahara", "vihara", "fast food", "street food",
        "तला-भुना", "मसालेदार", "खाना", "आहार", "विहार", "दिनचर्या", "देर से सोना", "बाहेरचे जेवण", "तळलेले"
    ]
    if target_field == "ahara_vihara" or any(w in text for w in indic_ahara_terms):
        val = raw_answer.strip()
        extracted["ahara_vihara"] = val
        if not updated_state.ayush:
            updated_state.ayush = AyushState()
        updated_state.ayush.ahara_vihara = val
        updated_state.set_canonical_dimension("ahara_vihara", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # Expanded Dashavidha Dimensions
    # sara
    if target_field == "sara" or any(w in text for w in ["tissue strength", "vitality", "dhatu sara", "skin luster", "general vitality", "धातु", "सारता"]):
        val = raw_answer.strip()
        extracted["sara"] = val
        updated_state.set_canonical_dimension("sara", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # samhanana
    if target_field == "samhanana" or any(w in text for w in ["body build", "compact build", "samhanana", "sturdy build", "lean frame", "body frame", "सहनन", "शरीर रचना"]):
        val = raw_answer.strip()
        extracted["samhanana"] = val
        updated_state.set_canonical_dimension("samhanana", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # pramana
    if target_field == "pramana" or any(w in text for w in ["body proportions", "pramana", "anthropometry", "height weight balance", "प्रमाण"]):
        val = raw_answer.strip()
        extracted["pramana"] = val
        updated_state.set_canonical_dimension("pramana", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # satmya
    if target_field == "satmya" or any(w in text for w in ["satmya", "suits me", "food tolerance", "homologation", "climate adaptability", "सात्म्य", "माफक"]):
        val = raw_answer.strip()
        extracted["satmya"] = val
        updated_state.set_canonical_dimension("satmya", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # sattva (Mental temperament / emotional resilience)
    if target_field == "sattva" or ("mental" in text and ("strength" in text or "temperament" in text or "resilience" in text)) or any(w in text for w in ["सत्त्व", "मानसिक"]):
        if is_vague_answer:
            updated_state.set_canonical_dimension("sattva", "AMBIGUOUS")
        else:
            if any(w in text for w in ["high", "strong", "calm", "patient", "pravara", "good patience", "प्रवर", "मजबूत"]):
                val = "Pravara"
            elif any(w in text for w in ["weak", "easily stressed", "anxious", "low", "avara", "break down", "panic", "अवर", "कमजोर", "तनाव"]):
                val = "Avara"
            elif any(w in text for w in ["moderate", "normal", "manageable", "madhyama", "मध्यम"]):
                val = "Madhyama"
            else:
                val = raw_answer.strip()
            extracted["sattva"] = val
            updated_state.set_canonical_dimension("sattva", "KNOWN_WITH_VALUE", value=val)
            progress = True

    # ahara_shakti
    if target_field == "ahara_shakti" or any(w in text for w in ["food intake capacity", "eating capacity", "ahara shakti", "full meals easily", "आहार शक्ति", "जेवणाची क्षमता"]):
        val = raw_answer.strip()
        extracted["ahara_shakti"] = val
        updated_state.set_canonical_dimension("ahara_shakti", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # vyayama_shakti
    if target_field == "vyayama_shakti" or any(w in text for w in ["exercise tolerance", "physical stamina", "vyayama", "heavy work tolerance", "work capacity", "व्यायाम शक्ति", "स्टैमिना"]):
        val = raw_answer.strip()
        extracted["vyayama_shakti"] = val
        updated_state.set_canonical_dimension("vyayama_shakti", "KNOWN_WITH_VALUE", value=val)
        progress = True

    # vaya
    if target_field == "vaya" or any(w in text for w in ["age stage", "biological age", "vaya", "youth", "middle aged", "elderly", "वय", "आयु"]):
        val = raw_answer.strip()
        extracted["vaya"] = val
        updated_state.set_canonical_dimension("vaya", "KNOWN_WITH_VALUE", value=val)
        progress = True

    return updated_state, extracted, progress
