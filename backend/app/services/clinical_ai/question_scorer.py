import re
from typing import List, Dict, Any, Optional, Set
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.domain_classifier import ClinicalDomain


# Universal mapping from specific field aliases to canonical clinical dimensions
MAP_TO_CANONICAL: Dict[str, str] = {
    # Duration & Onset
    "duration": "symptom_duration",
    "onset": "symptom_duration",
    "how_long": "symptom_duration",
    "chronicity": "symptom_duration",
    "symptom_duration": "symptom_duration",
    "symptom_onset": "symptom_duration",

    # Severity & Impact
    "severity": "severity",
    "pain_scale": "severity",
    "intensity": "severity",

    # Open Exploration
    "open_general_exploration": "open_exploration",
    "open_gi_exploration": "open_exploration",
    "open_headache_exploration": "open_exploration",
    "open_respiratory_exploration": "open_exploration",
    "open_cardiac_exploration": "open_exploration",
    "open_fever_exploration": "open_exploration",
    "open_msk_exploration": "open_exploration",
    "open_ophthalmic_exploration": "open_exploration",
    "open_urinary_exploration": "open_exploration",
    "open_dermatology_exploration": "open_exploration",
    "open_ayush_exploration": "open_exploration",
    "open_exploration": "open_exploration",

    # Ophthalmic (Eye)
    "red_eye": "red_eye",
    "red_eyes": "red_eye",
    "eye_redness": "red_eye",
    "blurred_vision": "blurred_vision",
    "blurry_vision": "blurred_vision",
    "visual_aura": "blurred_vision",
    "eye_watering": "eye_watering",
    "watering_eyes": "eye_watering",
    "tearing": "eye_watering",
    "light_sensitivity": "light_sensitivity",
    "photophobia": "light_sensitivity",
    "eye_discharge": "eye_discharge",
    "discharge": "eye_discharge",
    "eye_laterality": "eye_laterality",
    "eye_pain": "eye_pain",
    "foreign_body_sensation": "eye_pain",

    # Gastrointestinal (GI)
    "vomiting": "vomiting",
    "nausea_vomiting": "vomiting",
    "hydration_status": "hydration_status",
    "food_exposure": "food_exposure",
    "stool_frequency": "stool_frequency",
    "stool_consistency": "stool_consistency",
    "bloating": "bloating",
    "dark_stool": "dark_stool",
    "dark_stool_onset": "dark_stool_onset",
    "dark_stool_consistency": "dark_stool_consistency",
    "blood_in_stool": "blood_in_stool",
    "meal_relationship": "meal_relationship",
    "antacid_relief": "antacid_relief",
    "abdominal_location": "location",
    "problem_clarification": "problem_clarification",
    "clarify_problem": "problem_clarification",

    # Respiratory
    "cough_type": "cough_type",
    "breathlessness": "breathlessness",
    "sputum_color": "sputum_color",
    "fever": "fever",
    "fever_pattern": "fever_pattern",
    "triggers": "triggers",

    # Neuro / MSK / Cardiac
    "radiation": "radiation",
    "radiation_to_chest": "radiation",
    "character": "character",
    "location": "location",
    "distribution": "location",
    "dizziness": "dizziness",
    "weakness": "weakness",
    "sweating_diaphoresis": "sweating_diaphoresis",
    "swelling_warmth": "swelling_warmth",
    "injury_history": "injury_history",

    # Urinary
    "dysuria_burning": "dysuria_burning",
    "urinary_frequency": "urinary_frequency",
    "hematuria_blood": "hematuria_blood",
    "flank_pain": "flank_pain",
    "urinary_symptoms": "dysuria_burning",

    # Dermatology
    "rash_location": "location",
    "rash_character": "character",
    "itching_pruritus": "itching_pruritus",
    "spread_progression": "spread_progression",
    "rash_skin": "rash_character",

    # AYUSH
    "agni": "agni",
    "koshtha": "koshtha",
    "ahara_vihara": "ahara_vihara",
    "sleep_pattern": "sleep_pattern"
}


# Semantic clusters for multi-factor duplicate prevention
SEMANTIC_CLUSTERS: Dict[str, Set[str]] = {
    "food_exposure": {"food_exposure", "dietary_trigger", "recent_meals", "street_food", "food_intake"},
    "duration": {"duration", "chronicity", "how_long", "onset", "symptom_duration", "symptom_onset"},
    "location": {"location", "abdominal_location", "site", "distribution", "eye_laterality", "rash_location"},
    "stool_frequency": {"stool_frequency", "bowel_frequency"},
    "stool_consistency": {"stool_consistency", "stool_type"},
    "vomiting": {"vomiting", "nausea_vomiting", "emesis"},
    "bloating": {"bloating", "gas_distension", "abdominal_fullness"},
    "photophobia": {"photophobia", "phonophobia", "light_sensitivity"},
    "blurred_vision": {"blurred_vision", "blurry_vision", "visual_aura", "vision_changes"},
    "eye_watering": {"eye_watering", "watering_eyes", "tearing", "epiphora"},
    "eye_discharge": {"eye_discharge", "discharge", "discharge_eyes", "pus_discharge"},
    "problem_clarification": {"problem_clarification", "clarify_problem"},
    "open_exploration": {
        "open_gi_exploration", "open_headache_exploration", "open_respiratory_exploration",
        "open_cardiac_exploration", "open_fever_exploration", "open_msk_exploration",
        "open_ophthalmic_exploration", "open_urinary_exploration", "open_dermatology_exploration",
        "open_ayush_exploration", "open_general_exploration"
    }
}


# Structured dimension definitions per clinical domain
DOMAIN_DIMENSIONS: Dict[str, List[Dict[str, Any]]] = {
    ClinicalDomain.OPHTHALMIC: [
        {"field": "open_ophthalmic_exploration", "label": "Open Exploration: Vision blur, discharge, watering, light sensitivity", "priority": "HIGH"},
        {"field": "blurred_vision", "label": "Blurred Vision / Decreased Visual Acuity", "priority": "HIGH"},
        {"field": "eye_watering", "label": "Excessive Eye Watering / Tearing", "priority": "HIGH"},
        {"field": "light_sensitivity", "label": "Light Sensitivity / Photophobia", "priority": "HIGH"},
        {"field": "eye_discharge", "label": "Eye Discharge (Sticky, yellow/green pus, or watery)", "priority": "HIGH"},
        {"field": "duration", "label": "Duration of eye redness / symptoms", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (Sudden or gradual)", "priority": "HIGH"},
        {"field": "severity", "label": "Severity of eye redness / pain (Scale 1 to 10)", "priority": "MEDIUM"},
        {"field": "eye_laterality", "label": "Laterality (One eye or both eyes)", "priority": "MEDIUM"},
        {"field": "foreign_body_sensation", "label": "Foreign Body / Gritty / Burning sensation", "priority": "MEDIUM"},
    ],
    ClinicalDomain.HEADACHE: [
        {"field": "open_headache_exploration", "label": "Open Exploration: Vision, nausea, weakness, dizziness", "priority": "HIGH"},
        {"field": "distribution", "label": "Distribution (One side of head, both sides, or forehead)", "priority": "HIGH"},
        {"field": "photophobia", "label": "Light & Sound Sensitivity (Photophobia / Phonophobia)", "priority": "HIGH"},
        {"field": "duration", "label": "Duration (How long it has lasted)", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (When and how it started)", "priority": "HIGH"},
        {"field": "nausea_vomiting", "label": "Associated Nausea or Vomiting", "priority": "HIGH"},
        {"field": "visual_aura", "label": "Visual Changes (Flashing lights, zigzag lines, blurriness)", "priority": "MEDIUM"},
        {"field": "character", "label": "Character (Throbbing, pulsing, tight band pressure)", "priority": "MEDIUM"},
        {"field": "severity", "label": "Severity (Pain intensity 1 to 10)", "priority": "MEDIUM"},
        {"field": "triggers", "label": "Triggers (Stress, lack of sleep, eye strain, skipped meals)", "priority": "LOW"},
    ],
    ClinicalDomain.GASTROINTESTINAL: [
        {"field": "open_gi_exploration", "label": "Open Exploration: Digestion, bowel habits, appetite, vomiting", "priority": "HIGH"},
        {"field": "dark_stool_onset", "label": "Targeted Finding: Melena / Dark stool onset", "priority": "HIGH"},
        {"field": "dark_stool_consistency", "label": "Targeted Finding: Dark stool consistency and texture", "priority": "HIGH"},
        {"field": "problem_clarification", "label": "Specific GI Symptoms (Pain, loose motions, vomiting, acidity)", "priority": "HIGH"},
        {"field": "stool_frequency", "label": "Bowel Frequency (Number of episodes / times per day)", "priority": "HIGH"},
        {"field": "stool_consistency", "label": "Stool Consistency (Watery, loose, liquid, solid, bloody)", "priority": "HIGH"},
        {"field": "food_exposure", "label": "Food & Water Exposure (Outside food, street food, specific meal before symptoms)", "priority": "HIGH"},
        {"field": "vomiting", "label": "Vomiting episodes or inability to retain fluids", "priority": "HIGH"},
        {"field": "duration", "label": "Duration of gut symptoms", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (Sudden after meal or gradual)", "priority": "MEDIUM"},
        {"field": "bloating", "label": "Abdominal bloating, fullness, or gas distension", "priority": "HIGH"},
        {"field": "abdominal_location", "label": "Abdominal Location (Upper stomach, lower right, around navel)", "priority": "HIGH"},
        {"field": "hydration_status", "label": "Hydration Status (Oral intake, thirst, lightheadedness)", "priority": "HIGH"},
        {"field": "blood_in_stool", "label": "Red Flag: Blood or black discoloration in stool/vomit", "priority": "HIGH"},
        {"field": "bowel_movement_recency", "label": "Constipation: Last passed stool", "priority": "HIGH"},
        {"field": "laxative_use", "label": "Constipation: Laxative / home remedy use", "priority": "MEDIUM"},
        {"field": "meal_relationship", "label": "Acidity: Relationship with meals and lying down", "priority": "HIGH"},
        {"field": "antacid_relief", "label": "Acidity: Relief with antacids or cold milk", "priority": "MEDIUM"},
        {"field": "radiation_to_chest", "label": "Acidity: Burning sensation radiating up to chest/throat", "priority": "MEDIUM"},
        {"field": "fever", "label": "Associated Fever or Chills", "priority": "MEDIUM"},
        {"field": "severity", "label": "Severity (Pain / cramp scale 1 to 10)", "priority": "MEDIUM"},
    ],
    ClinicalDomain.RESPIRATORY: [
        {"field": "open_respiratory_exploration", "label": "Open Exploration: Breathing difficulty, chest discomfort, fever", "priority": "HIGH"},
        {"field": "cough_type", "label": "Cough Character (Dry hacking vs wet/productive with mucus)", "priority": "HIGH"},
        {"field": "breathlessness", "label": "Shortness of Breath (Difficulty breathing at rest or walking)", "priority": "HIGH"},
        {"field": "duration", "label": "Duration of cough/breathing difficulty", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (Sudden or progressive over days)", "priority": "HIGH"},
        {"field": "location", "label": "Chest / Throat location", "priority": "MEDIUM"},
        {"field": "fever", "label": "Associated Fever, Chills, or Body Ache", "priority": "HIGH"},
        {"field": "sputum_color", "label": "Sputum / Phlegm Color (Yellow/green, clear, blood-tinged)", "priority": "MEDIUM"},
        {"field": "chest_tightness", "label": "Chest Tightness or Wheezing Sound", "priority": "MEDIUM"},
        {"field": "triggers", "label": "Triggers (Cold air, dust, smoke, seasonal)", "priority": "LOW"},
    ],
    ClinicalDomain.CARDIAC: [
        {"field": "open_cardiac_exploration", "label": "Open Exploration: Shortness of breath, cold sweating, arm pain", "priority": "HIGH"},
        {"field": "radiation", "label": "Radiation (Pain spreading to left arm, shoulder, neck, or jaw)", "priority": "HIGH"},
        {"field": "character", "label": "Chest Pain Character (Heavy squeezing, crushing pressure vs sharp)", "priority": "HIGH"},
        {"field": "sweating_diaphoresis", "label": "Associated Cold Sweating (Diaphoresis) or Dizziness", "priority": "HIGH"},
        {"field": "breathlessness", "label": "Shortness of breath with chest tightness", "priority": "HIGH"},
        {"field": "duration", "label": "Duration of chest discomfort", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (At rest vs during physical exertion)", "priority": "HIGH"},
        {"field": "location", "label": "Site of chest pressure", "priority": "MEDIUM"},
        {"field": "severity", "label": "Pain Intensity Scale (1 to 10)", "priority": "MEDIUM"},
    ],
    ClinicalDomain.FEVER: [
        {"field": "open_fever_exploration", "label": "Open Exploration: Chills, sore throat, cough, body aches, urinary", "priority": "HIGH"},
        {"field": "fever_pattern", "label": "Fever Pattern & Chills (High spikes, continuous, shivering/rigors)", "priority": "HIGH"},
        {"field": "duration", "label": "Duration of fever (How many days)", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (Sudden with chills or gradual)", "priority": "HIGH"},
        {"field": "associated_bodyache", "label": "Severe Joint/Muscle Pain or Pain Behind Eyes", "priority": "HIGH"},
        {"field": "cough_throat", "label": "Associated Sore Throat, Cough, or Runny Nose", "priority": "HIGH"},
        {"field": "location", "label": "Site of localized body ache or rash", "priority": "LOW"},
        {"field": "urinary_symptoms", "label": "Burning or Pain During Urination", "priority": "MEDIUM"},
        {"field": "rash_skin", "label": "Skin Rash, Red Spots, or Bleeding Tendencies", "priority": "MEDIUM"},
    ],
    ClinicalDomain.MUSCULOSKELETAL: [
        {"field": "open_msk_exploration", "label": "Open Exploration: Joint swelling, weakness, numbness, trauma", "priority": "HIGH"},
        {"field": "location", "label": "Exact Joint or Muscle Location", "priority": "HIGH"},
        {"field": "duration", "label": "Duration of pain/stiffness", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (Sudden injury/twist vs gradual wear)", "priority": "HIGH"},
        {"field": "injury_history", "label": "History of Recent Fall, Trauma, or Sudden Twist", "priority": "HIGH"},
        {"field": "swelling_warmth", "label": "Joint Swelling, Redness, or Morning Stiffness", "priority": "HIGH"},
        {"field": "severity", "label": "Pain on Movement / Weight-Bearing (1 to 10)", "priority": "MEDIUM"},
    ],
    ClinicalDomain.URINARY: [
        {"field": "open_urinary_exploration", "label": "Open Exploration: Burning, frequency, urine color, fever", "priority": "HIGH"},
        {"field": "dysuria_burning", "label": "Burning sensation or pain during urination (Dysuria)", "priority": "HIGH"},
        {"field": "urinary_frequency", "label": "Urinary Frequency / Urgency (How often passing urine)", "priority": "HIGH"},
        {"field": "hematuria_blood", "label": "Red Flag: Blood in urine or dark brown coloration", "priority": "HIGH"},
        {"field": "duration", "label": "Duration of urinary symptoms", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (Sudden or gradual)", "priority": "HIGH"},
        {"field": "flank_pain", "label": "Flank / Lower back pain", "priority": "MEDIUM"},
        {"field": "fever", "label": "Associated Fever or Chills", "priority": "HIGH"},
        {"field": "severity", "label": "Pain / Discomfort Intensity (1 to 10)", "priority": "MEDIUM"},
    ],
    ClinicalDomain.DERMATOLOGY: [
        {"field": "open_dermatology_exploration", "label": "Open Exploration: Itching, spreading, pain, blisters, fever", "priority": "HIGH"},
        {"field": "itching_pruritus", "label": "Itching / Pruritus intensity", "priority": "HIGH"},
        {"field": "location", "label": "Location & Spread of Skin Lesions / Rash", "priority": "HIGH"},
        {"field": "duration", "label": "Duration of rash / skin changes", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (Sudden eruption or gradual)", "priority": "HIGH"},
        {"field": "character", "label": "Character (Dry scaly, red bumps, fluid blisters, hives)", "priority": "MEDIUM"},
        {"field": "spread_progression", "label": "Progression / Speed of spreading", "priority": "MEDIUM"},
        {"field": "severity", "label": "Discomfort / Severity Scale (1 to 10)", "priority": "MEDIUM"},
    ],
    ClinicalDomain.AYUSH: [
        {"field": "open_ayush_exploration", "label": "Open Exploration: Appetite, digestion, bowel regularity, sleep", "priority": "HIGH"},
        {"field": "location", "label": "Sthana (Location of discomfort / affected organ)", "priority": "HIGH"},
        {"field": "agni", "label": "Agni (Digestive fire, appetite, meal digestion)", "priority": "HIGH"},
        {"field": "koshtha", "label": "Koshtha (Bowel movement habit, hard vs soft stool)", "priority": "HIGH"},
        {"field": "duration", "label": "Kala / Chronicity of condition", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (Kala / Initial stage of disease)", "priority": "HIGH"},
        {"field": "ahara_vihara", "label": "Ahara-Vihara (Dietary habits, spicy/oily food, sleep routine)", "priority": "HIGH"},
        {"field": "sleep_pattern", "label": "Nidra (Sleep quality, night-time restlessness)", "priority": "MEDIUM"},
        {"field": "relieving_factors", "label": "Upashaya (What lifestyle/dietary factors give relief)", "priority": "MEDIUM"},
    ],
    ClinicalDomain.GENERAL: [
        {"field": "open_general_exploration", "label": "Open Exploration: Any other unusual symptoms or bodily changes", "priority": "HIGH"},
        {"field": "clarify_problem", "label": "Clarify Chief Medical Complaint", "priority": "HIGH"},
        {"field": "duration", "label": "Duration of symptoms", "priority": "HIGH"},
        {"field": "onset", "label": "Onset (When and how it began)", "priority": "HIGH"},
        {"field": "severity", "label": "Severity / Impact on Daily Activities", "priority": "MEDIUM"},
        {"field": "location", "label": "Location / Affected Body Part", "priority": "MEDIUM"},
        {"field": "character", "label": "Character of sensation", "priority": "MEDIUM"},
        {"field": "associated_symptoms", "label": "Any other accompanying symptoms", "priority": "MEDIUM"},
    ]
}


def is_field_already_resolved(field_name: str, state: ClinicalState) -> bool:
    """
    Unified, Domain-Independent Hard Invariant:
    Checks whether a clinical dimension is already sufficiently known in ClinicalState.
    Operates primarily on explicit CanonicalDimensionState, then validates schema attributes.
    """
    # 1. Canonical State Lookup (Primary Invariant)
    canon = MAP_TO_CANONICAL.get(field_name, field_name)
    if state.is_dimension_sufficiently_known(canon):
        return True

    # Check explicit resolved dimensions list
    if field_name in state.resolved_dimensions or canon in state.resolved_dimensions:
        return True

    snippets = list(state.raw_transcript_snippets)
    if state.chief_complaint:
        snippets.append(state.chief_complaint)
    snippets.extend(state.symptoms)
    snippets.extend(state.associated_symptoms)
    if state.location:
        snippets.append(state.location)
    if state.character:
        snippets.append(state.character)
    if state.radiation:
        snippets.append(state.radiation)

    combined_snippets = " ".join(snippets).lower()

    # 2. Open Exploration Resolution
    if canon == "open_exploration" or field_name.startswith("open_"):
        if "open_exploration" in state.canonical_dimensions or len(state.explored_areas) > 0:
            return True
        if "other_symptoms" in state.negated_symptoms or any(w in combined_snippets for w in ["nothing else", "no other", "aur kuch nahi", "itna hi", "no, nothing else"]):
            return True
        # If open exploration was prompted and patient answered with any associated symptom:
        if len(state.associated_symptoms) > 0:
            return True
        return False

    # 3. Universal Duration & Onset Canonical Invariant
    elif canon == "symptom_duration":
        return bool(state.duration) or bool(state.onset) or any(w in combined_snippets for w in [
            "days", "din", "divas", "hours", "ghante", "yesterday", "kal se", "weeks", "mahine", "minutes", "min", "since morning", "sudden", "gradual"
        ])

    # 4. Universal Severity Canonical Invariant
    elif canon == "severity":
        return state.severity is not None

    # 5. Ophthalmic Dimensions
    elif canon == "blurred_vision":
        return state.is_dimension_sufficiently_known("blurred_vision") or any(w in combined_snippets for w in ["blur", "blurred", "vision blur", "aura", "dhundhla"])

    elif canon == "eye_watering":
        return state.is_dimension_sufficiently_known("eye_watering") or any(w in combined_snippets for w in ["water", "tearing", "epiphora", "water coming", "paani"])

    elif canon == "light_sensitivity":
        return state.is_dimension_sufficiently_known("light_sensitivity") or any(w in combined_snippets for w in ["light", "sound", "photophobia", "roshni", "bright"])

    elif canon == "eye_discharge":
        return state.is_dimension_sufficiently_known("eye_discharge") or any(w in combined_snippets for w in ["discharge", "pus", "mucus", "sticky eyes", "gidd"])

    elif canon == "eye_laterality":
        return state.is_dimension_sufficiently_known("eye_laterality") or any(w in combined_snippets for w in ["one eye", "both eyes", "right eye", "left eye", "ek aankh", "dono aankh"])

    # 6. GI Dimensions
    elif field_name == "dark_stool_onset":
        return "dark_stool_onset" in state.resolved_dimensions or state.dimension_status.get("dark_stool_onset") == "RESOLVED"

    elif field_name == "dark_stool_consistency":
        return "dark_stool_consistency" in state.resolved_dimensions or state.dimension_status.get("dark_stool_consistency") == "RESOLVED"

    elif field_name in ["problem_clarification", "clarify_problem"]:
        has_specifics = any(s in combined_snippets for s in [
            "loose motion", "dast", "vomit", "ulti", "pain", "dard", "acidity", "gas",
            "burning", "constipation", "cramp", "diarrhea", "bloating", "vadapav", "headache", "red eye", "cough", "rash"
        ])
        if has_specifics or bool(state.duration) or bool(state.location) or bool(state.character) or len(state.symptoms) > 0 or len(state.associated_symptoms) > 0 or len(state.resolved_dimensions) > 0:
            return True
        vague_terms = [
            "problem with my stomach", "problem with stomach", "stomach problem", "pet me problem",
            "pet kharab", "pet ki dikkat", "pet ki samasya", "some problem with my stomach",
            "पेट में समस्या", "पेट खराब", "पेट में दिक्कत", "पेट में परेशानी", "पोटात त्रास"
        ]
        if any(v in combined_snippets for v in vague_terms):
            return False
        return bool(state.chief_complaint)

    elif canon == "location":
        if field_name == "distribution":
            return any(w in combined_snippets for w in ["one side", "both side", "right side", "left side", "forehead", "ek taraf", "dono taraf"])
        return bool(state.location)

    elif canon == "character":
        return bool(state.character) or any(w in combined_snippets for w in ["heavy", "squeezing", "crushing", "sharp", "burning", "throbbing", "pulsing", "cramp"])

    elif canon == "radiation":
        return bool(state.radiation) or any(w in combined_snippets for w in ["radiat", "left arm", "shoulder", "jaw", "neck", "haath me"])

    elif canon == "vomiting":
        return bool(state.hydration_status) or any(w in combined_snippets for w in ["vomit", "nausea", "ulti", "jeemichlana", "vomited twice", "vomited 3 times", "no vomit", "no nausea"])

    elif canon == "food_exposure":
        if state.food_exposure:
            return True
        food_words = ["outside food", "street food", "hotel", "restaurant", "bahar ka", "vadapav", "samosa", "panipuri", "bhojan", "meal", "ate"]
        return any(w in combined_snippets for w in food_words)

    elif canon == "stool_frequency":
        if state.dimension_status.get("stool_frequency") == "AMBIGUOUS":
            return False
        if state.dimension_status.get("stool_frequency") in ["RESOLVED", "PARTIALLY_KNOWN"]:
            return True
        if state.stool_frequency and state.stool_frequency != "Frequent (unquantified)":
            return True
        return bool(re.search(r'\b\d+\s*(times|baar|episodes)\b', combined_snippets))

    elif canon == "stool_consistency":
        return bool(state.stool_consistency) or any(w in combined_snippets for w in ["watery", "loose", "liquid", "solid", "hard stool", "mucus", "bloody", "dast", "patla"])

    elif canon == "bloating":
        return bool(state.bloating) or any(w in combined_snippets for w in ["bloat", "bloating", "gas", "pet phool", "fullness", "distension"])

    elif canon == "hydration_status":
        return bool(state.hydration_status) or any(w in combined_snippets for w in ["keep water down", "retaining fluids", "drink water", "tolerating fluids", "dehydration"])

    elif canon == "fever":
        return "fever" in state.negated_symptoms or any(w in combined_snippets for w in ["fever", "bukhar", "taap", "temperature", "chills", "no fever"])

    elif canon == "cough_type":
        return any(w in combined_snippets for w in ["dry cough", "wet cough", "phlegm", "balgam", "sukhi khansi"])

    elif canon == "breathlessness":
        return any(w in combined_snippets for w in ["breathless", "short of breath", "saans", "shortness of breath", "no breathlessness"])

    elif canon == "sweating_diaphoresis":
        return any(w in combined_snippets for w in ["sweat", "sweating", "pasina", "paseena", "diaphoresis"])

    elif canon == "swelling_warmth":
        return any(w in combined_snippets for w in ["swelling", "sujan", "warmth", "stiffness"])

    elif canon == "injury_history":
        return any(w in combined_snippets for w in ["fall", "injury", "trauma", "chot", "twist"])

    elif canon == "fever_pattern":
        return any(w in combined_snippets for w in ["continuous", "spike", "chills", "shivering", "bukhar"])

    elif canon == "associated_bodyache":
        return any(w in combined_snippets for w in ["body ache", "bodyache", "badan dard", "joint pain"])

    elif canon == "dysuria_burning":
        return state.is_dimension_sufficiently_known("dysuria_burning") or any(w in combined_snippets for w in ["dysuria", "peshab me jalan", "burning pee"]) or ("burning" in combined_snippets and any(u in combined_snippets for u in ["urin", "pee", "peshab", "mutra"]))

    elif canon == "itching_pruritus":
        return any(w in combined_snippets for w in ["itching", "khujli", "pruritus", "scratching"])

    elif canon == "agni":
        return bool(state.ayush and state.ayush.agni)

    elif canon == "koshtha":
        return bool(state.ayush and state.ayush.koshtha)

    elif canon == "ahara_vihara":
        return bool(state.ayush and state.ayush.ahara_vihara)

    elif canon == "sleep_pattern":
        return any(w in combined_snippets for w in ["sleep", "neend", "insomnia"])

    elif field_name == "associated_symptoms":
        return len(state.associated_symptoms) > 0

    return False


def score_candidate_dimensions(
    domains: List[str],
    state: ClinicalState,
    asked_questions: List[str],
    asked_target_fields: Optional[Set[str]] = None
) -> List[Dict[str, Any]]:
    """
    Generalized Domain-Independent Information-Gain Scorer.
    Evaluates candidate questioning dimensions dynamically based on:
    - Domain Relevance
    - Open Exploration vs Targeted Drilling
    - Safety-Required Red Flags
    - Active Volunteered Findings
    - Hard Invalidation of Known/Duplicate Dimensions (-500)
    """
    candidates: List[Dict[str, Any]] = []
    seen_fields: Set[str] = set()
    asked_targets = set(asked_target_fields or [])
    asked_canonicals = {MAP_TO_CANONICAL.get(t, t) for t in asked_targets}

    snippets = list(state.raw_transcript_snippets)
    if state.chief_complaint:
        snippets.append(state.chief_complaint)
    snippets.extend(state.symptoms)
    snippets.extend(state.associated_symptoms)
    combined_text = " ".join(snippets).lower()

    # Determine negated symptoms
    negated: Set[str] = set(state.negated_symptoms)
    if any(n in combined_text for n in ["no pain", "dard nahi", "no ache", "pain: no"]):
        negated.add("pain")
    if any(n in combined_text for n in ["no vomiting", "ulti nahi", "no nausea"]):
        negated.add("vomiting")
    if any(n in combined_text for n in ["no fever", "bukhar nahi", "taap nahi"]):
        negated.add("fever")
    if any(n in combined_text for n in ["no diarrhea", "no loose motion", "dast nahi"]):
        negated.add("diarrhea")
    if any(n in combined_text for n in ["no blood", "khoon nahi"]):
        negated.add("blood")
    if any(n in combined_text for n in ["nothing else", "no other", "aur kuch nahi", "no, nothing else"]):
        negated.add("other_symptoms")

    # Active volunteered clinical signals across domains
    has_dark_stool = bool(state.dark_stool) or any(w in combined_text for w in ["dark stool", "black stool", "kala dast"])
    has_dizziness = bool(state.dizziness) or any(w in combined_text for w in ["dizzy", "dizziness", "chakkar", "lightheaded"])
    has_weakness = bool(state.weakness) or any(w in combined_text for w in ["weak", "weakness", "kamzori", "fatigue"])
    has_vomiting = any(w in combined_text for w in ["vomit", "ulti"]) and "vomiting" not in negated
    has_diarrhea = any(w in combined_text for w in ["loose motion", "dast", "diarrhea", "watery"]) and "diarrhea" not in negated
    has_blurred_vision = state.is_dimension_sufficiently_known("blurred_vision") or "blur" in combined_text

    for d_idx, domain in enumerate(domains):
        dimensions = DOMAIN_DIMENSIONS.get(domain, DOMAIN_DIMENSIONS[ClinicalDomain.GENERAL])
        domain_weight = 35 if d_idx == 0 else 15

        for dim in dimensions:
            field_name = dim["field"]
            if field_name in seen_fields:
                continue
            seen_fields.add(field_name)

            canon = MAP_TO_CANONICAL.get(field_name, field_name)
            priority = dim["priority"]
            base_score = 50 if priority == "HIGH" else 30 if priority == "MEDIUM" else 15
            score = base_score + domain_weight
            reasoning_mode = "TARGETED_FOLLOW_UP"

            # 1. HARD INVARIANT: If already resolved in state -> Disqualify completely
            if is_field_already_resolved(field_name, state) or state.is_dimension_sufficiently_known(canon):
                score -= 500
                candidates.append({
                    "field_name": field_name,
                    "label": dim["label"],
                    "domain": domain,
                    "priority": priority,
                    "score": score,
                    "reasoning_mode": reasoning_mode,
                    "canonical_dimension": canon
                })
                continue

            # 2. Hard Invariant: If canonical dimension was already asked & answered -> Disqualify
            if canon in asked_canonicals and canon != "open_exploration":
                score -= 500
                candidates.append({
                    "field_name": field_name,
                    "label": dim["label"],
                    "domain": domain,
                    "priority": priority,
                    "score": score,
                    "reasoning_mode": reasoning_mode,
                    "canonical_dimension": canon
                })
                continue

            # 3. Open Exploration Reasoning Mode
            if field_name.startswith("open_"):
                reasoning_mode = "OPEN_EXPLORATION"
                if not is_field_already_resolved(field_name, state) and "other_symptoms" not in negated and len(state.explored_areas) == 0:
                    score += 65
                else:
                    score -= 500

            # 4. Safety-Required Reasoning Mode
            is_safety_field = (
                field_name in ["radiation", "sweating_diaphoresis"]
                or (field_name == "blood_in_stool" and (has_dark_stool or "blood" in combined_text or has_dizziness or has_weakness))
                or (has_dark_stool and field_name in ["dark_stool_onset", "dark_stool_consistency"])
                or (has_dizziness and has_dark_stool and field_name == "hydration_status")
                or (domain == ClinicalDomain.OPHTHALMIC and has_blurred_vision and field_name == "blurred_vision")
            )
            if is_safety_field and not is_field_already_resolved(field_name, state):
                reasoning_mode = "SAFETY_REQUIRED"
                score += 85

            # 5. Targeted Drilling on Volunteered Findings
            if domain == ClinicalDomain.OPHTHALMIC:
                if field_name in ["blurred_vision", "light_sensitivity", "eye_watering", "eye_discharge"]:
                    score += 45
            elif domain == ClinicalDomain.RESPIRATORY:
                if field_name in ["cough_type", "breathlessness", "fever"]:
                    score += 45
            elif domain == ClinicalDomain.HEADACHE:
                if field_name in ["distribution", "photophobia", "nausea_vomiting"]:
                    score += 45
            elif domain == ClinicalDomain.URINARY:
                if field_name in ["dysuria_burning", "urinary_frequency", "fever"]:
                    score += 45
            elif domain == ClinicalDomain.DERMATOLOGY:
                if field_name in ["itching_pruritus", "location", "character"]:
                    score += 45
            elif domain == ClinicalDomain.GASTROINTESTINAL:
                if has_dark_stool and field_name in ["dark_stool_onset", "dark_stool_consistency"]:
                    score += 95
                if (has_vomiting or has_diarrhea) and field_name == "hydration_status":
                    score += 85
                if (has_vomiting or has_diarrhea) and field_name == "food_exposure":
                    score += 50

            # 6. Irrelevant Sub-system Questionnaire Penalties
            # If not in GI domain, penalize unprompted stool/bowel questions
            if domain != ClinicalDomain.GASTROINTESTINAL and field_name in [
                "stool_frequency", "stool_consistency", "blood_in_stool", "bowel_movement_recency", "laxative_use", "dark_stool_onset", "dark_stool_consistency"
            ]:
                score -= 500

            # If not in Ophthalmic, penalize eye specific questions
            if domain != ClinicalDomain.OPHTHALMIC and field_name in ["blurred_vision", "eye_watering", "eye_discharge", "eye_laterality", "foreign_body_sensation"]:
                score -= 500

            # 7. Semantic Cluster Deduplication
            for cluster_key, cluster_members in SEMANTIC_CLUSTERS.items():
                if field_name in cluster_members:
                    if any(m in asked_targets for m in cluster_members):
                        score -= 500
                    if any(is_field_already_resolved(m, state) for m in cluster_members):
                        score -= 500

            if ("constipation" in combined_text or "kabz" in combined_text) and field_name in ["stool_frequency", "stool_consistency"]:
                score -= 300

            if (has_diarrhea or state.stool_consistency == "Watery" or "watery" in combined_text) and field_name in ["laxative_use", "bowel_movement_recency"]:
                score -= 300

            # 8. Negated Symptoms Penalties
            if "pain" in negated and field_name in ["severity", "character", "eye_pain"]:
                score -= 400
            if "vomiting" in negated and field_name in ["vomiting", "nausea_vomiting"]:
                score -= 400
            if "fever" in negated and field_name in ["fever", "fever_pattern"]:
                score -= 400
            if "diarrhea" in negated and field_name in ["stool_frequency", "stool_consistency"]:
                score -= 400

            candidates.append({
                "field_name": field_name,
                "label": dim["label"],
                "domain": domain,
                "priority": priority,
                "score": score,
                "reasoning_mode": reasoning_mode,
                "canonical_dimension": canon
            })

    # Sort candidates by information-gain score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates
