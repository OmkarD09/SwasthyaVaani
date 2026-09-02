import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Stethoscope,
  Info,
  X,
} from 'lucide-react';
import { AIMonitoringSummary, AICaseOversightItem } from '../../services/adminApi';

interface AIMonitoringTabProps {
  summary: AIMonitoringSummary;
  loading: boolean;
  onRefresh: () => void;
}

export const AIMonitoringTab: React.FC<AIMonitoringTabProps> = ({
  summary,
  loading: _loading,
  onRefresh: _onRefresh,
}) => {
  const [selectedCase, setSelectedCase] = useState<AICaseOversightItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCases = summary.cases.filter((c) =>
    c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.chief_complaint.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.suggested_department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* MANDATORY CLINICAL SAFETY NOTICE */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 via-emerald-50 to-indigo-50 border border-teal-200/80 shadow-xs flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0 shadow-xs">
          <ShieldCheck size={20} />
        </div>
        <div className="leading-normal">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-teal-950">
              Clinical Safety & Physician Governance
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-200/60 text-teal-800 uppercase tracking-wide">
              MANDATORY SPECIFICATION
            </span>
          </div>
          <p className="text-xs text-teal-900/80 mt-1">
            SwasthyaVaani AI acts strictly as an <b>intake structuring assistant</b>. All extracted symptoms, severity ratings, and red flags are presented for physician verification. The attending physician remains the sole authoritative decision-maker for diagnosis, clinical notes, and prescriptions.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AI TELEMETRY METRIC PILLS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total AI Intakes</span>
            <Sparkles size={16} className="text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-800">
            {summary.total_assessments}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            <b>{summary.completed_conversations}</b> completed · {summary.abandoned_conversations} abandoned
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Avg Intake Duration</span>
            <Clock size={16} className="text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-800">
            {summary.average_duration_minutes} <span className="text-base font-medium text-slate-400">min</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Minimum sufficient history target &lt; 5m
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Doctor Acceptance Rate</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">
            {summary.summary_accepted_pct}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Confirmed without modifying entities
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Doctor Refinements</span>
            <Stethoscope size={16} className="text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-700">
            {summary.summary_modified_pct}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Doctor refined terms during exam
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AI VS DOCTOR OUTCOME TRACKING */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              AI vs. Doctor Accordance Tracking
            </h3>
            <p className="text-xs text-slate-500">
              Evidence showing the AI assists rather than replaces clinical decisions
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Accepted ({summary.summary_accepted_pct}%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Doctor-Refined ({summary.summary_modified_pct}%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Overridden ({summary.summary_overridden_pct}%)</span>
            </span>
          </div>
        </div>

        {/* Visual Accordance Progress Bar */}
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${summary.summary_accepted_pct}%` }}
            className="bg-emerald-500 h-full transition-all"
            title={`Accepted: ${summary.summary_accepted_pct}%`}
          />
          <div
            style={{ width: `${summary.summary_modified_pct}%` }}
            className="bg-amber-500 h-full transition-all"
            title={`Doctor-Refined: ${summary.summary_modified_pct}%`}
          />
          <div
            style={{ width: `${summary.summary_overridden_pct}%` }}
            className="bg-rose-500 h-full transition-all"
            title={`Overridden: ${summary.summary_overridden_pct}%`}
          />
        </div>

        {/* Category Accordance Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-2">Clinical Specialty / Category</th>
                <th className="pb-2 text-center">Evaluated Cases</th>
                <th className="pb-2 text-center">Accepted</th>
                <th className="pb-2 text-center">Refined by Doctor</th>
                <th className="pb-2 text-right">Doctor Edit Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.override_breakdown.map((row) => (
                <tr key={row.category} className="hover:bg-slate-50/70">
                  <td className="py-2.5 font-medium text-slate-800">{row.category}</td>
                  <td className="py-2.5 text-center text-slate-600 font-mono">{row.total_cases}</td>
                  <td className="py-2.5 text-center text-emerald-700 font-semibold">{row.accepted_count}</td>
                  <td className="py-2.5 text-center text-amber-700 font-medium">{row.modified_count}</td>
                  <td className="py-2.5 text-right font-bold text-slate-700">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {row.override_rate_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PER-CASE CLINICAL STATE OVERSIGHT TABLE */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Per-Case Clinical Intake Oversight
            </h3>
            <p className="text-xs text-slate-500">
              Sourced directly from live ClinicalState and QuestionDecision engine outputs
            </p>
          </div>
          <input
            type="text"
            placeholder="Filter token, patient, symptom, or dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs w-full sm:w-64 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-2">Token</th>
                <th className="pb-2">Patient</th>
                <th className="pb-2">Chief Complaint</th>
                <th className="pb-2 text-center">Severity</th>
                <th className="pb-2">Suggested Dept</th>
                <th className="pb-2">Red Flags</th>
                <th className="pb-2">AI Confidence</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((c) => {
                const hasRedFlag = c.red_flags.length > 0;
                return (
                  <tr
                    key={c.intake_session_id}
                    onClick={() => setSelectedCase(c)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-mono font-bold text-teal-700">
                      #{c.token}
                    </td>
                    <td className="py-3 font-medium text-slate-800">
                      {c.patient_name}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {c.patient_age ? `${c.patient_age}y` : ''} {c.patient_gender || ''}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700 max-w-xs truncate">
                      {c.chief_complaint}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${c.severity_score >= 8
                            ? 'bg-rose-100 text-rose-800'
                            : c.severity_score >= 5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                      >
                        {c.severity_score}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700 font-medium">
                      {c.suggested_department}
                    </td>
                    <td className="py-3">
                      {hasRedFlag ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                          {c.red_flags.length} Escalation
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None detected</span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-slate-600">
                      {(c.ai_confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 text-right">
                      <button className="text-teal-600 hover:text-teal-800 p-1">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DETAIL MODAL / DRAWER FOR SELECTED CASE */}
      {/* ------------------------------------------------------------- */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 font-mono font-bold text-sm">
                  #{selectedCase.token}
                </span>
                <h3 className="text-base font-bold text-slate-800">
                  {selectedCase.patient_name} — Clinical Intake Detail
                </h3>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Patient and session summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-slate-400 block">Workflow</span>
                  <b className="text-slate-700">{selectedCase.workflow_type}</b>
                </div>
                <div>
                  <span className="text-slate-400 block">Severity</span>
                  <b className={selectedCase.severity_score >= 8 ? 'text-rose-600' : 'text-slate-700'}>
                    {selectedCase.severity_score} / 10
                  </b>
                </div>
                <div>
                  <span className="text-slate-400 block">Duration</span>
                  <b className="text-slate-700">{selectedCase.duration_minutes} mins</b>
                </div>
                <div>
                  <span className="text-slate-400 block">Status</span>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                    {selectedCase.status}
                  </span>
                </div>
              </div>

              {/* Chief complaint & symptoms */}
              <div>
                <h4 className="font-bold text-slate-700 mb-1">Chief Complaint:</h4>
                <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                  {selectedCase.chief_complaint}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-1.5">Identified Symptoms:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCase.symptoms.map((sym) => (
                    <span
                      key={sym}
                      className="px-2 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-medium"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>

              {/* Red flags */}
              {selectedCase.red_flags.length > 0 && (
                <div>
                  <h4 className="font-bold text-rose-700 mb-1 flex items-center gap-1">
                    <Info size={13} /> Active Safety Red Flags:
                  </h4>
                  <div className="space-y-1">
                    {selectedCase.red_flags.map((rf) => (
                      <div
                        key={rf}
                        className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold"
                      >
                        {rf}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Handoff */}
              <div>
                <h4 className="font-bold text-slate-700 mb-1">Recommended Clinical Handoff:</h4>
                <p className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-medium">
                  {selectedCase.recommended_handoff}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Read-only oversight view · Actioning handled in Doctor Workstation
              </span>
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
