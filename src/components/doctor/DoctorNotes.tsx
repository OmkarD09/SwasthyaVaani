import React, { useState } from 'react';
import { Pencil, Save, Check } from 'lucide-react';
import { ClinicianButton as Button } from '../clinician/ClinicianShared';

export interface DoctorNotesProps {
  initialNotes?: string;
  onSaveNotes?: (notes: string) => void;
}

export function DoctorNotes({ initialNotes = '', onSaveNotes }: DoctorNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    if (onSaveNotes) {
      onSaveNotes(notes);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#e5e9e2] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Pencil size={15} className="text-[#1f5b4e]" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
            Doctor Notes
          </h3>
        </div>
        <span className="text-[11px] text-[#71887d]">
          Attending clinician observations & follow-up instructions
        </span>
      </div>

      <div className="space-y-3">
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setIsSaved(false);
          }}
          rows={3}
          placeholder="Add clinical observations, preliminary diagnosis considerations, or follow-up notes..."
          className="w-full resize-none rounded-xl border border-[#cbd6ca] bg-[#fdfdfb] p-3 text-xs leading-relaxed text-[#234538] outline-none transition focus:border-[#1f5b4e] focus:ring-1 focus:ring-[#1f5b4e]/30 placeholder:text-[#8d9e95]"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#768e82]">
            {isSaved ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#297a55]">
                <Check size={13} /> Notes saved to record
              </span>
            ) : (
              'Notes are private and will be included in the confirmed consultation record.'
            )}
          </span>

          <Button
            variant="outline"
            onClick={handleSave}
            className="min-h-9 px-3.5 py-1 text-xs"
            testId="button-save-doctor-notes"
          >
            <Save size={13} /> Save notes
          </Button>
        </div>
      </div>
    </section>
  );
}
