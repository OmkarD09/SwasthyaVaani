import { Clock3 } from 'lucide-react';
import { getTranslation, type LanguageCode } from '../../i18n';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  language: LanguageCode;
  stepLabel?: string;
  className?: string;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  language,
  stepLabel,
  className = '',
}: ProgressIndicatorProps) {
  const percentage = Math.round((currentStep / Math.max(totalSteps, 1)) * 100);

  return (
    <div className={`kiosk-progress-top ${className}`}>
      <span>
        {stepLabel ||
          getTranslation(language, 'questionProgress', {
            current: currentStep,
            total: totalSteps,
          })}
      </span>
      <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <i
            key={idx}
            className={`transition-all duration-300 ${idx < currentStep ? 'filled' : ''}`}
            style={{ width: totalSteps > 6 ? '16px' : '28px', height: '6px', borderRadius: '3px' }}
          />
        ))}
      </div>
      <span className="time-note text-xs font-mono opacity-80 flex items-center gap-1">
        <Clock3 size={14} /> {percentage}%
      </span>
    </div>
  );
}
