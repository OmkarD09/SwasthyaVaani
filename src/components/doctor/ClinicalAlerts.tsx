import React from 'react';
import { TriangleAlert, ShieldCheck, AlertCircle, Info } from 'lucide-react';

export interface RedFlagAlert {
  rule_id?: string;
  title: string;
  reason: string;
  severity?: 'PRIORITY' | 'WARNING' | 'INFO' | string;
}

export interface ClinicalAlertsProps {
  alerts?: RedFlagAlert[];
  severityScore?: number;
}

export function ClinicalAlerts({ alerts = [], severityScore }: ClinicalAlertsProps) {
  const hasPriorityAlerts = alerts.some(
    (a) => a.severity === 'PRIORITY' || a.severity === 'CRITICAL' || (severityScore && severityScore >= 8)
  );
  const hasAlerts = alerts.length > 0;

  return (
    <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e5e9e2] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
            Clinical Alerts
          </span>
          {hasPriorityAlerts && (
            <span className="inline-flex items-center rounded-full bg-[#fde8e5] px-2 py-0.5 font-mono text-[10px] font-bold text-[#a0362e] border border-[#f5b8b2]">
              Priority Review Recommended
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#71887d] italic">
          AI-generated alerts require physician review.
        </span>
      </div>

      {/* Content based on state */}
      {hasPriorityAlerts ? (
        <div className="space-y-2.5">
          {alerts.map((alert, idx) => (
            <div
              key={alert.rule_id || idx}
              className="flex items-start gap-3 rounded-xl border border-[#e3b6b0] bg-[#fff3f0] p-3.5 text-[#8f3d36]"
            >
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[#b54137]" />
              <div>
                <p className="font-semibold text-sm text-[#872d24]">
                  {alert.title || 'Priority Clinical Signal Detected'}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[#8d4740]">{alert.reason}</p>
              </div>
            </div>
          ))}
        </div>
      ) : hasAlerts ? (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={alert.rule_id || idx}
              className="flex items-start gap-3 rounded-xl border border-[#e5d4a7] bg-[#fbf7ea] p-3 text-[#79571e]"
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0 text-[#b3832c]" />
              <div>
                <p className="font-semibold text-xs text-[#704f18]">
                  {alert.title || 'Important Symptoms Detected'}
                </p>
                <p className="mt-0.5 text-xs text-[#785926]">{alert.reason}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-[#cfe1d6] bg-[#f0f7f3] px-3.5 py-2.5 text-xs text-[#2b604e]">
          <ShieldCheck size={16} className="shrink-0 text-[#257356]" />
          <span>No urgent red flags or clinical alerts identified from the available intake information.</span>
        </div>
      )}
    </section>
  );
}
