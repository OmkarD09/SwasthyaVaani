import { Mic, MessageSquare, Languages } from 'lucide-react';

export interface MainConcernProps {
  primaryConcern: string;
  inputModes?: ('voice' | 'text')[];
  originalLanguage?: string;
  translatedLanguage?: string;
}

export function MainConcern({
  primaryConcern,
  inputModes = ['voice'],
  originalLanguage = 'Hindi',
  translatedLanguage = 'English',
}: MainConcernProps) {
  const hasVoice = inputModes.includes('voice');
  const hasText = inputModes.includes('text');

  return (
    <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e9e2] pb-3 mb-4">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
          Patient&apos;s Main Concern
        </h3>

        {/* Source and Language Metadata */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Input Source Badge */}
          <span className="inline-flex items-center gap-1 rounded-md border border-[#cbdbcf] bg-[#edf4ee] px-2.5 py-0.5 font-medium text-[#1f5b4e]">
            {hasVoice && hasText ? (
              <>
                <Mic size={12} className="text-[#1f5b4e]" />
                <span>Voice</span>
                <span className="text-[#889d93]">+</span>
                <MessageSquare size={12} className="text-[#1f5b4e]" />
                <span>Text</span>
              </>
            ) : hasVoice ? (
              <>
                <Mic size={12} className="text-[#1f5b4e]" />
                <span>Voice Intake</span>
              </>
            ) : (
              <>
                <MessageSquare size={12} className="text-[#1f5b4e]" />
                <span>Text Intake</span>
              </>
            )}
          </span>

          {/* Language Metadata */}
          {originalLanguage && (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#e2d8c3] bg-[#faf6eb] px-2.5 py-0.5 text-[#7c5b20] font-mono text-[11px]">
              <Languages size={12} />
              <span>Original: <b>{originalLanguage}</b></span>
              {translatedLanguage && translatedLanguage !== originalLanguage && (
                <>
                  <span className="text-[#af9c77]">→</span>
                  <span>{translatedLanguage}</span>
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Primary Extracted Concern */}
      <div className="rounded-xl border-l-3 border-[#e1b968] bg-[#fff9ea] p-4 text-base font-semibold leading-relaxed text-[#513c16]">
        &ldquo;{primaryConcern}&rdquo;
      </div>
    </section>
  );
}
