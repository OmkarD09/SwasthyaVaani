import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Languages,
  UserRound,
  Mic,
  FileText,
  Clock3,
  Search,
  Check,
  ArrowRight,
  CircleHelp,
  X,
} from 'lucide-react';
import { Brand, AppButton } from '../components/Brand';
import { getKioskTranslation } from '../lib/kioskTranslations';
import {
  getStoredLanguage,
  setStoredLanguage,
  INTAKE_LANGUAGES,
} from '../lib/kioskState';

export function PatientLanguageSelection() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState(getStoredLanguage);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleContinue = () => {
    if (language) {
      setStoredLanguage(language);
      setLocation('/patient/details');
    }
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
            <div className="kiosk-step current">
              <span className="step-icon">
                <Languages size={17} />
              </span>
              <span>
                <b>{t.steps.language.title}</b>
                <small>{t.steps.language.caption}</small>
              </span>
            </div>
            <div className="kiosk-step">
              <span className="step-icon">
                <UserRound size={17} />
              </span>
              <span>
                <b>Patient Details</b>
                <small>Personal info</small>
              </span>
            </div>
            <div className="kiosk-step">
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
                {t.stepPrefix} 01 {t.stepOf} 04
              </span>
              <div>
                <i className="filled" />
                <i />
                <i />
                <i />
              </div>
              <span className="time-note">
                <Clock3 size={14} /> {t.durationNote}
              </span>
            </div>
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
                onClick={handleContinue}
                disabled={!language}
                className="kiosk-next"
              >
                {t.btnContinue} <ArrowRight size={17} />
              </AppButton>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PatientLanguageSelection;
