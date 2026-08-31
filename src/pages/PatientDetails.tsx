import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  UserRound,
  ShieldCheck,
  Languages as LanguagesIcon,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
} from 'lucide-react';
import { getTranslation, type LanguageCode } from '../i18n';
import { patientApi, type PatientProfileData } from '../services/patientApi';
import { LanguageSelector } from '../components/patient/LanguageSelector';

export function PatientDetails() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [patientData, setPatientData] = useState<PatientProfileData>({
    name: 'Ananya Sharma',
    age: '34',
    gender: 'Female',
    abhaNumber: '91-4521-8890-1234',
    phone: '9876543210',
    preferredLanguage: 'en',
  });
  const [profileErrors, setProfileErrors] = useState<{ name?: string; age?: string }>({});
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    patientApi.getProfile().then((profile) => {
      if (profile) {
        setPatientData(profile);
        if (profile.preferredLanguage) {
          setLanguage(profile.preferredLanguage);
        }
      }
    });
  }, []);

  const handleLanguageSelect = (lang: LanguageCode) => {
    setLanguage(lang);
    setPatientData((prev) => ({ ...prev, preferredLanguage: lang }));
    patientApi.updateProfile({ ...patientData, preferredLanguage: lang });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; age?: string } = {};
    if (!patientData.name.trim()) {
      errors.name = getTranslation(language, 'requiredField');
    }
    if (!patientData.age.trim()) {
      errors.age = getTranslation(language, 'requiredField');
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    await patientApi.updateProfile({ ...patientData, preferredLanguage: language });
    setSavedNotice(true);
    setTimeout(() => {
      setLocation('/patient');
    }, 400);
  };

  return (
    <main className="kiosk-page min-h-screen flex flex-col justify-between bg-[var(--sv-paper,#f6f9f8)] text-[var(--sv-ink,#18332c)]">
      {/* Top Bar */}
      <header className="kiosk-topbar flex items-center justify-between p-4 md:px-8 border-b border-emerald-900/10 bg-white">
        <button
          className="brand-button flex items-center gap-2"
          onClick={() => setLocation('/')}
          aria-label="SwasthyaVaani Home"
        >
          <span className="brand-mark w-8 h-8 rounded-lg bg-emerald-900 text-amber-400 flex items-center justify-center">
            <Sparkles size={18} strokeWidth={2.5} />
          </span>
          <span className="font-serif font-bold text-lg text-emerald-950">
            Swasthya<span className="text-amber-600">Vaani</span>
          </span>
        </button>

        <div className="kiosk-right flex items-center gap-3">
          <span className="kiosk-secure flex items-center gap-1 text-xs font-mono text-stone-600">
            <ShieldCheck size={15} /> {getTranslation(language, 'privateAndSecure')}
          </span>

          {/* Quick Language Dropdown Switcher */}
          <LanguageSelector
            currentLanguage={language}
            onSelectLanguage={handleLanguageSelect}
            variant="compact"
          />

          <button
            className="kiosk-close p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors"
            onClick={() => setLocation('/patient')}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Kiosk Layout */}
      <div className="kiosk-layout flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-4 md:p-8 gap-8">
        {/* Left Side Progress Sidebar */}
        <aside className="kiosk-progress md:w-80 flex flex-col justify-between bg-emerald-950 text-emerald-50 p-6 md:p-8 rounded-2xl">
          <div>
            <div className="kiosk-welcome mb-8">
              <span className="eyebrow uppercase text-xs font-mono tracking-wider text-amber-400">
                PATIENT INTAKE
              </span>
              <h1 className="text-2xl md:text-3xl font-serif text-emerald-50 mt-2">
                Your care<br />
                <em>starts here.</em>
              </h1>
              <p className="text-xs md:text-sm text-emerald-100/70 mt-2">
                {getTranslation(language, 'patientRegistrationSubtitle')}
              </p>
            </div>

            <div className="step-list space-y-3">
              <div className="kiosk-step done flex items-center gap-3 text-xs text-emerald-200/80">
                <span className="step-icon w-6 h-6 rounded-full bg-emerald-800 flex items-center justify-center text-white">
                  <Check size={14} />
                </span>
                <span>
                  <b>{getTranslation(language, 'stepLanguage')}</b>
                </span>
              </div>
              <div className="kiosk-step current flex items-center gap-3 text-xs font-semibold text-amber-400">
                <span className="step-icon w-6 h-6 rounded-full bg-amber-500 text-emerald-950 flex items-center justify-center">
                  <UserRound size={14} />
                </span>
                <span>
                  <b>{getTranslation(language, 'stepDetails')}</b>
                </span>
              </div>
              <div className="kiosk-step flex items-center gap-3 text-xs text-emerald-100/50">
                <span className="step-icon w-6 h-6 rounded-full bg-emerald-900/60 flex items-center justify-center">
                  3
                </span>
                <span>
                  <b>{getTranslation(language, 'stepStory')}</b>
                </span>
              </div>
              <div className="kiosk-step flex items-center gap-3 text-xs text-emerald-100/50">
                <span className="step-icon w-6 h-6 rounded-full bg-emerald-900/60 flex items-center justify-center">
                  4
                </span>
                <span>
                  <b>{getTranslation(language, 'stepRecords')}</b>
                </span>
              </div>
            </div>
          </div>

          <div className="kiosk-help text-xs text-emerald-100/60 pt-6 border-t border-emerald-900/60 flex items-center gap-2">
            <span>{getTranslation(language, 'needHelp')}</span>
          </div>
        </aside>

        {/* Right Main Panel: Patient Details Form */}
        <section className="kiosk-main flex-1 flex items-center justify-center">
          <div className="w-full max-w-xl">
            <div className="kiosk-card profile-card p-6 md:p-8 rounded-2xl shadow-xl border border-emerald-900/10 bg-white space-y-6 animate-fadeIn">
              <div className="kiosk-card-icon w-12 h-12 rounded-xl bg-amber-400/20 text-emerald-900 flex items-center justify-center">
                <UserRound size={24} />
              </div>
              <div className="kiosk-card-heading">
                <span className="section-kicker text-xs font-mono uppercase text-emerald-800">
                  Step 2 · Patient Information
                </span>
                <h2 className="text-2xl md:text-3xl font-semibold text-emerald-950 mt-1">
                  {getTranslation(language, 'patientRegistrationTitle')}
                </h2>
                <p className="text-sm text-stone-600 mt-1">
                  {getTranslation(language, 'patientRegistrationSubtitle')}
                </p>
              </div>

              {savedNotice && (
                <div className="flex items-center gap-2 p-3 bg-emerald-100 text-emerald-900 text-sm rounded-lg border border-emerald-300">
                  <Check size={16} />
                  <span>Details saved! Opening interview…</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-stone-700 mb-1.5">
                    {getTranslation(language, 'nameLabel')} *
                  </label>
                  <input
                    type="text"
                    value={patientData.name}
                    onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                    placeholder="e.g. Meena Kumari"
                    className={`w-full p-3.5 rounded-xl border ${
                      profileErrors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-emerald-900/20'
                    } bg-white text-emerald-950 text-base focus:outline-none focus:ring-2 focus:border-amber-500`}
                  />
                  {profileErrors.name && (
                    <span className="text-xs text-red-600 font-mono mt-1 block">
                      {profileErrors.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase text-stone-700 mb-1.5">
                      {getTranslation(language, 'ageLabel')} *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={patientData.age}
                      onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                      placeholder="e.g. 42"
                      className={`w-full p-3.5 rounded-xl border ${
                        profileErrors.age ? 'border-red-500 ring-1 ring-red-500' : 'border-emerald-900/20'
                      } bg-white text-emerald-950 text-base focus:outline-none focus:ring-2 focus:border-amber-500`}
                    />
                    {profileErrors.age && (
                      <span className="text-xs text-red-600 font-mono mt-1 block">
                        {profileErrors.age}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase text-stone-700 mb-1.5">
                      {getTranslation(language, 'genderLabel')}
                    </label>
                    <select
                      value={patientData.gender}
                      onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-emerald-900/20 bg-white text-emerald-950 text-base focus:outline-none focus:ring-2 focus:border-amber-500"
                    >
                      <option value="Not specified">Not specified</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-stone-700 mb-1.5">
                    {getTranslation(language, 'phoneLabel')}
                  </label>
                  <input
                    type="tel"
                    value={patientData.phone || ''}
                    onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full p-3.5 rounded-xl border border-emerald-900/20 bg-white text-emerald-950 text-base focus:outline-none focus:ring-2 focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-stone-700 mb-1.5">
                    {getTranslation(language, 'abhaNumberLabel')}
                  </label>
                  <input
                    type="text"
                    value={patientData.abhaNumber || ''}
                    onChange={(e) => setPatientData({ ...patientData, abhaNumber: e.target.value })}
                    placeholder="e.g. 91-4521-8890-1234 (ABDM)"
                    className="w-full p-3.5 rounded-xl border border-emerald-900/20 bg-white text-emerald-950 text-base focus:outline-none focus:ring-2 focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Action Bar */}
                <div className="pt-4 border-t border-emerald-900/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setLocation('/patient')}
                    className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
                  >
                    <ArrowLeft size={16} />
                    <span>{getTranslation(language, 'back')}</span>
                  </button>

                  <button
                    type="submit"
                    className="app-button primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-md hover:shadow-lg bg-[#eaba61] text-[#1a332c] hover:bg-[#f1c771] transition-all"
                  >
                    <span>{getTranslation(language, 'createProfileAndContinue')}</span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PatientDetails;
