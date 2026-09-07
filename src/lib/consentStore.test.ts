import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredConsent,
  setStoredConsent,
  clearStoredConsent,
  hasValidConsent,
  CONSENT_STORAGE_KEY,
  CONSENT_CURRENT_VERSION,
} from './consentStore';
import {
  getConsentTranslation,
  getConsentLanguageLocale,
} from './consentTranslations';

// Polyfill localStorage in test environment
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};

globalThis.localStorage = mockLocalStorage as any;

describe('consentStore', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('returns null and false when no consent is stored', () => {
    expect(getStoredConsent()).toBeNull();
    expect(hasValidConsent()).toBe(false);
  });

  it('stores and retrieves audio-guided consent metadata correctly', () => {
    const metadata = setStoredConsent('हिन्दी');
    expect(metadata.consent_given).toBe(true);
    expect(metadata.consent_language).toBe('हिन्दी');
    expect(metadata.consent_method).toBe('AUDIO_GUIDED');
    expect(metadata.consent_version).toBe(CONSENT_CURRENT_VERSION);
    expect(metadata.consent_timestamp).toBeDefined();

    const stored = getStoredConsent();
    expect(stored).toEqual(metadata);
    expect(hasValidConsent()).toBe(true);
  });

  it('clears stored consent properly', () => {
    setStoredConsent('English');
    expect(hasValidConsent()).toBe(true);

    clearStoredConsent();
    expect(getStoredConsent()).toBeNull();
    expect(hasValidConsent()).toBe(false);
  });

  it('handles invalid JSON gracefully', () => {
    globalThis.localStorage.setItem(CONSENT_STORAGE_KEY, '{invalid json');
    expect(getStoredConsent()).toBeNull();
    expect(hasValidConsent()).toBe(false);
  });
});

describe('consentTranslations', () => {
  it('contains translations for all 13 supported languages', () => {
    const supportedLangs = [
      'English',
      'हिन्दी',
      'मराठी',
      'বাংলা',
      'తెలుగు',
      'தமிழ்',
      'ગુજરાતી',
      'ಕನ್ನಡ',
      'മലയാളം',
      'ਪੰਜਾਬੀ',
      'ଓଡ଼ିଆ',
      'অসমীয়া',
      'اردو',
    ];

    supportedLangs.forEach((lang) => {
      const t = getConsentTranslation(lang);
      expect(t).toBeDefined();
      expect(t.title).toBeTruthy();
      expect(t.spokenScript).toBeTruthy();
      expect(t.checkboxLabel).toBeTruthy();
      expect(t.bulletPoints.length).toBe(4);
    });
  });

  it('correctly maps language locale codes for audio speech synthesis', () => {
    expect(getConsentLanguageLocale('English')).toBe('en-IN');
    expect(getConsentLanguageLocale('हिन्दी')).toBe('hi-IN');
    expect(getConsentLanguageLocale('Hindi')).toBe('hi-IN');
    expect(getConsentLanguageLocale('मराठी')).toBe('mr-IN');
    expect(getConsentLanguageLocale('Marathi')).toBe('mr-IN');
    expect(getConsentLanguageLocale('বাংলা')).toBe('bn-IN');
    expect(getConsentLanguageLocale('தமிழ்')).toBe('ta-IN');
    expect(getConsentLanguageLocale('తెలుగు')).toBe('te-IN');
    expect(getConsentLanguageLocale('ગુજરાતી')).toBe('gu-IN');
    expect(getConsentLanguageLocale('ಕನ್ನಡ')).toBe('kn-IN');
    expect(getConsentLanguageLocale('മലയാളം')).toBe('ml-IN');
    expect(getConsentLanguageLocale('ਪੰਜਾਬੀ')).toBe('pa-IN');
    expect(getConsentLanguageLocale('ଓଡ଼ିଆ')).toBe('or-IN');
    expect(getConsentLanguageLocale('অসমীয়া')).toBe('as-IN');
    expect(getConsentLanguageLocale('اردو')).toBe('ur-IN');
  });
});
