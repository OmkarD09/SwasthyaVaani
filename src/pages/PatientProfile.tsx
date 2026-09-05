import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, UserRound, Check, ShieldCheck, Stethoscope } from 'lucide-react';
import { getTranslation, type LanguageCode } from '../i18n';
import { patientApi, type PatientProfileData } from '../services/patientApi';
import { LanguageSelector } from '../components/patient/LanguageSelector';

export function PatientProfile() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<PatientProfileData>({
    name: 'Ananya Sharma',
    age: '34',
    gender: 'Female',
    abhaNumber: '91-4521-8890-1234',
    phone: '9876543210',
    preferredLanguage: 'en',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    patientApi.getProfile().then((data) => setProfile(data));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await patientApi.updateProfile(profile);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const language: LanguageCode = (profile.preferredLanguage as LanguageCode) || 'en';

  return (
    <div className="min-h-screen bg-[var(--sv-paper,#f6f9f8)] text-[var(--sv-ink,#18332c)] p-4 md:p-8 flex flex-col justify-between">
      {/* Header */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between pb-6 border-b border-emerald-900/10">
        <button
          type="button"
          onClick={() => setLocation('/patient')}
          className="flex items-center gap-1.5 text-sm font-medium text-emerald-900 hover:text-emerald-950 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{getTranslation(language, 'back')}</span>
        </button>
        <span className="font-serif font-semibold text-lg text-emerald-950">
          {getTranslation(language, 'profileTitle')}
        </span>
        <div className="w-16" />
      </header>

      {/* Profile Card */}
      <main className="w-full max-w-xl mx-auto my-auto py-6">
        <div className="kiosk-card p-6 md:p-8 rounded-2xl shadow-xl border border-emerald-900/10 bg-white space-y-6">
          <div className="flex items-center gap-4 border-b border-emerald-900/10 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/20 text-emerald-900 flex items-center justify-center font-bold">
              <UserRound size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-emerald-950">
                {profile.name}
              </h1>
              <p className="text-xs font-mono text-stone-500">
                {getTranslation(language, 'demoNotice')}
              </p>
            </div>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-100 text-emerald-900 text-sm rounded-lg border border-emerald-300">
              <Check size={16} />
              <span>Profile updated successfully</span>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-stone-600 mb-1">
                  {getTranslation(language, 'nameLabel')}
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full p-3 rounded-lg border border-emerald-900/20 bg-white text-sm focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-stone-600 mb-1">
                    {getTranslation(language, 'ageLabel')}
                  </label>
                  <input
                    type="text"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                    className="w-full p-3 rounded-lg border border-emerald-900/20 bg-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-stone-600 mb-1">
                    {getTranslation(language, 'genderLabel')}
                  </label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full p-3 rounded-lg border border-emerald-900/20 bg-white text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Not specified">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-stone-600 mb-1">
                  {getTranslation(language, 'abhaNumberLabel')}
                </label>
                <input
                  type="text"
                  value={profile.abhaNumber || ''}
                  onChange={(e) => setProfile({ ...profile, abhaNumber: e.target.value })}
                  placeholder="e.g. 91-4521-8890-1234"
                  className="w-full p-3 rounded-lg border border-emerald-900/20 bg-white text-sm font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-stone-600 mb-1">
                  {getTranslation(language, 'phoneLabel')}
                </label>
                <input
                  type="text"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full p-3 rounded-lg border border-emerald-900/20 bg-white text-sm font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-stone-600 mb-2">
                  {getTranslation(language, 'preferredLanguageLabel')}
                </label>
                <LanguageSelector
                  currentLanguage={language}
                  onSelectLanguage={(newLang) =>
                    setProfile({ ...profile, preferredLanguage: newLang })
                  }
                  variant="compact"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-900/10">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
                >
                  {getTranslation(language, 'cancel')}
                </button>
                <button
                  type="submit"
                  className="app-button primary px-5 py-2 rounded-lg text-sm font-medium"
                >
                  {getTranslation(language, 'saveProfile')}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 py-2 border-b border-emerald-900/5">
                <div>
                  <span className="block text-xs font-mono text-stone-500 uppercase">
                    {getTranslation(language, 'nameLabel')}
                  </span>
                  <strong className="text-base text-emerald-950">{profile.name}</strong>
                </div>
                <div>
                  <span className="block text-xs font-mono text-stone-500 uppercase">
                    {getTranslation(language, 'ageLabel')}
                  </span>
                  <strong className="text-base text-emerald-950">{profile.age}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-b border-emerald-900/5">
                <div>
                  <span className="block text-xs font-mono text-stone-500 uppercase">
                    {getTranslation(language, 'genderLabel')}
                  </span>
                  <strong className="text-base text-emerald-950">{profile.gender}</strong>
                </div>
                <div>
                  <span className="block text-xs font-mono text-stone-500 uppercase">
                    {getTranslation(language, 'preferredLanguageLabel')}
                  </span>
                  <strong className="text-base text-emerald-950 uppercase font-mono">
                    {profile.preferredLanguage}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-b border-emerald-900/5">
                <div>
                  <span className="block text-xs font-mono text-stone-500 uppercase">
                    {getTranslation(language, 'abhaNumberLabel')}
                  </span>
                  <strong className="text-base text-emerald-950 font-mono">
                    {profile.abhaNumber || 'Not provided'}
                  </strong>
                </div>
                <div>
                  <span className="block text-xs font-mono text-stone-500 uppercase">
                    {getTranslation(language, 'phoneLabel')}
                  </span>
                  <strong className="text-base text-emerald-950 font-mono">
                    {profile.phone || 'Not provided'}
                  </strong>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="app-button outline px-5 py-2.5 rounded-lg text-sm font-medium"
                >
                  {getTranslation(language, 'editProfile')}
                </button>

                <button
                  type="button"
                  onClick={() => setLocation('/patient')}
                  className="app-button primary px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Stethoscope size={16} />
                  <span>{getTranslation(language, 'startConsultation')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl mx-auto pt-6 text-center text-xs text-stone-500 font-mono">
        <div className="flex items-center justify-center gap-1.5 text-emerald-900/80">
          <ShieldCheck size={15} />
          <span>{getTranslation(language, 'privateAndSecure')}</span>
        </div>
      </footer>
    </div>
  );
}

export default PatientProfile;
