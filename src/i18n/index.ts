import { en, type LanguageCode, type TranslationKey } from './en';
import { hi } from './hi';
import { mr } from './mr';

export const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en,
  hi,
  mr,
};

export const availableLanguages: { code: LanguageCode; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
];

export function getTranslation(lang: LanguageCode, key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = translations[lang] || translations.en;
  let text = dict[key] || translations.en[key] || (key as string);
  
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    });
  }
  
  return text;
}

export * from './en';
