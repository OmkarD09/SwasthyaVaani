import React, { useEffect, useRef } from 'react';
import { AlertCircle, Clock, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { registerAudioContext } from '../../lib/kioskSessionManager';

interface KioskInactivityModalProps {
  isOpen: boolean;
  countdownSeconds: number;
  onContinue: () => void;
  onCancel: () => void;
  language?: string;
}

export function KioskInactivityModal({
  isOpen,
  countdownSeconds,
  onContinue,
  onCancel,
  language = 'English',
}: KioskInactivityModalProps) {
  const isHindi = language === 'hi' || language === 'हिन्दी' || language === 'Hindi';
  const audioPlayedRef = useRef(false);

  // Play an accessible audio chime alert when the inactivity warning appears
  useEffect(() => {
    if (isOpen && !audioPlayedRef.current) {
      audioPlayedRef.current = true;
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          registerAudioContext(ctx);

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          // Gentle two-tone chime (440Hz -> 660Hz)
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        }
      } catch {
        // audio context could be restricted or blocked by autoplay policy
      }
    } else if (!isOpen) {
      audioPlayedRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-inactivity-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-amber-200 p-6 sm:p-8 text-center overflow-hidden">
        {/* Top warning ribbon */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

        {/* Large Countdown Badge */}
        <div className="mx-auto my-3 w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-400 flex flex-col items-center justify-center shadow-inner">
          <span className="text-3xl font-black text-amber-700 leading-none">
            {countdownSeconds}
          </span>
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">
            {isHindi ? 'सेकंड' : 'Seconds'}
          </span>
        </div>

        {/* Header Title */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h2 id="kiosk-inactivity-title" className="text-xl sm:text-2xl font-bold text-neutral-900">
            {isHindi ? 'क्या आप अभी भी यहाँ हैं?' : 'Are You Still There?'}
          </h2>
        </div>
        <p className="text-sm font-medium text-neutral-600 mb-4">
          {isHindi
            ? 'अक्रियता के कारण सत्र समाप्त हो रहा है'
            : 'Session Inactivity Alert'}
        </p>

        {/* Privacy Note / Explanation */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 mb-6 text-xs sm:text-sm text-neutral-700 leading-relaxed">
          <p className="mb-2">
            {isHindi
              ? 'आपकी व्यक्तिगत स्वास्थ्य जानकारी की सुरक्षा (DPDP अधिनियम) के लिए, यदि कोई गतिविधि नहीं होती है तो यह स्क्रीन रीसेट हो जाएगी।'
              : 'To safeguard your health data on this public kiosk under the DPDP Act 2023, this screen will automatically reset if no activity is detected.'}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-800 font-semibold">
            <ShieldCheck size={14} className="text-amber-700" />
            <span>
              {isHindi
                ? 'डेटा स्वचालित रूप से मिटा दिया जाएगा'
                : 'All patient data will be safely purged'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-neutral-300 text-neutral-700 font-medium text-sm hover:bg-neutral-100 active:scale-[0.98] transition cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <X size={16} />
            <span>{isHindi ? 'सत्र समाप्त करें' : 'Exit / Clear'}</span>
          </button>

          <button
            type="button"
            onClick={onContinue}
            autoFocus
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-md active:scale-[0.98] transition cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <span>{isHindi ? 'मैं यहीं हूँ, जारी रखें' : 'I am still here'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default KioskInactivityModal;
