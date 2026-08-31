import { patientApi } from '../services/patientApi';

export const PATIENT_LANG_KEY = 'sv_selected_language';
export const PATIENT_LANG_CODE_KEY = 'sv_selected_lang_code';
export const PATIENT_MODE_KEY = 'sv_selected_mode';

export function getStoredLanguage(): string {
  return localStorage.getItem(PATIENT_LANG_KEY) || '';
}

export function setStoredLanguage(lang: string) {
  localStorage.setItem(PATIENT_LANG_KEY, lang);
  const code =
    lang === 'हिन्दी' || lang.toLowerCase() === 'hindi' || lang === 'hi'
      ? 'hi'
      : lang === 'मराठी' || lang.toLowerCase() === 'marathi' || lang === 'mr'
      ? 'mr'
      : 'en';
  localStorage.setItem(PATIENT_LANG_CODE_KEY, code);
  patientApi.getProfile().then((p) => {
    patientApi.updateProfile({ ...p, preferredLanguage: code as any });
  });
}

export function getStoredMode(): 'voice' | 'text' {
  const m = localStorage.getItem(PATIENT_MODE_KEY);
  return m === 'text' ? 'text' : 'voice';
}

export function setStoredMode(mode: 'voice' | 'text') {
  localStorage.setItem(PATIENT_MODE_KEY, mode);
}

export const INTAKE_LANGUAGES = [
  { name: 'English', sub: 'English' },
  { name: 'हिन्दी', sub: 'Hindi' },
  { name: 'বাংলা', sub: 'Bengali' },
  { name: 'मराठी', sub: 'Marathi' },
  { name: 'తెలుగు', sub: 'Telugu' },
  { name: 'தமிழ்', sub: 'Tamil' },
  { name: 'ગુજરાતી', sub: 'Gujarati' },
  { name: 'ಕನ್ನಡ', sub: 'Kannada' },
  { name: 'മലയാളം', sub: 'Malayalam' },
  { name: 'ਪੰਜਾਬੀ', sub: 'Punjabi' },
  { name: 'ଓଡ଼ିଆ', sub: 'Odia' },
  { name: 'অসমীয়া', sub: 'Assamese' },
  { name: 'اردو', sub: 'Urdu' },
];
