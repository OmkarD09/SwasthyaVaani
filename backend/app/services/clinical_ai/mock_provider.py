import re
from typing import Tuple, Dict, Any
from app.schemas.clinical_state import ClinicalState, Medication, AyushState, Provenance


def extract_clinical_facts_from_answer(
    raw_answer: str,
    target_field: str,
    current_state: ClinicalState
) -> Tuple[ClinicalState, Dict[str, Any], bool]:
    """
    Extracts structured facts from patient natural language answer and updates ClinicalState.
    Returns (updated_state, extracted_dict, has_meaningful_progress).
    """
    updated_state = current_state.model_copy(deep=True)
    text = raw_answer.strip().lower()
    updated_state.raw_transcript_snippets.append(raw_answer)
    extracted: Dict[str, Any] = {}
    progress = False

    # Extract Chief Complaint if not set
    if not updated_state.chief_complaint:
        updated_state.chief_complaint = raw_answer
        extracted["chief_complaint"] = raw_answer
        progress = True

    # Check for duration signals (English, Hinglish, Devanagari)
    duration_match = re.search(r'(\d+)\s*(days?|din(?:o[n]?)?|weeks?|haft[ae]|months?|mah[ie]ne|hours?|ghant[ae]|दिन(?:ों)?|हफ्ते|हफ़्ते|महीने|घंटे)', text)
    if duration_match:
        num = duration_match.group(1)
        unit = duration_match.group(2)
        norm_unit = "days" if ("day" in unit or "din" in unit or "दिन" in unit) else unit
        dur_str = f"{num} {norm_unit}"
        updated_state.duration = dur_str
        extracted["duration"] = dur_str
        progress = True
    elif "yesterday" in text or "kal se" in text:
        updated_state.duration = "1 day (since yesterday)"
        extracted["duration"] = "1 day"
        progress = True
    elif "today" in text or "aaj se" in text:
        updated_state.duration = "Since today"
        extracted["duration"] = "1 day"
        progress = True

    # Check for onset
    if "sudden" in text or "achanak" in text or "ekdam" in text:
        updated_state.onset = "Sudden onset"
        extracted["onset"] = "Sudden"
        progress = True
    elif "gradual" in text or "dhire" in text or "slowly" in text:
        updated_state.onset = "Gradual onset"
        extracted["onset"] = "Gradual"
        progress = True

    # Check for severity (1-10)
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

    # Check for location
    if "chest" in text or "chaati" in text or "seen" in text:
        updated_state.location = "Centre of chest"
        extracted["location"] = "Chest"
        progress = True
    elif "stomach" in text or "abdomen" in text or "pet" in text:
        updated_state.location = "Upper abdomen / epigastrium"
        extracted["location"] = "Abdomen"
        progress = True
    elif "knee" in text or "ghutn" in text or "joint" in text:
        updated_state.location = "Knee joints (bilateral)"
        extracted["location"] = "Knees"
        progress = True
    elif "head" in text or "sar" in text or "sir" in text:
        updated_state.location = "Head / Frontal"
        extracted["location"] = "Head"
        progress = True

    # Check for character
    if "burning" in text or "jalan" in text or "acid" in text:
        updated_state.character = "Burning sensation with acidity"
        extracted["character"] = "Burning"
        progress = True
    elif "heavy" in text or "pressure" in text or "bhaari" in text or "dabaav" in text:
        updated_state.character = "Heavy squeezing pressure"
        extracted["character"] = "Heavy pressure"
        progress = True
    elif "sharp" in text or "stabbing" in text or "chubhan" in text:
        updated_state.character = "Sharp stabbing discomfort"
        extracted["character"] = "Sharp"
        progress = True
    elif "dull" in text or "stiff" in text or "jakdan" in text:
        updated_state.character = "Dull ache with stiffness"
        extracted["character"] = "Dull stiffness"
        progress = True

    # Check for radiation
    if "left arm" in text or "left shoulder" in text or "kandha" in text or "haath" in text:
        updated_state.radiation = "Radiating to left shoulder and arm"
        extracted["radiation"] = "Left shoulder / arm"
        progress = True

    # Check for associated symptoms
    for sym in ["breathlessness", "sweating", "fever", "nausea", "vomiting", "cough", "throat irritation", "saans", "paseena", "bukhar", "khansi"]:
        if sym in text and sym not in [s.lower() for s in updated_state.associated_symptoms]:
            updated_state.associated_symptoms.append(sym.title())
            extracted.setdefault("associated_symptoms", []).append(sym.title())
            progress = True

    # Check for AYUSH parameters (Agni, Koshtha, Ahara)
    if not updated_state.ayush:
        updated_state.ayush = AyushState()

    if "sour" in text or "acidity" in text or "tez bhookh" in text:
        updated_state.ayush.agni = "Tikshna (sharp/hyperactive)"
        extracted["agni"] = "Tikshna"
        progress = True
    elif "low appetite" in text or "bhookh nahi" in text or "kamzor" in text:
        updated_state.ayush.agni = "Manda (low/sluggish)"
        extracted["agni"] = "Manda"
        progress = True

    if "constipation" in text or "hard stool" in text or "kabz" in text:
        updated_state.ayush.koshtha = "Krura (hard/constipated)"
        extracted["koshtha"] = "Krura"
        progress = True
    elif "loose" in text or "mridu" in text or "dust" in text:
        updated_state.ayush.koshtha = "Mridu (soft/frequent)"
        extracted["koshtha"] = "Mridu"
        progress = True

    # Fallback to direct field mapping if specific target was probed
    if target_field and target_field not in extracted:
        if target_field == "relieving_factors" and len(text) > 3:
            updated_state.relieving_factors.append(raw_answer)
            extracted["relieving_factors"] = raw_answer
            progress = True
        elif target_field == "aggravating_factors" and len(text) > 3:
            updated_state.aggravating_factors.append(raw_answer)
            extracted["aggravating_factors"] = raw_answer
            progress = True
        elif target_field == "ahara_vihara" and len(text) > 3:
            updated_state.ayush.ahara_vihara = raw_answer
            extracted["ahara_vihara"] = raw_answer
            progress = True

    return updated_state, extracted, progress
