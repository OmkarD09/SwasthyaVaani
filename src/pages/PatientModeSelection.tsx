import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Mic,
  Keyboard,
  Check,
  ArrowRight,
  ArrowLeft,
  Languages,
} from 'lucide-react';
import { AppButton } from '../components/Brand';
import { getKioskTranslation } from '../lib/kioskTranslations';
import {
  getStoredLanguage,
  getStoredMode,
  setStoredMode,
  getStoredWorkflow,
  setStoredWorkflow,
} from '../lib/kioskState';
import {
  KioskProgressSidebar,
  KioskTopProgressBar,
} from '../components/patient/KioskProgress';
import { PatientFlowTransition } from '../components/patient/PatientFlowTransition';

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
    setStoredWorkflow(getStoredWorkflow());
    setLocation('/patient/intake');
  };

  return (
    <main className="kiosk-page">
      <div className="kiosk-layout">
        <KioskProgressSidebar currentStep={3} t={t} />

        <section className="kiosk-main">
          <div className="kiosk-main-inner">
            <KioskTopProgressBar currentStep={3} t={t} />

            <PatientFlowTransition stepKey="mode">
              <div className="kiosk-card mode-selection-card">
              <div className="kiosk-card-heading">
                <span className="section-kicker">
                  <Languages
                    size={14}
                    style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}
                  />
                  {t.speakingIn} {language} · STEP 03 OF 05
                </span>
                <h2>{t.modeKicker}</h2>
                <p className="text-base text-[#688680] mt-1">
                  Choose how you would like to share your symptoms with our AI assistant.
                </p>
              </div>

              <div className="mode-options-grid grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
                <button
                  type="button"
                  id="mode-option-voice"
                  className={`p-8 md:p-10 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-6 cursor-pointer min-h-[220px] ${
                    mode === 'voice'
                      ? 'border-[#eaba61] bg-[#fffdfa] shadow-lg ring-2 ring-[#eaba61]/40'
                      : 'border-[#e0ebe8] bg-white hover:border-[#173e35]/40 hover:shadow-md'
                  }`}
                  onClick={() => {
                    setMode('voice');
                    setStoredMode('voice');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-[#eaba61]/20 text-[#173e35] flex items-center justify-center shadow-inner">
                      <Mic size={28} />
                    </div>
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        mode === 'voice' ? 'border-[#c98e20] bg-[#eaba61]' : 'border-stone-300 bg-stone-50'
                      }`}
                    >
                      {mode === 'voice' && <Check size={14} className="text-white stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#173e35] mb-2">{t.modeVoice}</h3>
                    <p className="text-sm text-[#5c726a] leading-relaxed">
                      Speak freely and naturally in your chosen language. AI listens, transcribes, and structures your symptoms.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  id="mode-option-text"
                  className={`p-8 md:p-10 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-6 cursor-pointer min-h-[220px] ${
                    mode === 'text'
                      ? 'border-[#eaba61] bg-[#fffdfa] shadow-lg ring-2 ring-[#eaba61]/40'
                      : 'border-[#e0ebe8] bg-white hover:border-[#173e35]/40 hover:shadow-md'
                  }`}
                  onClick={() => {
                    setMode('text');
                    setStoredMode('text');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-[#eaba61]/20 text-[#173e35] flex items-center justify-center shadow-inner">
                      <Keyboard size={28} />
                    </div>
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        mode === 'text' ? 'border-[#c98e20] bg-[#eaba61]' : 'border-stone-300 bg-stone-50'
                      }`}
                    >
                      {mode === 'text' && <Check size={14} className="text-white stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#173e35] mb-2">{t.modeText}</h3>
                    <p className="text-sm text-[#5c726a] leading-relaxed">
                      Type your symptoms and answer guided clinical questions at your own comfortable pace.
                    </p>
                  </div>
                </button>
              </div>

              <div className="kiosk-form-actions mt-auto pt-4 border-t border-[#edf3f1]">
                <button
                  type="button"
                  onClick={() => setLocation('/patient/department')}
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
            </PatientFlowTransition>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PatientModeSelection;
