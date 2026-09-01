import { useState } from 'react';
import {
  Mic,
  MessageSquare,
  Bot,
  User,
  Play,
  Pause,
  Volume2,
  Languages,
} from 'lucide-react';

export interface ConversationExchange {
  id: string;
  questionId?: string;
  category?: string;
  questionText: string;
  patientResponse: string;
  originalLanguage?: string;
  originalPatientText?: string;
  translatedText?: string;
  inputMode: 'voice' | 'text';
  audioUrl?: string;
  timestamp?: string;
  isImportant?: boolean;
  followUpNumber?: number;
}

export interface ConversationMessageProps {
  exchange: ConversationExchange;
  index: number;
}

export function ConversationMessage({ exchange, index }: ConversationMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isVoice = exchange.inputMode === 'voice';

  const handleToggleAudio = () => {
    if (!exchange.audioUrl) {
      // Simulate audio playback demonstration
      setIsPlaying(!isPlaying);
      if (!isPlaying) {
        setTimeout(() => setIsPlaying(false), 3000);
      }
      return;
    }
    const audio = new Audio(exchange.audioUrl);
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-xs transition hover:border-[#b8cabe] space-y-4">
      {/* Exchange Meta Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6ebe2] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#1f5b4e] font-mono text-[11px] font-bold text-white">
            #{index + 1}
          </span>
          {exchange.category && (
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#476759]">
              {exchange.category}
            </span>
          )}
          {exchange.followUpNumber && (
            <span className="rounded bg-[#e2ede7] px-2 py-0.5 font-mono text-[10px] font-bold text-[#1f5b4e]">
              Follow-up #{exchange.followUpNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Mode Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 font-mono text-[10px] font-bold ${
              isVoice
                ? 'border border-[#b7dbc8] bg-[#eef7f2] text-[#1c644c]'
                : 'border border-[#cbdbd1] bg-[#f2f6f3] text-[#3e5f52]'
            }`}
          >
            {isVoice ? <Mic size={11} /> : <MessageSquare size={11} />}
            {isVoice ? '🎙️ Voice Input' : '💬 Text Input'}
          </span>

          {/* Timestamp */}
          {exchange.timestamp && (
            <span className="font-mono text-[11px] text-[#788e83]">
              {exchange.timestamp}
            </span>
          )}
        </div>
      </div>

      {/* 1. Doctor / AI Question */}
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e2ede6] text-[#1f5b4e]">
          <Bot size={15} />
        </div>
        <div className="rounded-xl rounded-tl-none bg-[#f1f6f2] border border-[#d9e4da] p-3 text-xs leading-relaxed text-[#234538] flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4b6d5f] mb-1">
            AI / Intake System
          </p>
          <p className="font-medium text-[13px]">{exchange.questionText}</p>
        </div>
      </div>

      {/* 2. Patient Response */}
      <div className="flex items-start gap-3 flex-row-reverse">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1f5b4e] text-white">
          <User size={15} />
        </div>
        <div className="rounded-xl rounded-tr-none bg-[#fffcf5] border border-[#e5dcbe] p-3.5 text-xs leading-relaxed text-[#312b1c] flex-1 space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px] text-[#85704a]">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1">
              {isVoice ? '🎙️ Patient — Voice' : '💬 Patient — Text'}
            </span>
            {exchange.originalLanguage && (
              <span className="flex items-center gap-1">
                <Languages size={11} />
                Language: {exchange.originalLanguage}
              </span>
            )}
          </div>

          {/* Patient Spoken / Typed Content */}
          <div className="text-sm font-semibold text-[#18392f] leading-snug">
            &ldquo;{exchange.patientResponse}&rdquo;
          </div>

          {/* Original Statement if translated */}
          {exchange.originalPatientText && exchange.originalPatientText !== exchange.patientResponse && (
            <div className="rounded-lg bg-[#faf6eb] p-2 text-xs italic text-[#594d35] border border-[#ebe2cc]">
              <span className="font-semibold not-italic text-[#7b6b4e]">Original: </span>
              &ldquo;{exchange.originalPatientText}&rdquo;
            </div>
          )}

          {/* Voice Audio Controls */}
          {isVoice && (
            <div className="flex items-center justify-between border-t border-[#ede5d0] pt-2.5 mt-2">
              <button
                type="button"
                onClick={handleToggleAudio}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#c4b693] bg-[#fbf5e5] px-3 py-1.5 text-xs font-bold text-[#6d5423] hover:bg-[#f6ebd0] transition cursor-pointer"
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlaying ? 'Playing Audio…' : '▶ Play Audio'}</span>
              </button>

              <div className="flex items-center gap-1 text-[11px] text-[#8a7651] font-mono">
                <Volume2 size={13} />
                <span>Speech-to-Text Transcript</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
