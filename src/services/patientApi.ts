import type { LanguageCode } from '../i18n';

export interface PatientProfileData {
  name: string;
  age: string;
  gender: string;
  abhaNumber?: string;
  abhaAddress?: string;
  dateOfBirth?: string;
  phone?: string;
  preferredLanguage: LanguageCode;
  isAbhaFromQr?: boolean;
}

export const BLANK_PATIENT_PROFILE: PatientProfileData = {
  name: '',
  age: '',
  gender: '',
  abhaNumber: '',
  abhaAddress: '',
  dateOfBirth: '',
  phone: '',
  preferredLanguage: 'en',
  isAbhaFromQr: false,
};

const PATIENT_STORAGE_KEY = 'sv_patient_profile';

export function getStoredPatientProfile(): PatientProfileData | null {
  try {
    const stored = localStorage.getItem(PATIENT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function clearStoredPatientProfile(): void {
  try {
    localStorage.removeItem(PATIENT_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export const patientApi = {
  getProfile: async (): Promise<PatientProfileData> => {
    try {
      const stored = localStorage.getItem(PATIENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors and return pristine blank
    }
    // Pristine blank profile as mandated by DPDP Act (no hardcoded fallback data)
    return { ...BLANK_PATIENT_PROFILE };
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
