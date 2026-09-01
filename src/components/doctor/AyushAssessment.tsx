import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Leaf } from 'lucide-react';
import { DoshaArcGauge } from '../clinician/ClinicianShared';

export interface AyushData {
  prakriti?: string;
  vikriti?: string;
  agni?: string;
  koshtha?: string;
  ahara_vihara?: string;
  doshas?: [number, number, number] | number[];
}

export interface AyushAssessmentProps {
  ayushData?: AyushData;
  defaultOpen?: boolean;
}

export function AyushAssessment({ ayushData, defaultOpen = false }: AyushAssessmentProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || Boolean(ayushData));
  const hasData = Boolean(ayushData && (ayushData.agni || ayushData.koshtha || ayushData.doshas));

  return (
    <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] overflow-hidden shadow-xs">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left transition hover:bg-[#f1efe4] cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#e2ede6] text-[#2d644d]">
            <Leaf size={15} />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
              AYUSH Assessment
            </h3>
            <p className="text-[11px] text-[#71887d]">
              {hasData ? 'Ayurveda Agni, Koshtha & Dosha observations' : 'Traditional clinical assessment'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#1f5b4e]">
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Body */}
      {isOpen && (
        <div className="border-t border-[#e2e7dc] bg-[#fdfdfb] p-5">
          {hasData && ayushData ? (
            <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
              <div className="space-y-3">
                {ayushData.prakriti && (
                  <div className="flex items-center justify-between rounded-xl bg-[#edf2e8] p-3 border border-[#dae3d6] text-xs">
                    <span className="font-medium text-[#688176]">Prakriti</span>
                    <span className="font-semibold text-[#1f5b4e]">{ayushData.prakriti}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl bg-[#edf2e8] p-3 border border-[#dae3d6] text-xs">
                  <span className="font-medium text-[#688176]">Agni (Digestive Fire)</span>
                  <span className="font-semibold text-[#1f5b4e]">
                    {ayushData.agni || 'Sama (Balanced)'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#edf2e8] p-3 border border-[#dae3d6] text-xs">
                  <span className="font-medium text-[#688176]">Koshtha (Bowel Habit)</span>
                  <span className="font-semibold text-[#1f5b4e]">
                    {ayushData.koshtha || 'Madhyam (Regular)'}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-[#71877c] mb-1">
                  <span className="font-medium">Dosha Distribution</span>
                  <span className="font-mono text-[10px]">Ayurveda Intake Metric</span>
                </div>
                <DoshaArcGauge doshas={ayushData.doshas || [33, 33, 34]} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#ccd7cc] bg-[#f7faf8] p-4 text-center text-xs text-[#6a8477]">
              AYUSH assessment has not been completed for this patient.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
