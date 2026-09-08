"""
Benchmark Scenarios for SwasthyaVaani LLM Provider Evaluation.

Defines standardized clinical scenarios A through H covering:
- English, Hindi, and Mixed Hindi-English (Hinglish) conversations
- Multi-turn clinical history gathering (SOCRATES framework)
- Deterministic vs LLM safety boundaries (Red Flag triggers)
- Contradiction detection across statements & documents
- Existing medical context utilization & question non-redundancy
- AYUSH Ayurvedic constitutional assessment (Agni, Koshtha, Ahara-Vihara)
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExpectedFacts(BaseModel):
    """Ground-truth expected structured clinical entities for accuracy evaluation."""
    chief_complaint: Optional[str] = None
    duration: Optional[str] = None
    severity: Optional[int] = None
    location: Optional[str] = None
    radiation: Optional[str] = None
    character: Optional[str] = None
    associated_symptoms: List[str] = Field(default_factory=list)
    negated_symptoms: List[str] = Field(default_factory=list)
    # AYUSH Core
    agni: Optional[str] = None
    koshtha: Optional[str] = None
    ahara_vihara: Optional[str] = None
    # Dashavidha
    sara: Optional[str] = None
    samhanana: Optional[str] = None
    pramana: Optional[str] = None
    satmya: Optional[str] = None
    sattva: Optional[str] = None
    ahara_shakti: Optional[str] = None
    vyayama_shakti: Optional[str] = None
    vaya: Optional[str] = None


class ExpectedSafetyBehavior(BaseModel):
    """Expected safety behaviors separated by model extraction vs deterministic rule triggers."""
    expected_red_flags: List[str] = Field(default_factory=list, description="Rule IDs like RF-CP-001, RF-SEV-001")
    expected_contradictions_count: int = 0
    safety_gating_required: bool = False
    notes: str = ""


class PatientPersonaTurn(BaseModel):
    """A patient persona response, mapped by target field or fallback sequence."""
    target_field_answers: Dict[str, str] = Field(
        default_factory=dict,
        description="Response provided if the AI specifically asks for a given clinical dimension"
    )
    default_response: str = Field(..., description="Response if an unmapped or general question is asked")


class BenchmarkScenario(BaseModel):
    id: str
    code: str  # e.g., "SCENARIO_A"
    title: str
    description: str
    language_code: str  # "en", "hi", "hi-en" (mixed)
    workflow_type: str = "GENERAL_CLINICAL"  # "GENERAL_CLINICAL" or "AYUSH"
    initial_statement: str
    initial_clinical_state: Optional[Dict[str, Any]] = None
    initial_medications: List[Dict[str, Any]] = Field(default_factory=list)
    initial_documents: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Patient conversation script/persona responses
    persona_responses: List[PatientPersonaTurn] = Field(default_factory=list)
    max_turns: int = 6
    
    # Ground truth for scoring
    expected_facts: ExpectedFacts
    expected_safety: ExpectedSafetyBehavior = Field(default_factory=ExpectedSafetyBehavior)
    irrelevant_dimensions: List[str] = Field(
        default_factory=list,
        description="Clinical dimensions that would be considered clinically irrelevant/hallucinated for this presentation"
    )


# ---------------------------------------------------------------------------
# Scenario Definitions (A through H)
# ---------------------------------------------------------------------------

SCENARIO_A_HEADACHE = BenchmarkScenario(
    id="scenario_a_headache_en",
    code="Scenario A",
    title="Simple Headache (English)",
    description="Patient presents with acute headache. Evaluates discovery of duration, severity, location, and absence of visual aura / vomiting.",
    language_code="en",
    workflow_type="GENERAL_CLINICAL",
    initial_statement="I have a headache.",
    persona_responses=[
        PatientPersonaTurn(
            target_field_answers={
                "duration": "It started about 2 days ago.",
                "symptom_duration": "It has been going on for 2 days.",
                "onset": "It started gradually 2 days ago.",
                "severity": "On a scale of 1 to 10, the pain is about 6.",
                "distribution": "The pain is mostly in my forehead and temples.",
                "location": "Across my forehead and both temples.",
                "photophobia": "Bright light makes the headache worse.",
                "light_sensitivity": "Yes, bright lights irritate my eyes.",
                "visual_aura": "No flashing lights or blurred vision.",
                "open_headache_exploration": "I have not had any vomiting or nausea, just the throbbing pain.",
                "associated_symptoms": "No vomiting and no dizziness.",
            },
            default_response="It started 2 days ago, pain is 6 out of 10 on my forehead, with no vomiting or vision problems."
        ),
        PatientPersonaTurn(
            target_field_answers={
                "severity": "The pain intensity is 6 out of 10.",
                "location": "Mainly across my forehead.",
                "distribution": "On both sides of my forehead.",
                "photophobia": "Yes, bright light worsens the pain.",
                "vomiting": "I am not vomiting at all.",
                "visual_aura": "No visual disturbances.",
            },
            default_response="The pain is about 6/10 across my forehead, worse in bright light, no vomiting."
        ),
        PatientPersonaTurn(
            target_field_answers={
                "photophobia": "Yes, bright light makes it worse.",
                "associated_symptoms": "No other symptoms, no nausea.",
                "visual_aura": "No visual changes.",
            },
            default_response="No other symptoms or nausea."
        ),
    ],
    expected_facts=ExpectedFacts(
        chief_complaint="headache",
        duration="2 days",
        severity=6,
        location="forehead",
        negated_symptoms=["vomiting", "visual aura", "nausea"]
    ),
    expected_safety=ExpectedSafetyBehavior(
        expected_red_flags=[],
        expected_contradictions_count=0,
        safety_gating_required=False,
        notes="Non-emergency presentation, normal triage priority."
    ),
    irrelevant_dimensions=["chest_pain", "stool_frequency", "dysuria_burning", "joint_swelling"]
)


SCENARIO_B_HINDI = BenchmarkScenario(
    id="scenario_b_hindi_headache",
    code="Scenario B",
    title="Hindi Headache & Duration",
    description="Patient speaks pure Hindi describing headache and 3-day duration. Evaluates Indic NLU, Devanagari question generation, and structured extraction.",
    language_code="hi",
    workflow_type="GENERAL_CLINICAL",
    initial_statement="मुझे तीन दिन से सिर में दर्द है।",
    persona_responses=[
        PatientPersonaTurn(
            target_field_answers={
                "severity": "दर्द मध्यम है, लगभग 5 नंबर का।",
                "distribution": "दर्द दोनों तरफ माथे पर है।",
                "location": "कनपटी और माथे में दर्द है।",
                "photophobia": "तेज रोशनी से थोड़ी परेशानी होती है।",
                "open_headache_exploration": "इसके अलावा कोई उल्टी या चक्कर नहीं है।",
                "associated_symptoms": "कोई उल्टी नहीं है।",
                "vomiting": "उल्टी बिल्कुल नहीं हो रही है।",
            },
            default_response="दर्द माथे पर है, 5 नंबर का, और कोई उल्टी नहीं है।"
        ),
        PatientPersonaTurn(
            target_field_answers={
                "severity": "1 से 10 में लगभग 5 है।",
                "photophobia": "हां, रोशनी में दर्द बढ़ता है।",
                "vomiting": "मुझे उल्टी नहीं है।",
                "associated_symptoms": "कोई अन्य परेशानी नहीं है।",
            },
            default_response="रोशनी से दर्द बढ़ता है, उल्टी नहीं है।"
        ),
    ],
    expected_facts=ExpectedFacts(
        chief_complaint="headache",
        duration="3 days",
        severity=5,
        location="forehead",
        negated_symptoms=["vomiting", "nausea"]
    ),
    expected_safety=ExpectedSafetyBehavior(
        expected_red_flags=[],
        expected_contradictions_count=0,
        safety_gating_required=False,
        notes="Standard Indic intake without red flags."
    ),
    irrelevant_dimensions=["stool_consistency", "cough_type", "dysuria_burning"]
)


SCENARIO_C_HINGLISH = BenchmarkScenario(
    id="scenario_c_hinglish_mixed",
    code="Scenario C",
    title="Mixed Hindi-English (Hinglish)",
    description="Patient uses code-switched Hindi-English describing headache and dizziness since yesterday. Evaluates bilingual entity extraction and symptom separation.",
    language_code="hi",
    workflow_type="GENERAL_CLINICAL",
    initial_statement="Mujhe kal se headache hai aur thoda dizziness bhi ho raha hai.",
    persona_responses=[
        PatientPersonaTurn(
            target_field_answers={
                "severity": "Pain moderate hai, scale par 4 out of 10.",
                "distribution": "Pure head mein heavy feeling aur dard hai.",
                "location": "Head mein frontal side par.",
                "vomiting": "Nahi, vomiting bilkul nahi hai.",
                "photophobia": "Light se thoda irritation hota hai.",
                "open_headache_exploration": "Sirf dizziness aur headache hai, vomiting ya fever nahi hai.",
                "associated_symptoms": "Fever nahi hai, bas dizziness hai.",
            },
            default_response="Pain 4/10 hai frontal head mein, vomiting nahi hai."
        ),
        PatientPersonaTurn(
            target_field_answers={
                "severity": "Pain is around 4 out of 10.",
                "vomiting": "No vomiting.",
                "fever": "No fever.",
            },
            default_response="No fever, no vomiting."
        ),
    ],
    expected_facts=ExpectedFacts(
        chief_complaint="headache",
        duration="since yesterday",
        severity=4,
        associated_symptoms=["dizziness"],
        negated_symptoms=["vomiting", "fever"]
    ),
    expected_safety=ExpectedSafetyBehavior(
        expected_red_flags=[],
        expected_contradictions_count=0,
        safety_gating_required=False,
        notes="Bilingual presentation correctly recognizing dizziness as associated symptom."
    ),
    irrelevant_dimensions=["stool_frequency", "dysuria_burning"]
)


SCENARIO_D_FEVER = BenchmarkScenario(
    id="scenario_d_fever_efficiency",
    code="Scenario D",
    title="Fever & Question Non-Redundancy",
    description="Patient presents with fever for 3 days. Evaluates whether the system extracts duration immediately and avoids redundant questions asking how long the fever lasted.",
    language_code="hi",
    workflow_type="GENERAL_CLINICAL",
    initial_statement="Mujhe 3 din se bukhar hai.",
    persona_responses=[
        PatientPersonaTurn(
            target_field_answers={
                "fever_pattern": "Tez bukhar aata hai thand aur shivering ke saath.",
                "open_fever_exploration": "Bukhar ke sath thand lagti hai, khansi ya gale mein dard nahi hai.",
                "cough_type": "Khansi nahi hai.",
                "associated_bodyache": "Sharir mein thoda dard hai.",
                "associated_symptoms": "Thand lagti hai aur body ache hai, khansi nahi hai.",
            },
            default_response="Tez bukhar hai thand ke saath, koi khansi nahi hai."
        ),
        PatientPersonaTurn(
            target_field_answers={
                "associated_bodyache": "Haan, body ache hai.",
                "cough_type": "No cough.",
                "open_fever_exploration": "No other symptoms.",
            },
            default_response="No cough, no breathing issue."
        ),
    ],
    expected_facts=ExpectedFacts(
        chief_complaint="fever",
        duration="3 days",
        associated_symptoms=["chills", "body ache"],
        negated_symptoms=["cough"]
    ),
    expected_safety=ExpectedSafetyBehavior(
        expected_red_flags=[],
        expected_contradictions_count=0,
        safety_gating_required=False,
        notes="Verifies no redundant questions on duration."
    ),
    irrelevant_dimensions=["rash_location", "eye_discharge", "dark_stool"]
)


SCENARIO_E_CHEST_PAIN = BenchmarkScenario(
    id="scenario_e_chest_pain_red_flag",
    code="Scenario E",
    title="Chest Pain / Red Flag Safety Trigger",
    description="Emergency cardiac presentation. Evaluates extraction of severe pain (9/10), radiation to left arm, sweating, and triggering deterministic Red Flag rules (RF-CP-001, RF-SEV-001).",
    language_code="en",
    workflow_type="GENERAL_CLINICAL",
    initial_statement="I've had severe chest pain since this morning.",
    persona_responses=[
        PatientPersonaTurn(
            target_field_answers={
                "severity": "The pain is extremely severe, 9 out of 10.",
                "radiation": "Yes, the heavy pressure is radiating down my left arm and jaw.",
                "sweating_diaphoresis": "Yes, I am sweating heavily and feel dizzy.",
                "breathlessness": "Yes, I am having trouble catching my breath.",
                "character": "It feels like a crushing heavy pressure on my chest.",
                "open_cardiac_exploration": "Pain goes down my left arm, I am sweating and short of breath.",
            },
            default_response="The pain is 9 out of 10, radiating to my left arm, with cold sweating and shortness of breath."
        ),
        PatientPersonaTurn(
            target_field_answers={
                "radiation": "Radiating to my left arm.",
                "sweating_diaphoresis": "Yes, severe sweating.",
                "severity": "9 out of 10.",
            },
            default_response="Radiating to left arm with cold sweats."
        ),
    ],
    expected_facts=ExpectedFacts(
        chief_complaint="chest pain",
        severity=9,
        location="chest",
        radiation="left arm",
        associated_symptoms=["sweating", "shortness of breath", "dizziness"]
    ),
    expected_safety=ExpectedSafetyBehavior(
        expected_red_flags=["RF-CP-001", "RF-SEV-001"],
        expected_contradictions_count=0,
        safety_gating_required=True,
        notes="Must trigger RF-CP-001 and RF-SEV-001. Gating safety scenario."
    ),
    irrelevant_dimensions=["stool_frequency", "itching_pruritus", "joint_swelling"]
)


SCENARIO_F_CONTRADICTION = BenchmarkScenario(
    id="scenario_f_contradictory_info",
    code="Scenario F",
    title="Contradictory Information & Medication Stoppage",
    description="Patient has active Metformin prescription in record, but reports having stopped it due to stomach upset, followed by conflicting fever duration statements.",
    language_code="en",
    workflow_type="GENERAL_CLINICAL",
    initial_statement="I stopped taking Metformin last week because my stomach hurt.",
    initial_medications=[
        {
            "drug_name": "Metformin",
            "dose": "500 mg",
            "frequency": "Once daily",
            "duration": "1 month",
            "status": "EXTRACTED",
            "provenance": {
                "source_type": "DOCUMENT",
                "source_id": "prescription_doc_001",
                "confidence": 0.95
            }
        }
    ],
    persona_responses=[
        PatientPersonaTurn(
            target_field_answers={
                "duration": "My fever started yesterday.",
                "symptom_duration": "The fever started yesterday.",
                "chief_complaint": "I also have fever which started yesterday.",
                "open_gi_exploration": "I stopped the Metformin because of stomach pain.",
            },
            default_response="I also developed a fever yesterday."
        ),
        PatientPersonaTurn(
            target_field_answers={
                "duration": "Actually, I've had this fever for one week now.",
                "symptom_duration": "To be honest, the fever has been there for one week.",
            },
            default_response="I have actually had this fever for one week."
        ),
    ],
    expected_facts=ExpectedFacts(
        chief_complaint="stomach pain",
        associated_symptoms=["fever"],
    ),
    expected_safety=ExpectedSafetyBehavior(
        expected_red_flags=[],
        expected_contradictions_count=1,
        safety_gating_required=False,
        notes="System must surface medication discontinuation contradiction for physician review."
    ),
    irrelevant_dimensions=["eye_discharge", "rash_character"]
)


SCENARIO_G_EXISTING_CONTEXT = BenchmarkScenario(
    id="scenario_g_existing_context",
    code="Scenario G",
    title="Existing Medical Context & History Non-Redundancy",
    description="Patient with existing documented hypertension and Amlodipine presents with persistent dry cough. Evaluates context reuse without asking duplicate medical history questions.",
    language_code="en",
    workflow_type="GENERAL_CLINICAL",
    initial_statement="I am having a persistent dry cough.",
    initial_clinical_state={
        "past_history": ["Hypertension for 5 years"],
        "medical_history": "Hypertension for 5 years",
        "medications": [
            {
                "drug_name": "Amlodipine",
                "dose": "5 mg",
                "frequency": "Once daily",
                "duration": "Ongoing",
                "status": "CONFIRMED"
            }
        ],
        "resolved_dimensions": ["past_history", "medications"]
    },
    persona_responses=[
        PatientPersonaTurn(
            target_field_answers={
                "duration": "The cough has been going on for 4 days.",
                "cough_type": "It is a dry hacking cough, no mucus or blood.",
                "breathlessness": "No shortness of breath or chest pain.",
                "fever": "No fever.",
                "open_respiratory_exploration": "It is dry cough without fever or breathlessness.",
            },
            default_response="The dry cough is for 4 days, no phlegm, no fever, no breathing issue."
        ),
        PatientPersonaTurn(
            target_field_answers={
                "breathlessness": "No shortness of breath.",
                "fever": "No fever.",
                "cough_type": "Dry cough.",
            },
            default_response="No breathing difficulty, no fever."
        ),
    ],
    expected_facts=ExpectedFacts(
        chief_complaint="cough",
        duration="4 days",
        character="dry",
        negated_symptoms=["phlegm", "fever", "breathlessness", "chest pain"]
    ),
    expected_safety=ExpectedSafetyBehavior(
        expected_red_flags=[],
        expected_contradictions_count=0,
        safety_gating_required=False,
        notes="Evaluates medical context preservation without re-asking known history."
    ),
    irrelevant_dimensions=["stool_consistency", "dark_stool", "dysuria_burning"]
)


SCENARIO_H_AYUSH = BenchmarkScenario(
    id="scenario_h_ayush_assessment",
    code="Scenario H",
    title="AYUSH Ayurvedic Constitutional Intake",
    description="Patient presents with indigestion, heaviness, low appetite, and hard stools. Evaluates extraction of Agni (Manda), Koshtha (Krura), Ahara-Vihara (oily spicy food), and AYUSH model integration.",
    language_code="en",
    workflow_type="AYUSH",
    initial_statement="I have had sluggish digestion and heaviness after meals for 2 weeks.",
    persona_responses=[
        PatientPersonaTurn(
            target_field_answers={
                "agni": "My appetite is very low and sluggish, I feel heavy for hours after eating (Manda Agni).",
                "koshtha": "My bowel movements are irregular and hard, with constipation (Krura Koshtha).",
                "ahara_vihara": "I eat a lot of oily, spicy fried foods late at night and have irregular sleep.",
                "open_ayush_exploration": "My appetite is low, digestion is slow, stools are hard and constipated, and I eat oily food.",
                "severity": "Discomfort is mild, around 3 out of 10.",
            },
            default_response="My appetite is low (Manda), stools are hard and constipated (Krura), and I eat oily spicy food."
        ),
        PatientPersonaTurn(
            target_field_answers={
                "koshtha": "Bowel is hard and constipated (Krura).",
                "ahara_vihara": "Oily food and late night dinners.",
                "sleep_pattern": "Disturbed sleep.",
            },
            default_response="Hard constipated stools, irregular sleep, oily diet."
        ),
    ],
    expected_facts=ExpectedFacts(
        chief_complaint="sluggish digestion",
        duration="2 weeks",
        agni="Manda",
        koshtha="Krura",
        ahara_vihara="oily spicy fried foods"
    ),
    expected_safety=ExpectedSafetyBehavior(
        expected_red_flags=[],
        expected_contradictions_count=0,
        safety_gating_required=False,
        notes="Core AYUSH constitutional dimensions extraction."
    ),
    irrelevant_dimensions=["chest_pain", "radiation", "rash_location"]
)


BENCHMARK_SCENARIOS: List[BenchmarkScenario] = [
    SCENARIO_A_HEADACHE,
    SCENARIO_B_HINDI,
    SCENARIO_C_HINGLISH,
    SCENARIO_D_FEVER,
    SCENARIO_E_CHEST_PAIN,
    SCENARIO_F_CONTRADICTION,
    SCENARIO_G_EXISTING_CONTEXT,
    SCENARIO_H_AYUSH,
]


def get_scenario_by_id(scenario_id: str) -> Optional[BenchmarkScenario]:
    for s in BENCHMARK_SCENARIOS:
        if s.id.lower() == scenario_id.lower() or s.code.lower() == scenario_id.lower():
            return s
    return None
