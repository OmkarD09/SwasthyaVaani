import { useState, useEffect, useRef, useCallback } from 'react';
import { purgeKioskSession } from '../lib/kioskSessionManager';

interface UseKioskIdleTimerOptions {
  idleTimeoutMs?: number; // Time before warning modal displays (default: 60s)
  countdownDurationSec?: number; // Countdown duration in seconds (default: 15s)
  enabled?: boolean;
  onTimeout?: () => void;
}

export interface UseKioskIdleTimerReturn {
  isIdleWarning: boolean;
  countdownSeconds: number;
  resetTimer: () => void;
  cancelAndPurge: (reason?: string) => void;
}

export function useKioskIdleTimer({
  idleTimeoutMs = 60000,
  countdownDurationSec = 15,
  enabled = true,
  onTimeout,
}: UseKioskIdleTimerOptions = {}): UseKioskIdleTimerReturn {
  const [isIdleWarning, setIsIdleWarning] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(countdownDurationSec);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestOnTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    latestOnTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const cancelAndPurge = useCallback((reason: string = 'USER_CANCELLED') => {
    clearAllTimers();
    setIsIdleWarning(false);
    purgeKioskSession(reason);
    if (latestOnTimeoutRef.current) {
      latestOnTimeoutRef.current();
    }
  }, [clearAllTimers]);

  const startCountdown = useCallback(() => {
    setIsIdleWarning(true);
    setCountdownSeconds(countdownDurationSec);

    let current = countdownDurationSec;

    countdownIntervalRef.current = setInterval(() => {
      current -= 1;
      setCountdownSeconds(current);

      if (current <= 0) {
        clearAllTimers();
        setIsIdleWarning(false);
        purgeKioskSession('IDLE_TIMEOUT');
        if (latestOnTimeoutRef.current) {
          latestOnTimeoutRef.current();
        }
      }
    }, 1000);
  }, [countdownDurationSec, clearAllTimers]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setIsIdleWarning(false);
    setCountdownSeconds(countdownDurationSec);

    if (!enabled) return;

    idleTimerRef.current = setTimeout(() => {
      startCountdown();
    }, idleTimeoutMs);
  }, [clearAllTimers, enabled, idleTimeoutMs, startCountdown, countdownDurationSec]);

  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setIsIdleWarning(false);
      return;
    }

    // Initialize idle timer
    resetTimer();

    // User interaction events that reset the timer when modal is NOT open
    const activityEvents: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'touchstart',
      'keydown',
      'scroll',
    ];

    let lastActivityTime = Date.now();
    const handleActivity = () => {
      // Throttle activity checks to every 1000ms
      const now = Date.now();
      if (now - lastActivityTime < 1000) return;
      lastActivityTime = now;

      // Only automatically reset timer on general activity if warning modal is not currently up
      if (!isIdleWarning) {
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(() => {
          startCountdown();
        }, idleTimeoutMs);
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    return () => {
      clearAllTimers();
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, [enabled, isIdleWarning, idleTimeoutMs, resetTimer, clearAllTimers, startCountdown]);

  return {
    isIdleWarning,
    countdownSeconds,
    resetTimer,
    cancelAndPurge,
  };
}
