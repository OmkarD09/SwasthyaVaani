import type { LanguageCode } from '../i18n';

export interface PatientProfileData {
  name: string;
  age: string;
  gender: string;
  abhaNumber?: string;
  phone?: string;
  preferredLanguage: LanguageCode;
}

const DEFAULT_PATIENT_PROFILE: PatientProfileData = {
  name: 'Ananya Sharma',
  age: '34',
  gender: 'Female',
  abhaNumber: '91-4521-8890-1234',
  phone: '9876543210',
  preferredLanguage: 'en',
};

const PATIENT_STORAGE_KEY = 'sv_patient_profile';

export const patientApi = {
  getProfile: async (): Promise<PatientProfileData> => {
    try {
      const stored = localStorage.getItem(PATIENT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore storage errors and return default
    }
    return DEFAULT_PATIENT_PROFILE;
  },

  updateProfile: async (profile: PatientProfileData): Promise<PatientProfileData> => {
    try {
      localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore storage errors
    }
    return profile;
  },
};
