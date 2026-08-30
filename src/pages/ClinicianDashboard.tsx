import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, BellRing, CheckCircle2, ChevronDown, 
  CloudUpload, FileCheck2, FileText, LockKeyhole, LogOut, Menu, MoreHorizontal, Pencil, 
  Plus, RotateCcw, Save, Search, Settings2, ShieldCheck, Sparkles, Stethoscope, 
  TriangleAlert, Upload, UsersRound, X, RefreshCw
} from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';

type DoctorQueueItem = {
  intake_session_id: string;
  token: string;
  patient_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  chief_complaint: string;
  language_code: string;
  workflow_type: string;
  status: 'WAITING' | 'HISTORY_READY' | 'PRIORITY_REVIEW' | 'IN_REVIEW' | 'CONFIRMED';
  status_tone: 'teal' | 'amber' | 'red';
  priority: 'Priority' | 'Routine';
  has_red_flags: boolean;
  submitted_at: string;
  wait_time_minutes: number;
};

type PatientDetail = {
  intake_session_id: string;
  token: string;
  patient_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  hospital_name: string;
  doctor_name: string;
  workflow_type: string;
  language_code: string;
  status: string;
  review_status: 'AI_DRAFT' | 'NEEDS_VERIFICATION' | 'PHYSICIAN_CONFIRMED';
  clinical_state: {
    chief_complaint?: string;
    symptoms?: string[];
    onset?: string;
    duration?: string;
    severity?: number;
    location?: string;
    character?: string;
    radiation?: string;
    associated_symptoms?: string[];
    timing?: string;
    aggravating_factors?: string[];
    relieving_factors?: string[];
    ayush?: {
      prakriti?: string;
      vikriti?: string;
      agni?: string;
      koshtha?: string;
      ahara_vihara?: string;
      doshas?: [number, number, number];
    };
    red_flags?: Array<{
      rule_id: string;
      title: string;
      reason: string;
      severity: string;
    }>;
    raw_transcript_snippets?: string[];
    confidence?: number;
  };
  clinician_notes?: string;
  submitted_at: string;
};

const fallbackQueue: DoctorQueueItem[] = [
  {
    intake_session_id: 'intake_001',
    token: 'A-027',
    patient_id: 'pat_001',
    patient_name: 'Sanjay Kumar',
    patient_age: 51,
    patient_gender: 'Male',
    chief_complaint: 'Sudden chest pressure while walking',
    language_code: 'en',
    workflow_type: 'GENERAL_CLINICAL',
    status: 'PRIORITY_REVIEW',
    status_tone: 'red',
    priority: 'Priority',
    has_red_flags: true,
    submitted_at: new Date().toISOString(),
    wait_time_minutes: 18,
  },
  {
    intake_session_id: 'intake_002',
    token: 'A-021',
    patient_id: 'pat_002',
    patient_name: 'Raghav Menon',
    patient_age: 62,
    patient_gender: 'Male',
    chief_complaint: 'Knee stiffness, worse in the morning',
    language_code: 'en',
    workflow_type: 'AYUSH',
    status: 'HISTORY_READY',
    status_tone: 'amber',
    priority: 'Routine',
    has_red_flags: false,
    submitted_at: new Date().toISOString(),
    wait_time_minutes: 32,
  },
  {
    intake_session_id: 'intake_003',
    token: 'SV-2048',
    patient_id: 'pat_003',
    patient_name: 'Meena Kumari',
    patient_age: 54,
    patient_gender: 'Female',
    chief_complaint: 'Persistent cough and throat irritation',
    language_code: 'en',
    workflow_type: 'GENERAL_CLINICAL',
    status: 'HISTORY_READY',
    status_tone: 'teal',
    priority: 'Routine',
    has_red_flags: false,
    submitted_at: new Date().toISOString(),
    wait_time_minutes: 4,
  }
];

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-swasthyavaani">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? 'bg-[#e1b968] text-[#163c35]' : 'bg-[#1f5b4e] text-[#f7f0df]'}`}>
        <span className="font-serif text-xl font-bold leading-none">स्व</span>
      </div>
      <div>
        <div className={`font-serif text-xl font-semibold tracking-tight ${dark ? 'text-[#f6efdf]' : 'text-[#163c35]'}`}>SwasthyaVaani</div>
        <div className={`font-mono text-[9px] uppercase tracking-[.2em] ${dark ? 'text-[#b9d1c4]' : 'text-[#70867b]'}`}>Clinical Intake</div>
      </div>
    </div>
  );
}

function Button({ children, variant = 'primary', onClick, className = '', disabled = false, testId = 'button-action', type = 'button' }: {
  children: ReactNode; variant?: 'primary' | 'outline' | 'quiet' | 'amber' | 'danger'; onClick?: () => void; className?: string; disabled?: boolean; testId?: string; type?: 'button' | 'submit';
}) {
  const styles = {
    primary: 'bg-[#1f5b4e] text-[#f8f1e2] hover:bg-[#17483e] shadow-[0_4px_0_#153f36]',
    outline: 'border border-[#b7c7bc] bg-[#fbf7ec] text-[#1f5b4e] hover:border-[#1f5b4e] hover:bg-[#eef3ea]',
    quiet: 'text-[#507165] hover:bg-[#e9efe7]',
    amber: 'bg-[#e1b968] text-[#173c35] hover:bg-[#d6a951] shadow-[0_4px_0_#b2873b]',
    danger: 'bg-[#b84940] text-white hover:bg-[#993b34] shadow-[0_4px_0_#83342f]',
  };
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}

function DoshaArcGauge({ doshas = [33, 33, 34] }: { doshas?: [number, number, number] | number[] }) {
  const [vata = 33, pitta = 33, kapha = 34] = doshas || [33, 33, 34];
  const items = [
    { label: 'Vata', val: vata, color: '#0ea5e9' },
    { label: 'Pitta', val: pitta, color: '#f59e0b' },
    { label: 'Kapha', val: kapha, color: '#10b981' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 py-1">
      {items.map(({ label, val, color }) => (
        <div key={label} className="relative flex flex-col items-center justify-center rounded-xl border border-[#d8ddd3] bg-[#fbfaf4] p-3 transition-all hover:border-[#1f5b4e]">
          <div className="relative h-14 w-14">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
              <path
                className="text-[#cad8cc]/30"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                stroke={color}
                strokeWidth="3.5"
                strokeDasharray={`${val}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-[#163c35]">
              {val}%
            </div>
          </div>
          <span className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#5f786d]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClinicianShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobile, setMobile] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-[#eef0e8] text-[#173e35]">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-[#31594e] bg-[#173e35] px-4 py-5 transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-3">
          <Logo dark />
          <button onClick={() => setMobile(false)} data-testid="button-close-menu" className="text-[#a9c5b5] lg:hidden">
            <X size={20} />
          </button>
        </div>
        <div className="mt-12 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-[#86a899]">Clinical workspace</div>
        <nav className="mt-3 space-y-1">
          <Link href="/clinician/queue" onClick={() => setMobile(false)} data-testid="link-clinician-queue" className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm transition ${location.includes('/clinician') ? 'bg-[#2b6154] font-semibold text-[#f7f0df] shadow-sm' : 'text-[#b6cdbf] hover:bg-[#234d43]'}`}>
            <UsersRound size={18} /> Today’s queue
          </Link>
          <button onClick={() => setLocation('/admin')} data-testid="button-clinician-settings" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm text-[#b6cdbf] hover:bg-[#234d43]">
            <Settings2 size={18} /> Hospital Admin
          </button>
        </nav>
        <div className="absolute bottom-6 left-7 right-7 border-t border-[#31594e] pt-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e1b968] font-semibold text-[#173e35]">DR</div>
            <div>
              <p className="text-sm font-semibold text-[#f7f0df]">Dr. Ananya Rao</p>
              <p className="font-mono text-[10px] text-[#86a899]">OPD 02 · DISTRICT HOSP</p>
            </div>
          </div>
          <button onClick={() => setLocation('/')} data-testid="button-clinician-logout" className="mt-5 flex items-center gap-2 text-xs text-[#9ebcaf] hover:text-[#f7f0df]">
            <LogOut size={14} /> Exit demo
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#d8ddd3] bg-[#f5f4ec]/95 px-5 backdrop-blur md:px-8">
          <button onClick={() => setMobile(true)} data-testid="button-open-menu" className="text-[#476b5e] lg:hidden">
            <Menu size={22} />
          </button>
          <div className="hidden text-xs text-[#71877c] sm:block">
            SwasthyaVaani Clinical Gateway <span className="mx-2 text-[#bdc8bb]">/</span> Connected OPD Session
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="flex items-center gap-2 font-mono text-[10px] text-[#668075]">
              <span className="h-2 w-2 rounded-full bg-[#6e9b76] animate-pulse" /> FASTAPI & SUPABASE LIVE
            </span>
            <BellRing size={18} className="text-[#668075]" />
          </div>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function ClinicianLogin() {
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);
  const login = () => {
    setBusy(true);
    setTimeout(() => setLocation('/clinician/queue'), 300);
  };
  return (
    <div className="min-h-[100dvh] bg-[#173e35] p-5 text-[#f7f0df] md:p-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Logo dark />
        <Link href="/" data-testid="link-login-home" className="text-sm text-[#b6cdbf] hover:text-[#e1b968]">Back to home</Link>
      </div>
      <div className="mx-auto grid max-w-5xl items-center gap-16 py-20 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[.2em] text-[#e1b968]">Clinician workspace · SwasthyaVaani</p>
          <h1 className="mt-5 max-w-xl font-serif text-6xl leading-[.97] md:text-7xl">See the story<br /><span className="text-[#e1b968]">before the visit.</span></h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[#b6cdbf]">A fast, source-grounded view of what patients shared during adaptive pre-intake—ready for your clinical review.</p>
          <div className="mt-10 flex gap-5 text-xs text-[#9ebcaf]">
            <span className="flex items-center gap-2"><LockKeyhole size={15} /> Secure session</span>
            <span className="flex items-center gap-2"><FileCheck2 size={15} /> FHIR R4 ready</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#41695d] bg-[#204b42] p-7 shadow-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#9ebcaf]">Sign in to continue</p>
          <h2 className="mt-3 font-serif text-3xl">Good morning, doctor.</h2>
          <label className="mt-8 block text-sm text-[#c1d5c9]">
            Staff ID
            <input defaultValue="DOC-001" data-testid="input-staff-id" className="mt-2 h-13 w-full rounded-xl border border-[#56796d] bg-[#173e35] px-4 text-[#f7f0df] outline-none focus:border-[#e1b968]" />
          </label>
          <label className="mt-4 block text-sm text-[#c1d5c9]">
            Demo passcode
            <input defaultValue="••••••••" type="password" data-testid="input-staff-passcode" className="mt-2 h-13 w-full rounded-xl border border-[#56796d] bg-[#173e35] px-4 text-[#f7f0df] outline-none focus:border-[#e1b968]" />
          </label>
          <Button variant="amber" className="mt-7 w-full" onClick={login} disabled={busy} testId="button-clinician-signin">
            {busy ? 'Opening workspace…' : <>Enter clinician view <ArrowRight size={17} /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: 'teal' | 'amber' | 'red'; children: ReactNode }) {
  const colors = {
    teal: 'bg-[#dbeade] text-[#27634f] border border-[#a8c9b3]',
    amber: 'bg-[#f7eac7] text-[#886326] border border-[#e1cc93]',
    red: 'bg-[#f6dcd7] text-[#a83d35] border border-[#e3b2aa]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide shadow-xs ${colors[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{children}
    </span>
  );
}

function Queue() {
  const [, setLocation] = useLocation();
  const [queue, setQueue] = useState<DoctorQueueItem[]>(fallbackQueue);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/doctor/queue');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setQueue(data);
        }
      }
    } catch (e) {
      console.warn('Using local fallback queue data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Establish Live WebSocket Connection
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/doctor/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'QUEUE_UPDATED') {
            fetchQueue(); // Instant re-fetch upon patient submission or confirmation
            setLiveToast(msg.message || 'Queue updated in real time');
            setTimeout(() => setLiveToast(null), 4000);
          }
        } catch (err) {
          console.warn('WS Message parse error:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch (err) {
      console.warn('WebSocket connection error, falling back to polling:', err);
    }

    // Secondary fallback polling every 15s
    const interval = setInterval(fetchQueue, 15000);

    return () => {
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, []);

  const filteredQueue = useMemo(() => {
    if (!search.trim()) return queue;
    const term = search.toLowerCase();
    return queue.filter(q => q.patient_name.toLowerCase().includes(term) || q.token.toLowerCase().includes(term) || q.chief_complaint.toLowerCase().includes(term));
  }, [queue, search]);

  const priorityCount = queue.filter(q => q.has_red_flags || q.status_tone === 'red').length;
  const readyCount = queue.filter(q => q.status_tone === 'amber' || q.status_tone === 'teal').length;

  return (
    <ClinicianShell>
      <div className="mx-auto max-w-7xl">
        {liveToast && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-[#1f5b4e] bg-[#234d40] px-4 py-3 text-sm font-medium text-[#f6efdf] shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#e1b968]" />
              <span>{liveToast}</span>
            </div>
            <button onClick={() => setLiveToast(null)} className="text-[#a9c5b5] hover:text-white">
              <X size={15} />
            </button>
          </div>
        )}

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#a06f42]">Live OPD Gateway</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold ${wsConnected ? 'bg-[#dbeade] text-[#1b4b3e]' : 'bg-[#faebd7] text-[#84531d]'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-[#1b4b3e] animate-ping' : 'bg-[#84531d]'}`} />
                {wsConnected ? 'LIVE WS' : 'POLLING'}
              </span>
            </div>
            <h1 className="mt-2 font-serif text-5xl tracking-tight text-[#173e35]">Today’s queue</h1>
            <p className="mt-3 text-sm text-[#6b8177]">
              {queue.length} intake {queue.length === 1 ? 'summary' : 'summaries'} ready for clinical review.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchQueue} disabled={loading} testId="button-refresh-queue">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
            <Button variant="primary" onClick={() => setLocation('/patient')} testId="button-new-intake">
              <Plus size={16} /> New walk-in
            </Button>
          </div>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-xs transition hover:shadow-md hover:border-[#1f5b4e]/30">
            <p className="font-mono text-[10px] uppercase text-[#80958a]">Total in queue</p>
            <p className="mt-3 font-serif text-4xl">{String(queue.length).padStart(2, '0')}</p>
            <p className="mt-1 text-xs text-[#6e857a]">patients checked in</p>
          </div>
          <div className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-xs transition hover:shadow-md hover:border-[#1f5b4e]/30">
            <p className="font-mono text-[10px] uppercase text-[#80958a]">Ready for review</p>
            <p className="mt-3 font-serif text-4xl text-[#a06f42]">{String(readyCount).padStart(2, '0')}</p>
            <p className="mt-1 text-xs text-[#6e857a]">AI drafts ready</p>
          </div>
          <div className="rounded-2xl border border-[#e7c9c4] bg-[#fff6f1] p-5 shadow-xs transition hover:shadow-md hover:border-[#a83d35]/40">
            <p className="font-mono text-[10px] uppercase text-[#a83d35]">Priority review</p>
            <p className="mt-3 font-serif text-4xl text-[#a83d35]">{String(priorityCount).padStart(2, '0')}</p>
            <p className="mt-1 text-xs text-[#9c6d66]">cardiac & high-risk signals</p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#d8ddd3] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Patient intake queue</h2>
              <span className="rounded-full bg-[#e4e9df] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#6c8478]">
                {filteredQueue.length} LISTED
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[#d8ddd3] bg-[#fbfaf4] px-3 py-2 text-xs text-[#7b9086]">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search patient, token, complaint..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none text-[#173e35] placeholder:text-[#9aa9a0] w-48 sm:w-64"
              />
            </div>
          </div>

          <div className="divide-y divide-[#e2e5dc]">
            {filteredQueue.map((patient) => (
              <Link
                href={`/clinician/patient/${patient.intake_session_id}`}
                key={patient.intake_session_id}
                data-testid={`link-patient-${patient.token}`}
                className={`group grid gap-4 px-5 py-5 transition-all duration-200 hover:bg-[#edf2e8] md:grid-cols-[82px_1.3fr_1.8fr_150px_82px] md:items-center ${patient.has_red_flags ? 'bg-[#fffaf5]' : ''}`}
              >
                <div>
                  <span className="font-mono text-lg font-medium text-[#a06f42]">{patient.token}</span>
                  <p className="mt-1 text-[10px] text-[#9aaa9f]">{patient.wait_time_minutes}m wait</p>
                </div>
                <div>
                  <p className="font-semibold text-[#244c40]">{patient.patient_name}</p>
                  <p className="mt-1 text-xs text-[#789086]">
                    {patient.patient_age ? `${patient.patient_age} yrs` : 'Age N/A'} · {patient.patient_gender || 'Other'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#4e7063]">{patient.chief_complaint}</p>
                  <p className="mt-1 text-[11px] text-[#8b9c91]">{patient.workflow_type} · {patient.language_code.toUpperCase()}</p>
                </div>
                <div>
                  <StatusPill tone={patient.status_tone}>{patient.status.replace('_', ' ')}</StatusPill>
                </div>
                <div className="flex justify-end">
                  <ArrowRight size={18} className="text-[#9caf9f] transition group-hover:translate-x-1.5 group-hover:text-[#1f5b4e]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ClinicianShell>
  );
}

function RecordPage() {
  const params = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
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
          const found = fallbackQueue.find(p => p.intake_session_id === params.id || p.token === params.id) || fallbackQueue[0];
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
              onset: 'Sudden onset' as string,
              duration: '2 hours',
              severity: 8,
              location: 'Chest / Epigastrium',
              character: 'Heavy squeezing sensation',
              radiation: 'Left shoulder',
              associated_symptoms: ['Breathlessness', 'Sweating'],
              ayush: found.workflow_type === 'AYUSH' ? {
                agni: 'Manda (low)',
                koshtha: 'Krura (hard)',
                doshas: [67, 15, 18],
              } : undefined,
              red_flags: found.has_red_flags ? [{
                rule_id: 'RF-CP-001',
                title: 'Chest Pain with High-Risk Associated Signals',
                reason: 'Patient reported chest discomfort with breathlessness and left shoulder radiation.',
                severity: 'PRIORITY'
              }] : [],
              confidence: 0.95
            },
            submitted_at: found.submitted_at
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
      const res = await fetch(`/api/v1/doctor/patients/${patientDetail.intake_session_id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_session_id: patientDetail.intake_session_id,
          notes: note,
          edits: [],
          generate_fhir: true
        })
      });
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
  const isPriority = (cs.red_flags && cs.red_flags.length > 0) || (cs.severity && cs.severity >= 8);

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
            <button onClick={() => setLocation('/clinician/queue')} data-testid="button-back-queue" className="mb-4 flex items-center gap-2 text-xs font-semibold text-[#668075] hover:text-[#1f5b4e]">
              <ArrowLeft size={15} /> Today’s queue
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm text-[#a06f42]">{patientDetail.token}</span>
              <h1 className="font-serif text-4xl tracking-tight text-[#173e35]">{patientDetail.patient_name}</h1>
              <span className="text-sm text-[#7c9086]">
                {patientDetail.patient_age ? `${patientDetail.patient_age} yrs` : ''} · {patientDetail.patient_gender || 'Other'}
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
              {confirmed ? <><CheckCircle2 size={16} /> Confirmed & Synced</> : <><BadgeCheck size={16} /> Confirm review</>}
            </Button>
            <button onClick={() => setSyncOpen(true)} data-testid="button-open-sync" className="grid h-12 w-12 place-items-center rounded-xl border border-[#cbd6ca] bg-[#f8f7ef] text-[#527467] hover:border-[#1f5b4e]">
              <MoreHorizontal size={19} />
            </button>
          </div>
        </div>

        {isPriority && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e3b6b0] bg-[#fff1ed] p-5 text-[#8f3d36] shadow-sm">
            <TriangleAlert size={21} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Priority Routing Signal · Physician Evaluation Required</p>
              <p className="mt-1 text-sm leading-6 text-[#9f6059]">
                {cs.red_flags?.[0]?.reason || 'Critical clinical flag detected. SwasthyaVaani NEVER diagnoses autonomously; use physician judgement.'}
              </p>
            </div>
          </div>
        )}

        {fhirId && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#9fc1ac] bg-[#eef7ee] p-3 text-xs text-[#22573d]">
            <CheckCircle2 size={16} />
            <span>FHIR R4 Document Bundle Generated & Validated: <strong className="font-mono">{fhirId}</strong></span>
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
                    <p className="text-[11px] text-[#80958a]">Structured from adaptive patient intake</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b8d4c2] bg-[#e7efe5] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#2f644d]">
                    <Sparkles size={11} className="text-[#e1b968]" /> {Math.round((cs.confidence || 0.94) * 100)}% confidence
                  </span>
                  <button onClick={() => setEditing(!editing)} data-testid="button-edit-history" className="text-xs font-semibold text-[#1f5b4e]">
                    {editing ? <><Save size={14} className="mr-1 inline" /> Done</> : <><Pencil size={14} className="mr-1 inline" /> Edit</>}
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
                      <p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#8d9d92]">{label}</p>
                      {editing ? (
                        <input defaultValue={value} className="mt-1 h-9 w-full border-b border-[#b8cabe] bg-transparent text-sm text-[#315b4d] outline-none focus:border-[#1f5b4e]" />
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
                  <p className="mt-1 text-[11px] text-[#80958a]">Agni, Koshtha, and Dosha balance observations</p>
                </div>
                <div className="grid gap-6 p-5 md:grid-cols-[1fr_1.4fr]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-[#edf2e8] p-4 border border-[#dae3d6]">
                      <span className="text-xs font-medium text-[#688176]">Agni</span>
                      <span className="font-semibold text-[#1f5b4e]">{cs.ayush.agni || 'Sama (balanced)'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#edf2e8] p-4 border border-[#dae3d6]">
                      <span className="text-xs font-medium text-[#688176]">Koshtha</span>
                      <span className="font-semibold text-[#1f5b4e]">{cs.ayush.koshtha || 'Madhyam (regular)'}</span>
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
                  <p className="mt-1 text-[11px] text-[#80958a]">Private clinical observations & follow-up</p>
                </div>
                <Pencil size={16} className="text-[#8aa095]" />
              </div>
              <div className="p-5">
                <textarea
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setNoteSaved(false); }}
                  data-testid="input-clinician-notes"
                  rows={3}
                  placeholder="Type notes or clinical findings..."
                  className="w-full resize-none rounded-xl border border-[#ccd7ca] bg-[#fbfaf4] p-3 text-sm leading-6 text-[#476b5e] outline-none focus:border-[#1f5b4e] transition"
                />
                <div className="mt-3 flex items-center justify-end gap-3">
                  {noteSaved && <span className="text-xs text-[#5b876e]">Saved note locally</span>}
                  <Button variant="outline" className="min-h-10 px-4 text-xs" onClick={() => setNoteSaved(true)} testId="button-save-notes">
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
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#8c9d91]">Verification Status</p>
                  <p className="mt-1 font-semibold text-[#27634f]">{confirmed ? 'Physician Confirmed' : 'AI Draft (Needs Review)'}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#8c9d91]">Draft Confidence</p>
                  <div className="mt-2 h-2.5 rounded-full bg-[#dfe6da] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#1f5b4e] to-[#6c9a7d] transition-all" style={{ width: `${Math.round((cs.confidence || 0.94) * 100)}%` }} />
                  </div>
                </div>
                <div className="border-t border-[#e2e5dc] pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#8c9d91]">Clinical Safety</p>
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
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#a06f42]">Physician Confirmation</p>
                <h2 className="mt-2 font-serif text-3xl">Confirm & Sync Record?</h2>
              </div>
              <button onClick={() => setSyncOpen(false)} data-testid="button-close-sync" className="text-[#7b9086]">
                <X size={20} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#60796e]">
              This will record physician verification for {patientDetail.patient_name} (Token #{patientDetail.token}) and generate a compliant FHIR R4 Bundle for hospital sync.
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
              <Button variant="quiet" onClick={() => setSyncOpen(false)} testId="button-cancel-sync">Cancel</Button>
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

export { ClinicianLogin, Queue, RecordPage };
