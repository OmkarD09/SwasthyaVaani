"""
Tests for SwasthyaVaani LLM Benchmark Framework.

Validates:
1. Benchmark scenario specifications (A through H)
2. Metric computation logic (precision, recall, relevance, redundancy, safety attribution)
3. Multi-turn conversation simulation with isolated states
4. Reporter output formatting (ASCII table, Markdown report, JSON schema)
"""

import pytest
import tempfile
from pathlib import Path

from app.schemas.clinical_state import ClinicalState, RedFlag
from app.services.benchmarking.metrics import (
    calculate_scenario_metrics,
    aggregate_provider_metrics,
    TurnLatency,
)
from app.services.benchmarking.reporter import BenchmarkReporter
from app.services.benchmarking.runner import (
    BenchmarkRunConfig,
    BenchmarkRunner,
)
from app.services.benchmarking.scenarios import (
    BENCHMARK_SCENARIOS,
    get_scenario_by_id,
    SCENARIO_A_HEADACHE,
    SCENARIO_E_CHEST_PAIN,
)


def test_benchmark_scenarios_exist():
    assert len(BENCHMARK_SCENARIOS) >= 8
    expected_codes = ["Scenario A", "Scenario B", "Scenario C", "Scenario D", "Scenario E", "Scenario F", "Scenario G", "Scenario H"]
    actual_codes = [s.code for s in BENCHMARK_SCENARIOS]
    for code in expected_codes:
        assert code in actual_codes


def test_scenario_lookup_by_id():
    sc_a = get_scenario_by_id("scenario_a_headache_en")
    assert sc_a is not None
    assert sc_a.expected_facts.chief_complaint == "headache"

    sc_e = get_scenario_by_id("scenario_e_chest_pain_red_flag")
    assert sc_e is not None
    assert "RF-CP-001" in sc_e.expected_safety.expected_red_flags


def test_metrics_calculation_simple():
    state = ClinicalState(
        chief_complaint="headache",
        duration="2 days",
        severity=6,
        location="forehead",
        negated_symptoms=["vomiting"]
    )
    trajectory = [
        {"turn": 1, "target_field": "chief_complaint", "ai_question": "What brings you in today?", "action": "ASK"},
        {"turn": 2, "target_field": "severity", "ai_question": "On a scale of 1 to 10, how bad is the pain?", "action": "ASK"},
        {"turn": 3, "target_field": "location", "ai_question": "Where is the pain located?", "action": "STOP", "reason": "Sufficient"}
    ]
    latencies = [
        TurnLatency(turn=1, extraction_ms=100.0, question_generation_ms=150.0, turn_total_ms=250.0),
        TurnLatency(turn=2, extraction_ms=110.0, question_generation_ms=140.0, turn_total_ms=250.0),
    ]

    metrics = calculate_scenario_metrics(
        scenario=SCENARIO_A_HEADACHE,
        provider_name="TestProvider",
        final_state=state,
        conversation_trajectory=trajectory,
        turn_latencies=latencies,
        error_log=[],
        fallback_count=0
    )

    assert metrics.extraction_precision > 0.8
    assert metrics.extraction_recall >= 0.7
    assert metrics.extraction_f1 >= 0.7
    assert metrics.relevant_question_rate == 1.0
    assert metrics.redundant_question_rate == 0.0
    assert metrics.composite_score > 60.0


def test_safety_gating_attribution():
    state = ClinicalState(
        chief_complaint="chest pain",
        radiation="left arm",
        severity=9,
        red_flags=[
            RedFlag(
                rule_id="RF-CP-001",
                title="Chest Pain",
                reason="Cardiac warning",
                severity="PRIORITY"
            ),
            RedFlag(
                rule_id="RF-SEV-001",
                title="Severe Pain",
                reason="Pain severity 9",
                severity="PRIORITY"
            )
        ]
    )
    trajectory = [
        {"turn": 1, "target_field": "radiation", "ai_question": "Does pain radiate to arm?", "action": "ASK"}
    ]

    metrics = calculate_scenario_metrics(
        scenario=SCENARIO_E_CHEST_PAIN,
        provider_name="Groq",
        final_state=state,
        conversation_trajectory=trajectory,
        turn_latencies=[],
        error_log=[],
        fallback_count=0
    )

    assert metrics.safety_gating_passed is True
    assert metrics.model_extracted_safety_markers is True
    assert "RF-CP-001" in metrics.system_safety_red_flags_fired
    assert "RF-SEV-001" in metrics.system_safety_red_flags_fired


@pytest.mark.asyncio
async def test_runner_mock_execution_all_scenarios():
    config = BenchmarkRunConfig(
        providers=["mock"],
        runs=1,
        scenario_ids=None
    )
    runner = BenchmarkRunner(config)
    report = await runner.run_all()

    assert len(report.scenario_results) == len(BENCHMARK_SCENARIOS)
    assert "Deterministic Mock" in report.provider_aggregates
    agg = report.provider_aggregates["Deterministic Mock"]
    assert agg.mean_extraction_f1 > 0.3
    assert agg.reliability_rate == 1.0

    # Verify reporter
    reporter = BenchmarkReporter(report)
    ascii_table = reporter.generate_ascii_table()
    assert "Deterministic Mock" in ascii_table

    md_report = reporter.generate_markdown_report()
    assert "# SwasthyaVaani" in md_report
    assert "Conversation Transcripts" in md_report

    with tempfile.TemporaryDirectory() as tmpdir:
        json_path = str(Path(tmpdir) / "results.json")
        md_path = str(Path(tmpdir) / "report.md")
        reporter.export_json(json_path)
        reporter.export_markdown(md_path)
        assert Path(json_path).exists()
        assert Path(md_path).exists()
