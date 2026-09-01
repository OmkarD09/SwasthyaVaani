import re
from typing import List, Dict, Any, Optional, Set
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.domain_classifier import ClinicalDomain


# Semantic clusters for multi-factor duplicate prevention
SEMANTIC_CLUSTERS: Dict[str, Set[str]] = {
    "food_exposure": {"food_exposure", "dietary_trigger", "recent_meals", "street_food", "food_intake"},
    "duration": {"duration", "chronicity", "how_long"},
    "location": {"location", "abdominal_location", "site", "distribution"},
    "stool_frequency": {"stool_frequency", "bowel_frequency"},
    "stool_consistency": {"stool_consistency", "stool_type"},
    "vomiting": {"vomiting", "nausea_vomiting", "emesis"},
    "bloating": {"bloating", "gas_distension", "abdominal_fullness"},
    "photophobia": {"photophobia", "phonophobia", "light_sensitivity"},
    "problem_clarification": {"problem_clarification", "clarify_problem"},
    "open_exploration": {
        "open_gi_exploration", "open_headache_exploration", "open_respiratory_exploration",
        "open_cardiac_exploration", "open_fever_exploration", "open_msk_exploration",
        "open_ayush_exploration", "open_general_exploration"
    }
}


# Structured dimension definitions per clinical domain
DOMAIN_DIMENSIONS: Dict[str, List[Dict[str, Any]]] = {
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
        {"field": "bloating", "label": "Abdominal bloating, fullness, or gas distension", "priority": "HIGH"},
        {"field": "abdominal_location", "label": "Abdominal Location (Upper stomach, lower right, around navel)", "priority": "HIGH"},
        {"field": "hydration_status", "label": "Hydration Status (Oral intake, thirst, lightheadedness)", "priority": "HIGH"},
        {"field": "blood_in_stool", "label": "Red Flag: Blood or black discoloration in stool/vomit", "priority": "HIGH"},
        {"field": "bowel_movement_recency", "label": "Constipation: Last passed stool", "priority": "HIGH"},
        {"field": "laxative_use", "label": "Constipation: Laxative / home remedy use", "priority": "MEDIUM"},
        {"field": "meal_relationship", "label": "Acidity: Relationship with meals and lying down", "priority": "HIGH"},
        {"field": "antacid_relief", "label": "Acidity: Relief with antacids or cold milk", "priority": "MEDIUM"},
        {"field": "radiation_to_chest", "label": "Acidity: Burning sensation radiating up to chest/throat", "priority": "MEDIUM"},
        {"field": "onset", "label": "Onset (Sudden after meal or gradual)", "priority": "MEDIUM"},
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
        {"field": "injury_history", "label": "History of Recent Fall, Trauma, or Sudden Twist", "priority": "HIGH"},
        {"field": "swelling_warmth", "label": "Joint Swelling, Redness, or Morning Stiffness", "priority": "HIGH"},
        {"field": "severity", "label": "Pain on Movement / Weight-Bearing (1 to 10)", "priority": "MEDIUM"},
    ],
    ClinicalDomain.AYUSH: [
        {"field": "open_ayush_exploration", "label": "Open Exploration: Appetite, digestion, bowel regularity, sleep", "priority": "HIGH"},
        {"field": "agni", "label": "Agni (Digestive fire, appetite, meal digestion)", "priority": "HIGH"},
        {"field": "koshtha", "label": "Koshtha (Bowel movement habit, hard vs soft stool)", "priority": "HIGH"},
        {"field": "duration", "label": "Kala / Chronicity of condition", "priority": "HIGH"},
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
        {"field": "associated_symptoms", "label": "Any other accompanying symptoms", "priority": "MEDIUM"},
    ]
}


def is_field_already_resolved(field_name: str, state: ClinicalState) -> bool:
    """
    Checks whether the requested clinical dimension is already resolved in ClinicalState
    or explicitly present in patient statements/extracted entities.
    """
    if field_name in state.resolved_dimensions:
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

    if field_name.startswith("open_"):
        if field_name in state.explored_areas or field_name in state.resolved_dimensions:
            return True
        if "other_symptoms" in state.negated_symptoms or any(w in combined_snippets for w in ["nothing else", "no other", "aur kuch nahi", "itna hi"]):
            return True
        return False

    elif field_name == "dark_stool_onset":
        return "dark_stool_onset" in state.resolved_dimensions or state.dimension_status.get("dark_stool_onset") == "RESOLVED"

    elif field_name == "dark_stool_consistency":
        return "dark_stool_consistency" in state.resolved_dimensions or state.dimension_status.get("dark_stool_consistency") == "RESOLVED"

    elif field_name in ["problem_clarification", "clarify_problem"]:
        has_specifics = any(s in combined_snippets for s in [
            "loose motion", "dast", "vomit", "ulti", "pain", "dard", "acidity", "gas",
            "burning", "constipation", "cramp", "diarrhea", "bloating", "vadapav", "headache"
        ])
        if has_specifics or bool(state.duration) or bool(state.location) or bool(state.character) or len(state.symptoms) > 0 or len(state.associated_symptoms) > 0 or len(state.resolved_dimensions) > 0:
            return True
        vague_terms = [
            "problem with my stomach", "problem with stomach", "stomach problem", "pet me problem",
            "pet kharab", "pet ki dikkat", "pet ki samasya", "some problem with my stomach",
            "पेट में समस्या", "पेट खराब", "पेट में दिक्कत", "पेट में परेशानी", "पोटात त्रास",
            "पोट खराब", "पोटात दुखणे", "पोटात गडबड", "मला पोटात त्रास होत आहे"
        ]
        is_vague = any(v in combined_snippets for v in vague_terms)
        if is_vague:
            return False
        return bool(state.chief_complaint)

    elif field_name == "duration":
        return bool(state.duration) or any(w in combined_snippets for w in ["days", "din", "hours", "ghante", "yesterday", "kal se", "weeks", "mahine", "minutes", "min", "3 days", "2 days"])

    elif field_name == "onset":
        return bool(state.onset) or any(w in combined_snippets for w in ["sudden", "achanak", "gradual", "dhire", "started yesterday", "kal shuru", "resting", "aaram"])

    elif field_name == "severity":
        return state.severity is not None

    elif field_name in ["location", "abdominal_location", "distribution"]:
        if field_name == "distribution":
            return any(w in combined_snippets for w in ["one side", "both side", "right side", "left side", "forehead", "ek taraf", "dono taraf"])
        return bool(state.location) or "location" in state.resolved_dimensions or "abdominal_location" in state.resolved_dimensions or any(w in combined_snippets for w in ["stomach", "abdomen", "pet", "upper stomach", "upper abdomen", "epigastric", "lower right", "around navel"])

    elif field_name == "character":
        return bool(state.character) or any(w in combined_snippets for w in ["heavy", "squeezing", "crushing", "sharp", "burning", "throbbing", "pulsing", "cramp"])

    elif field_name == "radiation":
        return bool(state.radiation) or any(w in combined_snippets for w in ["radiat", "left arm", "shoulder", "jaw", "neck", "haath me"])

    elif field_name == "photophobia":
        return any(w in combined_snippets for w in ["light", "sound", "roshni", "awaaz", "dhoop", "bright", "yes light"])

    elif field_name == "visual_aura":
        return any(w in combined_snippets for w in ["aura", "flash", "zigzag", "blur", "dhundhla", "no visual"])

    elif field_name in ["nausea_vomiting", "vomiting"]:
        return bool(state.hydration_status) or any(w in combined_snippets for w in ["vomit", "nausea", "ulti", "jeemichlana", "vomited twice", "vomited 3 times", "no vomit", "no nausea"])

    elif field_name == "food_exposure":
        if state.food_exposure:
            return True
        food_words = [
            "outside food", "street food", "hotel", "restaurant", "bahar ka", "shadi", "party",
            "vadapav", "vada pav", "samosa", "panipuri", "pani puri", "dosa", "biryani", "snack",
            "junk food", "stall", "bhojan", "meal", "eating", "ate", "yes, vadapav", "khana khaya"
        ]
        return any(w in combined_snippets for w in food_words)

    elif field_name == "stool_frequency":
        if state.dimension_status.get("stool_frequency") == "AMBIGUOUS":
            return False
        if state.dimension_status.get("stool_frequency") in ["RESOLVED", "PARTIALLY_KNOWN"]:
            return True
        if "stool_frequency" in state.resolved_dimensions:
            return True
        if state.stool_frequency and state.stool_frequency != "Frequent (unquantified)":
            return True
        return bool(re.search(r'\b\d+\s*(times|baar|episodes)\b', combined_snippets))

    elif field_name == "stool_consistency":
        if state.stool_consistency:
            return True
        consistency_words = ["watery", "loose", "liquid", "solid", "hard stool", "mucus", "bloody", "dast", "patla", "churna"]
        return any(w in combined_snippets for w in consistency_words)

    elif field_name == "bloating":
        if state.bloating:
            return True
        return any(w in combined_snippets for w in ["bloat", "bloating", "gas", "pet phool", "fullness", "distension"])

    elif field_name == "hydration_status":
        if state.hydration_status:
            return True
        hydration_words = [
            "keep water down", "retaining fluids", "drink water", "drinking fluids",
            "unable to drink", "vomiting water", "paani pee", "paani nahi ruk", "fluids down",
            "tolerating fluids", "dehydration", "paani pee pa", "can drink water", "fluids: "
        ]
        return any(w in combined_snippets for w in hydration_words)

    elif field_name == "blood_in_stool":
        return any(w in combined_snippets for w in ["blood in stool", "black stool", "khoon", "red stool", "no blood", "dark stool"])

    elif field_name == "bowel_movement_recency":
        return any(w in combined_snippets for w in ["last passed", "last stool", "days ago stool", "yesterday stool"])

    elif field_name == "meal_relationship":
        return any(w in combined_snippets for w in ["after eating", "after meals", "khana khane ke baad", "lying down", "empty stomach"])

    elif field_name == "fever":
        return any(w in combined_snippets for w in ["fever", "bukhar", "taap", "temperature", "chills", "thandi", "no fever"])

    elif field_name == "cough_type":
        return any(w in combined_snippets for w in ["dry cough", "wet cough", "phlegm", "balgam", "sukhi khansi"])

    elif field_name == "breathlessness":
        return any(w in combined_snippets for w in ["breathless", "short of breath", "saans", "shortness of breath", "no breathlessness"])

    elif field_name == "sweating_diaphoresis":
        return any(w in combined_snippets for w in ["sweat", "sweating", "pasina", "paseena", "diaphoresis"])

    elif field_name == "agni":
        return bool(state.ayush and state.ayush.agni)

    elif field_name == "koshtha":
        return bool(state.ayush and state.ayush.koshtha)

    elif field_name == "ahara_vihara":
        return bool(state.ayush and state.ayush.ahara_vihara)

    elif field_name == "sleep_pattern":
        return any(w in combined_snippets for w in ["sleep", "neend", "insomnia", "raat ko"])

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
    Evaluates and scores candidate questioning dimensions dynamically based on:
    - Open Exploration vs Targeted Drilling reasoning modes
    - Safety-required red flags (+200 priority)
    - Active volunteered findings (dark stool, dizziness, weakness -> +160 priority)
    - Open domain exploration (+135 priority)
    - Demotion and disqualification of irrelevant unprompted sub-system questionnaires (-300)
    """
    candidates: List[Dict[str, Any]] = []
    seen_fields: Set[str] = set()
    asked_targets = set(asked_target_fields or [])

    snippets = list(state.raw_transcript_snippets)
    if state.chief_complaint:
        snippets.append(state.chief_complaint)
    snippets.extend(state.symptoms)
    snippets.extend(state.associated_symptoms)
    combined_text = " ".join(snippets).lower()

    # Determine negated symptoms
    negated: Set[str] = set(state.negated_symptoms)
    if any(n in combined_text for n in ["no pain", "dard nahi", "no ache", "pain: no", "dard: nahi"]):
        negated.add("pain")
    if any(n in combined_text for n in ["no vomiting", "ulti nahi", "no nausea", "ulti: nahi"]):
        negated.add("vomiting")
    if any(n in combined_text for n in ["no fever", "bukhar nahi", "taap nahi"]):
        negated.add("fever")
    if any(n in combined_text for n in ["no diarrhea", "no loose motion", "dast nahi"]):
        negated.add("diarrhea")
    if any(n in combined_text for n in ["no blood", "khoon nahi"]):
        negated.add("blood")
    if any(n in combined_text for n in ["nothing else", "no other", "aur kuch nahi", "no, nothing else"]):
        negated.add("other_symptoms")

    # Check active volunteered findings
    has_dark_stool = bool(state.dark_stool) or any(w in combined_text for w in ["dark stool", "black stool", "kala dast", "kala sandas", "stools are dark"])
    has_dizziness = bool(state.dizziness) or any(w in combined_text for w in ["dizzy", "dizziness", "chakkar", "lightheaded"])
    has_weakness = bool(state.weakness) or any(w in combined_text for w in ["weak", "weakness", "kamzori", "thakan", "fatigue"])
    has_vomiting = any(w in combined_text for w in ["vomit", "ulti"]) and "vomiting" not in negated
    has_diarrhea = any(w in combined_text for w in ["loose motion", "dast", "diarrhea", "watery"]) and "diarrhea" not in negated

    for d_idx, domain in enumerate(domains):
        dimensions = DOMAIN_DIMENSIONS.get(domain, DOMAIN_DIMENSIONS[ClinicalDomain.GENERAL])
        domain_weight = 35 if d_idx == 0 else 15

        for dim in dimensions:
            field_name = dim["field"]
            if field_name in seen_fields:
                continue
            seen_fields.add(field_name)

            # 1. Base Priority & Reasoning Mode Classification
            priority = dim["priority"]
            base_score = 50 if priority == "HIGH" else 30 if priority == "MEDIUM" else 15
            score = base_score + domain_weight
            reasoning_mode = "TARGETED_FOLLOW_UP"

            # 2. Open Exploration Reasoning Mode
            if field_name.startswith("open_"):
                reasoning_mode = "OPEN_EXPLORATION"
                # If primary complaint is present and domain has not been openly explored:
                if not is_field_already_resolved(field_name, state) and "other_symptoms" not in negated:
                    # Give high expected information gain to open exploration
                    score += 65
                else:
                    score -= 300

            # 3. Safety-Required Reasoning Mode
            is_safety_field = (
                field_name in ["radiation", "sweating_diaphoresis"]
                or (field_name == "blood_in_stool" and (has_dark_stool or "blood" in combined_text or has_dizziness or has_weakness))
                or (has_dark_stool and field_name in ["dark_stool_onset", "dark_stool_consistency"])
                or (has_dizziness and has_dark_stool and field_name == "hydration_status")
            )
            if is_safety_field and not is_field_already_resolved(field_name, state):
                reasoning_mode = "SAFETY_REQUIRED"
                score += 85

            # 4. Targeted Drilling on Volunteered Findings
            if has_dark_stool:
                if field_name in ["dark_stool_onset", "dark_stool_consistency", "blood_in_stool"]:
                    if not is_field_already_resolved(field_name, state):
                        score += 95
                elif field_name in ["stool_frequency", "stool_consistency"]:
                    # Demote generic frequency in favor of melena characterization
                    score -= 50
            else:
                if field_name in ["dark_stool_onset", "dark_stool_consistency"]:
                    score -= 300

            if ("constipation" in combined_text or "kabz" in combined_text) and field_name in ["stool_frequency", "stool_consistency"]:
                score -= 100

            if (has_diarrhea or state.stool_consistency == "Watery") and field_name in ["laxative_use", "bowel_movement_recency"]:
                score -= 100

            if (has_vomiting or has_diarrhea or has_dizziness or has_weakness) and not is_field_already_resolved("hydration_status", state):
                if field_name == "hydration_status":
                    score += 85
                    reasoning_mode = "TARGETED_FOLLOW_UP"

            if (has_vomiting or has_diarrhea) and not is_field_already_resolved("food_exposure", state):
                if field_name == "food_exposure":
                    score += 50
                    reasoning_mode = "TARGETED_FOLLOW_UP"

            # 5. Check if already resolved or answered
            if is_field_already_resolved(field_name, state):
                score -= 250

            # 6. Direct / Semantic Target Deduplication
            if field_name in asked_targets:
                score -= 300

            for cluster_key, cluster_members in SEMANTIC_CLUSTERS.items():
                if field_name in cluster_members:
                    if any(m in asked_targets for m in cluster_members):
                        score -= 300
                    if any(is_field_already_resolved(m, state) for m in cluster_members):
                        score -= 250

            # 7. Disqualify problem_clarification if we already have specific details
            if field_name in ["problem_clarification", "clarify_problem"]:
                has_specific_detail = has_vomiting or has_diarrhea or has_dark_stool or bool(state.duration) or bool(state.location) or len(state.resolved_dimensions) > 0
                if has_specific_detail:
                    score -= 500

            # 8. Negated Symptom Penalties (Do NOT ask about absent symptoms)
            if "pain" in negated and field_name in ["severity", "character", "pain_location", "abdominal_location"]:
                score -= 300
            if "vomiting" in negated and field_name in ["vomiting", "nausea_vomiting"]:
                score -= 300
            if "fever" in negated and field_name in ["fever", "fever_pattern"]:
                score -= 300
            if "diarrhea" in negated and field_name in ["stool_frequency", "stool_consistency"]:
                score -= 300
            if "blood" in negated and field_name in ["blood_in_stool"]:
                score -= 300

            # 9. Domain-Specific Questionnaire Pruning (Zero Questionnaire Behavior)
            # If patient has NOT volunteered a stool problem, do NOT drill into stool questionnaire
            is_stool_field = field_name in ["stool_frequency", "stool_consistency", "blood_in_stool", "bowel_movement_recency", "laxative_use"]
            if is_stool_field and not (has_dark_stool or has_diarrhea):
                if domain != ClinicalDomain.GASTROINTESTINAL:
                    score -= 400
                elif "other_symptoms" in negated or ("acidity" in combined_text and not has_vomiting):
                    score -= 300
                else:
                    # Demote unprompted stool questions in favor of open exploration or meal relationship
                    score -= 60

            # If patient came with cough/respiratory, prune GI and urinary questions
            if domain == ClinicalDomain.RESPIRATORY or "cough" in combined_text:
                if is_stool_field or field_name in ["urinary_symptoms", "agni", "koshtha"]:
                    score -= 400
                if field_name in ["cough_type", "breathlessness"]:
                    score += 45

            # If patient came with headache, prune GI and urinary questions
            if domain == ClinicalDomain.HEADACHE or "headache" in combined_text or "sir dard" in combined_text:
                if is_stool_field or field_name in ["urinary_symptoms", "agni", "koshtha"]:
                    score -= 400
                if field_name in ["distribution", "photophobia"]:
                    score += 45

            # 10. Anti-Repetition String Token Check
            field_token = field_name.replace("_", " ")
            for prev_q in asked_questions:
                if field_token in prev_q.lower():
                    score -= 100

            candidates.append({
                "field_name": field_name,
                "label": dim["label"],
                "domain": domain,
                "priority": priority,
                "score": score,
                "reasoning_mode": reasoning_mode
            })

    # Sort candidate dimensions by score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates
