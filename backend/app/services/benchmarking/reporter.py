"""
Benchmark Reporter for SwasthyaVaani LLM Evaluation.

Generates:
1. Terminal ASCII Comparison Table
2. Detailed Markdown Comparison Report with complete conversation transcripts
3. Machine-readable JSON Result Payloads
"""

import json
from pathlib import Path
from typing import Any, Dict, List

from app.services.benchmarking.runner import BenchmarkExecutionReport, ScenarioExecutionResult


class BenchmarkReporter:
    """Formats, prints, and writes benchmark evaluation reports."""

    def __init__(self, report: BenchmarkExecutionReport):
        self.report = report

    def generate_ascii_table(self) -> str:
        """Generates the comparison table requested in Section 7."""
        aggs = list(self.report.provider_aggregates.values())
        if not aggs:
            return "No benchmark results available."

        header_names = [a.provider_name for a in aggs]
        col_w = 22
        
        lines = []
        lines.append("=" * 110)
        lines.append("SWASTHYAVAANI LLM PROVIDER BENCHMARK: PATIENT-AI CLINICAL CONVERSATION COMPARISON")
        lines.append("=" * 110)

        # Header
        hdr_row = f"{'Metric':<32}" + "".join([f"{name:^{col_w}}" for name in header_names])
        lines.append(hdr_row)
        lines.append("-" * len(hdr_row))

        # Metrics rows
        rows = [
            ("Extraction Accuracy (F1)", [f"{a.mean_extraction_f1 * 100:.1f}%" for a in aggs]),
            ("Relevant Question Rate", [f"{a.mean_relevant_question_rate * 100:.1f}%" for a in aggs]),
            ("Redundant Question Rate", [f"{a.mean_redundant_question_rate * 100:.1f}%" for a in aggs]),
            ("Avg Questions Asked", [f"{a.mean_questions_per_conversation:.1f}" for a in aggs]),
            ("Conversation Efficiency", [f"{a.mean_efficiency_yield:.2f} facts/turn" for a in aggs]),
            ("English NLU (F1)", [f"{a.english_f1 * 100:.1f}%" for a in aggs]),
            ("Hindi NLU (F1)", [f"{a.hindi_f1 * 100:.1f}%" for a in aggs]),
            ("Mixed Language Hinglish (F1)", [f"{a.hinglish_f1 * 100:.1f}%" for a in aggs]),
            ("Safety Gating Pass Rate", [f"{a.safety_pass_rate * 100:.0f}%" for a in aggs]),
            ("Contradiction Detection", [f"{a.contradiction_pass_rate * 100:.0f}%" for a in aggs]),
            ("AYUSH Extraction Accuracy", [f"{a.ayush_accuracy * 100:.1f}%" for a in aggs]),
            ("Avg Response Latency", [f"{a.avg_latency_ms:.0f} ms" for a in aggs]),
            ("Avg Fact Extraction Time", [f"{a.avg_extraction_latency_ms:.0f} ms" for a in aggs]),
            ("Avg Question Gen Time", [f"{a.avg_generation_latency_ms:.0f} ms" for a in aggs]),
            ("Reliability / Success Rate", [f"{a.reliability_rate * 100:.0f}%" for a in aggs]),
            ("API Errors / Fallbacks", [f"{a.total_api_errors} / {a.total_fallback_invocations}" for a in aggs]),
            ("OVERALL COMPOSITE SCORE", [f"{a.overall_composite_score:.1f} / 100" for a in aggs]),
        ]

        for label, vals in rows:
            row_str = f"{label:<32}" + "".join([f"{v:^{col_w}}" for v in vals])
            lines.append(row_str)

        lines.append("-" * len(hdr_row))
        lines.append("Scoring: 30% Extraction + 25% Relevance + 15% Efficiency + 10% Language + 10% Reliability + 10% Latency")
        lines.append("Safety Gating: Critical red-flag failure caps composite score to maximum 40.0.")
        lines.append("=" * 110)
        return "\n".join(lines)

    def generate_markdown_report(self) -> str:
        """Generates comprehensive markdown report with comparison, methodology, and transcripts."""
        aggs = list(self.report.provider_aggregates.values())
        provider_names = [a.provider_name for a in aggs]

        md = []
        md.append("# SwasthyaVaani: End-to-End LLM Provider Clinical Performance Benchmark")
        md.append("\n> **Evaluation Purpose**: Direct, empirical comparison of **Groq (Primary)**, **Gemini (Fallback)**, and **Deterministic Mock** within SwasthyaVaani's actual multi-turn patient clinical intake workflow (SIH Problem Statement 26047).")
        md.append("\n---")
        
        md.append("\n## 1. Executive Comparison Table\n")
        
        # Markdown table
        table_header = "| Metric | " + " | ".join(provider_names) + " |"
        table_divider = "|:---| " + " | ".join([":---:" for _ in provider_names]) + " |"
        md.append(table_header)
        md.append(table_divider)

        rows = [
            ("Clinical Extraction Accuracy (F1)", [f"**{a.mean_extraction_f1 * 100:.1f}%**" for a in aggs]),
            ("Relevant Question Rate", [f"{a.mean_relevant_question_rate * 100:.1f}%" for a in aggs]),
            ("Redundant Question Rate", [f"{a.mean_redundant_question_rate * 100:.1f}%" for a in aggs]),
            ("Avg Questions per Intake", [f"{a.mean_questions_per_conversation:.1f}" for a in aggs]),
            ("Conversation Efficiency", [f"{a.mean_efficiency_yield:.2f} facts/turn" for a in aggs]),
            ("English NLU (F1)", [f"{a.english_f1 * 100:.1f}%" for a in aggs]),
            ("Hindi NLU (F1)", [f"{a.hindi_f1 * 100:.1f}%" for a in aggs]),
            ("Mixed Language Hinglish (F1)", [f"{a.hinglish_f1 * 100:.1f}%" for a in aggs]),
            ("Safety Gating Pass Rate", [f"{a.safety_pass_rate * 100:.0f}%" for a in aggs]),
            ("Contradiction Detection Pass Rate", [f"{a.contradiction_pass_rate * 100:.0f}%" for a in aggs]),
            ("AYUSH Extraction Accuracy", [f"{a.ayush_accuracy * 100:.1f}%" for a in aggs]),
            ("Avg Total Response Latency", [f"**{a.avg_latency_ms:.0f} ms**" for a in aggs]),
            ("Avg Extraction Latency", [f"{a.avg_extraction_latency_ms:.0f} ms" for a in aggs]),
            ("Avg Question Gen Latency", [f"{a.avg_generation_latency_ms:.0f} ms" for a in aggs]),
            ("API Error / Fallback Count", [f"{a.total_api_errors} / {a.total_fallback_invocations}" for a in aggs]),
            ("Reliability Rate", [f"{a.reliability_rate * 100:.0f}%" for a in aggs]),
            ("Overall Composite Score", [f"**{a.overall_composite_score:.1f} / 100**" for a in aggs]),
        ]

        for label, vals in rows:
            md.append(f"| {label} | " + " | ".join(vals) + " |")

        md.append("\n---")
        md.append("\n## 2. Key Findings & Engineering Trade-offs\n")
        
        # Dynamically formulate honest key findings based on aggregated values
        if aggs:
            groq_agg = next((a for a in aggs if "groq" in a.provider_name.lower()), None)
            gemini_agg = next((a for a in aggs if "gemini" in a.provider_name.lower()), None)
            mock_agg = next((a for a in aggs if "mock" in a.provider_name.lower()), None)

            if groq_agg and gemini_agg:
                speedup = (gemini_agg.avg_latency_ms / max(1.0, groq_agg.avg_latency_ms))
                md.append(f"1. **Inference Latency & Responsiveness**: Groq demonstrates ultra-low latency ({groq_agg.avg_latency_ms:.0f} ms avg turn latency) compared to Gemini ({gemini_agg.avg_latency_ms:.0f} ms avg turn latency, ~{speedup:.1f}x difference). In patient voice interactions, this sub-second turnaround is crucial for maintaining real-time conversational flow.")
                md.append(f"2. **Multilingual & Indic Accuracy**: Groq achieved {groq_agg.hindi_f1*100:.1f}% on Hindi and {groq_agg.hinglish_f1*100:.1f}% on Hinglish. Gemini achieved {gemini_agg.hindi_f1*100:.1f}% on Hindi and {gemini_agg.hinglish_f1*100:.1f}% on Hinglish.")
                md.append(f"3. **Clinical Extraction Quality**: Groq achieved an extraction F1 of {groq_agg.mean_extraction_f1*100:.1f}%, while Gemini achieved {gemini_agg.mean_extraction_f1*100:.1f}%.")
            if mock_agg:
                md.append(f"4. **Deterministic Fallback Role**: The Mock LLM operates at zero API cost with 0 ms network latency ({mock_agg.avg_latency_ms:.0f} ms local compute). While limited to regex and heuristic pattern matching ({mock_agg.mean_extraction_f1*100:.1f}% F1), it guarantees uninterrupted intake availability if internet connectivity or third-party API quotas fail.")

        md.append("\n---")
        md.append("\n## 3. Architectural Distinction: Provider Extraction vs. Deterministic System Safety\n")
        md.append("A fundamental architectural principle in SwasthyaVaani is that **AI output is untrusted and physicians remain the final decision-makers**.")
        md.append("\n- **Provider-Dependent Layer**:")
        md.append("  - Entity extraction from natural patient speech (e.g. recognizing 'severe chest pain', pain intensity 9/10, radiation to arm).")
        md.append("  - Adaptive natural language follow-up question formulation in Hindi, Marathi, and English.")
        md.append("- **System-Level Deterministic Layer**:")
        md.append("  - Red flag safety rules ([`evaluate_red_flags`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/safety/red_flags.py#L5-L74)): triggers `RF-CP-001` or `RF-SEV-001` deterministically.")
        md.append("  - Contradiction detection ([`detect_contradictions`](file:///c:/Users/ACER/Downloads/SwasthyaVaani/backend/app/services/safety/contradictions.py#L5-L40)): identifies discrepancies between current statements and prior prescriptions.")
        md.append("  - Information sufficiency stopping & max question limits (`MAX_QUESTIONS=10`).")
        md.append("\n> **Important**: Safety events are NOT generated by LLM hallucinations; the LLM merely extracts the factual parameters that our deterministic safety engine verifies.")

        md.append("\n---")
        md.append("\n## 4. Conversation Transcripts by Scenario & Provider\n")
        
        # Group transcripts by scenario
        scenarios_seen = set()
        for res in self.report.scenario_results:
            if res.scenario_id not in scenarios_seen:
                scenarios_seen.add(res.scenario_id)
                md.append(f"\n### Scenario: {res.scenario_code} — {res.scenario_title}\n")
                
                # Show transcript for each provider on this scenario
                for p_res in [r for r in self.report.scenario_results if r.scenario_id == res.scenario_id]:
                    md.append(f"#### Provider: {p_res.provider_name} (Run #{p_res.run_index})\n")
                    md.append(f"- **Extraction F1**: {p_res.metrics.extraction_f1*100:.1f}% | **Avg Turn Latency**: {p_res.metrics.avg_turn_latency_ms:.0f} ms | **Composite Score**: {p_res.metrics.composite_score:.1f}")
                    md.append(f"- **Safety Attribution**: `{p_res.metrics.safety_attribution_summary}`\n")
                    md.append("```text")
                    for t in p_res.transcript:
                        speaker = t.get("speaker", "Unknown")
                        text = t.get("text", "")
                        target = f" [Target: {t.get('target_field')}]" if t.get("target_field") else ""
                        md.append(f"{speaker}{target}: {text}")
                    md.append("```\n")

        md.append("\n---")
        md.append("\n## 5. Scoring Methodology & Gating\n")
        md.append("The overall conversation performance score is calculated using the following transparent formula:")
        md.append("\n$$\\text{Overall Score} = 0.30 \\times \\text{Extraction F1} + 0.25 \\times \\text{Question Relevance} + 0.15 \\times \\text{Efficiency Yield} + 0.10 \\times \\text{Language Handling} + 0.10 \\times \\text{Reliability} + 0.10 \\times \\text{Latency Score}$$")
        md.append("\n- **Safety Gating**: If a critical red-flag emergency scenario fails safety verification, the score is hard-capped to a maximum of 40.0.")

        md.append("\n---")
        md.append("\n## 6. Environmental Context & Limitations\n")
        md.append("1. **Network Latency**: API turnaround latencies reflect real-world network connectivity to provider endpoints (`api.groq.com` and Google GenAI endpoints) from the evaluation machine.")
        md.append("2. **Rate Limits & Fallback**: Live cloud providers may experience occasional rate limits or transient network latency spikes, which is precisely why SwasthyaVaani employs a multi-tiered fallback architecture (Groq -> Gemini -> Mock).")

        return "\n".join(md)

    def export_json(self, output_path: str):
        """Exports full machine-readable results to JSON."""
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(self.report.model_dump_json(indent=2))

    def export_markdown(self, output_path: str):
        """Exports markdown comparison report."""
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(self.generate_markdown_report())
