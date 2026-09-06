import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface PatientFlowTransitionProps {
  children: React.ReactNode;
  stepKey: string | number;
  direction?: number; // 1 = forward (slide in from right), -1 = back (slide in from left)
  className?: string;
}

const STEP_RANKS: Record<string, number> = {
  language: 1,
  details: 2,
  mode: 3,
  'story-voice': 4,
  'story-text': 4,
  story: 4,
  records: 5,
  ready: 6,
  review: 6,
  'review-summary': 7,
  complete: 8,
};

function getRank(key: string | number): number {
  if (typeof key === 'number') return key;
  return STEP_RANKS[key] ?? 1;
}

/**
 * Calm, premium healthcare page-transition wrapper for the patient intake flow.
 * - Forward navigation: enters from right (+28px), exits to left (-28px)
 * - Back navigation: enters from left (-28px), exits to right (+28px)
 * - 350ms duration with smooth cubic-bezier ease-out
 * - Respects prefers-reduced-motion
 */
export function PatientFlowTransition({
  children,
  stepKey,
  direction,
  className = '',
}: PatientFlowTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  const effectiveDirection = React.useMemo(() => {
    if (direction !== undefined) return direction;
    const currentRank = getRank(stepKey);
    let prevRank = currentRank;
    try {
      const stored = sessionStorage.getItem('sv_patient_flow_rank');
      if (stored) prevRank = Number.parseInt(stored, 10) || currentRank;
    } catch {}
    return currentRank >= prevRank ? 1 : -1;
  }, [direction, stepKey]);

  useEffect(() => {
    try {
      const rank = getRank(stepKey);
      sessionStorage.setItem('sv_patient_flow_rank', String(rank));
    } catch {}
  }, [stepKey]);

  const variants: import('framer-motion').Variants = {
    initial: (dir: number) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : dir >= 0 ? 28 : -28,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0.01 : 0.35,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : dir >= 0 ? -28 : 28,
      transition: {
        duration: shouldReduceMotion ? 0.01 : 0.28,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  };

  return (
    <motion.div
      key={stepKey}
      custom={effectiveDirection}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`w-full ${className}`.trim()}
    >
      {children}
    </motion.div>
  );
}
