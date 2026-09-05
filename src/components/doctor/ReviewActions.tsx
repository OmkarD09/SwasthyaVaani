import {
  BadgeCheck,
  CheckCircle2,
  Pencil,
  Save,
  HelpCircle,
} from 'lucide-react';
import { ClinicianButton as Button } from '../clinician/ClinicianShared';

export interface ReviewActionsProps {
  isConfirmed: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onConfirm: () => void;
  onRequestMoreInfo?: () => void;
  isSubmitting?: boolean;
}

export function ReviewActions({
  isConfirmed,
  isEditing,
  onToggleEdit,
  onConfirm,
  onRequestMoreInfo,
  isSubmitting = false,
}: ReviewActionsProps) {
  return (
    <div className="rounded-2xl border border-[#cbd6ca] bg-[#f8f7ef] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Summary mode status */}
        <div>
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#355749]">
            Physician Clinical Sign-Off
          </h4>
          <p className="mt-0.5 text-xs text-[#637d71]">
            {isConfirmed
              ? 'This clinical intake has been confirmed and validated by attending physician.'
              : 'Review and verify the AI-drafted clinical record before committing to EHR.'}
          </p>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Edit Button */}
          <Button
            variant="outline"
            onClick={onToggleEdit}
            testId="button-edit-summary"
            className="min-h-11 px-4 text-xs font-semibold"
          >
            {isEditing ? (
              <>
                <Save size={14} /> Done Editing
              </>
            ) : (
              <>
                <Pencil size={14} /> View / Edit AI Summary
              </>
            )}
          </Button>

          {/* Optional Request More Info */}
          {onRequestMoreInfo && (
            <Button
              variant="quiet"
              onClick={onRequestMoreInfo}
              testId="button-request-info"
              className="min-h-11 px-3.5 text-xs font-semibold"
            >
              <HelpCircle size={14} /> Request More Info
            </Button>
          )}

          {/* Confirm Clinical Record Button */}
          <Button
            variant={isConfirmed ? 'outline' : 'primary'}
            onClick={onConfirm}
            disabled={isSubmitting}
            testId="button-confirm-record"
            className="min-h-11 px-6 text-xs font-bold"
          >
            {isConfirmed ? (
              <>
                <CheckCircle2 size={16} className="text-[#2b7f5b]" /> Record Confirmed & Synced
              </>
            ) : (
              <>
                <BadgeCheck size={16} /> Confirm Clinical Record
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
