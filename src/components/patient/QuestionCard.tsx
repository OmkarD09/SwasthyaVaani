import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import type { IntakeQuestion } from '../../services/intakeApi';
import { getTranslation, type LanguageCode } from '../../i18n';

interface QuestionCardProps {
  question: IntakeQuestion;
  questionNumber: number;
  totalQuestions: number;
  initialAnswer?: string;
  language: LanguageCode;
  onNext: (answer: string) => void;
  onBack?: () => void;
  isLastQuestion?: boolean;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  initialAnswer = '',
  language,
  onNext,
  onBack,
  isLastQuestion = false,
}: QuestionCardProps) {
  const [answer, setAnswer] = useState(initialAnswer);
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync answer state when current question changes
  useEffect(() => {
    setAnswer(initialAnswer || '');
    setValidationError(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [question.id, initialAnswer]);

  const handleContinue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) {
      setValidationError(getTranslation(language, 'validationEmpty'));
      return;
    }
    setValidationError(null);
    onNext(trimmed);
  };

  const currentPrompt = question.prompt[language] || question.prompt.en;
  const currentPlaceholder = question.placeholder[language] || question.placeholder.en;

  return (
    <div className="kiosk-card w-full max-w-2xl mx-auto shadow-lg transition-all animate-fadeIn">
      {/* Category kicker */}
      <div className="flex items-center justify-between mb-2">
        <span className="section-kicker uppercase tracking-wider text-xs font-semibold">
          {getTranslation(language, 'questionProgress', {
            current: questionNumber,
            total: totalQuestions,
          })}
        </span>
      </div>

      {/* Prominent Question Heading */}
      <h2 className="text-2xl md:text-3xl font-semibold mb-3 leading-snug text-emerald-950 dark:text-emerald-50">
        {currentPrompt}
      </h2>

      {/* Text Answer Input Area */}
      <form onSubmit={handleContinue} className="mt-6 space-y-4">
        <div>
          <label htmlFor={`question-${question.id}`} className="block text-sm font-medium text-emerald-900/80 mb-1.5">
            {getTranslation(language, 'yourAnswerLabel')}
          </label>
          <textarea
            id={`question-${question.id}`}
            ref={textareaRef}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (validationError && e.target.value.trim()) {
                setValidationError(null);
              }
            }}
            placeholder={currentPlaceholder}
            rows={4}
            className={`w-full p-4 rounded-xl border bg-white dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-50 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all resize-y text-base md:text-lg leading-relaxed ${
              validationError
                ? 'border-red-500 ring-1 ring-red-500'
                : 'border-emerald-900/20 focus:border-amber-500 focus:ring-amber-500/20'
            }`}
          />
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800 animate-shake">
            <AlertCircle size={16} className="shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 mt-6 border-t border-emerald-900/10">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-emerald-900/20 hover:bg-emerald-900/5 text-sm font-medium text-emerald-900 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>{getTranslation(language, 'previousQuestion')}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="submit"
            className="app-button primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
          >
            <span>
              {isLastQuestion
                ? getTranslation(language, 'finishQuestions')
                : getTranslation(language, 'continue')}
            </span>
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}
