import { Globe } from 'lucide-react';
import { availableLanguages, type LanguageCode } from '../../i18n';

interface LanguageSelectorProps {
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  className?: string;
  variant?: 'grid' | 'dropdown' | 'compact';
}

export function LanguageSelector({
  currentLanguage,
  onSelectLanguage,
  className = '',
  variant = 'grid',
}: LanguageSelectorProps) {
  if (variant === 'compact') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <Globe className="w-4 h-4 text-emerald-800 dark:text-emerald-300 mr-2" />
        <select
          value={currentLanguage}
          onChange={(e) => onSelectLanguage(e.target.value as LanguageCode)}
          className="bg-transparent border border-emerald-800/20 rounded-md px-2.5 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          aria-label="Select preferred language"
        >
          {availableLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeLabel} ({lang.label})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`language-grid ${className}`}>
      {availableLanguages.map((item) => {
        const isSelected = currentLanguage === item.code;
        return (
          <button
            key={item.code}
            type="button"
            className={isSelected ? 'selected' : ''}
            onClick={() => onSelectLanguage(item.code)}
          >
            <span className="language-radio">
              {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
            <b>{item.nativeLabel}</b>
            <small>{item.label}</small>
          </button>
        );
      })}
    </div>
  );
}
