import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Search,
  Check,
  ArrowRight,
  X,
} from 'lucide-react';
import { AppButton } from '../components/Brand';
import { getKioskTranslation } from '../lib/kioskTranslations';
import {
  getStoredLanguage,
  setStoredLanguage,
  INTAKE_LANGUAGES,
} from '../lib/kioskState';
import {
  KioskProgressSidebar,
  KioskTopProgressBar,
} from '../components/patient/KioskProgress';
import { PatientFlowTransition } from '../components/patient/PatientFlowTransition';
import { AudioGuidedConsent } from '../components/patient/AudioGuidedConsent';

export function PatientLanguageSelection() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState(getStoredLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [subStep, setSubStep] = useState<'language' | 'consent'>('language');

  useEffect(() => {
    const l = getStoredLanguage();
    if (l) setLanguage(l);
  }, []);

  const t = getKioskTranslation(language || 'English');

  const filteredLanguages = INTAKE_LANGUAGES.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sub.toLowerCase().includes(q)
    );
  });

  const handleSelect = (langName: string) => {
    setLanguage(langName);
    setStoredLanguage(langName);
  };

  const handleProceedToConsent = () => {
    if (language) {
      setStoredLanguage(language);
      setSubStep('consent');
    }
  };

  const handleConsentConfirmed = () => {
    setLocation('/patient/details');
  };

  return (
    <main className="kiosk-page">
      <div className="kiosk-layout">
        <KioskProgressSidebar currentStep={1} t={t} />
        <section className="kiosk-main">
          <div className="kiosk-main-inner">
            <KioskTopProgressBar currentStep={1} t={t} />
            <PatientFlowTransition stepKey={subStep === 'consent' ? 'consent' : 'language'}>
              {subStep === 'consent' ? (
                <AudioGuidedConsent
                  language={language || 'English'}
                  onConsentConfirmed={handleConsentConfirmed}
                  onChangeLanguage={() => setSubStep('language')}
                />
              ) : (
                <div className="kiosk-card language-card">
                  <div className="kiosk-card-heading">
                    <span className="section-kicker">{t.langKicker}</span>
                    <h2>{t.langHeading}</h2>
                    <p>{t.langSubtitle}</p>
                  </div>
                  <div className="language-search-wrap">
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      className="language-search-input"
                      placeholder="Search your language..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {filteredLanguages.length === 0 ? (
                    <div className="language-no-results">
                      No languages found matching &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    <div className="language-grid-wrap">
                      <div className="language-grid">
                        {filteredLanguages.map((item) => (
                          <button
                            key={item.sub}
                            className={
                              language === item.name || language === item.sub ? 'selected' : ''
                            }
                            onClick={() => handleSelect(item.name)}
                          >
                            <span className="language-radio">
                              {(language === item.name || language === item.sub) && <Check size={14} />}
                            </span>
                            <b>{item.name}</b>
                            <small>{item.sub}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <AppButton
                    variant="amber"
                    onClick={handleProceedToConsent}
                    disabled={!language}
                    className="kiosk-next"
                  >
                    {t.btnContinue} <ArrowRight size={17} />
                  </AppButton>
                </div>
              )}
            </PatientFlowTransition>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PatientLanguageSelection;

