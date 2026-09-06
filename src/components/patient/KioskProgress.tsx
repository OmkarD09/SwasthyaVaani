import React from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Languages,
  UserRound,
  Mic,
  FileText,
  CheckCircle2,
  Check,
  CircleHelp,
  Clock3,
} from 'lucide-react';
import { Brand } from '../Brand';
import type { KioskTranslation } from '../../lib/kioskTranslations';

export type PatientFlowStep = 1 | 2 | 3 | 4 | 5;

export interface KioskStepMeta {
  step: PatientFlowStep;
  key: 'language' | 'details' | 'story' | 'records' | 'ready';
  defaultTitle: string;
  defaultCaption: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

/**
 * EXACT 5-Step Patient Flow Definition:
 * 1. Language - Choose how you speak
 * 2. Your Details - Personal info
 * 3. Your Story - Tell us what brings you in (Voice / Text)
 * 4. Records - Add helpful context
 * 5. Ready - Review before your doctor
 */
export const KIOSK_5_STEPS: KioskStepMeta[] = [
  {
    step: 1,
    key: 'language',
    defaultTitle: 'Language',
    defaultCaption: 'Choose how you speak',
    icon: Languages,
  },
  {
    step: 2,
    key: 'details',
    defaultTitle: 'Your Details',
    defaultCaption: 'Personal info',
    icon: UserRound,
  },
  {
    step: 3,
    key: 'story',
    defaultTitle: 'Your Story',
    defaultCaption: 'Tell us what brings you in',
    icon: Mic,
  },
  {
    step: 4,
    key: 'records',
    defaultTitle: 'Records',
    defaultCaption: 'Add helpful context',
    icon: FileText,
  },
  {
    step: 5,
    key: 'ready',
    defaultTitle: 'Ready',
    defaultCaption: 'Review before your doctor',
    icon: CheckCircle2,
  },
];

export interface KioskProgressSidebarProps {
  currentStep: PatientFlowStep;
  t: KioskTranslation;
  onBrandClick?: () => void;
}

/**
 * Shared Left Progress Sidebar for All Patient Kiosk Pages
 */
export function KioskProgressSidebar({
  currentStep,
  t,
  onBrandClick,
}: KioskProgressSidebarProps) {
  const [, setLocation] = useLocation();
  const handleBrandClick = onBrandClick || (() => setLocation('/'));

  return (
    <aside className="kiosk-progress">
      <div className="kiosk-brand">
        <button
          type="button"
          className="brand-button"
          onClick={handleBrandClick}
          aria-label="SwasthyaVaani home"
        >
          <Brand light />
        </button>
      </div>

      <div className="kiosk-welcome">
        <span className="eyebrow">{t.intakeEyebrow}</span>
        <h1>
          {t.careStartsHere}
          <br />
          <em>{t.careStartsHereEm}</em>
        </h1>
        <p>{t.careDescription}</p>
      </div>

      <div className="step-list">
        {KIOSK_5_STEPS.map((item) => {
          const isDone = item.step < currentStep;
          const isCurrent = item.step === currentStep;
          const Icon = item.icon;

          const title = t?.steps?.[item.key]?.title || item.defaultTitle;
          const caption = t?.steps?.[item.key]?.caption || item.defaultCaption;

          return (
            <div
              key={item.key}
              className={`kiosk-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <span className="step-icon">
                <AnimatePresence mode="wait" initial={false}>
                  {isDone ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="inline-flex items-center justify-center"
                    >
                      <Check size={19} strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="icon"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="inline-flex items-center justify-center"
                    >
                      <Icon size={19} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span>
                <b>{title}</b>
                <small>{caption}</small>
              </span>
            </div>
          );
        })}
      </div>

      <div className="kiosk-help">
        <CircleHelp size={16} />
        <span>{t.needHelp}</span>
      </div>
    </aside>
  );
}

export interface KioskTopProgressBarProps {
  currentStep: PatientFlowStep;
  totalSteps?: number;
  t: KioskTranslation;
  stepSuffix?: string;
  timeNote?: string;
  className?: string;
}

/**
 * Shared Top Progress Indicator for All Patient Kiosk Pages
 * Displays: "STEP 0X OF 05" with exactly 5 segments
 */
export function KioskTopProgressBar({
  currentStep,
  t,
  stepSuffix,
  timeNote,
  className = '',
}: KioskTopProgressBarProps) {
  const stepNumberStr = String(currentStep).padStart(2, '0');
  const totalStepsStr = '05';
  const prefix = t?.stepPrefix || 'STEP';
  const ofWord = t?.stepOf || 'OF';

  return (
    <div className={`kiosk-progress-top ${className}`.trim()}>
      <span>
        {prefix} {stepNumberStr} {ofWord} {totalStepsStr}
        {stepSuffix ? ` · ${stepSuffix}` : ''}
      </span>
      <div role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={5}>
        <i className={currentStep >= 1 ? 'filled' : ''} />
        <i className={currentStep >= 2 ? 'filled' : ''} />
        <i className={currentStep >= 3 ? 'filled' : ''} />
        <i className={currentStep >= 4 ? 'filled' : ''} />
        <i className={currentStep >= 5 ? 'filled' : ''} />
      </div>
      <span className="time-note">
        <Clock3 size={14} /> {timeNote || t?.durationNote || 'Takes about 3 min'}
      </span>
    </div>
  );
}
