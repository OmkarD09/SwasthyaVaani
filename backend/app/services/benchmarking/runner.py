"""
Benchmark Runner for SwasthyaVaani LLM Provider Performance Evaluation.

Executes identical clinical intake scenarios independently across Groq, Gemini, and Mock LLM,
ensuring zero state contamination between providers and repeated multi-run statistical evaluation.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.benchmarking.conversation_sim import run_scenario_conversation
from app.services.benchmarking.metrics import (
    ProviderAggregateMetrics,
    ScenarioMetrics,
    aggregate_provider_metrics,
    calculate_scenario_metrics,
)
from app.services.benchmarking.scenarios import (
    BENCHMARK_SCENARIOS,
    BenchmarkScenario,
    get_scenario_by_id,
)
from app.services.providers.base import AbstractLLMProvider
from app.services.providers.llm_provider import (
    GeminiLLMProvider,
    GroqLLMProvider,
    MockLLMProvider,
)

logger = logging.getLogger(__name__)


class BenchmarkRunConfig(BaseModel):
    providers: List[str] = Field(default_factory=lambda: ["mock", "groq", "gemini"])
    runs: int = 1
    scenario_ids: Optional[List[str]] = None
    verbose: bool = False


class ScenarioExecutionResult(BaseModel):
    run_index: int
    scenario_id: str
    scenario_code: str
    scenario_title: str
    provider_name: str
    metrics: ScenarioMetrics
    transcript: List[Dict[str, Any]]
    trajectory: List[Dict[str, Any]]
    final_clinical_state: Dict[str, Any]


class BenchmarkExecutionReport(BaseModel):
    config: BenchmarkRunConfig
    scenario_results: List[ScenarioExecutionResult] = Field(default_factory=list)
    provider_aggregates: Dict[str, ProviderAggregateMetrics] = Field(default_factory=dict)
    summary_table: Dict[str, Any] = Field(default_factory=dict)


class BenchmarkRunner:
    """Orchestrates fair, isolated multi-provider benchmarking on SwasthyaVaani clinical intake."""

    def __init__(self, config: Optional[BenchmarkRunConfig] = None):
        self.config = config or BenchmarkRunConfig()

    def _instantiate_provider(self, name: str) -> tuple[AbstractLLMProvider, str]:
        """Instantiates a pristine provider instance."""
        p_name = name.strip().lower()
        if p_name in ["groq", "groqllmprovider"]:
            return GroqLLMProvider(api_key=settings.GROQ_API_KEY), "Groq"
        elif p_name in ["gemini", "geminillmprovider"]:
            return GeminiLLMProvider(api_key=settings.GEMINI_API_KEY), "Gemini"
        elif p_name in ["mock", "mockllmprovider", "deterministic"]:
            return MockLLMProvider(), "Deterministic Mock"
        else:
            raise ValueError(f"Unknown provider: '{name}'. Supported: groq, gemini, mock.")

    def get_selected_scenarios(self) -> List[BenchmarkScenario]:
        if not self.config.scenario_ids:
            return list(BENCHMARK_SCENARIOS)
        
        selected = []
        for s_id in self.config.scenario_ids:
            sc = get_scenario_by_id(s_id)
            if sc:
                selected.append(sc)
            else:
                logger.warning(f"Scenario ID '{s_id}' not found. Skipping.")
        return selected or list(BENCHMARK_SCENARIOS)

    async def run_scenario(
        self,
        scenario: BenchmarkScenario,
        provider_key: str,
        run_idx: int = 1
    ) -> ScenarioExecutionResult:
        """Runs a single scenario against a fresh provider instance."""
        provider_inst, display_name = self._instantiate_provider(provider_key)
        
        # Execute conversation simulation
        sim_res = await run_scenario_conversation(
            scenario=scenario,
            provider=provider_inst,
            provider_name=display_name
        )

        # Calculate metrics
        metrics = calculate_scenario_metrics(
            scenario=scenario,
            provider_name=display_name,
            final_state=sim_res["final_state"],
            conversation_trajectory=sim_res["trajectory"],
            turn_latencies=sim_res["turn_latencies"],
            error_log=sim_res["error_log"],
            fallback_count=sim_res["fallback_count"]
        )

        return ScenarioExecutionResult(
            run_index=run_idx,
            scenario_id=scenario.id,
            scenario_code=scenario.code,
            scenario_title=scenario.title,
            provider_name=display_name,
            metrics=metrics,
            transcript=sim_res["transcript"],
            trajectory=sim_res["trajectory"],
            final_clinical_state=sim_res["final_state"].model_dump()
        )

    async def run_all(self) -> BenchmarkExecutionReport:
        """Executes full benchmark suite across all configured providers, scenarios, and repeated runs."""
        scenarios = self.get_selected_scenarios()
        provider_keys = [p.strip().lower() for p in self.config.providers]
        
        all_results: List[ScenarioExecutionResult] = []
        results_by_provider: Dict[str, List[ScenarioMetrics]] = {p: [] for p in provider_keys}

        print("=" * 80)
        print("SWASTHYAVAANI LLM PERFORMANCE BENCHMARK RUNNER")
        print(f"Providers: {', '.join(provider_keys).upper()} | Scenarios: {len(scenarios)} | Runs: {self.config.runs}")
        print("=" * 80)

        for run_idx in range(1, self.config.runs + 1):
            if self.config.runs > 1:
                print(f"\n--- [STARTING RUN {run_idx}/{self.config.runs}] ---")

            for p_key in provider_keys:
                _, display_name = self._instantiate_provider(p_key)
                
                for scenario in scenarios:
                    print(f"Executing [{display_name}] -> {scenario.code} ({scenario.title})...", end="", flush=True)
                    
                    try:
                        res = await self.run_scenario(scenario, p_key, run_idx)
                        all_results.append(res)
                        results_by_provider[p_key].append(res.metrics)
                        print(f" DONE (F1: {res.metrics.extraction_f1:.2f}, Latency: {res.metrics.avg_turn_latency_ms:.0f}ms, Score: {res.metrics.composite_score:.1f})")
                    except Exception as e:
                        print(f" FAILED: {e}")
                        logger.error(f"Error evaluating {p_key} on {scenario.id}: {e}", exc_info=True)

        # Compute Provider Aggregates
        aggregates: Dict[str, ProviderAggregateMetrics] = {}
        for p_key in provider_keys:
            _, display_name = self._instantiate_provider(p_key)
            agg = aggregate_provider_metrics(display_name, results_by_provider.get(p_key, []))
            aggregates[display_name] = agg

        return BenchmarkExecutionReport(
            config=self.config,
            scenario_results=all_results,
            provider_aggregates=aggregates,
            summary_table={}
        )


