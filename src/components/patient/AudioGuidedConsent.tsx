import { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  FileText,
  Mic,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { AppButton } from '../Brand';
import {
  getConsentTranslation,
  getConsentLanguageLocale,
  type ConsentTranslation,
} from '../../lib/consentTranslations';
import { setStoredConsent } from '../../lib/consentStore';

interface AudioGuidedConsentProps {
  language: string;
  onConsentConfirmed: () => void;
  onChangeLanguage: () => void;
}

export function AudioGuidedConsent({
  language,
  onConsentConfirmed,
  onChangeLanguage,
}: AudioGuidedConsentProps) {
  const t: ConsentTranslation = getConsentTranslation(language);
  const langLocale = getConsentLanguageLocale(language);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(15);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Stop audio on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopAudio();
    };
  }, []);

  // Whenever language changes, reset playback
  useEffect(() => {
    stopAudio();
    setProgressPercent(0);
    setCurrentTimeSec(0);
  }, [language]);

  const stopAudio = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (isMountedRef.current) {
      setIsPlaying(false);
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsPlaying(true);
    setAudioError(false);

    // Estimate realistic duration based on word count
    const words = t.spokenScript.split(/\s+/).length;
    const estimatedSec = Math.max(12, Math.min(30, Math.ceil(words / 2.2)));
    setDurationSec(estimatedSec);

    let startOffset = currentTimeSec;
    if (progressPercent >= 100) {
      startOffset = 0;
      setCurrentTimeSec(0);
      setProgressPercent(0);
    }

    const startTimestamp = Date.now() - startOffset * 1000;

    // Start progress counter
    timerIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      const elapsed = (Date.now() - startTimestamp) / 1000;
      const pct = Math.min(100, (elapsed / estimatedSec) * 100);
      setCurrentTimeSec(Math.min(estimatedSec, Math.floor(elapsed)));
      setProgressPercent(pct);

      if (pct >= 100) {
        stopAudio();
        setCurrentTimeSec(estimatedSec);
        setProgressPercent(100);
      }
    }, 100);

    // Attempt Server TTS or Web Speech Synthesis
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(t.spokenScript);
        utterance.lang = langLocale;
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) =>
          v.lang.toLowerCase().startsWith(langLocale.toLowerCase().slice(0, 2))
        );
        if (match) utterance.voice = match;

        utterance.onend = () => {
          if (isMountedRef.current) {
            stopAudio();
            setProgressPercent(100);
            setCurrentTimeSec(estimatedSec);
          }
        };

        utterance.onerror = () => {
          // Keep visual playback timer running even if voice engine fails silently
        };

        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('[ConsentAudio] Web speech fallback triggered:', err);
      setAudioError(true);
    }
  };

  const handleReplay = () => {
    stopAudio();
    setProgressPercent(0);
    setCurrentTimeSec(0);
    setTimeout(() => {
      handlePlayPause();
    }, 50);
  };

  const handleConfirmConsent = () => {
    if (!hasAgreed) return;
    stopAudio();
    // Persist consent in localStorage
    setStoredConsent(language);
    onConsentConfirmed();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const iconMap: Record<number, any> = {
    0: Mic,
    1: FileText,
    2: UserCheck,
    3: ShieldCheck,
  };

  return (
    <div className="kiosk-card audio-consent-card animate-fadeIn">
      {/* Header */}
      <div className="kiosk-card-heading">
        <span className="section-kicker">{t.kicker}</span>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
          <span>{t.title}</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-300">
            {language}
          </span>
        </h2>
        <p className="text-sm text-neutral-600 mt-1">{t.subtitle}</p>
      </div>

      {/* Audio Player Box */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 p-4 sm:p-5 shadow-xs transition-all my-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Audio Title & State */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform ${
                isPlaying
                  ? 'bg-amber-500 text-white shadow-md scale-105 animate-pulse'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isPlaying ? <Volume2 size={24} /> : <Volume2 size={22} />}
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 text-base leading-tight">
                {t.audioGuideTitle}
              </h4>
              <p className="text-xs text-neutral-600 mt-0.5 flex items-center gap-1.5 font-medium">
                <span>{t.audioGuideSubtitle}</span>
                <span className="inline-block w-1 h-1 rounded-full bg-neutral-400"></span>
                <span className="text-amber-800 font-mono text-[11px]">
                  {formatTime(currentTimeSec)} / {formatTime(durationSec)}
                </span>
              </p>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleReplay}
              className="px-3 py-2 rounded-xl bg-white/90 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Replay from start"
            >
              <RotateCcw size={14} />
              <span>Replay</span>
            </button>

            <button
              type="button"
              onClick={handlePlayPause}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                isPlaying
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause size={15} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={15} fill="currentColor" />
                  <span>{progressPercent > 0 && progressPercent < 100 ? 'Resume' : 'Play Audio'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Visual Progress Bar & Waveform */}
        <div className="mt-4 pt-3 border-t border-amber-100">
          <div className="flex items-center gap-3">
            {/* Animated Equalizer Waveform Bars when playing */}
            <div className="flex items-end gap-0.5 h-4 w-12 shrink-0">
              <span
                className={`w-1 bg-amber-500 rounded-full transition-all duration-200 ${
                  isPlaying ? 'h-3.5 animate-bounce' : 'h-1.5 opacity-40'
                }`}
                style={{ animationDelay: '0ms' }}
              />
              <span
                className={`w-1 bg-amber-600 rounded-full transition-all duration-200 ${
                  isPlaying ? 'h-4 animate-bounce' : 'h-2 opacity-40'
                }`}
                style={{ animationDelay: '150ms' }}
              />
              <span
                className={`w-1 bg-amber-500 rounded-full transition-all duration-200 ${
                  isPlaying ? 'h-2.5 animate-bounce' : 'h-1 opacity-40'
                }`}
                style={{ animationDelay: '300ms' }}
              />
              <span
                className={`w-1 bg-amber-600 rounded-full transition-all duration-200 ${
                  isPlaying ? 'h-3.5 animate-bounce' : 'h-2 opacity-40'
                }`}
                style={{ animationDelay: '75ms' }}
              />
            </div>

            {/* Track Bar */}
            <div className="relative flex-1 h-2.5 bg-neutral-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className="text-[11px] font-mono text-neutral-500 font-semibold w-8 text-right">
              {Math.round(progressPercent)}%
            </span>
          </div>

          <p className="text-[11px] text-neutral-500 mt-2 italic flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-600 shrink-0" />
            <span>
              {isPlaying
                ? t.audioStatusPlaying
                : progressPercent >= 100
                ? t.audioStatusCompleted
                : progressPercent > 0
                ? t.audioStatusPaused
                : t.audioStatusReady}
            </span>
          </p>
        </div>
      </div>

      {/* Spoken Script Accordion / Text Card */}
      <div className="bg-neutral-50/90 border border-neutral-200/90 rounded-xl p-3.5 my-3 text-xs text-neutral-700 leading-relaxed">
        <p className="font-semibold text-neutral-900 mb-1 flex items-center gap-1.5 text-xs">
          <Volume2 size={13} className="text-amber-700" />
          <span>Audio Transcript ({language})</span>
        </p>
        <p className="italic text-neutral-600 font-serif">&ldquo;{t.spokenScript}&rdquo;</p>
      </div>

      {/* 4 Consent Explanations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
        {t.bulletPoints.map((item, idx) => {
          const IconComponent = iconMap[idx] || ShieldCheck;
          return (
            <div
              key={idx}
              className="p-3 rounded-xl border border-neutral-200/80 bg-white hover:border-amber-300 transition-colors flex items-start gap-2.5"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-100">
                <IconComponent size={15} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-neutral-900 leading-tight">
                  {item.title}
                </h5>
                <p className="text-[11px] text-neutral-600 mt-0.5 leading-snug">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkbox Consent Agreement */}
      <div className="pt-2 pb-1 border-t border-neutral-200/80">
        <label
          htmlFor="kiosk-consent-checkbox"
          className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200 hover:bg-amber-50 transition-colors cursor-pointer select-none"
        >
          <div className="pt-0.5">
            <input
              id="kiosk-consent-checkbox"
              type="checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="w-5 h-5 rounded border-neutral-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-xs text-neutral-900 leading-normal block">
              {t.checkboxLabel}
            </span>
            <span className="text-[10px] text-neutral-500 block mt-0.5">
              Consent method: <b>AUDIO_GUIDED</b> · Version: <b>v1.0</b>
            </span>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="kiosk-form-actions mt-4 pt-2">
        <button
          type="button"
          onClick={() => {
            stopAudio();
            onChangeLanguage();
          }}
          className="kiosk-back-btn"
        >
          <ArrowLeft size={16} />
          <span>{t.btnChangeLanguage}</span>
        </button>

        <AppButton
          variant="amber"
          onClick={handleConfirmConsent}
          disabled={!hasAgreed}
          className="kiosk-submit-btn"
        >
          {t.btnAgree} <ArrowRight size={17} />
        </AppButton>
      </div>
    </div>
  );
}
