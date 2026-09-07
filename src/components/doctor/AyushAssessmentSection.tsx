import { useState } from 'react';
import {
  Leaf,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Edit3,
  Sparkles,
  User,
  FileText,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
} from 'lucide-react';
import { DoshaArcGauge } from '../clinician/ClinicianShared';
import { type AyushData } from './AyushAssessment';
import {
  type AyushAssessmentData,
  type AyushDimensionData,
  type AyushProvenanceSource,
  type AyushAssessmentStatus,
} from '../../lib/clinicianData';

export interface AyushAssessmentSectionProps {
  ayushAssessment?: AyushAssessmentData;
  ayushData?: AyushData;
  confirmed?: boolean;
  onConfirm?: (edits: Record<string, string>, notes?: string) => Promise<boolean>;
  isSubmitting?: boolean;
  clinicianNotes?: string;
  onSaveNotes?: (notes: string) => void;
}

// Provenance Badge Component
function ProvenanceBadge({ source }: { source?: AyushProvenanceSource | string | null }) {
  switch (source) {
    case 'PHYSICIAN_CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#1b5e43] px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-xs">
          <Stethoscope size={11} /> Physician Confirmed
        </span>
      );
    case 'AI_INFERRED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#b2d3eb] bg-[#eef7fd] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#1a5b8a]">
          <Sparkles size={11} /> AI Inferred (Preliminary)
        </span>
      );
    case 'DOCUMENT':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#d6c7eb] bg-[#f7f2fc] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#5e3594]">
          <FileText size={11} /> Document OCR
        </span>
      );
    case 'SYSTEM_DERIVED':
    case 'DERIVED_FROM_DEMOGRAPHICS':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#cbd5cc] bg-[#f0f4f1] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#3d594b]">
          <Clock size={11} /> Derived from Demographics
        </span>
      );
    case 'PATIENT_STATED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#c4ded2] bg-[#f0f9f4] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#1e614a]">
          <User size={11} /> Patient Stated
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#cbd5cc] bg-[#f5f8f5] px-2 py-0.5 font-mono text-[10px] font-medium text-[#71887d]">
          Unassessed
        </span>
      );
  }
}

// Assessment Status Badge Component
function StatusBadge({ status }: { status: AyushAssessmentStatus }) {
  switch (status) {
    case 'PHYSICIAN_CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#2b7255] bg-[#1d5740] px-3 py-1 font-mono text-xs font-bold text-white shadow-xs">
          <CheckCircle2 size={14} /> Physician Confirmed
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#c2a255] bg-[#fdf9ea] px-3 py-1 font-mono text-xs font-bold text-[#8a6514]">
          <Clock size={14} /> Needs Physician Review
        </span>
      );
    case 'PRELIMINARY':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#d4be77] bg-[#fcf9ed] px-3 py-1 font-mono text-xs font-bold text-[#876a1c]">
          <Clock size={14} /> Preliminary (AI Intake Draft)
        </span>
      );
    case 'INCOMPLETE':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd5cc] bg-[#f5f8f5] px-3 py-1 font-mono text-xs font-semibold text-[#576e60]">
          <Clock size={14} /> Incomplete Intake
        </span>
      );
  }
}

export function AyushAssessmentSection({
  ayushAssessment,
  ayushData,
  confirmed = false,
  onConfirm,
  isSubmitting = false,
  clinicianNotes = '',
  onSaveNotes,
}: AyushAssessmentSectionProps) {
  // Editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<string>('');
  const [pendingEdits, setPendingEdits] = useState<Record<string, string>>({});
  const [notesText, setNotesText] = useState(clinicianNotes);
  const [showUnassessed, setShowUnassessed] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  // Normalize data between AyushAssessmentData and legacy AyushData
  const rawAgni = ayushAssessment?.agni?.value ?? ayushData?.agni;
  const rawKoshtha = ayushAssessment?.koshtha?.value ?? ayushData?.koshtha;
  const rawPrakriti = ayushAssessment?.prakriti?.value ?? ayushData?.prakriti;
  const rawVikriti = ayushAssessment?.vikriti?.value ?? ayushData?.vikriti;
  const rawAharaVihara = ayushAssessment?.ahara_vihara?.value ?? ayushData?.ahara_vihara;
  const doshas = ayushAssessment?.doshas ?? ayushData?.doshas ?? null;

  const overallStatus: AyushAssessmentStatus = confirmed
    ? 'PHYSICIAN_CONFIRMED'
    : (ayushAssessment?.overall_status || 'PRELIMINARY');

  const hasData = Boolean(rawAgni || rawKoshtha || rawPrakriti || rawVikriti || rawAharaVihara || ayushAssessment);

  // Dashavidha fields metadata
  const dashavidhaDefinitions: Array<{
    key: string;
    label: string;
    description: string;
    data?: AyushDimensionData;
  }> = [
    {
      key: 'sara',
      label: 'Sara (Tissue Quality)',
      description: 'Excellence of body tissues (Dhatu Satva)',
      data: ayushAssessment?.sara,
    },
    {
      key: 'samhanana',
      label: 'Samhanana (Compactness)',
      description: 'Skeletal and muscular structural integrity',
      data: ayushAssessment?.samhanana,
    },
    {
      key: 'pramana',
      label: 'Pramana (Proportions)',
      description: 'Anthropometric balance and body measurements',
      data: ayushAssessment?.pramana,
    },
    {
      key: 'satmya',
      label: 'Satmya (Homologation)',
      description: 'Wholesome adaptability to diet & environment',
      data: ayushAssessment?.satmya,
    },
    {
      key: 'sattva',
      label: 'Sattva (Mental Resilience)',
      description: 'Psychological strength & emotional tolerance',
      data: ayushAssessment?.sattva,
    },
    {
      key: 'ahara_shakti',
      label: 'Ahara Shakti (Metabolism)',
      description: 'Digestive intake and assimilation capacity',
      data: ayushAssessment?.ahara_shakti,
    },
    {
      key: 'vyayama_shakti',
      label: 'Vyayama Shakti (Physical Capacity)',
      description: 'Work endurance and exercise tolerance',
      data: ayushAssessment?.vyayama_shakti,
    },
    {
      key: 'vaya',
      label: 'Vaya (Age & Life Stage)',
      description: 'Chronological/biological Ayurvedic life stage (Bala/Madhya/Vriddha)',
      data: ayushAssessment?.vaya,
    },
  ];

  const populatedDashavidha = dashavidhaDefinitions.filter((d) => Boolean(d.data?.value || pendingEdits[d.key]));
  const unassessedDashavidha = dashavidhaDefinitions.filter((d) => !Boolean(d.data?.value || pendingEdits[d.key]));

  const handleStartEdit = (key: string, currentVal: string) => {
    setEditingField(key);
    setFieldValue(pendingEdits[key] || currentVal || '');
  };

  const handleSaveEdit = (key: string) => {
    if (fieldValue.trim()) {
      setPendingEdits((prev) => ({ ...prev, [key]: fieldValue.trim() }));
    }
    setEditingField(null);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setFieldValue('');
  };

  const handleResetEdit = (key: string) => {
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditingField(null);
  };

  const handleConfirmAssessment = async () => {
    if (onConfirm) {
      if (onSaveNotes) onSaveNotes(notesText);
      const ok = await onConfirm(pendingEdits, notesText);
      if (ok) {
        setActionSuccess(true);
        setTimeout(() => setActionSuccess(false), 3000);
      }
    }
  };

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
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl font-bold text-[#173e35]">
                  AYUSH Clinical Assessment
                </h2>
                <span className="rounded-md bg-[#e4ede7] px-2 py-0.5 font-mono text-[10px] font-bold text-[#1a5a46]">
                  {ayushAssessment?.system || 'AYURVEDA'}
                </span>
              </div>
              <p className="text-xs text-[#688277]">
                Traditional Ayurveda structured clinical observations with verified provenance
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={overallStatus} />
          </div>
        </div>

        {/* Assessment Content */}
        {hasData ? (
          <div className="space-y-6">
            {/* Core Baseline Grid: Prakriti, Vikriti, Agni, Koshtha */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
                  Core Constitutional & Digestive Parameters
                </h3>
                <span className="text-[11px] text-[#71887d]">
                  Click Edit to adjust or verify any finding
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Prakriti */}
                <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#698478]">
                        Prakriti (Constitution)
                      </span>
                      <ProvenanceBadge
                        source={pendingEdits['prakriti'] ? 'PHYSICIAN_CONFIRMED' : (rawPrakriti ? ayushAssessment?.prakriti?.source : undefined)}
                      />
                    </div>
                    {editingField === 'prakriti' ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={fieldValue}
                          onChange={(e) => setFieldValue(e.target.value)}
                          placeholder="e.g. Vata-Pitta, Pitta-Kapha"
                          className="w-full rounded border border-[#cbdbd1] bg-white px-2.5 py-1 text-xs text-[#183f33] focus:outline-hidden focus:ring-1 focus:ring-[#1f5b4e]"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit('prakriti')}
                            className="inline-flex items-center gap-1 rounded bg-[#1f5b4e] px-2 py-0.5 text-[11px] font-semibold text-white"
                          >
                            <Save size={11} /> Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`mt-2 text-sm font-semibold ${pendingEdits['prakriti'] || rawPrakriti ? 'text-[#183f33]' : 'italic text-[#789387]'}`}>
                        {pendingEdits['prakriti'] || rawPrakriti || 'Not assessed'}
                        {pendingEdits['prakriti'] && (
                          <span className="ml-1 text-[10px] font-normal italic text-[#1f5b4e]">(edited)</span>
                        )}
                      </p>
                    )}
                  </div>
                  {editingField !== 'prakriti' && (
                    <div className="mt-3 flex items-center justify-between border-t border-[#edf2ea] pt-2 text-[11px]">
                      <span className="text-[#789387]">
                        {pendingEdits['prakriti'] || rawPrakriti
                          ? (ayushAssessment?.prakriti?.confidence
                              ? `Conf: ${Math.round(ayushAssessment.prakriti.confidence * 100)}%`
                              : 'Baseline observation')
                          : 'Pending clinical examination'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit('prakriti', String(pendingEdits['prakriti'] || rawPrakriti || ''))}
                        className="inline-flex items-center gap-1 font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Vikriti */}
                <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#698478]">
                        Vikriti (Imbalance)
                      </span>
                      <ProvenanceBadge
                        source={pendingEdits['vikriti'] ? 'PHYSICIAN_CONFIRMED' : (rawVikriti ? ayushAssessment?.vikriti?.source : undefined)}
                      />
                    </div>
                    {editingField === 'vikriti' ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={fieldValue}
                          onChange={(e) => setFieldValue(e.target.value)}
                          placeholder="e.g. Vata-Pitta Vriddhi"
                          className="w-full rounded border border-[#cbdbd1] bg-white px-2.5 py-1 text-xs text-[#183f33] focus:outline-hidden focus:ring-1 focus:ring-[#1f5b4e]"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit('vikriti')}
                            className="inline-flex items-center gap-1 rounded bg-[#1f5b4e] px-2 py-0.5 text-[11px] font-semibold text-white"
                          >
                            <Save size={11} /> Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`mt-2 text-sm font-semibold ${pendingEdits['vikriti'] || rawVikriti ? 'text-[#183f33]' : 'italic text-[#789387]'}`}>
                        {pendingEdits['vikriti'] || rawVikriti || 'Not assessed'}
                        {pendingEdits['vikriti'] && (
                          <span className="ml-1 text-[10px] font-normal italic text-[#1f5b4e]">(edited)</span>
                        )}
                      </p>
                    )}
                  </div>
                  {editingField !== 'vikriti' && (
                    <div className="mt-3 flex items-center justify-between border-t border-[#edf2ea] pt-2 text-[11px]">
                      <span className="text-[#789387]">
                        {pendingEdits['vikriti'] || rawVikriti
                          ? 'Active pathological state'
                          : 'Pending clinical examination'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit('vikriti', String(pendingEdits['vikriti'] || rawVikriti || ''))}
                        className="inline-flex items-center gap-1 font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Agni */}
                <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#698478]">
                        Agni (Digestive Fire)
                      </span>
                      <ProvenanceBadge
                        source={pendingEdits['agni'] ? 'PHYSICIAN_CONFIRMED' : (rawAgni ? ayushAssessment?.agni?.source : undefined)}
                      />
                    </div>
                    {editingField === 'agni' ? (
                      <div className="mt-2 space-y-2">
                        <select
                          value={fieldValue}
                          onChange={(e) => setFieldValue(e.target.value)}
                          className="w-full rounded border border-[#cbdbd1] bg-white px-2 py-1 text-xs text-[#183f33] focus:outline-hidden focus:ring-1 focus:ring-[#1f5b4e]"
                        >
                          <option value="Samagni (Balanced / Normal)">Samagni (Balanced / Normal)</option>
                          <option value="Mandagni (Low / Sluggish)">Mandagni (Low / Sluggish)</option>
                          <option value="Tikshnagni (Sharp / Hyperactive)">Tikshnagni (Sharp / Hyperactive)</option>
                          <option value="Vishamagni (Irregular / Fluctuating)">Vishamagni (Irregular / Fluctuating)</option>
                        </select>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit('agni')}
                            className="inline-flex items-center gap-1 rounded bg-[#1f5b4e] px-2 py-0.5 text-[11px] font-semibold text-white"
                          >
                            <Save size={11} /> Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`mt-2 text-sm font-semibold ${pendingEdits['agni'] || rawAgni ? 'text-[#183f33]' : 'italic text-[#789387]'}`}>
                        {pendingEdits['agni'] || rawAgni || 'Not assessed'}
                        {pendingEdits['agni'] && (
                          <span className="ml-1 text-[10px] font-normal italic text-[#1f5b4e]">(edited)</span>
                        )}
                      </p>
                    )}
                  </div>
                  {editingField !== 'agni' && (
                    <div className="mt-3 flex items-center justify-between border-t border-[#edf2ea] pt-2 text-[11px]">
                      <span className="text-[#789387]">
                        {pendingEdits['agni'] || rawAgni
                          ? 'Digestive capacity'
                          : 'Pending clinical examination'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit('agni', String(pendingEdits['agni'] || rawAgni || ''))}
                        className="inline-flex items-center gap-1 font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Koshtha */}
                <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#698478]">
                        Koshtha (Bowel Habit)
                      </span>
                      <ProvenanceBadge
                        source={pendingEdits['koshtha'] ? 'PHYSICIAN_CONFIRMED' : (rawKoshtha ? ayushAssessment?.koshtha?.source : undefined)}
                      />
                    </div>
                    {editingField === 'koshtha' ? (
                      <div className="mt-2 space-y-2">
                        <select
                          value={fieldValue}
                          onChange={(e) => setFieldValue(e.target.value)}
                          className="w-full rounded border border-[#cbdbd1] bg-white px-2 py-1 text-xs text-[#183f33] focus:outline-hidden focus:ring-1 focus:ring-[#1f5b4e]"
                        >
                          <option value="Madhyam (Regular / Balanced)">Madhyam (Regular / Balanced)</option>
                          <option value="Krura (Hard / Constipated)">Krura (Hard / Constipated)</option>
                          <option value="Mridu (Soft / Loose)">Mridu (Soft / Loose)</option>
                        </select>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit('koshtha')}
                            className="inline-flex items-center gap-1 rounded bg-[#1f5b4e] px-2 py-0.5 text-[11px] font-semibold text-white"
                          >
                            <Save size={11} /> Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`mt-2 text-sm font-semibold ${pendingEdits['koshtha'] || rawKoshtha ? 'text-[#183f33]' : 'italic text-[#789387]'}`}>
                        {pendingEdits['koshtha'] || rawKoshtha || 'Not assessed'}
                        {pendingEdits['koshtha'] && (
                          <span className="ml-1 text-[10px] font-normal italic text-[#1f5b4e]">(edited)</span>
                        )}
                      </p>
                    )}
                  </div>
                  {editingField !== 'koshtha' && (
                    <div className="mt-3 flex items-center justify-between border-t border-[#edf2ea] pt-2 text-[11px]">
                      <span className="text-[#789387]">
                        {pendingEdits['koshtha'] || rawKoshtha
                          ? 'Bowel evacuation'
                          : 'Pending clinical examination'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit('koshtha', String(pendingEdits['koshtha'] || rawKoshtha || ''))}
                        className="inline-flex items-center gap-1 font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dosha Distribution & Ahara-Vihara Row */}
            <div className="grid gap-4 md:grid-cols-[1.2fr_1.8fr]">
              {/* Dosha Balance Arc Gauge */}
              <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-5">
                <div className="flex items-center justify-between border-b border-[#e6ebe2] pb-2 mb-4">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
                    Dosha Balance Analysis
                  </span>
                  <span className="font-mono text-[10px] text-[#71877c]">
                    Tri-Dosha Ratio
                  </span>
                </div>
                <DoshaArcGauge doshas={doshas} />
              </div>

              {/* Ahara & Vihara Observations */}
              <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#e6ebe2] pb-2 mb-3">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
                      Ahara & Vihara Observations
                    </span>
                    <ProvenanceBadge
                      source={pendingEdits['ahara_vihara'] ? 'PHYSICIAN_CONFIRMED' : (rawAharaVihara ? ayushAssessment?.ahara_vihara?.source : undefined)}
                    />
                  </div>
                  {editingField === 'ahara_vihara' ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        className="w-full rounded border border-[#cbdbd1] bg-white p-2 text-xs text-[#183f33] focus:outline-hidden focus:ring-1 focus:ring-[#1f5b4e]"
                        placeholder="Enter lifestyle and dietary observations..."
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit('ahara_vihara')}
                          className="inline-flex items-center gap-1 rounded bg-[#1f5b4e] px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          <Save size={12} /> Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="rounded bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-xs leading-relaxed ${pendingEdits['ahara_vihara'] || rawAharaVihara ? 'text-[#2c4b3f]' : 'italic text-[#789387]'}`}>
                      {pendingEdits['ahara_vihara'] ||
                        rawAharaVihara ||
                        'Not recorded during clinical intake.'}
                    </p>
                  )}
                </div>
                {editingField !== 'ahara_vihara' && (
                  <div className="mt-3 flex justify-end border-t border-[#edf2ea] pt-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit('ahara_vihara', String(pendingEdits['ahara_vihara'] || rawAharaVihara || ''))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                    >
                      <Edit3 size={12} /> Edit Ahara & Vihara
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Expanded Dashavidha Pariksha Dimensions */}
            <div className="rounded-xl border border-[#dce5d9] bg-[#fbfdfc] p-5">
              <div className="flex items-center justify-between border-b border-[#e6ebe2] pb-3 mb-4">
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
                    Dashavidha Pariksha (10-Fold Clinical Examination)
                  </h3>
                  <p className="text-[11px] text-[#71887d]">
                    Adaptive Ayurvedic parameters captured based on patient presentation
                  </p>
                </div>
                <span className="rounded-full bg-[#e8f2ec] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#1e5d48]">
                  {populatedDashavidha.length} / {dashavidhaDefinitions.length} Evaluated
                </span>
              </div>

              {populatedDashavidha.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {populatedDashavidha.map((dim) => {
                    const currentVal = pendingEdits[dim.key] || dim.data?.value || '';
                    const isEditing = editingField === dim.key;
                    return (
                      <div
                        key={dim.key}
                        className="rounded-lg border border-[#e2e8df] bg-white p-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#698478]">
                              {dim.label}
                            </span>
                            <ProvenanceBadge
                              source={pendingEdits[dim.key] ? 'PHYSICIAN_CONFIRMED' : dim.data?.source}
                            />
                          </div>
                          {isEditing ? (
                            <div className="mt-1 space-y-1.5">
                              <input
                                type="text"
                                value={fieldValue}
                                onChange={(e) => setFieldValue(e.target.value)}
                                className="w-full rounded border border-[#cbdbd1] bg-white px-2 py-1 text-xs text-[#183f33] focus:outline-hidden focus:ring-1 focus:ring-[#1f5b4e]"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(dim.key)}
                                  className="rounded bg-[#1f5b4e] px-2 py-0.5 text-[10px] font-semibold text-white"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-semibold text-[#183f33] mt-1">
                                {String(currentVal)}
                                {pendingEdits[dim.key] && (
                                  <span className="ml-1 text-[10px] font-normal italic text-[#1f5b4e]">(edited)</span>
                                )}
                              </p>
                              <p className="text-[10px] text-[#71887d] mt-0.5 line-clamp-1">{dim.description}</p>
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="mt-2 flex items-center justify-between border-t border-[#f0f4ee] pt-1.5 text-[10px]">
                            <span className="text-[#789387]">
                              {dim.data?.source === 'SYSTEM_DERIVED'
                                ? 'Derived'
                                : dim.data?.confidence
                                ? `Conf: ${Math.round(dim.data.confidence * 100)}%`
                                : 'Stated'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(dim.key, String(currentVal))}
                              className="font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#ccd7cc] bg-[#f9fbf9] p-4 text-center text-xs text-[#6a8477]">
                  No Dashavidha parameters were activated during intake. You can assess them below.
                </div>
              )}

              {/* Unassessed Dashavidha Parameters Toggle */}
              {unassessedDashavidha.length > 0 && (
                <div className="mt-4 border-t border-[#edf2ea] pt-3">
                  <button
                    type="button"
                    onClick={() => setShowUnassessed(!showUnassessed)}
                    className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#356853] hover:underline cursor-pointer"
                  >
                    <span>{showUnassessed ? 'Hide' : 'Show'} Unassessed Dimensions ({unassessedDashavidha.length})</span>
                    {showUnassessed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showUnassessed && (
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      {unassessedDashavidha.map((dim) => {
                        const isEditing = editingField === dim.key;
                        return (
                          <div
                            key={dim.key}
                            className="rounded-lg border border-dashed border-[#ccd7cc] bg-[#f9fbf9] p-3 text-xs"
                          >
                            <p className="font-mono text-[10px] font-bold uppercase text-[#728b7e]">{dim.label}</p>
                            <p className="text-[10px] text-[#71887d] mt-0.5">{dim.description}</p>
                            {isEditing ? (
                              <div className="mt-2 space-y-1.5">
                                <input
                                  type="text"
                                  value={fieldValue}
                                  onChange={(e) => setFieldValue(e.target.value)}
                                  placeholder="Enter finding..."
                                  className="w-full rounded border border-[#cbdbd1] bg-white px-2 py-1 text-xs text-[#183f33]"
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(dim.key)}
                                    className="rounded bg-[#1f5b4e] px-2 py-0.5 text-[10px] font-semibold text-white"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 flex items-center justify-between border-t border-[#e8eee7] pt-1.5">
                                <span className="font-mono text-[10px] text-[#8ea599]">Not assessed</span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(dim.key, '')}
                                  className="text-[10px] font-bold text-[#1f5b4e] hover:underline cursor-pointer"
                                >
                                  + Add Finding
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Physician Review & Confirmation Card */}
            <div className="rounded-xl border border-[#cbdbd1] bg-[#eef5f0] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dae6de] pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="text-[#1f5b4e]" size={18} />
                  <h3 className="font-serif text-lg font-bold text-[#173e35]">
                    Physician Review & Clinical Sign-Off
                  </h3>
                </div>
                {Object.keys(pendingEdits).length > 0 && (
                  <span className="rounded-md bg-[#d8ebdf] px-2.5 py-0.5 font-mono text-xs font-bold text-[#16513e]">
                    {Object.keys(pendingEdits).length} pending edit(s)
                  </span>
                )}
              </div>

              <div>
                <label className="block font-mono text-xs font-bold text-[#355648] mb-1">
                  Physician Consultation Notes & Treatment Plan:
                </label>
                <textarea
                  rows={3}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  disabled={confirmed}
                  placeholder="Record Ayurvedic clinical assessment, Chikitsa formulation notes, Pathya-Apathya dietary advice..."
                  className="w-full rounded-lg border border-[#cbdbd1] bg-white p-3 text-xs text-[#183f33] placeholder:text-[#8aa095] focus:outline-hidden focus:ring-1 focus:ring-[#1f5b4e] disabled:bg-[#f5f8f5]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-[#486b5c]">
                  {confirmed ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#1b5e43]">
                      <CheckCircle2 size={16} /> Clinical history confirmed by physician. NRCES India FHIR R4 Bundle generated.
                    </span>
                  ) : (
                    <span>
                      Review and modify preliminary intake findings above, then confirm.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {Object.keys(pendingEdits).length > 0 && !confirmed && (
                    <button
                      type="button"
                      onClick={() => setPendingEdits({})}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#cbd5cc] bg-white px-3 py-2 text-xs font-semibold text-[#5a7466] hover:bg-gray-50"
                    >
                      <RotateCcw size={13} /> Reset Edits
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirmAssessment}
                    disabled={isSubmitting || confirmed}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1f5b4e] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#18493e] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    <CheckCircle2 size={15} />
                    {confirmed
                      ? 'Assessment Confirmed'
                      : isSubmitting
                      ? 'Confirming...'
                      : 'Confirm Clinical Assessment'}
                  </button>
                </div>
              </div>

              {actionSuccess && (
                <div className="rounded-lg bg-[#d9eee1] p-3 text-xs font-bold text-[#17523f] flex items-center gap-2">
                  <CheckCircle2 size={16} /> AYUSH assessment successfully confirmed and synced with medical record.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Scalable Empty State */
          <div className="rounded-xl border border-dashed border-[#ccd7cc] bg-[#f8fbf9] p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#e8f2ec] text-[#24634f]">
              <Clock size={24} />
            </div>
            <h3 className="text-base font-semibold text-[#173e35]">
              AYUSH assessment is not yet available for this patient.
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#688277]">
              Assessment data will be populated once the patient intake questions are submitted.
            </p>
          </div>
        )}
      </div>

      {/* Clinical Safety Notice */}
      <div className="rounded-xl border border-[#d4ded5] bg-[#f1f6f2] p-4 text-xs text-[#335649] flex items-start gap-2.5">
        <ShieldAlert size={16} className="shrink-0 text-[#1f5b4e] mt-0.5" />
        <div>
          <b>Clinical Safety Notice:</b> AYUSH intake parameters are assistive pre-consultation observations. Prakriti, Vikriti, and Dosha balances are preliminary until verified by the attending clinician. All diagnosis and Chikitsa prescriptions remain the sole authority of the licensed physician.
        </div>
      </div>
    </div>
  );
}
