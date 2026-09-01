import React from 'react';
import { Sparkles, Pencil, Save, Check } from 'lucide-react';

export interface ClinicalFieldItem {
  key: string;
  label: string;
  value: string | number | string[] | null | undefined;
  category?: 'hpi' | 'symptoms' | 'history' | 'other';
}

export interface ClinicalSummaryProps {
  fields: ClinicalFieldItem[];
  isEditing?: boolean;
  onFieldChange?: (key: string, newValue: string) => void;
  confidence?: number;
}

export function ClinicalSummary({
  fields,
  isEditing = false,
  onFieldChange,
  confidence,
}: ClinicalSummaryProps) {
  // Filter only available / populated fields (not empty / not "Not specified")
  const activeFields = fields.filter((f) => {
    if (f.value === null || f.value === undefined) return false;
    if (typeof f.value === 'string') {
      const trimmed = f.value.trim();
      return (
        trimmed !== '' &&
        trimmed.toLowerCase() !== 'not specified' &&
        trimmed.toLowerCase() !== 'none reported' &&
        trimmed.toLowerCase() !== 'n/a' &&
        trimmed.toLowerCase() !== 'not provided'
      );
    }
    if (Array.isArray(f.value)) {
      return f.value.length > 0;
    }
    return true;
  });

  const formatFieldValue = (val: string | number | string[] | null | undefined) => {
    if (Array.isArray(val)) return val.join(', ');
    return String(val ?? '');
  };

  return (
    <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e9e2] pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#e6eee4] text-[#1f5b4e]">
            <Sparkles size={15} />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
              AI-Structured Clinical Summary
            </h3>
          </div>
        </div>

        {confidence !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#b8d4c2] bg-[#e7efe5] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#2f644d]">
            <Sparkles size={10} className="text-[#e1b968]" /> {Math.round(confidence * 100)}% confidence
          </span>
        )}
      </div>

      {activeFields.length > 0 ? (
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeFields.map((field) => (
            <div
              key={field.key}
              className="rounded-xl border border-[#e1e7dc] bg-[#fbfdfc] p-3 transition-all hover:border-[#b9cebf]"
            >
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#6d8478]">
                {field.label}
              </span>

              {isEditing ? (
                <input
                  type="text"
                  defaultValue={formatFieldValue(field.value)}
                  onChange={(e) => onFieldChange && onFieldChange(field.key, e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#b8cabe] bg-white px-2 py-1 text-xs text-[#204539] outline-none focus:border-[#1f5b4e]"
                />
              ) : (
                <p className="mt-1 text-xs font-semibold leading-5 text-[#1b3d32]">
                  {formatFieldValue(field.value)}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#ccd7cc] bg-[#f7faf8] p-4 text-center text-xs text-[#6a8477]">
          Additional clinical details were not captured during the current intake.
        </div>
      )}
    </section>
  );
}
