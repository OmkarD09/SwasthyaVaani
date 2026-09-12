"""
SwasthyaVaani - Department & OPD Triage Routing Engine.
Maps clinical taxonomy, detected domains, pediatric age criteria, and red flags
to authentic hospital departments and AYUSH OPD units.
"""

from typing import Any, Dict, Optional
from app.services.clinical_ai.domain_classifier import ClinicalDomain

# Canonical Department Codes
DEPT_EMERGENCY = "DEPT_EMERGENCY"
DEPT_GEN_MED = "DEPT_GEN_MED"
DEPT_ORTHO_SHALYA = "DEPT_ORTHO_SHALYA"
DEPT_ENT_EYE = "DEPT_ENT_EYE"
DEPT_PEDS = "DEPT_PEDS"
DEPT_GYNEC = "DEPT_GYNEC"
DEPT_DERM = "DEPT_DERM"
DEPT_PANCHAKARMA = "DEPT_PANCHAKARMA"

# Comprehensive Department Metadata with English, Hindi, AYUSH equivalents, priority & Lucide icons
DEPARTMENT_METADATA: Dict[str, Dict[str, Any]] = {
    DEPT_EMERGENCY: {
        "code": DEPT_EMERGENCY,
        "name_en": "Emergency & Trauma",
        "name_hi": "आपातकालीन एवं ट्रॉमा",
        "ayush_equivalent": "Aatyayika Chikitsa",
        "ayush_name": "Aatyayika Chikitsa",
        "priority_level": 1,
        "priority": 1,
        "icon": "Ambulance",
        "description_en": "Acute chest pain, severe breathlessness, trauma, collapse, or active bleeding",
        "description_hi": "सीने में तेज दर्द, सांस फूलना, गंभीर चोट, बेहोशी या रक्तस्राव",
    },
    DEPT_GEN_MED: {
        "code": DEPT_GEN_MED,
        "name_en": "General Medicine",
        "name_hi": "सामान्य चिकित्सा (ओपीडी)",
        "ayush_equivalent": "Kayachikitsa",
        "ayush_name": "Kayachikitsa",
        "priority_level": 2,
        "priority": 2,
        "icon": "Stethoscope",
        "description_en": "Fever, diabetes, cough, abdominal complaints, body ache, hypertension",
        "description_hi": "बुखार, खांसी, पेट दर्द, बदन दर्द, बीपी, मधुमेह एवं सामान्य रोग",
    },
    DEPT_ORTHO_SHALYA: {
        "code": DEPT_ORTHO_SHALYA,
        "name_en": "Orthopedics & Joint Care",
        "name_hi": "हड्डी एवं जोड़ रोग",
        "ayush_equivalent": "Shalya Tantra",
        "ayush_name": "Shalya Tantra",
        "priority_level": 3,
        "priority": 3,
        "icon": "Bone",
        "description_en": "Joint pain, fractures, arthritis, spine/back pain, sports injuries, sprains",
        "description_hi": "जोड़ों का दर्द, फ्रैक्चर, गठिया, रीढ़/कमर दर्द, मोच एवं चोट",
    },
    DEPT_ENT_EYE: {
        "code": DEPT_ENT_EYE,
        "name_en": "Eye & ENT",
        "name_hi": "नेत्र, कान, नाक एवं गला",
        "ayush_equivalent": "Shalakya Tantra",
        "ayush_name": "Shalakya Tantra",
        "priority_level": 3,
        "priority": 3,
        "icon": "Eye",
        "description_en": "Vision issues, red eye, ear pain/discharge, sore throat, sinus blockage",
        "description_hi": "आंखों में लाली, धुंधला दिखना, कान दर्द, गले में खराश, साइनस",
    },
    DEPT_PEDS: {
        "code": DEPT_PEDS,
        "name_en": "Child Health & Pediatrics",
        "name_hi": "बाल रोग (शिशु स्वास्थ्य)",
        "ayush_equivalent": "Kaumarbhritya",
        "ayush_name": "Kaumarbhritya",
        "priority_level": 2,
        "priority": 2,
        "icon": "Baby",
        "description_en": "Illnesses, vaccinations, and growth issues for infants and children under 14",
        "description_hi": "14 वर्ष से कम उम्र के बच्चों की बीमारियां, टीकाकरण एवं विकास",
    },
    DEPT_GYNEC: {
        "code": DEPT_GYNEC,
        "name_en": "Women's Health & Maternity",
        "name_hi": "स्त्री एवं प्रसूति रोग",
        "ayush_equivalent": "Prasuti Tantra & Stri Roga",
        "ayush_name": "Prasuti Tantra & Stri Roga",
        "priority_level": 2,
        "priority": 2,
        "icon": "HeartHandshake",
        "description_en": "Maternal health, prenatal/postnatal care, menstrual and pelvic disorders",
        "description_hi": "गर्भावस्था, प्रसव पूर्व/पश्चात जांच, मासिक धर्म संबंधी समस्याएं",
    },
    DEPT_DERM: {
        "code": DEPT_DERM,
        "name_en": "Skin & Dermatology",
        "name_hi": "त्वचा एवं चर्म रोग",
        "ayush_equivalent": "Twak Roga",
        "ayush_name": "Twak Roga",
        "priority_level": 3,
        "priority": 3,
        "icon": "Sparkles",
        "description_en": "Rashes, itching, fungal infections, eczema, acne, skin allergies",
        "description_hi": "खुजली, दाद-खाज, त्वचा के चकत्ते, मुंहासे, त्वचा एलर्जी",
    },
    DEPT_PANCHAKARMA: {
        "code": DEPT_PANCHAKARMA,
        "name_en": "Panchakarma & Detox",
        "name_hi": "पंचकर्म एवं शोधन चिकित्सा",
        "ayush_equivalent": "Panchakarma",
        "ayush_name": "Panchakarma",
        "priority_level": 3,
        "priority": 3,
        "icon": "Flower2",
        "description_en": "Ayurvedic detoxification, chronic lifestyle rejuvenation, Vata/dosha therapy",
        "description_hi": "आयुर्वेदिक विषहरण, वात विकार, पुरानी बीमारियों का शोधन व कायाकल्प",
    },
}

# Mapping legacy database codes and IDs to canonical department codes
CODE_ALIASES: Dict[str, str] = {
    "GEN-OPD": DEPT_GEN_MED,
    "dept_gen_01": DEPT_GEN_MED,
    "AYU-OPD": DEPT_PANCHAKARMA,
    "dept_ayu_01": DEPT_PANCHAKARMA,
    "EMERG-OPD": DEPT_EMERGENCY,
    "dept_cardio_01": DEPT_EMERGENCY,
    "ORTHO-OPD": DEPT_ORTHO_SHALYA,
    "dept_ortho_01": DEPT_ORTHO_SHALYA,
    "PED-OPD": DEPT_PEDS,
    "dept_ped_01": DEPT_PEDS,
    "ENT-OPD": DEPT_ENT_EYE,
    "dept_ent_01": DEPT_ENT_EYE,
    "GYN-OPD": DEPT_GYNEC,
    "dept_gyn_01": DEPT_GYNEC,
    "DERM-OPD": DEPT_DERM,
    "dept_derm_01": DEPT_DERM,
}

# Domain to Department Mapping
DOMAIN_TO_DEPARTMENT: Dict[str, str] = {
    ClinicalDomain.CARDIAC: DEPT_EMERGENCY,
    "RESPIRATORY_DISTRESS": DEPT_EMERGENCY,
    "TRAUMA": DEPT_EMERGENCY,
    "EMERGENCY": DEPT_EMERGENCY,
    ClinicalDomain.RESPIRATORY: DEPT_GEN_MED,
    ClinicalDomain.GASTROINTESTINAL: DEPT_GEN_MED,
    ClinicalDomain.FEVER: DEPT_GEN_MED,
    ClinicalDomain.HEADACHE: DEPT_GEN_MED,
    ClinicalDomain.URINARY: DEPT_GEN_MED,
    ClinicalDomain.GENERAL: DEPT_GEN_MED,
    ClinicalDomain.MUSCULOSKELETAL: DEPT_ORTHO_SHALYA,
    ClinicalDomain.OPHTHALMIC: DEPT_ENT_EYE,
    "ENT": DEPT_ENT_EYE,
    "EYE": DEPT_ENT_EYE,
    ClinicalDomain.DERMATOLOGY: DEPT_DERM,
    ClinicalDomain.AYUSH: DEPT_PANCHAKARMA,
    "GYNECOLOGY": DEPT_GYNEC,
    "GYNECOLOGICAL": DEPT_GYNEC,
    "PEDIATRICS": DEPT_PEDS,
    "AYUSH_PANCHAKARMA": DEPT_PANCHAKARMA,
    "PANCHAKARMA": DEPT_PANCHAKARMA,
}


def normalize_department_code(code_or_id: Optional[str]) -> str:
    """Normalizes any code or ID to the canonical DEPT_* code."""
    if not code_or_id:
        return DEPT_GEN_MED
    trimmed = code_or_id.strip()
    if trimmed in DEPARTMENT_METADATA:
        return trimmed
    if trimmed in CODE_ALIASES:
        return CODE_ALIASES[trimmed]
    upper_trimmed = trimmed.upper()
    if upper_trimmed in DEPARTMENT_METADATA:
        return upper_trimmed
    if upper_trimmed in CODE_ALIASES:
        return CODE_ALIASES[upper_trimmed]
    return DEPT_GEN_MED


def resolve_department_route(
    current_department_id: Optional[str] = None,
    detected_domain: Optional[str] = None,
    has_red_flags: bool = False,
    patient_age: Optional[int] = None,
    *,
    current_department_code: Optional[str] = None,
) -> str:
    """
    Deterministically computes the target clinical department for a patient intake session.

    Rules applied in strict clinical order:
    1. Immediate override: if has_red_flags is True -> force route to DEPT_EMERGENCY.
    2. Acute Emergency Domain: CARDIAC, RESPIRATORY_DISTRESS, TRAUMA -> route to DEPT_EMERGENCY.
    3. Pediatric rule: if patient_age < 14 and not acute emergency -> route to DEPT_PEDS.
    4. Auto Triage: If current_department_id is None, 'AUTO', or 'UNKNOWN' -> route based on detected_domain.
    5. User Selection: Respects patient selection unless acute escalation is required.
    """
    # 1. Immediate override for critical safety red flags
    if has_red_flags:
        return DEPT_EMERGENCY

    # 2. Acute emergency clinical domains
    acute_emergency_domains = {
        ClinicalDomain.CARDIAC,
        "RESPIRATORY_DISTRESS",
        "TRAUMA",
        "EMERGENCY",
    }
    if detected_domain in acute_emergency_domains:
        return DEPT_EMERGENCY

    # 3. Pediatric rule: patient age < 14
    if patient_age is not None and patient_age < 14:
        return DEPT_PEDS

    # 4. Auto Triage if not specified by user
    raw_current = current_department_code if current_department_code is not None else current_department_id
    norm_current = (raw_current or "").strip()
    if not norm_current or norm_current.upper() in {"AUTO", "UNKNOWN", "NONE", "NULL"}:
        if detected_domain and detected_domain in DOMAIN_TO_DEPARTMENT:
            return DOMAIN_TO_DEPARTMENT[detected_domain]
        return DEPT_GEN_MED

    # 5. User-selected department: resolve through canonical/alias map
    canonical = CODE_ALIASES.get(norm_current, norm_current)
    if canonical in DEPARTMENT_METADATA:
        return canonical

    upper_code = norm_current.upper()
    if upper_code in DEPARTMENT_METADATA:
        return upper_code
    if upper_code in CODE_ALIASES:
        return CODE_ALIASES[upper_code]

    # Fallback to domain or general medicine
    if detected_domain and detected_domain in DOMAIN_TO_DEPARTMENT:
        return DOMAIN_TO_DEPARTMENT[detected_domain]
    return DEPT_GEN_MED
