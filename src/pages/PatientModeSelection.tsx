import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Mic,
  Keyboard,
  FileText,
  Clock3,
  Check,
  ArrowRight,
  ArrowLeft,
  CircleHelp,
  Languages,
} from 'lucide-react';
import { Brand, AppButton } from '../components/Brand';
import { getKioskTranslation } from '../lib/kioskTranslations';
import {
  getStoredLanguage,
  getStoredMode,
  setStoredMode,
} from '../lib/kioskState';

export function PatientModeSelection() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState(getStoredLanguage);
  const [mode, setMode] = useState<'voice' | 'text'>(getStoredMode);

  useEffect(() => {
    setLanguage(getStoredLanguage());
    setMode(getStoredMode());
  }, []);

  const t = getKioskTranslation(language || 'English');

  const handleContinue = () => {
    setStoredMode(mode);
    setLocation('/patient/intake');
  };

  return (
    <main className="kiosk-page">
      <div className="kiosk-layout">
        <aside className="kiosk-progress">
          <div className="kiosk-brand">
            <button
              className="brand-button"
              onClick={() => setLocation('/')}
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
            <div className="kiosk-step done">
              <span className="step-icon">
                <Check size={17} />
              </span>
              <span>
                <b>{t.steps.language.title}</b>
                <small>{t.steps.language.caption}</small>
              </span>
            </div>
            <div className="kiosk-step done">
              <span className="step-icon">
                <Check size={17} />
              </span>
              <span>
                <b>Patient Details</b>
                <small>Personal info</small>
              </span>
            </div>
            <div className="kiosk-step current">
              <span className="step-icon">
                <Mic size={17} />
              </span>
              <span>
                <b>Interaction Mode</b>
                <small>Voice or Text</small>
              </span>
            </div>
            <div className="kiosk-step">
              <span className="step-icon">
                <FileText size={17} />
              </span>
              <span>
                <b>{t.steps.records.title}</b>
                <small>{t.steps.records.caption}</small>
              </span>
            </div>
          </div>
          <div className="kiosk-help">
            <CircleHelp size={16} />
            <span>{t.needHelp}</span>
          </div>
        </aside>
        <section className="kiosk-main">
          <div className="kiosk-main-inner">
            <div className="kiosk-progress-top">
              <span>
                {t.stepPrefix} 03 {t.stepOf} 04
              </span>
              <div>
                <i className="filled" />
                <i className="filled" />
                <i className="filled" />
                <i />
              </div>
              <span className="time-note">
                <Clock3 size={14} /> {t.durationNote}
              </span>
            </div>
            <div className="kiosk-card mode-selection-card">
              <div className="kiosk-card-heading">
                <span className="section-kicker">
                  <Languages
                    size={13}
                    style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}
                  />
                  {t.speakingIn} {language}
                </span>
                <h2>{t.modeKicker}</h2>
                <p>Choose how you would like to share your health concern with our AI assistant.</p>
              </div>

              <div className="mode-options-grid grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <button
                  type="button"
                  className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-4 cursor-pointer ${
                    mode === 'voice'
                      ? 'border-[#eaba61] bg-[#fffdfa] shadow-md ring-2 ring-[#eaba61]/30'
                      : 'border-[#e0ebe8] bg-white hover:border-[#173e35]/30'
                  }`}
                  onClick={() => {
                    setMode('voice');
                    setStoredMode('voice');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-[#eaba61]/20 text-[#173e35] flex items-center justify-center">
                      <Mic size={24} />
                    </div>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        mode === 'voice' ? 'border-[#c98e20] bg-[#eaba61]' : 'border-stone-300'
                      }`}
                    >
                      {mode === 'voice' && <Check size={12} className="text-white stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#173e35] mb-1">{t.modeVoice}</h3>
                    <p className="text-xs text-[#5c726a] leading-relaxed">
                      Speak freely and naturally in your chosen language. AI listens and transcribes.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-4 cursor-pointer ${
                    mode === 'text'
                      ? 'border-[#eaba61] bg-[#fffdfa] shadow-md ring-2 ring-[#eaba61]/30'
                      : 'border-[#e0ebe8] bg-white hover:border-[#173e35]/30'
                  }`}
                  onClick={() => {
                    setMode('text');
                    setStoredMode('text');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-[#eaba61]/20 text-[#173e35] flex items-center justify-center">
                      <Keyboard size={24} />
                    </div>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        mode === 'text' ? 'border-[#c98e20] bg-[#eaba61]' : 'border-stone-300'
                      }`}
                    >
                      {mode === 'text' && <Check size={12} className="text-white stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#173e35] mb-1">{t.modeText}</h3>
                    <p className="text-xs text-[#5c726a] leading-relaxed">
                      Type your symptoms and answer guided questions on screen.
                    </p>
                  </div>
                </button>
              </div>

              <div className="kiosk-form-actions">
                <button
                  type="button"
                  onClick={() => setLocation('/patient/details')}
                  className="kiosk-back-btn"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>

                <AppButton variant="amber" onClick={handleContinue} className="kiosk-submit-btn">
                  {t.btnContinue} <ArrowRight size={17} />
                </AppButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PatientModeSelection;
