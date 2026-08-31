import { type ReactNode } from 'react';
import { Activity } from 'lucide-react';

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark">
        <Activity size={18} strokeWidth={2.5} />
      </span>
      <span>
        <strong>
          Swasthya<span>Vaani</span>
        </strong>
        <small>CARE, UNDERSTOOD</small>
      </span>
    </div>
  );
}

export function AppButton({
  children,
  onClick,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'dark' | 'soft' | 'amber';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      className={`app-button ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
