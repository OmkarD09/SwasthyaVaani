import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, UserRound, ShieldCheck, HeartPulse } from 'lucide-react';
import { getTranslation, type LanguageCode } from '../i18n';
import { LanguageSelector } from '../components/patient/LanguageSelector';
import { patientApi } from '../services/patientApi';

export function PatientHome() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState<LanguageCode>('en');

  useEffect(() => {
    patientApi.getProfile().then((profile) => {
      if (profile.preferredLanguage) {
        setLanguage(profile.preferredLanguage);
      }
    });
  }, []);

  const handleLanguageChange = (newLang: LanguageCode) => {
    setLanguage(newLang);
    patientApi.getProfile().then((profile) => {
      patientApi.updateProfile({ ...profile, preferredLanguage: newLang });
    });
  };

  const handleStart = () => {
    setLocation('/patient/consultation');
  };

  return (
    <div className="min-h-screen bg-[var(--sv-paper)] text-[var(--sv-ink)] flex flex-col justify-between p-4 md:p-8">
      {/* Top bar */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-emerald-900/10">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-400/30 text-emerald-900 flex items-center justify-center font-bold">
            <HeartPulse size={18} />
          </span>
          <span className="font-serif font-bold text-xl tracking-tight">
            Swasthya<span className="text-amber-600">Vaani</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation('/patient/profile')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-900/20 text-sm font-medium hover:bg-emerald-900/5 transition-colors"
          >
            <UserRound size={16} />
            <span>{getTranslation(language, 'viewProfile')}</span>
          </button>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="w-full max-w-2xl mx-auto my-auto py-8">
        <div className="kiosk-card p-6 md:p-10 rounded-2xl shadow-xl border border-emerald-900/10 bg-[var(--sv-card)] text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/20 text-emerald-900 mx-auto">
            <HeartPulse size={28} />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800">
              {getTranslation(language, 'brandName')}
            </span>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-emerald-950">
              {getTranslation(language, 'homeTitle')}
            </h1>
            <p className="text-lg text-emerald-900/70 font-medium">
              {getTranslation(language, 'homeSubtitle')}
            </p>
          </div>

          <p className="text-sm md:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-lg mx-auto">
            {getTranslation(language, 'homeDescription')}
          </p>

          {/* Language Selection within Home */}
          <div className="pt-4 border-t border-emerald-900/10 text-left space-y-3">
            <label className="block text-xs font-mono font-semibold uppercase text-stone-500">
              {getTranslation(language, 'selectLanguage')}
            </label>
            <LanguageSelector
              currentLanguage={language}
              onSelectLanguage={handleLanguageChange}
            />
          </div>

          {/* Start Intake Button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={handleStart}
              className="app-button primary w-full md:w-auto min-w-[240px] py-3.5 px-8 text-base font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 mx-auto"
            >
              <span>{getTranslation(language, 'startConsultation')}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>

      {/* Trust & Footer */}
      <footer className="w-full max-w-4xl mx-auto pt-6 border-t border-emerald-900/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 font-mono">
        <div className="flex items-center gap-1.5 text-emerald-900/80">
          <ShieldCheck size={15} />
          <span>{getTranslation(language, 'privateAndSecure')}</span>
        </div>
        <span>{getTranslation(language, 'needHelp')}</span>
      </footer>
    </div>
  );
}
