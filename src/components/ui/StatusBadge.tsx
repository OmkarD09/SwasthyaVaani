import React from 'react';
import { formatSessionStatus, getStatusBadgeVariant } from '../../lib/terminology';

export interface StatusBadgeProps {
  status?: string | null;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showDot = true,
}) => {
  const label = formatSessionStatus(status);
  const variant = getStatusBadgeVariant(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${variant.bg} ${variant.text} ${variant.border} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${variant.dot} shrink-0`} />
      )}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
