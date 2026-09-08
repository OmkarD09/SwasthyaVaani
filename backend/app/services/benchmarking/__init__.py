"""
SwasthyaVaani LLM Provider Performance Benchmark Package.
Provides end-to-end clinical conversation evaluation across Groq, Gemini, and Mock LLM.
"""

from app.services.benchmarking.scenarios import (
    BenchmarkScenario,
    BENCHMARK_SCENARIOS,
    get_scenario_by_id,
)
from app.services.benchmarking.metrics import (
    ScenarioMetrics,
    ProviderAggregateMetrics,
    calculate_scenario_metrics,
    aggregate_provider_metrics,
)
from app.services.benchmarking.runner import BenchmarkRunner, BenchmarkRunConfig
from app.services.benchmarking.reporter import BenchmarkReporter

__all__ = [
    "BenchmarkScenario",
    "BENCHMARK_SCENARIOS",
    "get_scenario_by_id",
    "ScenarioMetrics",
    "ProviderAggregateMetrics",
    "calculate_scenario_metrics",
    "aggregate_provider_metrics",
    "BenchmarkRunner",
    "BenchmarkRunConfig",
    "BenchmarkReporter",
]
