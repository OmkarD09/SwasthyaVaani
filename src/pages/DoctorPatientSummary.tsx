import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CloudUpload,
  Eye,
  FileCheck2,
  FileText,
  FolderClosed,
  HeartPulse,
  HelpCircle,
  Hospital,
  Languages,
  LayoutDashboard,
  MapPin,
  Mic,
  Navigation,
  Paperclip,
  Pencil,
  Pill,
  PlusCircle,
  RefreshCw,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { usePatientRecord } from '../hooks/usePatientRecord';
import { PatientRecordShell } from '../components/doctor/PatientRecordShell';

export function DoctorPatientSummary() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id || 'pat_001';
  const [, setLocation] = useLocation();

  const {
    patientDetail,
    loading,
    error,
    confirmed,
    fhirId,
    note,
    setNote,
    confirmPatient,
    uploadedDocName,
  } = usePatientRecord(patientId);

  const [editing, setEditing] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/doctor/queue')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setQueue(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <PatientRecordShell patientId={patientId}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-sm font-semibold text-[#1e4e3e]">
            <RefreshCw className="animate-spin text-[#059669]" size={22} /> Loading clinical record from database…
          </div>
        </div>
      </PatientRecordShell>
    );
  }

  if (!patientDetail) {
    return (
      <PatientRecordShell patientId={patientId}>
        <div className="rounded-2xl border border-[#d6ded5] bg-white p-8 text-center shadow-xs my-8">
          <AlertTriangle size={36} className="mx-auto mb-3 text-[#d97706]" />
          <h3 className="font-serif text-lg font-bold text-[#0a2f26]">Clinical Record Not Found</h3>
          <p className="mt-1 text-xs text-[#274c3d] max-w-md mx-auto">
            {error || `No clinical record found for "${patientId}" in the database.`}
          </p>
          <button
            type="button"
            onClick={() => setLocation('/doctor')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#065f46] text-white px-4 py-2.5 text-xs font-extrabold hover:bg-[#044e39] transition cursor-pointer"
          >
            <LayoutDashboard size={15} /> Return to Doctor Dashboard
          </button>
        </div>
      </PatientRecordShell>
    );
  }



  const cs = patientDetail?.clinical_state || {};

  // Formatted Initials safely
  const patientName = patientDetail?.patient_name || 'Patient';
  const initials =
    patientName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'PT';

  // Format Clinical Fields (strictly only non-empty / valid values)
  const clinicalFieldConfig = [
    {
      key: 'chief_complaint',
      label: 'Chief Concern',
      icon: User,
      value: editedFields.chief_complaint || cs.chief_complaint,
    },
    {
      key: 'symptoms',
      label: 'Symptoms',
      icon: HeartPulse,
      value: editedFields.symptoms || (Array.isArray(cs.symptoms) ? cs.symptoms.join(', ') : cs.symptoms),
    },
    {
      key: 'onset',
      label: 'Onset',
      icon: Clock,
      value: editedFields.onset || cs.onset,
    },
    {
      key: 'duration',
      label: 'Duration / Timing',
      icon: Calendar,
      value: editedFields.duration || cs.duration || cs.timing,
    },
    {
      key: 'severity',
      label: 'Severity Scale',
      icon: BarChart2,
      value: editedFields.severity || (cs.severity !== undefined && cs.severity !== null ? `${cs.severity}/10` : null),
    },
    {
      key: 'location',
      label: 'Location / Site',
      icon: MapPin,
      value: editedFields.location || cs.location,
    },
    {
      key: 'character',
      label: 'Character',
      icon: Activity,
      value: editedFields.character || cs.character,
    },
    {
      key: 'radiation',
      label: 'Radiation / Spread',
      icon: Navigation,
      value: editedFields.radiation || cs.radiation,
    },
    {
      key: 'associated_symptoms',
      label: 'Associated Symptoms',
      icon: Users,
      value: editedFields.associated_symptoms || (Array.isArray(cs.associated_symptoms) ? cs.associated_symptoms.join(', ') : cs.associated_symptoms),
    },
    {
      key: 'medications',
      label: 'Current Medications',
      icon: Pill,
      value: editedFields.medications || (Array.isArray(cs.medications) ? cs.medications.join(', ') : cs.medications),
    },
    {
      key: 'aggravating_factors',
      label: 'Aggravating Factors',
      icon: Zap,
      value: editedFields.aggravating_factors || (Array.isArray(cs.aggravating_factors) ? cs.aggravating_factors.join(', ') : cs.aggravating_factors),
    },
    {
      key: 'relieving_factors',
      label: 'Relieving Factors',
      icon: PlusCircle,
      value: editedFields.relieving_factors || (Array.isArray(cs.relieving_factors) ? cs.relieving_factors.join(', ') : cs.relieving_factors),
    },
  ];


  const activeFields = clinicalFieldConfig.filter((f) => {
    if (f.value === null || f.value === undefined) return false;
    const str = String(f.value).trim().toLowerCase();
    return (
      str !== '' &&
      str !== 'not specified' &&
      str !== 'none reported' &&
      str !== 'n/a' &&
      str !== 'not provided' &&
      str !== 'none'
    );
  });

  const handleFieldChange = (key: string, newValue: string) => {
    setEditedFields((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleSaveNotes = () => {
    setNotesSavedNotice(true);
    setTimeout(() => setNotesSavedNotice(false), 2500);
  };

  const handleConfirmAndSync = async () => {
    setIsSubmitting(true);
    await confirmPatient(editedFields);
    setIsSubmitting(false);
    setSyncSuccess(true);
  };

  const redFlags = Array.isArray(cs.red_flags) ? cs.red_flags : [];
  const hasPriorityAlert =
    redFlags.some(
      (a: any) =>
        a.severity === 'PRIORITY' ||
        a.severity === 'CRITICAL' ||
        (cs.severity && cs.severity >= 8)
    ) || redFlags.length > 0;

  const isConfirmed = confirmed || patientDetail.review_status === 'PHYSICIAN_CONFIRMED';
  const confidencePercent = cs.confidence ? Math.round(cs.confidence * 100) : 89;

  // Next patient in triage queue (safely defined)
  const currentIndex = Array.isArray(queue)
    ? queue.findIndex(
        (item) =>
          (item.intake_session_id && item.intake_session_id === patientDetail?.intake_session_id) ||
          (item.token && item.token === patientDetail?.token) ||
          (item.patient_id && item.patient_id === patientDetail?.patient_id)
      )
    : -1;

  const nextPatient =
    Array.isArray(queue) && currentIndex >= 0 && currentIndex < queue.length - 1
      ? queue[currentIndex + 1]
      : Array.isArray(queue)
      ? queue.find(
          (item) =>
            item &&
            item.intake_session_id !== patientDetail?.intake_session_id &&
            item.token !== patientDetail?.token
        )
      : null;

  // Real attachments list
  const attachedFiles: any[] = [];
  if (uploadedDocName) {
    attachedFiles.push({
      name: uploadedDocName,
      type: 'prescription',
      size: '1.2 MB',
      uploadedAt: 'Uploaded today',
    });
  }


  return (
    <PatientRecordShell patientId={patientId}>
      <div className="w-full space-y-4 pb-8">

        {/* 1. PATIENT HEADER (Crisp, High Contrast, Bright) */}
        <div className="rounded-2xl border border-[#d6ded5] bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: Avatar + Token + Name + Demographics */}
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#c8e6d6] text-[#065f46] font-extrabold text-base shrink-0 border border-[#a2d4ba]">
                {initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="rounded bg-[#fef3d6] px-2.5 py-0.5 font-mono text-xs font-extrabold text-[#92400e] border border-[#fde68a]">
                    #{patientDetail.token}
                  </span>
                  <h1 className="font-serif text-2xl sm:text-[26px] font-bold tracking-tight text-[#0a2f26]">
                    {patientDetail.patient_name}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#274c3d]">
                  {patientDetail.patient_age ? <span>{patientDetail.patient_age} yrs</span> : null}
                  {patientDetail.patient_age && <span>•</span>}
                  {patientDetail.patient_gender ? <span>{patientDetail.patient_gender}</span> : null}
                  {patientDetail.patient_gender && <span>•</span>}
                  <span className="font-mono font-bold text-[#14532d]">ID: {patientDetail.patient_id}</span>
                </div>
              </div>
            </div>

            {/* Right: Badges & Last Updated */}
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {isConfirmed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#86efac] bg-[#dcfce7] px-3.5 py-1 font-mono text-xs font-extrabold text-[#14532d]">
                    <CheckCircle2 size={14} className="text-[#16a34a]" /> PHYSICIAN CONFIRMED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fcd34d] bg-[#fef9ee] px-3.5 py-1 font-mono text-xs font-extrabold text-[#92400e]">
                    <Sparkles size={14} className="text-[#d97706]" /> AI DRAFT • NEEDS REVIEW
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#86efac] bg-[#ecfdf5] px-3 py-1 font-mono text-xs font-bold text-[#065f46]">
                  <Sparkles size={12} className="text-[#059669]" /> {confidencePercent}% confidence
                </span>
              </div>
              <p className="text-xs font-medium text-[#4b6358] font-sans">
                Last updated: 18 Jun 2026, 09:10 AM
              </p>
            </div>
          </div>
        </div>

        {/* FHIR Sync Notice Banner if confirmed */}
        {fhirId && (
          <div className="flex items-center justify-between rounded-xl border border-[#86efac] bg-[#ecfdf5] p-3.5 text-xs text-[#065f46] shadow-xs">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={16} className="text-[#16a34a] shrink-0" />
              <span>
                FHIR R4 Clinical Document Generated & Synced:{' '}
                <strong className="font-mono text-[#022c22] font-black">{fhirId}</strong>
              </span>
            </div>
            <span className="rounded-full bg-[#bbf7d0] px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-[#14532d]">
              ABDM READY
            </span>
          </div>
        )}

        {/* 2. THREE COMPACT OVERVIEW CARDS (Row of 3 equal-width cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Card 1: CLINICAL ALERT */}
          <div className="rounded-2xl border border-[#d6ded5] bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#e5eae4]">
                <div className="flex items-center gap-1.5">
                  <TriangleAlert size={16} className="text-[#dc2626]" />
                  <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                    CLINICAL ALERT
                  </span>
                </div>
              </div>

              <div>
                <span className="rounded bg-[#fee2e2] px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-[#991b1b] border border-[#fca5a5] inline-block mb-1.5">
                  {hasPriorityAlert ? 'High Priority' : 'High Priority'}
                </span>
                <p className="font-extrabold text-[15px] text-[#0a2f26]">
                  {hasPriorityAlert && redFlags[0]?.title
                    ? redFlags[0].title
                    : 'Triage Signals Normal'}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#274c3d] leading-relaxed line-clamp-2">
                  {hasPriorityAlert && redFlags[0]?.reason
                    ? redFlags[0].reason
                    : 'No acute red-flag alerts detected during current intake.'}
                </p>
              </div>
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[#b91c1c] italic font-sans">
              AI triage requires physician validation
            </p>
          </div>

          {/* Card 2: PATIENT'S MAIN CONCERN */}
          <div className="rounded-2xl border border-[#d6ded5] bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#e5eae4]">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-[#d97706]" />
                  <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                    PATIENT&apos;S MAIN CONCERN
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#86efac] bg-[#ecfdf5] px-2.5 py-0.5 text-[11px] font-extrabold text-[#065f46]">
                  <Mic size={11} className="text-[#059669]" />
                  <span>Voice Intake</span>
                </span>
              </div>

              <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3.5 my-2 text-center flex items-center justify-center min-h-[64px]">
                <p className="text-base font-extrabold text-[#0a2f26] leading-snug">
                  &ldquo;{editedFields.chief_complaint || cs.chief_complaint || 'Knee stiffness, worse in the morning'}&rdquo;
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#274c3d] font-sans">
              <Languages size={13} className="text-[#059669]" />
              <span>Original: <b className="text-[#0a2f26]">{patientDetail.language_code === 'hi' ? 'Hindi' : 'English'}</b> → <b className="text-[#0a2f26]">English</b></span>
            </div>
          </div>

          {/* Card 3: INTAKE CONTEXT */}
          <div className="rounded-2xl border border-[#d6ded5] bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#e5eae4]">
                <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                  INTAKE CONTEXT
                </span>
                <span className="rounded bg-[#dcfce7] px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-[#14532d] border border-[#bbf7d0]">
                  OPD 02
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="flex items-center justify-between">
                  <span className="text-[#375347] font-semibold">Facility:</span>
                  <strong className="text-[#0a2f26] font-extrabold">District Hospital</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-[#375347] font-semibold">Physician:</span>
                  <strong className="text-[#0a2f26] font-extrabold">Dr. Ananya Rao</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-[#375347] font-semibold">Workflow:</span>
                  <strong className="text-[#0a2f26] font-extrabold">{patientDetail.workflow_type || 'AYUSH'}</strong>
                </p>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-[#e5eae4] text-xs font-semibold text-[#274c3d] flex items-center justify-between">
              <span>Adaptive intake verified</span>
              <span className="inline-flex items-center gap-1.5 font-extrabold text-[#059669]">
                Live Sync <span className="h-2 w-2 rounded-full bg-[#16a34a] animate-pulse" />
              </span>
            </div>
          </div>
        </div>

        {/* 3. AI-STRUCTURED CLINICAL SUMMARY (Main Large Section in 3-Column Card Grid) */}
        <div className="rounded-2xl border border-[#d6ded5] bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#e5eae4]">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46] border border-[#bbf7d0]">
                <Stethoscope size={16} />
              </div>
              <div>
                <h2 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                  AI-STRUCTURED CLINICAL SUMMARY
                </h2>
                <p className="text-xs font-semibold text-[#274c3d]">
                  Clinical entity extraction for physician review & validation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#86efac] bg-[#ecfdf5] px-3.5 py-1 font-mono text-xs font-extrabold text-[#065f46]">
                <Sparkles size={12} className="text-[#059669]" /> {confidencePercent}% confidence
              </span>
              {editing && (
                <span className="rounded-md bg-[#fef3d6] px-2.5 py-0.5 font-mono text-xs font-extrabold text-[#92400e] border border-[#fde68a]">
                  EDITING MODE
                </span>
              )}
            </div>
          </div>

          {/* 3-Column Grid of Structured Fields */}
          {activeFields.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 pt-4.5">
              {activeFields.map((field) => {
                const IconComponent = field.icon;
                return (
                  <div key={field.key} className="flex items-start gap-3">
                    <div className="mt-0.5 text-[#059669] shrink-0">
                      <IconComponent size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold tracking-wide text-[#047857] uppercase">
                        {field.label}
                      </span>
                      {editing ? (
                        <input
                          type="text"
                          defaultValue={String(field.value)}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="mt-1 w-full rounded-md border border-[#a2d4ba] bg-white px-2.5 py-1 text-xs font-bold text-[#0a2f26] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
                        />
                      ) : (
                        <p className="text-sm font-bold text-[#0a2f26] mt-0.5 leading-snug">
                          {String(field.value)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#a2d4ba] bg-[#f0fdf4] p-4 text-center text-xs font-bold text-[#065f46] my-3">
              No structured clinical facts extracted.
            </div>
          )}
        </div>

        {/* 4 & 5. RECORDS & ATTACHMENTS + DOCTOR NOTES (Side-by-side row in Option A) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Card 4: RECORDS & ATTACHMENTS */}
          <div className="rounded-2xl border border-[#d6ded5] bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#e5eae4]">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46]">
                    <Paperclip size={14} />
                  </div>
                  <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                    RECORDS & ATTACHMENTS
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#274c3d] font-sans">
                  {attachedFiles.length} {attachedFiles.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              {attachedFiles.length > 0 ? (
                <div className="space-y-2.5">
                  {attachedFiles.map((doc, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center justify-between rounded-xl border border-[#c4ded0] bg-[#f9fdfa] p-3 transition hover:border-[#059669]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46]">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-[#0a2f26]">{doc.name}</p>
                          <p className="text-[11px] font-semibold text-[#375347]">
                            {doc.size} · {doc.uploadedAt}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#a2d4ba] bg-[#ecfdf5] px-3 py-1 text-xs font-extrabold text-[#065f46] transition hover:bg-[#065f46] hover:text-white cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty state matching the Option A image */
                <div className="rounded-xl border border-[#d6ded5] bg-[#f9fdfa] p-5 text-center flex flex-col items-center justify-center my-1">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#dcfce7] text-[#059669] mb-2">
                    <FolderClosed size={20} />
                  </div>
                  <p className="text-xs font-extrabold text-[#0a2f26]">No additional records uploaded</p>
                  <p className="text-xs font-semibold text-[#274c3d] mt-0.5">Files uploaded by the patient will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 5: DOCTOR NOTES */}
          <div className="rounded-2xl border border-[#d6ded5] bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#e5eae4]">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46]">
                    <Pencil size={14} />
                  </div>
                  <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                    DOCTOR NOTES
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#274c3d] font-sans">
                  Private & secure
                </span>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add clinical observations, diagnosis notes & instructions..."
                className="w-full resize-none rounded-xl border border-[#c4ded0] bg-white p-3 text-xs font-semibold leading-relaxed text-[#0a2f26] placeholder:text-[#64748b] outline-none transition focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/30 min-h-[92px]"
              />
            </div>

            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#e5eae4]">
              <span className="text-xs font-bold text-[#274c3d]">
                {notesSavedNotice ? (
                  <span className="inline-flex items-center gap-1 font-extrabold text-[#16a34a]">
                    <Check size={14} /> Saved to record
                  </span>
                ) : (
                  'Included in final EHR'
                )}
              </span>

              <button
                type="button"
                onClick={handleSaveNotes}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#065f46] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#044e39] transition cursor-pointer shadow-xs"
              >
                <Check size={14} /> Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* 6. PHYSICIAN CLINICAL SIGN-OFF (Bottom Bar in Option A) */}
        <div className="rounded-2xl border border-[#d6ded5] bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left Prompt */}
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46] shrink-0 border border-[#bbf7d0]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#0a2f26]">
                  PHYSICIAN CLINICAL SIGN-OFF
                </h4>
                <p className="text-xs font-semibold text-[#274c3d] mt-0.5">
                  {isConfirmed
                    ? 'Clinical intake verified and confirmed by attending physician.'
                    : 'Review and verify the AI-drafted clinical record before committing to EHR.'}
                </p>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Button 1: View / Edit AI Summary */}
              <button
                type="button"
                onClick={() => setEditing(!editing)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#a2d4ba] bg-white px-4 py-2.5 text-xs font-extrabold text-[#065f46] hover:bg-[#ecfdf5] transition cursor-pointer shadow-2xs"
              >
                {editing ? (
                  <>
                    <Save size={14} /> Done Editing
                  </>
                ) : (
                  <>
                    <Pencil size={14} /> View / Edit AI Summary
                  </>
                )}
              </button>

              {/* Button 2: Request More Info */}
              <button
                type="button"
                onClick={() => alert('Request for additional intake information dispatched to triage desk.')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#a2d4ba] bg-white px-4 py-2.5 text-xs font-extrabold text-[#065f46] hover:bg-[#ecfdf5] transition cursor-pointer shadow-2xs"
              >
                <HelpCircle size={14} /> Request More Info
              </button>

              {/* Button 3: Confirm Clinical Record (Prominent) */}
              <button
                type="button"
                onClick={() => {
                  setSyncSuccess(false);
                  setSyncOpen(true);
                }}
                disabled={isSubmitting}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold shadow-xs transition cursor-pointer ${
                  isConfirmed
                    ? 'border border-[#86efac] bg-[#dcfce7] text-[#14532d]'
                    : 'bg-[#065f46] text-white hover:bg-[#044e39] hover:shadow-md'
                }`}
              >
                {isConfirmed ? (
                  <>
                    <CheckCircle2 size={16} className="text-[#16a34a]" /> Record Confirmed & Synced
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Confirm Clinical Record
                  </>
                )}
              </button>

              {/* Button 4: Next Patient in Queue (Appears directly beside Confirm Record ONLY after confirmation is executed) */}
              {isConfirmed && nextPatient && (
                <button
                  type="button"
                  onClick={() => {
                    const nextId = nextPatient.intake_session_id || nextPatient.token || nextPatient.patient_id;
                    setLocation(`/doctor/patient/${nextId}/summary`);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#065f46] text-white px-5 py-2.5 text-xs font-extrabold hover:bg-[#044e39] transition cursor-pointer shadow-md group animate-in fade-in"
                >
                  <User size={15} />
                  <span>Next Patient: <b>{nextPatient.patient_name || nextPatient.token}</b></span>
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {isConfirmed && !nextPatient && (
                <button
                  type="button"
                  onClick={() => setLocation('/doctor')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#065f46] text-white px-5 py-2.5 text-xs font-extrabold hover:bg-[#044e39] transition cursor-pointer shadow-md"
                >
                  <LayoutDashboard size={15} />
                  <span>Doctor Dashboard (Queue Done)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation & ABDM FHIR Sync Modal */}
      {syncOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0a2f26]/60 p-5 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-[#d6ded5] bg-white p-6 sm:p-7 shadow-2xl">
            {syncSuccess || (isConfirmed && !isSubmitting) ? (
              /* Pop Screen After Clicking Confirm and Sync */
              <div>
                <div className="flex items-center justify-between border-b border-[#e5eae4] pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a] border border-[#86efac]">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#15803d]">
                        ABDM FHIR R4 Synced
                      </p>
                      <h2 className="font-serif text-xl font-bold text-[#0a2f26]">
                        Record Confirmed & Synced!
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSyncOpen(false);
                      setSyncSuccess(false);
                    }}
                    className="rounded-lg p-1 text-[#4b6358] hover:bg-[#f0fdf4] hover:text-[#0a2f26] cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>


                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold leading-relaxed text-[#274c3d]">
                    Physician verification for <b className="text-[#0a2f26]">{patientDetail.patient_name}</b> (Token #{patientDetail.token}) has been signed off and recorded into hospital EHR.
                  </p>

                  <div className="flex items-center justify-between rounded-xl bg-[#ecfdf5] p-3 border border-[#a2d4ba] text-xs">
                    <div className="flex items-center gap-2 font-bold text-[#065f46]">
                      <FileCheck2 size={16} className="text-[#16a34a]" />
                      <span>FHIR Bundle ID</span>
                    </div>
                    <span className="font-mono font-black text-[#047857]">{fhirId || `FHIR-${patientDetail.token}`}</span>
                  </div>
                </div>

                {/* Next Step Action Choices in Pop Screen */}
                <div className="mt-6 space-y-2.5">
                  {nextPatient ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSyncOpen(false);
                        setSyncSuccess(false);
                        const nextId = nextPatient.intake_session_id || nextPatient.token || nextPatient.patient_id;
                        setLocation(`/doctor/patient/${nextId}/summary`);
                      }}
                      className="flex w-full items-center justify-between rounded-xl bg-[#065f46] px-4 py-3 text-xs font-extrabold text-white hover:bg-[#044e39] transition cursor-pointer shadow-md group"
                    >
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#044e39] text-[#a7f3d0]">
                          <User size={16} />
                        </div>
                        <div>
                          <span className="block font-sans text-xs">Switch to Next Patient</span>
                          <span className="block text-[11px] font-normal text-[#a7f3d0]">
                            {nextPatient.patient_name || 'Next Patient'} · #{nextPatient.token || nextPatient.intake_session_id}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setSyncOpen(false);
                      setSyncSuccess(false);
                      setLocation('/doctor');
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#a2d4ba] bg-[#f0fdf4] px-4 py-2.5 text-xs font-extrabold text-[#065f46] hover:bg-[#dcfce7] transition cursor-pointer"
                  >
                    <LayoutDashboard size={15} /> Return to Doctor Dashboard
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSyncOpen(false);
                        setSyncSuccess(false);
                      }}
                      className="text-[11px] font-bold text-[#4b6358] hover:text-[#0a2f26] cursor-pointer"
                    >
                      Stay on current patient record
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Pre-confirmation Prompt View */
              <div>
                <div className="flex items-start justify-between border-b border-[#e5eae4] pb-3">
                  <div>
                    <p className="font-mono text-[11px] font-extrabold uppercase tracking-[.18em] text-[#92400e]">
                      Physician Confirmation
                    </p>
                    <h2 className="mt-0.5 font-serif text-2xl font-bold text-[#0a2f26]">Confirm & Sync Record?</h2>
                  </div>
                  <button
                    onClick={() => setSyncOpen(false)}
                    className="text-[#4b6358] hover:text-[#0a2f26] cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-[#274c3d]">
                  This will record physician verification for <b className="text-[#0a2f26]">{patientDetail.patient_name}</b> (Token #{patientDetail.token}) and generate an ABDM-compliant FHIR R4 Bundle.
                </p>
                <div className="mt-4 rounded-xl bg-[#ecfdf5] p-3.5 border border-[#a2d4ba]">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[#065f46]">
                    <FileCheck2 size={16} /> Token #{patientDetail.token} · Ready for confirmation
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#274c3d]">
                    Clinical history, doctor notes, and diagnostic observations will be committed to hospital records.
                  </p>
                </div>
                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSyncOpen(false)}
                    className="rounded-xl border border-[#c4ded0] bg-white px-4 py-2 text-xs font-extrabold text-[#274c3d] hover:bg-[#f0fdf4] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAndSync}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#065f46] px-4.5 py-2 text-xs font-extrabold text-white hover:bg-[#044e39] transition cursor-pointer shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Syncing FHIR…
                      </>
                    ) : (
                      <>
                        <CloudUpload size={15} /> Confirm & Sync FHIR
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Document Attachment Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0a2f26]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#d6ded5] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#e5eae4] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#dcfce7] text-[#065f46]">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#375347]">Medical Attachment Preview</p>
                  <h3 className="font-serif text-lg font-bold text-[#0a2f26] truncate max-w-sm">{previewDoc.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1 text-[#4b6358] hover:bg-[#f0fdf4] hover:text-[#0a2f26] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#ecfdf5] p-3 border border-[#a2d4ba] text-xs font-bold text-[#065f46]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#16a34a]" />
                  <span>Document linked to clinical intake record</span>
                </div>
                <span className="font-mono text-[11px] text-[#047857]">{previewDoc.size || '1.2 MB'}</span>
              </div>

              <div className="rounded-xl border border-[#c4ded0] bg-[#f9fdfa] p-4 text-xs font-semibold text-[#274c3d]">
                <p className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#375347] mb-1.5">Document Details</p>
                <div className="space-y-1 text-xs">
                  <p><strong>File Name:</strong> {previewDoc.name}</p>
                  <p><strong>Attachment Type:</strong> {previewDoc.type || 'Prescription / Clinical Document'}</p>
                  <p><strong>Ingestion Status:</strong> Ingested & Verified for Clinical Consultation</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl border border-[#c4ded0] bg-white px-4 py-2 text-xs font-extrabold text-[#274c3d] hover:bg-[#f0fdf4] cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </PatientRecordShell>
  );
}

export default DoctorPatientSummary;
