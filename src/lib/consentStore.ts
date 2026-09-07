export interface ConsentMetadata {
  consent_given: boolean;
  consent_language: string;
  consent_timestamp: string; // ISO 8601 UTC
  consent_method: 'AUDIO_GUIDED';
  consent_version: string;
}

export const CONSENT_STORAGE_KEY = 'sv_audio_consent';
export const CONSENT_CURRENT_VERSION = 'v1.0';

export function getStoredConsent(): ConsentMetadata | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.consent_given === true) {
      return parsed as ConsentMetadata;
    }
  } catch (err) {
    console.error('[ConsentStore] Failed to parse stored consent:', err);
  }
  return null;
}

export function setStoredConsent(language: string, version: string = CONSENT_CURRENT_VERSION): ConsentMetadata {
  const metadata: ConsentMetadata = {
    consent_given: true,
    consent_language: language || 'English',
    consent_timestamp: new Date().toISOString(),
    consent_method: 'AUDIO_GUIDED',
    consent_version: version,
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(metadata));
    }
  } catch (err) {
    console.error('[ConsentStore] Failed to save consent:', err);
  }
  return metadata;
}

export function clearStoredConsent(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    }
  } catch (err) {
    console.error('[ConsentStore] Failed to clear consent:', err);
  }
}

export function hasValidConsent(): boolean {
  const c = getStoredConsent();
  return Boolean(c && c.consent_given && c.consent_timestamp);
}
