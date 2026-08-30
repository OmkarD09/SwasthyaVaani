import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { getTranslation, type LanguageCode } from '../../i18n';

interface PatientReviewCardProps {
  title: string;
  answer: string;
  category: string;
  language: LanguageCode;
  onUpdateAnswer: (newAnswer: string) => void;
}

export function PatientReviewCard({
  title,
  answer,
  language,
  onUpdateAnswer,
}: PatientReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(answer);

  const handleSave = () => {
    const trimmed = editedText.trim();
    if (trimmed) {
      onUpdateAnswer(trimmed);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedText(answer);
    setIsEditing(false);
  };

  return (
    <div className="bg-white/80 dark:bg-emerald-950/40 border border-emerald-900/15 rounded-xl p-4 md:p-5 shadow-sm transition-all hover:border-emerald-900/30">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
          {title}
        </h3>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md transition-colors"
          >
            <Pencil size={12} />
            <span>{getTranslation(language, 'edit')}</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-3">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-lg border border-amber-500/50 bg-white dark:bg-stone-900 text-emerald-950 dark:text-emerald-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 text-xs font-medium hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300"
            >
              <X size={13} />
              <span>{getTranslation(language, 'cancel')}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 shadow-sm"
            >
              <Check size={13} />
              <span>{getTranslation(language, 'saveChanges')}</span>
            </button>
          </div>
        </div>
      ) : (
        <p className="text-stone-700 dark:text-stone-300 text-sm md:text-base whitespace-pre-wrap leading-relaxed">
          {answer || <span className="italic text-stone-400">No answer provided</span>}
        </p>
      )}
    </div>
  );
}
