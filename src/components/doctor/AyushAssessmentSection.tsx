import { Leaf, ShieldAlert, Clock } from 'lucide-react';
import { DoshaArcGauge } from '../clinician/ClinicianShared';
import { type AyushData } from './AyushAssessment';

export interface AyushAssessmentSectionProps {
  ayushData?: AyushData;
}

export function AyushAssessmentSection({ ayushData }: AyushAssessmentSectionProps) {
  const hasData = Boolean(ayushData && (ayushData.agni || ayushData.koshtha || ayushData.doshas));

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ece3] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e2ede6] text-[#205e49]">
              <Leaf size={20} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#173e35]">
                AYUSH Clinical Assessment
              </h2>
              <p className="text-xs text-[#688277]">
                Traditional Ayurveda, Siddha & Unani structured intake observations
              </p>
            </div>
          </div>

          <div className="rounded-md border border-[#cbdbd1] bg-[#eef5f0] px-3 py-1 text-xs font-mono font-semibold text-[#1f5b4e]">
            Workflow: AYUSH & Integrative Health
          </div>
        </div>

        {/* Assessment Content or Scalable Empty State */}
        {hasData && ayushData ? (
          <div className="space-y-6">
            {/* Modular Grid: Prakriti, Agni, Koshtha */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-4">
                <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#698478]">
                  Prakriti (Constitutional Type)
                </span>
                <p className="mt-1 text-sm font-semibold text-[#183f33]">
                  {ayushData.prakriti || 'Vata-Pitta Dominant'}
                </p>
              </div>

              <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-4">
                <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#698478]">
                  Agni (Digestive Fire)
                </span>
                <p className="mt-1 text-sm font-semibold text-[#183f33]">
                  {ayushData.agni || 'Manda (Low / Sluggish)'}
                </p>
              </div>

              <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-4">
                <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#698478]">
                  Koshtha (Bowel Habits)
                </span>
                <p className="mt-1 text-sm font-semibold text-[#183f33]">
                  {ayushData.koshtha || 'Krura (Hard / Constipated)'}
                </p>
              </div>
            </div>

            {/* Dosha Distribution */}
            <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-5">
              <div className="flex items-center justify-between border-b border-[#e6ebe2] pb-2 mb-4">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
                  Dosha Balance Analysis
                </span>
                <span className="font-mono text-[10px] text-[#71877c]">
                  Standard Tri-Dosha Proportion
                </span>
              </div>
              <DoshaArcGauge doshas={ayushData.doshas || [67, 15, 18]} />
            </div>

            {/* Additional Observations */}
            <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-4">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#698478] mb-1">
                Ahara & Vihara Observations (Diet & Lifestyle Factors)
              </span>
              <p className="text-xs leading-relaxed text-[#2c4b3f]">
                {ayushData.ahara_vihara ||
                  'Patient reports irregular meal timings, aggravated dry cough during Vata-kala (early morning). Advise warm fluids and avoiding cold foods.'}
              </p>
            </div>
          </div>
        ) : (
          /* Professional and Scalable Empty State */
          <div className="space-y-6">
            <div className="rounded-xl border border-dashed border-[#ccd7cc] bg-[#f8fbf9] p-8 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#e8f2ec] text-[#24634f]">
                <Clock size={24} />
              </div>
              <h3 className="text-base font-semibold text-[#173e35]">
                AYUSH assessment is not yet available for this patient.
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#688277]">
                Assessment data will be generated after the required AYUSH-specific intake questions are completed.
              </p>
            </div>

            {/* Architecture Preview for Future AYUSH Data Sections */}
            <div className="border-t border-[#e5ebe2] pt-5">
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#70897e] mb-3">
                Supported AYUSH Assessment Capabilities
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-lg border border-[#e2e8df] bg-white p-3">
                  <p className="font-bold text-[#1f5b4e]">Prakriti Assessment</p>
                  <p className="text-[11px] text-[#71887d] mt-0.5">Physical & psychological constitution</p>
                </div>
                <div className="rounded-lg border border-[#e2e8df] bg-white p-3">
                  <p className="font-bold text-[#1f5b4e]">Dosha Distribution</p>
                  <p className="text-[11px] text-[#71887d] mt-0.5">Vata, Pitta & Kapha balance metrics</p>
                </div>
                <div className="rounded-lg border border-[#e2e8df] bg-white p-3">
                  <p className="font-bold text-[#1f5b4e]">Agni & Koshtha</p>
                  <p className="text-[11px] text-[#71887d] mt-0.5">Digestive capacity & bowel evaluation</p>
                </div>
                <div className="rounded-lg border border-[#e2e8df] bg-white p-3">
                  <p className="font-bold text-[#1f5b4e]">Dietary & Lifestyle</p>
                  <p className="text-[11px] text-[#71887d] mt-0.5">Ahara & Vihara guidance</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="rounded-xl border border-[#d4ded5] bg-[#f1f6f2] p-4 text-xs text-[#335649] flex items-start gap-2.5">
        <ShieldAlert size={16} className="shrink-0 text-[#1f5b4e] mt-0.5" />
        <div>
          <b>Clinical Safety Notice:</b> AYUSH intake metrics are assistive observations captured during pre-consultation intake. All clinical decisions and formulations require attending physician validation.
        </div>
      </div>
    </div>
  );
}
