import React, { useState } from 'react';
import { MessageSquare, Mic, Volume2, Sparkles, Filter, Layers } from 'lucide-react';
import { ConversationMessage, type ConversationExchange } from './ConversationMessage';

export interface ConversationTimelineProps {
  exchanges: ConversationExchange[];
}

export type ConversationFilterMode = 'all' | 'text' | 'voice';

export function ConversationTimeline({ exchanges }: ConversationTimelineProps) {
  const [filterMode, setFilterMode] = useState<ConversationFilterMode>('all');

  const voiceCount = exchanges.filter((e) => e.inputMode === 'voice').length;
  const textCount = exchanges.filter((e) => e.inputMode === 'text').length;

  const filteredExchanges = exchanges.filter((e) => {
    if (filterMode === 'voice') return e.inputMode === 'voice';
    if (filterMode === 'text') return e.inputMode === 'text';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Overview & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e2ede6] text-[#1f5b4e]">
            <Layers size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-[#173e35] text-sm">
              Patient Conversation Timeline
            </h2>
            <p className="text-xs text-[#6a8277]">
              Chronological interactive transcript captured via adaptive AI intake
            </p>
          </div>
        </div>

        {/* Segmented Control: [ All ] [ 💬 Text ] [ 🎙️ Voice ] */}
        <div className="flex items-center rounded-xl border border-[#cbdbd1] bg-[#edf3ef] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#1f5b4e] text-white shadow-xs font-bold'
                : 'text-[#3d6051] hover:text-[#173e35]'
            }`}
          >
            <span>All ({exchanges.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('text')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
              filterMode === 'text'
                ? 'bg-[#1f5b4e] text-white shadow-xs font-bold'
                : 'text-[#3d6051] hover:text-[#173e35]'
            }`}
          >
            <MessageSquare size={13} />
            <span>💬 Text ({textCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('voice')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
              filterMode === 'voice'
                ? 'bg-[#1f5b4e] text-white shadow-xs font-bold'
                : 'text-[#3d6051] hover:text-[#173e35]'
            }`}
          >
            <Mic size={13} />
            <span>🎙️ Voice ({voiceCount})</span>
          </button>
        </div>
      </div>

      {/* Filtered Exchanges List */}
      {filteredExchanges.length > 0 ? (
        <div className="space-y-4">
          {filteredExchanges.map((exchange, idx) => (
            <ConversationMessage
              key={exchange.id || idx}
              exchange={exchange}
              index={idx}
            />
          ))}
        </div>
      ) : (
        /* Appropriate Empty State based on filter mode */
        <div className="rounded-2xl border border-dashed border-[#ccd7cc] bg-[#f8fbf9] p-8 text-center text-sm text-[#6a8477]">
          {filterMode === 'voice' ? (
            <>
              <Mic size={26} className="mx-auto mb-2 text-[#9bb3a6]" />
              <p className="font-semibold text-[#2b5142]">No voice conversation is available for this patient.</p>
              <p className="text-xs text-[#7c9689] mt-1">
                The patient completed their intake session entirely through text interaction.
              </p>
            </>
          ) : filterMode === 'text' ? (
            <>
              <MessageSquare size={26} className="mx-auto mb-2 text-[#9bb3a6]" />
              <p className="font-semibold text-[#2b5142]">No text conversation is available for this patient.</p>
              <p className="text-xs text-[#7c9689] mt-1">
                The patient completed their intake session entirely through voice conversation.
              </p>
            </>
          ) : (
            <>
              <MessageSquare size={26} className="mx-auto mb-2 text-[#9bb3a6]" />
              <p className="font-semibold text-[#2b5142]">No conversation dialog available for this patient.</p>
              <p className="text-xs text-[#7c9689] mt-1">
                New messages and voice transcripts will appear here chronologically as intake is conducted.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
