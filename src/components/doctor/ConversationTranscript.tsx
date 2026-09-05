import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mic,
  Bot,
  User,
} from 'lucide-react';

export interface TranscriptItem {
  id?: string;
  role: 'patient' | 'assistant' | 'doctor';
  content: string;
  mode?: 'voice' | 'text';
  timestamp?: string;
  category?: string;
}

export interface ConversationTranscriptProps {
  items: TranscriptItem[];
  defaultOpen?: boolean;
}

export function ConversationTranscript({
  items = [],
  defaultOpen = false,
}: ConversationTranscriptProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] overflow-hidden shadow-xs">
      {/* Collapsible Header Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left transition hover:bg-[#f1efe4] cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#e2ede6] text-[#1f5b4e]">
            <MessageSquare size={15} />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
              Conversation Transcript
            </h3>
            <p className="text-[11px] text-[#71887d]">
              {items.length > 0
                ? `${items.length} exchange${items.length > 1 ? 's' : ''} recorded across voice & text intake`
                : 'Intake dialog recording'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#1f5b4e]">
          <span>{isOpen ? 'Collapse' : 'Expand Transcript'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Transcript Body */}
      {isOpen && (
        <div className="border-t border-[#e2e7dc] bg-[#fdfdfb] p-5">
          {items.length > 0 ? (
            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-2">
              {items.map((item, idx) => {
                const isPatient = item.role === 'patient';
                const isVoice = item.mode === 'voice';

                return (
                  <div
                    key={item.id || idx}
                    className={`flex items-start gap-3 ${
                      isPatient ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${
                        isPatient
                          ? 'bg-[#1f5b4e] text-white'
                          : 'bg-[#e2ede6] text-[#1f5b4e]'
                      }`}
                    >
                      {isPatient ? <User size={13} /> : <Bot size={13} />}
                    </div>

                    {/* Speech Bubble */}
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isPatient
                          ? 'rounded-tr-none bg-[#eaf4ef] border border-[#c4e0d4] text-[#173e35]'
                          : 'rounded-tl-none bg-[#f4f7f2] border border-[#dae3d8] text-[#2c473c]'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3 text-[10px] text-[#6d8478] font-mono">
                        <span className="font-bold uppercase tracking-wider">
                          {isPatient ? 'Patient' : 'SwasthyaVaani Assistant'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isVoice ? (
                            <span className="flex items-center gap-0.5 text-[#1f5b4e]">
                              <Mic size={10} /> Voice
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[#4a6d5f]">
                              <MessageSquare size={10} /> Text
                            </span>
                          )}
                          {item.timestamp && <span>· {item.timestamp}</span>}
                        </div>
                      </div>

                      <p className="font-medium text-xs">{item.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#ccd7cc] bg-[#f7faf8] p-4 text-center text-xs text-[#6a8477]">
              No conversation transcript entries recorded for this session.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
