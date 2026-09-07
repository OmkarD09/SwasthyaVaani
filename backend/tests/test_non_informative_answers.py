import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.intake import IntakeSession, ClinicalStateModel
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question
from app.services.providers.llm_provider import ClinicalExtractionSchema, MockLLMProvider
from app.seed.seed_data import seed_database


def test_schema_includes_is_non_informative():
    """Verify ClinicalExtractionSchema defines and accepts is_non_informative."""
    data = {"chief_complaint": None, "is_non_informative": True}
    schema = ClinicalExtractionSchema(**data)
    assert schema.is_non_informative is True

    default_schema = ClinicalExtractionSchema()
    assert default_schema.is_non_informative is False


@pytest.mark.asyncio
async def test_mock_llm_provider_flags_non_informative():
    """Verify MockLLMProvider sets is_non_informative for uncertainty/confusion phrases."""
    provider = MockLLMProvider()

    for phrase in ["idk", "i don't know", "what?", "samajh nahi aaya", "pata nahi", "not sure"]:
        res = await provider.extract_clinical_facts(
            raw_text=phrase,
            current_state=ClinicalState(chief_complaint="Severe headache"),
            target_field="distribution",
        )
        assert res.extracted_facts.get("is_non_informative") is True, f"Failed for '{phrase}'"


def test_intake_pivots_on_english_non_informative(client: TestClient, db: Session):
    """Verify 'idk' sets last_non_informative_response and pivots to alternative candidate."""
    seed_database(db)

    # 1. Create intake
    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Test English Pivot",
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert create_res.status_code == 200
    intake_id = create_res.json()["id"]

    # 2. Present complaint
    ans1 = client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "I have had a severe throbbing headache for 2 days.",
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()

    first_target = ans1["decision"]["target_field"]
    first_q = ans1["decision"]["question"]
    assert first_target is not None

    # 3. Patient replies with non-informative answer: "idk"
    ans2 = client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "idk",
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()

    second_target = ans2["decision"]["target_field"]
    second_q = ans2["decision"]["question"]

    # The engine must pivot to a different candidate dimension rather than re-asking the exact same question
    assert second_target != first_target, f"Engine should pivot away from '{first_target}' on non-informative answer, but got '{second_target}'"
    assert second_q != first_q


def test_intake_pivots_on_hindi_non_informative(client: TestClient, db: Session):
    """Verify 'samajh nahi aaya' pivots dimension in Hindi."""
    seed_database(db)

    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Test Hindi Pivot",
        "language_code": "hi",
        "interaction_mode": "TEXT"
    })
    intake_id = create_res.json()["id"]

    ans1 = client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "मुझे 2 दिन से बहुत तेज सिरदर्द है",
        "input_mode": "TEXT",
        "language_code": "hi"
    }).json()

    first_target = ans1["decision"]["target_field"]

    # Hindi confused reply
    ans2 = client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "samajh nahi aaya",
        "input_mode": "TEXT",
        "language_code": "hi"
    }).json()

    second_target = ans2["decision"]["target_field"]
    assert second_target != first_target


def test_intake_pivots_on_hinglish_non_informative(client: TestClient, db: Session):
    """Verify 'pata nahi not sure' pivots dimension cleanly."""
    seed_database(db)

    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Test Hinglish Pivot",
        "language_code": "hi",
        "interaction_mode": "TEXT"
    })
    intake_id = create_res.json()["id"]

    ans1 = client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "पेट में बहुत तेज दर्द है कल से",
        "input_mode": "TEXT",
        "language_code": "hi"
    }).json()

    first_target = ans1["decision"]["target_field"]

    # Hinglish confused reply
    ans2 = client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "pata nahi",
        "input_mode": "TEXT",
        "language_code": "hi"
    }).json()

    second_target = ans2["decision"]["target_field"]
    assert second_target != first_target


def test_subsequent_informative_answer_resets_and_extracts(client: TestClient, db: Session):
    """Verify that after an 'idk' pivot, an informative answer continues normal intake."""
    seed_database(db)

    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Test Recovery",
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    intake_id = create_res.json()["id"]

    # 1. Chief complaint
    client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "I have red eyes and irritation.",
        "input_mode": "TEXT",
        "language_code": "en"
    })

    # 2. Confused reply
    ans2 = client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "not sure",
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()
    assert ans2["decision"]["action"] == "ASK"

    # 3. Informative answer to the pivoted question
    ans3 = client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "Yes, water is coming from my eyes since yesterday.",
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()

    assert ans3["clinical_state"]["associated_symptoms"] is not None
    assert any("watering" in s.lower() for s in ans3["clinical_state"]["associated_symptoms"])
