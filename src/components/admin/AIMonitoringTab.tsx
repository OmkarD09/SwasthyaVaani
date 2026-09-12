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
  ExternalLink,
} from 'lucide-react';
import { AIMonitoringSummary, AICaseOversightItem } from '../../services/adminApi';
import { formatWorkflowType } from '../../lib/terminology';
import { StatusBadge } from '../ui/StatusBadge';

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
      <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200/90 shadow-xs flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-teal-700 text-white shrink-0 shadow-xs">
          <ShieldCheck size={20} />
        </div>
        <div className="leading-normal">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-teal-950">
              Clinical Safety & Physician Governance
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-200/60 text-teal-900 uppercase tracking-wide">
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
            <Sparkles size={16} className="text-teal-700" />
          </div>
          <div className="text-3xl font-bold text-slate-800 tabular-nums">
            {summary.total_assessments}
          </div>
          <div className="text-[11px] text-teal-700 font-medium mt-1">
            <b>{summary.completed_conversations}</b> completed · {summary.abandoned_conversations} abandoned
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Avg Intake Duration</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-slate-800 tabular-nums">
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
          <div className="text-3xl font-bold text-emerald-700 tabular-nums">
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
          <div className="text-3xl font-bold text-amber-700 tabular-nums">
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

        {/* Override Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-2">Clinical Presentation Category</th>
                <th className="pb-2 text-center">Total Cases</th>
                <th className="pb-2 text-center">Accepted Intact</th>
                <th className="pb-2 text-center">Doctor Refined</th>
                <th className="pb-2 text-center">Overridden</th>
                <th className="pb-2 text-right">Doctor Accordance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.override_breakdown.map((item) => (
                <tr key={item.category} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 font-medium text-slate-800">{item.category}</td>
                  <td className="py-2.5 text-center text-slate-600 tabular-nums">{item.total_cases}</td>
                  <td className="py-2.5 text-center text-emerald-700 font-semibold tabular-nums">
                    {item.accepted_count}
                  </td>
                  <td className="py-2.5 text-center text-amber-700 font-semibold tabular-nums">
                    {item.modified_count}
                  </td>
                  <td className="py-2.5 text-center text-rose-700 font-semibold tabular-nums">
                    {item.overridden_count}
                  </td>
                  <td className="py-2.5 text-right font-bold text-teal-800 tabular-nums">
                    {(100 - item.override_rate_pct).toFixed(1)}%
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
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs w-full sm:w-64 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-2">Token</th>
                <th className="pb-2">Patient</th>
                <th className="pb-2">Chief Complaint</th>
                <th className="pb-2">Stream</th>
                <th className="pb-2 text-center">Severity</th>
                <th className="pb-2">Suggested Dept</th>
                <th className="pb-2">Red Flags</th>
                <th className="pb-2">Status</th>
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
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-mono font-bold text-teal-800">
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
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.workflow_type === 'AYUSH'
                            ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                            : 'bg-teal-50 text-teal-800 border-teal-200/80'
                          }`}
                      >
                        {formatWorkflowType(c.workflow_type)}
                      </span>
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                          {c.red_flags.length} Escalation
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None detected</span>
                      )}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 text-right">
                      <button className="text-teal-700 hover:text-teal-900 p-1">
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
      {/* DETAIL MODAL FOR SELECTED CASE */}
      {/* ------------------------------------------------------------- */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 font-mono font-bold text-sm border border-teal-200/80">
                  #{selectedCase.token}
                </span>
                <h3 className="text-base font-bold text-slate-800">
                  {selectedCase.patient_name} — Clinical Intake Detail
                </h3>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Patient and session summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-slate-400 block">Workflow Stream</span>
                  <b className="text-slate-800">{formatWorkflowType(selectedCase.workflow_type)}</b>
                </div>
                <div>
                  <span className="text-slate-400 block">Severity Rating</span>
                  <b className={selectedCase.severity_score >= 8 ? 'text-rose-600' : 'text-slate-800'}>
                    {selectedCase.severity_score} / 10
                  </b>
                </div>
                <div>
                  <span className="text-slate-400 block">Intake Duration</span>
                  <b className="text-slate-800">{selectedCase.duration_minutes} mins</b>
                </div>
                <div>
                  <span className="text-slate-400 block">Session Status</span>
                  <StatusBadge status={selectedCase.status} />
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
                <h4 className="font-bold text-slate-700 mb-1.5">Extracted Clinical Entities:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCase.symptoms.map((sym) => (
                    <span
                      key={sym}
                      className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 font-medium"
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
                        className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold"
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
                <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                  {selectedCase.recommended_handoff}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`/doctor/patient/${selectedCase.patient_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Stethoscope size={13} />
                <span>Review in Doctor Workstation</span>
                <ExternalLink size={12} />
              </a>

              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
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

export default AIMonitoringTab;
