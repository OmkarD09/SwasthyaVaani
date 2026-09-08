#!/usr/bin/env python3
"""
SwasthyaVaani LLM Provider Performance Benchmark CLI.

Compares Groq, Gemini, and Mock LLM in real-world patient intake clinical conversations.

Usage:
    python benchmark.py --providers all --runs 3
    python benchmark.py --providers groq,gemini,mock --scenarios A,B,E --runs 1
    python benchmark.py --output ../artifacts/benchmark_results.json --report ../artifacts/benchmark_report.md
"""

import argparse
import asyncio
import os
import sys

# Ensure UTF-8 output encoding on Windows consoles
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.benchmarking.metrics import ProviderAggregateMetrics
from app.services.benchmarking.reporter import BenchmarkReporter
from app.services.benchmarking.runner import BenchmarkRunConfig, BenchmarkRunner
from app.services.benchmarking.scenarios import BENCHMARK_SCENARIOS


def parse_args():
    parser = argparse.ArgumentParser(
        description="SwasthyaVaani End-to-End LLM Performance Benchmark Runner (Groq vs Gemini vs Mock)"
    )
    parser.add_argument(
        "--providers",
        type=str,
        default="mock,groq,gemini",
        help="Comma-separated list of providers to evaluate ('groq,gemini,mock' or 'all')",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=1,
        help="Number of repeated runs per scenario for statistical evaluation (default: 1)",
    )
    parser.add_argument(
        "--scenarios",
        type=str,
        default="all",
        help="Comma-separated list of scenario codes/IDs to run (e.g. 'A,B,E' or 'all')",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="artifacts/benchmark_results.json",
        help="Path to save machine-readable JSON output",
    )
    parser.add_argument(
        "--report",
        type=str,
        default="artifacts/benchmark_report.md",
        help="Path to save Markdown comparison report",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable detailed debug logs during execution",
    )
    return parser.parse_args()


async def main_async():
    args = parse_args()

    # Parse providers
    if args.providers.strip().lower() == "all":
        provider_list = ["mock", "groq", "gemini"]
    else:
        provider_list = [p.strip().lower() for p in args.providers.split(",") if p.strip()]

    # Parse scenarios
    scenario_ids = None
    if args.scenarios.strip().lower() != "all":
        input_scenarios = [s.strip().upper() for s in args.scenarios.split(",") if s.strip()]
        matched_ids = []
        for s in BENCHMARK_SCENARIOS:
            for inp in input_scenarios:
                if inp in s.code.upper() or inp == s.id.upper() or inp == s.code.replace("Scenario ", "").upper():
                    matched_ids.append(s.id)
        scenario_ids = list(set(matched_ids))

    config = BenchmarkRunConfig(
        providers=provider_list,
        runs=args.runs,
        scenario_ids=scenario_ids,
        verbose=args.verbose,
    )

    runner = BenchmarkRunner(config)
    report = await runner.run_all()
    reporter = BenchmarkReporter(report)

    # Print ASCII Table to console
    print("\n" + reporter.generate_ascii_table() + "\n")

    # Save JSON and Markdown artifacts
    reporter.export_json(args.output)
    print(f"[✓] Exported machine-readable results to: {args.output}")

    reporter.export_markdown(args.report)
    print(f"[✓] Exported full Markdown comparison report to: {args.report}")


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
