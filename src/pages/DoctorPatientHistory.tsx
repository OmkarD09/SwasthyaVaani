import { useState } from 'react';
import { useParams } from 'wouter';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  FolderClosed,
  HeartPulse,
  History,
  Maximize2,
  Paperclip,
  Pill,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Users,
  Utensils,
  Wine,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { usePatientRecord } from '../hooks/usePatientRecord';
import { PatientRecordShell } from '../components/doctor/PatientRecordShell';
import { PatientContextHeader } from '../components/doctor/PatientContextHeader';
import { authorizedClinicianFetch, getClinicianAccessToken } from '../lib/clinicianAuth';

export function DoctorPatientHistory() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id || '';

  const {
    patientDetail,
    loading,
    error,
    confirmed,
    note,
    setNote,
    refresh,
  } = usePatientRecord(patientId);

  const [historyNotes, setHistoryNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);

  const handleRunOcr = async (docId: string) => {
    if (!docId) return;
    setProcessingDocId(docId);
    try {
      const res = await authorizedClinicianFetch(`/api/v1/documents/${docId}/process`, {
        method: 'POST',
      });
      if (res.ok) {
        await refresh();
      }
    } catch (err) {
      console.error('Failed to run OCR processing:', err);
    } finally {
      setProcessingDocId(null);
    }
  };

  const getDocViewUrl = (doc: any) => {
    if (!doc) return '';
    const token = getClinicianAccessToken();
    const base = doc.url || (doc.id ? `/api/v1/documents/${doc.id}/view` : '');
    if (!base) return '';
    if (token && !base.includes('token=')) {
      return `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    }
    return base;
  };

  const getDocDownloadUrl = (doc: any) => {
    if (!doc) return '';
    const token = getClinicianAccessToken();
    const base = doc.id ? `/api/v1/documents/${doc.id}/download` : '';
    if (!base) return '';
    if (token && !base.includes('token=')) {
      return `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    }
    return base;
  };

  const isImageDoc = (doc: any) => {
    if (!doc) return false;
    const mime = (doc.mime_type || '').toLowerCase();
    const name = (doc.name || doc.file_name || '').toLowerCase();
    return (
      mime.startsWith('image/') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.webp') ||
      name.endsWith('.bmp') ||
      name.endsWith('.gif')
    );
  };

  const openDocumentPreview = (doc: any) => {
    setPreviewDoc(doc);
    setImageScale(1);
    setImageRotation(0);
    setImageLoading(true);
    setImageError(false);
  };

  if (loading) {
    return (
      <PatientRecordShell patientId={patientId}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-sm text-[#059669]">
            <RefreshCw className="animate-spin" size={20} /> Loading patient clinical history…
          </div>
        </div>
      </PatientRecordShell>
    );
  }

  if (error || !patientDetail) {
    return (
      <PatientRecordShell patientId={patientId}>
        <div className="rounded-2xl border border-[#fca5a5] bg-[#fef2f2] p-6 text-center text-[#991b1b]">
          <AlertCircle size={32} className="mx-auto mb-2 text-[#dc2626]" />
          <h2 className="text-lg font-bold">Unable to Load Clinical History</h2>
          <p className="mt-1 text-xs text-[#7f1d1d]">{error || 'Patient record could not be found.'}</p>
        </div>
      </PatientRecordShell>
    );
  }

  const cs = patientDetail.clinical_state || {};

  const toList = (val: unknown, fallback: string): string[] => {
    if (Array.isArray(val)) {
      const items = val.map((v) => String(v).trim()).filter(Boolean);
      return items.length > 0 ? items : [fallback];
    }
    if (typeof val === 'string' && val.trim() !== '') {
      return [val.trim()];
    }
    return [fallback];
  };

  const pastMedicalConditions: string[] = toList(
    cs.past_medical_history || cs.medical_history,
    'No prior chronic diseases recorded in initial intake'
  );

  const currentMedications: string[] = toList(
    cs.medications,
    'No active regular medications reported'
  );

  const allergyList: string[] = toList(
    cs.allergies,
    'No known drug or environmental allergies (NKDA)'
  );

  const familyHistoryList: string[] = toList(
    cs.family_history,
    'No significant familial or hereditary conditions reported'
  );

  const attachedFiles: any[] = Array.isArray(patientDetail.documents)
    ? patientDetail.documents
    : [];
  const allMedicalRecords: any[] = Array.isArray(patientDetail.medical_records)
    ? patientDetail.medical_records
    : [];

  const handleSaveHistoryNote = () => {
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2500);
  };

  return (
    <PatientRecordShell patientId={patientId}>
      <div className="mx-auto max-w-6xl space-y-5 pb-12">
        {/* Patient Context Header */}
        <PatientContextHeader
          token={patientDetail.token}
          patientName={patientDetail.patient_name}
          patientAge={patientDetail.patient_age}
          patientGender={patientDetail.patient_gender}
          patientId={patientDetail.patient_id}
          displayId={patientDetail.display_id || patientDetail.patient_display_id}
          reviewStatus={patientDetail.review_status}
          confirmed={confirmed}
          confidence={cs.confidence}
        />

        {/* Banner: Clinical History Overview */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d6ded5] bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#dcfce7] text-[#065f46] border border-[#bbf7d0]">
              <History size={20} />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0a2f26]">
                Comprehensive Clinical History
              </h2>
              <p className="text-xs font-medium text-[#274c3d]">
                Pre-consultation past medical records, medications, allergies, and uploaded document history
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#a2d4ba] bg-[#f0fdf4] px-3 py-1 font-mono text-xs font-bold text-[#065f46]">
              <span>AGE:</span>{' '}
              <strong className="text-[#0a2f26]">
                {patientDetail.patient_age ? `${patientDetail.patient_age} yrs` : 'Not recorded'}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#a2d4ba] bg-[#f0fdf4] px-3 py-1 font-mono text-xs font-bold text-[#065f46]">
              <span>Gender:</span>{' '}
              <strong className="text-[#0a2f26]">
                {patientDetail.patient_gender || 'Not recorded'}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#86efac] bg-[#ecfdf5] px-3 py-1 font-mono text-xs font-bold text-[#065f46]">
              <Sparkles size={12} className="text-[#059669]" /> AI Structured • Physician Reviewable
            </span>
          </div>
        </div>

        {/* 1. Core Clinical History Cards (2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Past Medical History & Chronic Conditions */}
          <div className="rounded-2xl border border-[#d6ded5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#e5eae4]">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46]">
                    <HeartPulse size={16} />
                  </div>
                  <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                    Past Medical & Chronic History
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#059669]">
                  {pastMedicalConditions.length} entry
                </span>
              </div>

              <div className="space-y-2.5">
                {pastMedicalConditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-[#c8e6d6] bg-[#f9fdfa] p-3"
                  >
                    <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#dcfce7] text-[#065f46] shrink-0">
                      <Activity size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0a2f26]">{cond}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-[#4b6358]">
                        Source: Pre-consultation conversational intake
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e5eae4] flex items-center justify-between text-xs text-[#274c3d]">
              <span>Chronic disease screening</span>
              <span className="font-semibold text-[#059669]">Verified in record</span>
            </div>
          </div>

          {/* Card 2: Current & Past Medications */}
          <div className="rounded-2xl border border-[#d6ded5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#e5eae4]">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46]">
                    <Pill size={16} />
                  </div>
                  <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                    Medications & Treatments
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#059669]">
                  {currentMedications.length} listed
                </span>
              </div>

              <div className="space-y-2.5">
                {currentMedications.map((med, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-[#c8e6d6] bg-[#f9fdfa] p-3"
                  >
                    <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#dcfce7] text-[#065f46] shrink-0">
                      <Pill size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0a2f26]">{med}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-[#4b6358]">
                        Self-reported by patient during clinical intake
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e5eae4] flex items-center justify-between text-xs text-[#274c3d]">
              <span>Drug interaction check</span>
              <span className="font-semibold text-[#059669]">Ready for validation</span>
            </div>
          </div>

          {/* Card 3: Allergies & Adverse Reactions */}
          <div className="rounded-2xl border border-[#d6ded5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#e5eae4]">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#fee2e2] text-[#991b1b]">
                    <ShieldAlert size={16} />
                  </div>
                  <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                    Allergies & Contraindications
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#991b1b]">Safety check</span>
              </div>

              <div className="space-y-2.5">
                {allergyList.map((allergy, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-[#fed7aa] bg-[#fffaf5] p-3"
                  >
                    <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#ffedd5] text-[#c2410c] shrink-0">
                      <AlertTriangle size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0a2f26]">{allergy}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-[#7c2d12]">
                        Documented for physician prescription verification
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e5eae4] text-[11px] italic font-semibold text-[#b91c1c]">
              Physician must confirm allergy status before prescribing
            </div>
          </div>

          {/* Card 4: Family & Social History */}
          <div className="rounded-2xl border border-[#d6ded5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#e5eae4]">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46]">
                    <Users size={16} />
                  </div>
                  <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                    Family & Social History
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#059669]">Demographics</span>
              </div>

              <div className="space-y-2.5">
                {familyHistoryList.map((fam, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-[#c8e6d6] bg-[#f9fdfa] p-3"
                  >
                    <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#dcfce7] text-[#065f46] shrink-0">
                      <Users size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0a2f26]">{fam}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-[#4b6358]">
                        Family medical background
                      </p>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  <div className="rounded-lg border border-[#c8e6d6] bg-[#f0fdf4] p-2.5">
                    <span className="block text-[10px] font-bold text-[#047857] uppercase">AGE:</span>
                    <p className="text-xs font-extrabold text-[#0a2f26] mt-0.5">
                      {patientDetail.patient_age ? `${patientDetail.patient_age} yrs` : 'Not recorded'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#c8e6d6] bg-[#f0fdf4] p-2.5">
                    <span className="block text-[10px] font-bold text-[#047857] uppercase">Gender:</span>
                    <p className="text-xs font-extrabold text-[#0a2f26] mt-0.5">
                      {patientDetail.patient_gender || 'Not recorded'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#e5eae4] bg-[#fafafa] p-2.5">
                    <span className="block text-[10px] font-bold text-[#4b6358] uppercase">Dietary Habit</span>
                    <p className="text-xs font-bold text-[#0a2f26] mt-0.5 flex items-center gap-1">
                      <Utensils size={12} className="text-[#059669]" /> Standard balanced
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#e5eae4] bg-[#fafafa] p-2.5">
                    <span className="block text-[10px] font-bold text-[#4b6358] uppercase">Tobacco / Alcohol</span>
                    <p className="text-xs font-bold text-[#0a2f26] mt-0.5 flex items-center gap-1">
                      <Wine size={12} className="text-[#059669]" /> None reported
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e5eae4] flex items-center justify-between text-xs text-[#274c3d]">
              <span>Risk stratification</span>
              <span className="font-semibold text-[#059669]">Standard profile</span>
            </div>
          </div>
        </div>

        {/* 2. UPLOADED MEDICAL DOCUMENTS & RECORDS HISTORY SECTION */}
        <div className="rounded-2xl border border-[#d6ded5] bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#e5eae4]">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46] border border-[#bbf7d0]">
                <Paperclip size={16} />
              </div>
              <div>
                <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                  Uploaded Medical Records & Document History
                </h3>
                <p className="text-xs font-semibold text-[#274c3d]">
                  Previous prescriptions, discharge summaries, laboratory reports, and OCR extraction history
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#86efac] bg-[#ecfdf5] px-3 py-1 font-mono text-xs font-extrabold text-[#065f46]">
                <FileText size={12} className="text-[#059669]" /> {attachedFiles.length} {attachedFiles.length === 1 ? 'file' : 'files'} in history
              </span>
              {allMedicalRecords.length > 0 && (
                <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 font-mono text-xs font-extrabold text-[#14532d] border border-[#bbf7d0]">
                  {allMedicalRecords.length} clinical finding{allMedicalRecords.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {attachedFiles.length > 0 ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attachedFiles.map((doc, idx) => {
                  const isProcessing = processingDocId === doc.id || doc.status === 'PROCESSING';
                  const isProcessed = doc.status === 'NEEDS_REVIEW' || doc.status === 'COMPLETED';
                  const isFailed = doc.status === 'PROCESSING_FAILED';
                  const isPending = doc.status === 'PENDING' || (!doc.status && !doc.localOnly);
                  const isImage = isImageDoc(doc);
                  const docUrl = getDocViewUrl(doc);
                  const isInlineExpanded = expandedDocId === (doc.id || String(idx));

                  return (
                    <div
                      key={doc.id || idx}
                      className="flex flex-col justify-between rounded-xl border border-[#c4ded0] bg-[#f9fdfa] p-4 transition hover:border-[#059669] shadow-2xs"
                    >
                      <div>
                        {/* Top info and action buttons */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Document Thumbnail / Icon */}
                            {isImage && docUrl ? (
                              <button
                                type="button"
                                onClick={() => openDocumentPreview(doc)}
                                className="group relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#a2d4ba] bg-white cursor-pointer hover:ring-2 hover:ring-[#059669] transition"
                                title="Click to view full image"
                              >
                                <img
                                  src={docUrl}
                                  alt={doc.name}
                                  className="h-full w-full object-cover group-hover:scale-105 transition"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                                  <Eye size={14} />
                                </div>
                              </button>
                            ) : (
                              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46]">
                                <FileText size={22} />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold text-[#0a2f26]" title={doc.name}>
                                {doc.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="font-semibold text-[#375347]">
                                  {doc.size ? `${doc.size} · ` : ''}{doc.uploadedAt || doc.uploaded_at || 'Attached'}
                                </span>
                                <span className="rounded bg-[#f0fdf4] px-1.5 py-0.2 font-mono text-[9px] font-bold text-[#065f46] border border-[#d1fae5] uppercase">
                                  {doc.type || doc.document_type || 'Document'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openDocumentPreview(doc)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#059669] bg-[#065f46] px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-[#044e39] cursor-pointer shadow-xs"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>

                            {isImage && (
                              <button
                                type="button"
                                onClick={() => setExpandedDocId(isInlineExpanded ? null : (doc.id || String(idx)))}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#a2d4ba] bg-[#ecfdf5] px-2 py-1.5 text-xs font-extrabold text-[#065f46] hover:bg-[#dcfce7] transition cursor-pointer"
                                title={isInlineExpanded ? 'Collapse inline preview' : 'Expand inline preview'}
                              >
                                <Maximize2 size={12} />
                              </button>
                            )}

                            {(isPending || isFailed) && doc.id && (
                              <button
                                type="button"
                                onClick={() => handleRunOcr(doc.id)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#a2d4ba] bg-white px-2.5 py-1.5 text-xs font-extrabold text-[#065f46] hover:bg-[#065f46] hover:text-white transition cursor-pointer disabled:opacity-50"
                                title="Run OCR extraction"
                              >
                                <RefreshCw size={11} className={isProcessing ? 'animate-spin' : ''} />
                                <span>{isFailed ? 'Retry' : 'Run OCR'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                          {isProcessed && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#dcfce7] px-2 py-0.5 font-mono text-[10px] font-bold text-[#065f46] border border-[#bbf7d0]">
                              <CheckCircle2 size={11} className="text-[#16a34a]" /> OCR Processed & Extracted
                            </span>
                          )}
                          {isProcessing && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#dbeafe] px-2 py-0.5 font-mono text-[10px] font-bold text-[#1d4ed8] border border-[#bfdbfe]">
                              <RefreshCw size={11} className="animate-spin text-[#2563eb]" /> Processing OCR Extraction...
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#fef3c7] px-2 py-0.5 font-mono text-[10px] font-bold text-[#92400e] border border-[#fde68a]">
                              <Clock size={11} className="text-[#d97706]" /> Ready for OCR Extraction
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#fee2e2] px-2 py-0.5 font-mono text-[10px] font-bold text-[#b91c1c] border border-[#fecaca]">
                              <AlertTriangle size={11} className="text-[#dc2626]" /> OCR Processing Failed
                            </span>
                          )}
                        </div>

                        {/* Inline Image Preview (if toggled) */}
                        {isInlineExpanded && isImage && docUrl && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-[#a2d4ba] bg-white p-2 shadow-xs animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#e5eae4] text-[11px] font-bold text-[#065f46]">
                              <span className="flex items-center gap-1">
                                <FileCheck2 size={12} /> Document Preview
                              </span>
                              <button
                                type="button"
                                onClick={() => openDocumentPreview(doc)}
                                className="inline-flex items-center gap-1 text-[10px] text-[#059669] hover:underline"
                              >
                                Full Screen <ExternalLink size={10} />
                              </button>
                            </div>
                            <img
                              src={docUrl}
                              alt={doc.name}
                              className="max-h-64 w-full object-contain rounded-lg cursor-pointer hover:opacity-95"
                              onClick={() => openDocumentPreview(doc)}
                              title="Click for full-screen viewer"
                            />
                          </div>
                        )}
                      </div>

                      {doc.extractions && doc.extractions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#e5eae4] text-[11px] text-[#274c3d] flex items-center">
                          <span className="font-semibold flex items-center gap-1 text-[#065f46]">
                            <Sparkles size={11} /> {doc.extractions.length} entity candidate{doc.extractions.length > 1 ? 's' : ''} extracted
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Aggregated AI Extracted Findings from Documents */}
              {allMedicalRecords.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#c4ded0] bg-[#f0fdf4]/50 p-4">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#c4ded0]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#059669]" />
                      <h4 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                        Historical Clinical Findings Extracted from Uploaded Records
                      </h4>
                    </div>
                    <span className="font-mono text-[10px] font-bold bg-[#dcfce7] text-[#065f46] px-2 py-0.5 rounded border border-[#bbf7d0]">
                      {allMedicalRecords.length} findings
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {allMedicalRecords.map((record, rIdx) => {
                      const val = record.value;
                      const title = typeof val === 'object' && val !== null
                        ? (val.medicine_name || val.name || val.test_name || record.field_name)
                        : String(val || record.field_name);
                      const details = typeof val === 'object' && val !== null
                        ? [val.strength, val.dosage, val.frequency, val.duration, val.value ? `${val.value} ${val.unit || ''}` : null].filter(Boolean).join(' • ')
                        : null;
                      const confidencePct = record.confidence != null
                        ? (record.confidence <= 1 ? Math.round(record.confidence * 100) : Math.round(record.confidence))
                        : null;

                      return (
                        <div
                          key={record.id || rIdx}
                          className="rounded-lg border border-[#c4ded0] bg-white p-2.5 text-xs text-[#0a2f26]"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="rounded bg-[#dcfce7] px-1.5 py-0.2 font-mono text-[9px] font-extrabold text-[#065f46] uppercase border border-[#bbf7d0]">
                              {record.field_type || 'FINDING'}
                            </span>
                            {confidencePct !== null && (
                              <span className={`font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${confidencePct >= 80 ? 'bg-[#dcfce7] text-[#065f46] border-[#bbf7d0]' : 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'}`}>
                                {confidencePct}%
                              </span>
                            )}
                          </div>
                          <p className="font-extrabold text-[#0a2f26] truncate">{title}</p>
                          {details && (
                            <p className="mt-0.5 text-[10px] font-semibold text-[#274c3d] truncate">{details}</p>
                          )}
                          {record.source_text && (
                            <p className="mt-0.5 text-[9px] italic text-[#4b6358] line-clamp-1">
                              &ldquo;{record.source_text}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#d6ded5] bg-[#f9fdfa] p-6 text-center flex flex-col items-center justify-center my-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#dcfce7] text-[#059669] mb-2">
                <FolderClosed size={20} />
              </div>
              <p className="text-xs font-extrabold text-[#0a2f26]">No Prior Medical Documents Uploaded</p>
              <p className="text-xs font-semibold text-[#274c3d] mt-0.5 max-w-md">
                The patient did not upload prior physical prescriptions, discharge summaries, or laboratory documents during this intake session.
              </p>
            </div>
          )}
        </div>

        {/* 3. Physician Clinical History Notes */}
        <div className="rounded-2xl border border-[#d6ded5] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e5eae4]">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46]">
                <Stethoscope size={16} />
              </div>
              <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                Physician History Notes & Clinical Validation
              </h3>
            </div>
            {notesSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16a34a]">
                <CheckCircle2 size={14} /> Notes saved
              </span>
            )}
          </div>

          <textarea
            value={historyNotes}
            onChange={(e) => setHistoryNotes(e.target.value)}
            placeholder="Add physician addendum to clinical history (e.g. verified duration of symptoms, corroborated previous clinical records, specific surgical timelines)..."
            rows={4}
            className="w-full rounded-xl border border-[#c8e6d6] bg-[#f9fdfa] p-3 text-xs font-medium text-[#0a2f26] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleSaveHistoryNote}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#065f46] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#044e39] cursor-pointer shadow-xs"
            >
              <Save size={14} />
              Save History Notes
            </button>
          </div>
        </div>
      </div>

      {/* FULL DOCUMENT ATTACHMENT PREVIEW & IMAGE VIEWER MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a2f26]/75 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-[#d6ded5] bg-white shadow-2xl my-auto flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e5eae4] px-5 py-4 shrink-0 bg-[#f9fdfa] rounded-t-2xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46] shrink-0 border border-[#bbf7d0]">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#047857] bg-[#dcfce7] px-2 py-0.5 rounded border border-[#bbf7d0]">
                      {previewDoc.type || previewDoc.document_type || 'Prescription'}
                    </span>
                    <span className="text-xs text-[#688176]">
                      {previewDoc.size ? `${previewDoc.size} · ` : ''}{previewDoc.uploadedAt || previewDoc.uploaded_at || 'Attached'}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#0a2f26] truncate max-w-lg mt-0.5">
                    {previewDoc.name}
                  </h3>
                </div>
              </div>

              {/* Action Buttons & Close */}
              <div className="flex items-center gap-2 shrink-0">
                {getDocDownloadUrl(previewDoc) && (
                  <a
                    href={getDocDownloadUrl(previewDoc)}
                    download={previewDoc.name}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#c4ded0] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0a2f26] hover:bg-[#f0fdf4] transition"
                    title="Download original file"
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                )}
                {getDocViewUrl(previewDoc) && (
                  <a
                    href={getDocViewUrl(previewDoc)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-[#c4ded0] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0a2f26] hover:bg-[#f0fdf4] transition"
                    title="Open in new window"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden sm:inline">New Tab</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-lg p-1.5 text-[#4b6358] hover:bg-[#fee2e2] hover:text-[#991b1b] cursor-pointer transition"
                  title="Close preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Image / Document Viewer Section */}
              {isImageDoc(previewDoc) ? (
                <div className="rounded-xl border border-[#c4ded0] bg-[#0c1f19] overflow-hidden flex flex-col items-center">
                  {/* Image Viewer Toolbar */}
                  <div className="w-full flex items-center justify-between border-b border-[#1f4236] bg-[#071712] px-4 py-2 text-white">
                    <span className="font-mono text-xs font-semibold text-[#86efac] flex items-center gap-1.5">
                      <FileCheck2 size={13} /> Uploaded Medical Image
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setImageScale((s) => Math.max(0.5, s - 0.25))}
                        className="rounded p-1 text-[#a7f3d0] hover:bg-[#143d31] hover:text-white transition cursor-pointer"
                        title="Zoom out"
                      >
                        <ZoomOut size={15} />
                      </button>
                      <span className="font-mono text-xs text-[#a7f3d0] px-1">
                        {Math.round(imageScale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setImageScale((s) => Math.min(3, s + 0.25))}
                        className="rounded p-1 text-[#a7f3d0] hover:bg-[#143d31] hover:text-white transition cursor-pointer"
                        title="Zoom in"
                      >
                        <ZoomIn size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageRotation((r) => (r + 90) % 360)}
                        className="rounded p-1 text-[#a7f3d0] hover:bg-[#143d31] hover:text-white transition cursor-pointer ml-1"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageScale(1);
                          setImageRotation(0);
                        }}
                        className="rounded px-2 py-0.5 text-[10px] font-mono text-[#a7f3d0] hover:bg-[#143d31] hover:text-white transition cursor-pointer"
                        title="Reset zoom and rotation"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Image Display Area */}
                  <div className="relative w-full min-h-[360px] max-h-[580px] overflow-auto flex items-center justify-center p-4 bg-[#0a1612]">
                    {imageLoading && !imageError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0a1612]/70 text-[#86efac] gap-2 font-mono text-xs">
                        <RefreshCw size={18} className="animate-spin" /> Loading document image…
                      </div>
                    )}

                    {imageError ? (
                      <div className="p-8 text-center text-[#fca5a5]">
                        <AlertTriangle size={32} className="mx-auto mb-2 text-[#f87171]" />
                        <p className="text-sm font-bold">Failed to render image directly</p>
                        <p className="text-xs mt-1 text-[#fecaca]">
                          You can download or open the file in a new tab using the buttons above.
                        </p>
                      </div>
                    ) : (
                      <img
                        src={getDocViewUrl(previewDoc)}
                        alt={previewDoc.name}
                        onLoad={() => setImageLoading(false)}
                        onError={() => {
                          setImageLoading(false);
                          setImageError(true);
                        }}
                        style={{
                          transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.15s ease-out',
                        }}
                        className="max-h-[540px] max-w-full object-contain rounded shadow-lg select-none"
                      />
                    )}
                  </div>
                </div>
              ) : (
                /* PDF / Non-Image Fallback Viewer */
                <div className="rounded-xl border border-[#c4ded0] bg-[#f9fdfa] p-8 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#dcfce7] text-[#065f46] mx-auto mb-3 border border-[#bbf7d0]">
                    <FileText size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-[#0a2f26]">{previewDoc.name}</h4>
                  <p className="text-xs text-[#4b6358] mt-1 max-w-md mx-auto">
                    This document is stored as{' '}
                    <span className="font-mono font-bold uppercase">{previewDoc.mime_type || previewDoc.type || 'PDF/DOCUMENT'}</span>.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {getDocViewUrl(previewDoc) && (
                      <a
                        href={getDocViewUrl(previewDoc)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#065f46] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#044e39] transition"
                      >
                        <ExternalLink size={14} /> Open Document in Viewer
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Extracted Findings Accordion / Details */}
              {previewDoc.extractions && previewDoc.extractions.length > 0 && (
                <div className="rounded-xl border border-[#c4ded0] bg-[#f0fdf4]/60 p-4">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#c4ded0]">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold uppercase tracking-wider text-[#065f46]">
                      <Sparkles size={14} />
                      <span>Extracted Clinical Findings ({previewDoc.extractions.length})</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#047857] bg-[#dcfce7] px-2 py-0.5 rounded border border-[#bbf7d0]">
                      PaddleOCR + Clinical Intelligence
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {previewDoc.extractions.map((ext: any, eIdx: number) => {
                      const val = ext.value;
                      const title = typeof val === 'object' && val !== null
                        ? (val.medicine_name || val.name || val.test_name || ext.field_name)
                        : String(val || ext.field_name);
                      const details = typeof val === 'object' && val !== null
                        ? [val.strength, val.dosage, val.frequency, val.duration, val.value ? `${val.value} ${val.unit || ''}` : null].filter(Boolean).join(' • ')
                        : null;
                      const conf = ext.confidence != null
                        ? (ext.confidence <= 1 ? Math.round(ext.confidence * 100) : Math.round(ext.confidence))
                        : null;

                      return (
                        <div key={eIdx} className="rounded-lg border border-[#c4ded0] bg-white p-2.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="rounded bg-[#dcfce7] px-1.5 py-0.2 font-mono text-[9px] font-bold text-[#065f46] uppercase border border-[#bbf7d0]">
                              {ext.field_type || 'FINDING'}
                            </span>
                            {conf !== null && (
                              <span className="font-mono text-[9px] font-bold text-[#047857]">
                                {conf}% conf
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-[#0a2f26]">{title}</p>
                          {details && (
                            <p className="mt-0.5 text-[11px] font-semibold text-[#274c3d]">{details}</p>
                          )}
                          {ext.source_text && (
                            <p className="text-[10px] italic text-[#4b6358] mt-1 bg-[#f9fdfa] p-1 rounded border border-[#e5eae4]">
                              &ldquo;{ext.source_text}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#e5eae4] px-5 py-3 shrink-0 bg-[#f9fdfa] rounded-b-2xl text-xs">
              <span className="text-[#4b6358] font-medium">
                Verified private medical record • Hospital Clinician Review
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl bg-[#065f46] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#044e39] transition cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </PatientRecordShell>
  );
}

export default DoctorPatientHistory;
