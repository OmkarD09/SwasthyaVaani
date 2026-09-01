"""
Curated AYUSH Reference Knowledge Base for SwasthyaVaani RAG Layer.
Contains structured clinical guidance based on standardized Ayurvedic intake assessment dimensions.
Source: National AYUSH Morbidity & Standardized Terminology Guidelines (NAMSTP) / Ministry of AYUSH.
"""

from typing import Any

AYUSH_REFERENCE_DOCUMENTS: list[dict[str, Any]] = [
    {
        "title": "AYUSH Clinical Intake Standard: Agni (Digestive Fire) Assessment",
        "source": "Ministry of AYUSH Clinical Protocols (NAMSTP)",
        "source_type": "AYUSH_REFERENCE",
        "version": "1.0",
        "language": "en",
        "workflow": "AYUSH",
        "chunks": [
            {
                "topic": "agni_overview",
                "content": "Agni (Digestive Fire) Assessment: In Ayurveda, assessment of Agni (Jatharagni) is primary for understanding gastrointestinal and systemic metabolism. Agni is categorized into four states: Samagni (balanced), Mandagni (sluggish/low appetite), Tikshnagni (excessive appetite/burning), and Vishamagni (irregular appetite and digestion).",
                "language": "en",
                "workflow": "AYUSH"
            },
            {
                "topic": "mandagni_assessment",
                "content": "Mandagni (Sluggish Digestion): Symptoms include loss of appetite (Aruchi), prolonged digestion time (>6 hours), feeling of abdominal heaviness (Gaurava/Pet mein bhari pan), dull discomfort after small meals, and sluggishness after food. Common in Kapha-dominant conditions.",
                "language": "en",
                "workflow": "AYUSH"
            },
            {
                "topic": "tikshnagni_assessment",
                "content": "Tikshnagni (Intense/Acidic Digestion): Symptoms include burning sensation in chest or epigastrium (Amlapitta/Daha/Seene mein jalan), excessive thirst (Trishna), ravenous hunger that worsens discomfort if food is delayed, acid regurgitation, and irritability. Common in Pitta-dominant conditions.",
                "language": "en",
                "workflow": "AYUSH"
            },
            {
                "topic": "vishamagni_assessment",
                "content": "Vishamagni (Irregular/Fluctuating Digestion): Symptoms include fluctuating appetite (sometimes very hungry, other times complete loss of hunger), flatulence, abdominal bloating (Adhmana), borborygmi (stomach gurgling), and erratic bowel movements. Common in Vata-dominant conditions.",
                "language": "en",
                "workflow": "AYUSH"
            }
        ]
    },
    {
        "title": "AYUSH Clinical Intake Standard: Koshtha (Bowel Habits & Evacuation) Assessment",
        "source": "Ministry of AYUSH Clinical Protocols (NAMSTP)",
        "source_type": "AYUSH_REFERENCE",
        "version": "1.0",
        "language": "en",
        "workflow": "AYUSH",
        "chunks": [
            {
                "topic": "koshtha_overview",
                "content": "Koshtha (Bowel Characteristics): Assesses bowel movement ease, frequency, stool consistency, and gastrointestinal sensitivity. Evaluated as Mridu (soft/laxative-sensitive), Madhyama (moderate/regular), or Krura (hard/constipated).",
                "language": "en",
                "workflow": "AYUSH"
            },
            {
                "topic": "krura_koshtha",
                "content": "Krura Koshtha (Hard Bowel / Constipation): Marked by infrequent evacuation, hard dry stools (Vibandha), straining during defecation, sensation of incomplete evacuation, and gas retention. Strong Vata involvement requiring gentle lubricant inquiry.",
                "language": "en",
                "workflow": "AYUSH"
            },
            {
                "topic": "mridu_koshtha",
                "content": "Mridu Koshtha (Laxative Sensitive / Loose Stools): Marked by easy, frequent bowel movements, loose or unformed stools (Atisara tendencies), and high sensitivity where warm milk, ghee, or sugarcane juice induces loose motion. Pitta involvement.",
                "language": "en",
                "workflow": "AYUSH"
            }
        ]
    },
    {
        "title": "AYUSH Clinical Intake Standard: Ahara, Vihara & Nidra (Diet, Lifestyle & Sleep)",
        "source": "Ministry of AYUSH Clinical Protocols (NAMSTP)",
        "source_type": "AYUSH_REFERENCE",
        "version": "1.0",
        "language": "en",
        "workflow": "AYUSH",
        "chunks": [
            {
                "topic": "ahara_diet",
                "content": "Ahara (Dietary Intake Dimensions): Evaluation of food habits, including consumption of spicy (Katu), sour (Amla), heavy/oily (Snigdha/Guru), cold (Sheeta), or dry (Ruksha) foods; meal frequency, snacking habits (Adhyashana), and time interval between meals.",
                "language": "en",
                "workflow": "AYUSH"
            },
            {
                "topic": "nidra_sleep",
                "content": "Nidra (Sleep Patterns): Assessment of sleep quality, onset insomnia (difficulty falling asleep - Vata), night awakening with restlessness (Pitta), or excessive unrefreshing morning sleepiness/heaviness (Kapha/Alasya).",
                "language": "en",
                "workflow": "AYUSH"
            },
            {
                "topic": "dosha_vitiation_symptoms",
                "content": "Dosha Symptom Clusters: Vata presents with severe variable pain, joint stiffness, dryness, and anxiety; Pitta presents with burning sensation, hyperacidity, excessive sweating, and feverish heat; Kapha presents with persistent heaviness, lethargy, congestion, and slow digestion.",
                "language": "en",
                "workflow": "AYUSH"
            }
        ]
    }
]
