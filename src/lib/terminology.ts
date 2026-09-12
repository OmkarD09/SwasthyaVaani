/**
 * SwasthyaVaani - Standardized Clinical Terminology & Status Mappings
 * Source of truth for human-readable clinical labels across Patient, Doctor, and Admin interfaces.
 */

/**
 * Standardizes clinical stream / intake workflow labels.
 * "GENERAL_CLINICAL" -> "Modern Clinical"
 * "AYUSH" -> "AYUSH"
 */
export function formatWorkflowType(workflowType?: string | null): string {
  if (!workflowType) return 'Modern Clinical';
  const upper = workflowType.toUpperCase().trim();
  if (upper === 'AYUSH') return 'AYUSH';
  if (upper === 'AYURVEDA') return 'Ayurveda';
  if (upper === 'HOMEOPATHY') return 'Homeopathy';
  if (upper === 'UNANI') return 'Unani';
  if (upper === 'SIDDHA') return 'Siddha';
  if (upper === 'YOGA') return 'Yoga & Naturopathy';
  if (upper === 'GENERAL_CLINICAL' || upper === 'GENERAL_MEDICINE') return 'Modern Clinical';
  return 'Modern Clinical';
}

/**
 * Standardizes intake session, queue, and review status labels.
 * Maps internal database enum tokens into unified human-readable terms:
 * - "Submitted"
 * - "Needs Review"
 * - "Physician Confirmed"
 * - "Active Intake"
 * - "Emergency"
 * - "AI Draft"
 * - "Processing"
 * - "Abandoned"
 */
export function formatSessionStatus(status?: string | null): string {
  if (!status) return 'Active Intake';
  const upper = status.toUpperCase().trim();
  switch (upper) {
    case 'SUBMITTED':
    case 'READY_TO_SUBMIT':
      return 'Submitted';
    case 'IN_REVIEW':
      return 'Needs Review';
    case 'CONFIRMED':
    case 'REVIEWED':
      return 'Physician Confirmed';
    case 'ACTIVE':
      return 'Active Intake';
    case 'PATIENT_ABORTED':
      return 'Abandoned';
    case 'DRAFT':
    case 'AI_DRAFT':
      return 'AI Draft';
    case 'PROCESSING':
      return 'Processing';
    case 'CRITICAL':
    case 'ESCALATED_TO_DOCTOR':
    case 'EMERGENCY':
      return 'Emergency';
    default:
      return status;
  }
}

/**
 * Provides standardized color tokens and styling for status badges
 * consistent with SwasthyaVaani design tokens.
 */
export function getStatusBadgeVariant(status?: string | null): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const label = formatSessionStatus(status);
  switch (label) {
    case 'Physician Confirmed':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200/80',
        dot: 'bg-emerald-500',
      };
    case 'Needs Review':
    case 'AI Draft':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200/80',
        dot: 'bg-amber-500',
      };
    case 'Submitted':
    case 'Active Intake':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        border: 'border-teal-200/80',
        dot: 'bg-teal-500',
      };
    case 'Emergency':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200/80',
        dot: 'bg-rose-500 animate-ping',
      };
    case 'Processing':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200/80',
        dot: 'bg-sky-500',
      };
    case 'Abandoned':
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200/80',
        dot: 'bg-slate-400',
      };
  }
}
