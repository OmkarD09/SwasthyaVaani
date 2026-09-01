import { ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLocation } from 'wouter';

export interface PatientHeaderProps {
  token: string;
  patientName: string;
  patientAge?: number | null;
  patientGender?: string | null;
  patientId?: string;
  workflowType?: string;
  hospitalName?: string;
  reviewStatus: 'AI_DRAFT' | 'NEEDS_VERIFICATION' | 'PHYSICIAN_CONFIRMED';
  confidence?: number;
  confirmed?: boolean;
}

export function PatientHeader({
  token,
  patientName,
  patientAge,
  patientGender,
  patientId,
  workflowType,
  hospitalName,
  reviewStatus,
  confidence,
  confirmed,
}: PatientHeaderProps) {
  const [, setLocation] = useLocation();

  const isConfirmed = confirmed || reviewStatus === 'PHYSICIAN_CONFIRMED';
  const confidencePercent = confidence ? Math.round(confidence * 100) : null;

  return (
    <div className="border-b border-[#d8ddd3] pb-5">
      {/* Back to Dashboard */}
      <div className="mb-3">
        <button
          onClick={() => setLocation('/doctor')}
          data-testid="button-back-dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#668075] hover:text-[#1f5b4e] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Doctor Dashboard
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Left: Patient Primary Info */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-block rounded-md bg-[#eeeade] px-2 py-0.5 font-mono text-xs font-bold text-[#8d6138]">
              #{token}
            </span>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#173e35] sm:text-4xl">
              {patientName}
            </h1>
            <div className="flex items-center gap-2 text-sm text-[#668075]">
              {patientAge ? <span>{patientAge} yrs</span> : null}
              {patientAge && patientGender ? <span>·</span> : null}
              {patientGender ? <span>{patientGender}</span> : null}
              {patientId ? (
                <>
                  <span>·</span>
                  <span className="font-mono text-xs text-[#7c9086]">ID: {patientId}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-3 text-xs text-[#688176]">
            {workflowType && (
              <span className="rounded bg-[#e8eee3] px-2 py-0.5 font-mono font-medium text-[#2d5c4b]">
                {workflowType}
              </span>
            )}
            {hospitalName && <span>{hospitalName}</span>}
          </div>
        </div>

        {/* Right: Compact Review Status & Confidence Badge */}
        <div className="flex flex-col items-end gap-1.5 text-right">
          {isConfirmed ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#9fc1ac] bg-[#eef7ee] px-3.5 py-1 text-xs font-bold text-[#1f5b4e]">
              <CheckCircle2 size={14} className="text-[#2a7a58]" />
              <span>Physician Confirmed</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#dfcca0] bg-[#fbf5e5] px-3.5 py-1 text-xs font-bold text-[#875c1a]">
              <Sparkles size={13} className="text-[#c99430]" />
              <span>AI Draft — Needs Review</span>
            </div>
          )}

          {/* Small Subtitle & Confidence Indicator */}
          <div className="flex items-center gap-2 text-[11px] text-[#6b8277]">
            <span>{isConfirmed ? 'Verified & synced' : 'Needs physician review'}</span>
            {confidencePercent !== null && (
              <>
                <span>·</span>
                <span className="font-mono font-semibold text-[#305e4e]">
                  Confidence: {confidencePercent}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
