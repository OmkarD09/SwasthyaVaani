import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Building2,
  Stethoscope,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { EmergencyCaseItem } from '../../services/adminApi';

interface EmergencyCasesTabProps {
  cases: EmergencyCaseItem[];
  loading: boolean;
  onRefresh: () => void;
  onNavigateDoctorPortal?: () => void;
}

export const EmergencyCasesTab: React.FC<EmergencyCasesTabProps> = ({
  cases,
  loading: _loading,
  onRefresh: _onRefresh,
  onNavigateDoctorPortal,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'Critical' | 'High' | 'Medium' | 'Low'>('ALL');

  const filteredCases = cases.filter((c) => {
    if (priorityFilter === 'ALL') return true;
    return c.severity.toLowerCase() === priorityFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 uppercase tracking-wider">
            <ShieldAlert size={14} className="text-rose-600 animate-pulse" />
            Safety Guardrail & Emergency Triage Escalation
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Critical & Red-Flag Cases
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Read-only oversight of clinical cases escalated by the deterministic safety engine.
          </p>
        </div>

        {/* Priority Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Filter size={12} /> Filter:
          </span>
          <div className="inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            {(['ALL', 'Critical', 'High', 'Medium'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${priorityFilter === p
                    ? p === 'Critical'
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-800 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Triage Protocol Notice */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-amber-700 shrink-0" />
          <span>
            <b>Triage Protocol Active:</b> Red-flag escalated patients are prioritized in the live doctor triage queue with mandatory immediate physician review.
          </span>
        </div>
        {onNavigateDoctorPortal && (
          <button
            onClick={onNavigateDoctorPortal}
            className="hidden md:flex items-center gap-1 font-semibold text-amber-950 hover:underline shrink-0 text-xs"
          >
            Go to Doctor Workstation <ExternalLink size={12} />
          </button>
        )}
      </div>

      {/* Critical Cases Cards List */}
      {filteredCases.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-400">
          <AlertTriangle size={36} className="mx-auto mb-2 text-slate-300" />
          <h4 className="text-sm font-bold text-slate-700">No Open Escalations</h4>
          <p className="text-xs text-slate-400 mt-1">
            All acute red-flags have been confirmed or triaged by clinical staff.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((item) => {
            const isCritical = item.severity === 'Critical';
            return (
              <div
                key={item.intake_session_id}
                className={`p-5 rounded-2xl bg-white border transition-all hover:shadow-md ${isCritical
                    ? 'border-rose-300 shadow-xs shadow-rose-500/5'
                    : 'border-slate-200/80 shadow-xs'
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                      #{item.token}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {item.patient_name}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {item.patient_age ? `${item.patient_age}y` : ''} · {item.patient_gender || 'Patient'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Severity Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isCritical
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-600 animate-ping' : 'bg-amber-600'
                          }`}
                      />
                      {item.severity} Priority
                    </span>

                    {/* Wait Time */}
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                      <Clock size={13} className="text-slate-400" />
                      Wait: {item.wait_time_minutes}m
                    </span>
                  </div>
                </div>

                {/* Case Reasoning & Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3.5 text-xs">
                  <div className="md:col-span-2 space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Primary Escalation Reason:</span>
                      <p className="font-semibold text-rose-900 bg-rose-50/70 p-2.5 rounded-lg border border-rose-100 mt-0.5">
                        {item.escalation_reason}
                      </p>
                    </div>

                    {item.associated_symptoms && item.associated_symptoms.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-400 text-[11px]">Reported Signals:</span>
                        {item.associated_symptoms.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-l border-slate-100 pl-4">
                    <div>
                      <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                        <Building2 size={11} /> Routing Department:
                      </span>
                      <b className="text-slate-700 block mt-0.5">{item.assigned_department}</b>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                        <Stethoscope size={11} /> Assigned Physician:
                      </span>
                      <b className="text-slate-700 block mt-0.5">
                        {item.assigned_doctor_name || 'Emergency On-Call'}
                      </b>
                    </div>

                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-1 rounded border border-teal-100">
                        Physician review required in workstation <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
