from typing import List, Set, Tuple
from app.schemas.clinical_state import ClinicalState


class ClinicalDomain:
    HEADACHE = "HEADACHE"
    GASTROINTESTINAL = "GASTROINTESTINAL"
    RESPIRATORY = "RESPIRATORY"
    CARDIAC = "CARDIAC"
    FEVER = "FEVER"
    MUSCULOSKELETAL = "MUSCULOSKELETAL"
    AYUSH = "AYUSH"
    GENERAL = "GENERAL"


# Keyword signal banks for domain detection
DOMAIN_KEYWORDS = {
    ClinicalDomain.HEADACHE: [
        "headache", "head ache", "head pain", "migraine", "throbbing", "forehead",
        "temple", "one side of head", "sir dard", "sar dard", "doke dukhi", "mastak", "cephalalgia",
        "डोकेदुखी", "डोके", "सिरदर्द", "सरदर्द", "माथा"
    ],
    ClinicalDomain.GASTROINTESTINAL: [
        "stomach", "abdomen", "abdominal", "belly", "tummy", "loose motion", "diarrhea", "diarrhoea",
        "vomit", "vomiting", "nausea", "acidity", "gas", "bloating", "constipation", "cramps",
        "pet dard", "pet kharab", "dast", "ulti", "jalan", "pot dukhi", "sandaas",
        "पोट", "पोटात", "पेट", "उल्टी", "उलट्या", "जुलाब", "दस्त", "ॲसिडिटी", "बद्धकोष्ठता"
    ],
    ClinicalDomain.RESPIRATORY: [
        "cough", "coughing", "breathless", "shortness of breath", "breathing difficulty", "dyspnea",
        "wheezing", "sputum", "phlegm", "mucus", "throat", "asthma", "khansi", "khokla", "saans lene me takleef",
        "dama", "chest congestion", "खोकला", "खांसी", "कफ", "श्वास"
    ],
    ClinicalDomain.CARDIAC: [
        "chest pain", "chest pressure", "squeezing chest", "crushing chest", "heart", "palpitations",
        "radiation to left arm", "arm pain", "jaw pain", "chaati me dard", "chaati dabaav", "hruday",
        "छाती", "छातीत", "सीने में दर्द"
    ],
    ClinicalDomain.FEVER: [
        "fever", "high temperature", "chills", "shivering", "rigors", "body ache", "sweats",
        "bukhar", "taap", "ang dukhi", "thandi lagna", "ताप", "बुखार"
    ],
    ClinicalDomain.MUSCULOSKELETAL: [
        "joint", "knee", "back pain", "backache", "neck pain", "shoulder", "swelling",
        "sprain", "stiffness", "kamar dard", "ghutna dard", "sandhivata", "path dukhi",
        "गुडघे", "सांधेदुखी", "कमर दर्द", "घुटने"
    ]
}


def classify_clinical_domains(state: ClinicalState, workflow_type: str = "GENERAL_CLINICAL") -> List[str]:
    """
    Classifies the clinical domains applicable to the patient based on accumulated ClinicalState,
    workflow selection, chief complaint, reported symptoms, and natural language transcript snippets.
    Returns prioritized list of matching domains.
    """
    if workflow_type == "AYUSH":
        return [ClinicalDomain.AYUSH, ClinicalDomain.GASTROINTESTINAL, ClinicalDomain.GENERAL]

    # Aggregate all text signals from clinical state
    text_corpus: List[str] = []
    if state.chief_complaint:
        text_corpus.append(state.chief_complaint.lower())
    for s in state.symptoms:
        text_corpus.append(s.lower())
    for a in state.associated_symptoms:
        text_corpus.append(a.lower())
    if state.location:
        text_corpus.append(state.location.lower())
    for snippet in state.raw_transcript_snippets:
        text_corpus.append(snippet.lower())

    combined_text = " ".join(text_corpus)

    matched_domains: List[Tuple[str, int]] = []

    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in combined_text:
                score += 2 if (state.chief_complaint and kw in state.chief_complaint.lower()) else 1
        if score > 0:
            matched_domains.append((domain, score))

    # Sort by match score descending
    matched_domains.sort(key=lambda x: x[1], reverse=True)

    domains = [d[0] for d in matched_domains]

    # Default to GENERAL if no specific domain triggers
    if not domains:
        domains = [ClinicalDomain.GENERAL]

    return domains
