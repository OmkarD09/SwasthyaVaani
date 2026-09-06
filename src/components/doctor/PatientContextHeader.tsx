import { Sparkles, CheckCircle2 } from 'lucide-react';

export interface PatientContextHeaderProps {
  token: string;
  patientName: string;
  patientAge?: number | null;
  patientGender?: string | null;
  patientId?: string;
  patientDisplayId?: string | null;
  displayId?: string | null;
  reviewStatus?: 'AI_DRAFT' | 'NEEDS_VERIFICATION' | 'PHYSICIAN_CONFIRMED' | string;
  confirmed?: boolean;
  confidence?: number;
}

export function PatientContextHeader({
  token,
  patientName,
  patientAge,
  patientGender,
  patientId,
  patientDisplayId,
  displayId,
  reviewStatus = 'AI_DRAFT',
  confirmed = false,
  confidence,
}: PatientContextHeaderProps) {
  const isConfirmed = confirmed || reviewStatus === 'PHYSICIAN_CONFIRMED';
  const confidencePercent = confidence ? Math.round(confidence * 100) : null;
  const shownPatientId = displayId || patientDisplayId || patientId;

  return (
    <div className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Patient Key Info */}
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="inline-block rounded-md bg-[#eeeade] px-2.5 py-0.5 font-mono text-xs font-bold text-[#8d6138]">
              #{token}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#173e35]">
              {patientName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#446658]">
            <span>
              <strong className="font-bold text-[#173e35]">AGE:</strong>{' '}
              {patientAge ? `${patientAge} yrs` : 'Not recorded'}
            </span>
            <span>•</span>
            <span>
              <strong className="font-bold text-[#173e35]">Gender:</strong>{' '}
              {patientGender || 'Not recorded'}
            </span>
            {shownPatientId ? (
              <>
                <span>•</span>
                <span>
                  <strong className="font-bold text-[#173e35]">Patient ID:</strong>{' '}
                  <span className="font-mono text-xs text-[#2c5244]">{shownPatientId}</span>
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right: Review Status Badge */}
        <div className="flex flex-col items-end gap-1 text-right">
          {isConfirmed ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#9fc1ac] bg-[#eef7ee] px-3.5 py-1 text-xs font-bold text-[#1f5b4e]">
              <CheckCircle2 size={14} className="text-[#2a7a58]" />
              <span>Physician Reviewed</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#dfcca0] bg-[#fbf5e5] px-3.5 py-1 text-xs font-bold text-[#875c1a]">
              <Sparkles size={13} className="text-[#c99430]" />
              <span>AI Draft — Needs Review</span>
            </div>
          )}

          <div className="text-[11px] text-[#6b8277]">
            {isConfirmed ? 'Verified & recorded' : 'Needs physician review'}
            {confidencePercent !== null && !isConfirmed && (
              <span className="font-mono font-semibold text-[#305e4e] ml-1.5">
                • Confidence: {confidencePercent}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
