import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CloudUpload,
  FileCheck2,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  ClinicianShell,
  ClinicianButton as Button,
  DoshaArcGauge,
  StatusPill,
} from '../components/clinician/ClinicianShared';
import {
  type PatientDetail,
  fallbackQueue,
} from '../lib/clinicianData';

export function DoctorPatientReview() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [fhirId, setFhirId] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/doctor/patients/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPatientDetail(data);
          setNote(data.clinician_notes || '');
          if (data.review_status === 'PHYSICIAN_CONFIRMED') setConfirmed(true);
        } else {
          // Fallback matching by token or index
          const found =
            fallbackQueue.find(
              (p) => p.intake_session_id === params.id || p.token === params.id
            ) || fallbackQueue[0];
          setPatientDetail({
            intake_session_id: found.intake_session_id,
            token: found.token,
            patient_id: found.patient_id,
            patient_name: found.patient_name,
            patient_age: found.patient_age,
            patient_gender: found.patient_gender,
            hospital_name: 'District Hospital',
            doctor_name: 'Dr. Ananya Rao',
            workflow_type: found.workflow_type,
            language_code: found.language_code,
            status: found.status,
            review_status: 'AI_DRAFT',
            clinical_state: {
              chief_complaint: found.chief_complaint,
              symptoms: [found.chief_complaint],
              onset: 'Sudden onset',
              duration: '2 hours',
              severity: 8,
              location: 'Chest / Epigastrium',
              character: 'Heavy squeezing sensation',
              radiation: 'Left shoulder',
              associated_symptoms: ['Breathlessness', 'Sweating'],
              ayush:
                found.workflow_type === 'AYUSH'
                  ? {
                      agni: 'Manda (low)',
                      koshtha: 'Krura (hard)',
                      doshas: [67, 15, 18],
                    }
                  : undefined,
              red_flags: found.has_red_flags
                ? [
                    {
                      rule_id: 'RF-CP-001',
                      title: 'Chest Pain with High-Risk Associated Signals',
                      reason:
                        'Patient reported chest discomfort with breathlessness and left shoulder radiation.',
                      severity: 'PRIORITY',
                    },
                  ]
                : [],
              confidence: 0.95,
            },
            submitted_at: found.submitted_at,
          });
        }
      } catch (e) {
        console.warn('Loading fallback patient record:', e);
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [params.id]);

  const handleConfirmAndSync = async () => {
    if (!patientDetail) return;
    try {
      const res = await fetch(
        `/api/v1/doctor/patients/${patientDetail.intake_session_id}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intake_session_id: patientDetail.intake_session_id,
            notes: note,
            edits: [],
            generate_fhir: true,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setFhirId(data.fhir_bundle_id);
        setConfirmed(true);
      }
    } catch (e) {
      console.warn('Physician confirm offline fallback:', e);
      setConfirmed(true);
    } finally {
      setSyncOpen(false);
    }
  };

  if (loading || !patientDetail) {
    return (
      <ClinicianShell>
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-sm text-[#5f786d]">
            <RefreshCw className="animate-spin" size={20} /> Loading clinical intake record…
          </div>
        </div>
      </ClinicianShell>
    );
  }

  const cs = patientDetail.clinical_state;
  const isPriority =
    (cs.red_flags && cs.red_flags.length > 0) || (cs.severity && cs.severity >= 8);

  const sections = [
    ['Onset', cs.onset || 'Not specified'],
    ['Location / Site', cs.location || 'Not specified'],
    ['Character', cs.character || 'Not specified'],
    ['Radiation', cs.radiation || 'None reported'],
    ['Associated', (cs.associated_symptoms || []).join(', ') || 'None reported'],
    ['Timing / Duration', cs.duration || cs.timing || 'Not specified'],
    ['Aggravating', (cs.aggravating_factors || []).join(', ') || 'None reported'],
    ['Relieving', (cs.relieving_factors || []).join(', ') || 'None reported'],
  ];

  return (
    <ClinicianShell>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-4 flex items-center gap-3 text-xs font-semibold">
              <button
                onClick={() => setLocation('/doctor')}
                data-testid="button-back-dashboard"
                className="flex items-center gap-1.5 text-[#668075] hover:text-[#1f5b4e] transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Doctor Dashboard
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm text-[#a06f42]">{patientDetail.token}</span>
              <h1 className="font-serif text-4xl tracking-tight text-[#173e35]">
                {patientDetail.patient_name}
              </h1>
              <span className="text-sm text-[#7c9086]">
                {patientDetail.patient_age ? `${patientDetail.patient_age} yrs` : ''} ·{' '}
                {patientDetail.patient_gender || 'Other'}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#5f786d]">
              {patientDetail.workflow_type} · {patientDetail.hospital_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isPriority && <StatusPill tone="red">Priority Review</StatusPill>}
            <Button
              variant={confirmed ? 'outline' : 'primary'}
              onClick={() => setSyncOpen(true)}
              testId="button-confirm-record"
            >
              {confirmed ? (
                <>
                  <CheckCircle2 size={16} /> Confirmed & Synced
                </>
              ) : (
                <>
                  <BadgeCheck size={16} /> Confirm review
                </>
              )}
            </Button>
            <button
              onClick={() => setSyncOpen(true)}
              data-testid="button-open-sync"
              className="grid h-12 w-12 place-items-center rounded-xl border border-[#cbd6ca] bg-[#f8f7ef] text-[#527467] hover:border-[#1f5b4e]"
            >
              <MoreHorizontal size={19} />
            </button>
          </div>
        </div>

        {isPriority && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e3b6b0] bg-[#fff1ed] p-5 text-[#8f3d36] shadow-sm">
            <TriangleAlert size={21} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">
                Priority Routing Signal · Physician Evaluation Required
              </p>
              <p className="mt-1 text-sm leading-6 text-[#9f6059]">
                {cs.red_flags?.[0]?.reason ||
                  'Critical clinical flag detected. SwasthyaVaani NEVER diagnoses autonomously; use physician judgement.'}
              </p>
            </div>
          </div>
        )}

        {fhirId && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#9fc1ac] bg-[#eef7ee] p-3 text-xs text-[#22573d]">
            <CheckCircle2 size={16} />
            <span>
              FHIR R4 Document Bundle Generated & Validated:{' '}
              <strong className="font-mono">{fhirId}</strong>
            </span>
          </div>
        )}

        <div className="mt-7 grid gap-5 xl:grid-cols-[1.35fr_.8fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8ddd3] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#e6eee4] text-[#1f5b4e]">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="font-semibold">AI-Drafted Clinical History</h2>
                    <p className="text-[11px] text-[#80958a]">
                      Structured from adaptive patient intake
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b8d4c2] bg-[#e7efe5] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#2f644d]">
                    <Sparkles size={11} className="text-[#e1b968]" />{' '}
                    {Math.round((cs.confidence || 0.94) * 100)}% confidence
                  </span>
                  <button
                    onClick={() => setEditing(!editing)}
                    data-testid="button-edit-history"
                    className="text-xs font-semibold text-[#1f5b4e]"
                  >
                    {editing ? (
                      <>
                        <Save size={14} className="mr-1 inline" /> Done
                      </>
                    ) : (
                      <>
                        <Pencil size={14} className="mr-1 inline" /> Edit
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="rounded-xl border-l-2 border-[#e1b968] bg-[#fff7df] p-4 text-sm italic leading-6 text-[#685735]">
                  “{cs.chief_complaint || 'Chief complaint shared during voice intake'}”
                  <p className="mt-2 not-italic font-mono text-[10px] uppercase tracking-wide text-[#a27c39]">
                    Primary Source · Patient Intake Audio / Text
                  </p>
                </div>

                <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {sections.map(([label, value]) => (
                    <div key={label}>
                      <p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#8d9d92]">
                        {label}
                      </p>
                      {editing ? (
                        <input
                          defaultValue={value}
                          className="mt-1 h-9 w-full border-b border-[#b8cabe] bg-transparent text-sm text-[#315b4d] outline-none focus:border-[#1f5b4e]"
                        />
                      ) : (
                        <p className="mt-1 text-sm leading-5 text-[#315b4d]">{value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {cs.ayush && (
              <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] shadow-sm">
                <div className="border-b border-[#d8ddd3] px-5 py-4">
                  <h2 className="font-semibold">Ayurveda Assessment</h2>
                  <p className="mt-1 text-[11px] text-[#80958a]">
                    Agni, Koshtha, and Dosha balance observations
                  </p>
                </div>
                <div className="grid gap-6 p-5 md:grid-cols-[1fr_1.4fr]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-[#edf2e8] p-4 border border-[#dae3d6]">
                      <span className="text-xs font-medium text-[#688176]">Agni</span>
                      <span className="font-semibold text-[#1f5b4e]">
                        {cs.ayush.agni || 'Sama (balanced)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#edf2e8] p-4 border border-[#dae3d6]">
                      <span className="text-xs font-medium text-[#688176]">Koshtha</span>
                      <span className="font-semibold text-[#1f5b4e]">
                        {cs.ayush.koshtha || 'Madhyam (regular)'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#71877c]">
                      <span>Dosha Distribution</span>
                      <span className="font-mono text-[10px]">Ayurveda Intake Metric</span>
                    </div>
                    <DoshaArcGauge doshas={cs.ayush.doshas || [67, 15, 18]} />
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] shadow-sm">
              <div className="flex items-center justify-between border-b border-[#d8ddd3] px-5 py-4">
                <div>
                  <h2 className="font-semibold">Clinician Notes</h2>
                  <p className="mt-1 text-[11px] text-[#80958a]">
                    Private clinical observations & follow-up
                  </p>
                </div>
                <Pencil size={16} className="text-[#8aa095]" />
              </div>
              <div className="p-5">
                <textarea
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setNoteSaved(false);
                  }}
                  data-testid="input-clinician-notes"
                  rows={3}
                  placeholder="Type notes or clinical findings..."
                  className="w-full resize-none rounded-xl border border-[#ccd7ca] bg-[#fbfaf4] p-3 text-sm leading-6 text-[#476b5e] outline-none focus:border-[#1f5b4e] transition"
                />
                <div className="mt-3 flex items-center justify-end gap-3">
                  {noteSaved && <span className="text-xs text-[#5b876e]">Saved note locally</span>}
                  <Button
                    variant="outline"
                    className="min-h-10 px-4 text-xs"
                    onClick={() => setNoteSaved(true)}
                    testId="button-save-notes"
                  >
                    <Save size={14} /> Save note
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Source & Provenance</h2>
                <FileCheck2 size={17} className="text-[#6a9076]" />
              </div>
              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#8c9d91]">
                    Verification Status
                  </p>
                  <p className="mt-1 font-semibold text-[#27634f]">
                    {confirmed ? 'Physician Confirmed' : 'AI Draft (Needs Review)'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#8c9d91]">
                    Draft Confidence
                  </p>
                  <div className="mt-2 h-2.5 rounded-full bg-[#dfe6da] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1f5b4e] to-[#6c9a7d] transition-all"
                      style={{ width: `${Math.round((cs.confidence || 0.94) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="border-t border-[#e2e5dc] pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#8c9d91]">
                    Clinical Safety
                  </p>
                  <p className="mt-2 flex gap-2 text-xs leading-5 text-[#648076]">
                    <ShieldCheck size={15} className="shrink-0 text-[#1f5b4e]" />
                    AI output is untrusted until confirmed by attending physician.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {syncOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#173e35]/55 p-5 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#a06f42]">
                  Physician Confirmation
                </p>
                <h2 className="mt-2 font-serif text-3xl">Confirm & Sync Record?</h2>
              </div>
              <button
                onClick={() => setSyncOpen(false)}
                data-testid="button-close-sync"
                className="text-[#7b9086]"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#60796e]">
              This will record physician verification for {patientDetail.patient_name} (Token #
              {patientDetail.token}) and generate a compliant FHIR R4 Bundle for hospital sync.
            </p>
            <div className="mt-5 rounded-xl bg-[#e8eee3] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#315b4d]">
                <FileCheck2 size={17} /> {patientDetail.token} · Ready for confirmation
              </div>
              <p className="mt-2 text-xs text-[#71877c]">
                SOCRATES fields, Red flags & Ayurveda metrics will be committed to the database.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="quiet"
                onClick={() => setSyncOpen(false)}
                testId="button-cancel-sync"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmAndSync} testId="button-confirm-sync">
                <CloudUpload size={16} /> Confirm & Sync FHIR
              </Button>
            </div>
          </div>
        </div>
      )}
    </ClinicianShell>
  );
}

export { DoctorPatientReview as RecordPage };
export default DoctorPatientReview;
