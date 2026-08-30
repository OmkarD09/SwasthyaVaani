import { useMemo, useState, type ReactNode } from 'react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  HeartPulse,
  Hospital,
  Keyboard,
  Languages,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Mic,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  UserRound,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import './index.css';
import CursorGrid from './components/CursorGrid';
import { PatientTextChat } from './components/PatientTextChat';
import { getKioskTranslation } from './lib/kioskTranslations';
import { ClinicianLogin, Queue, RecordPage } from './pages/ClinicianDashboard';

type IconType = typeof Activity;

const navigation = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'For hospitals', href: '#hospitals' },
  { label: 'Technology', href: '#technology' },
];

const featureCards = [
  {
    icon: Languages,
    eyebrow: '01 / Accessible',
    title: 'Speak in your language',
    copy: 'Patients can share what they feel in the language that comes naturally to them.',
    tone: 'mint',
  },
  {
    icon: Sparkles,
    eyebrow: '02 / Adaptive',
    title: 'Questions that listen',
    copy: 'The intake adapts gently, asking only what is relevant to the patient’s story.',
    tone: 'blue',
  },
  {
    icon: ScanLine,
    eyebrow: '03 / Connected',
    title: 'Scan medical records',
    copy: 'Old prescriptions and reports become searchable context for the care team.',
    tone: 'amber',
  },
  {
    icon: FileCheck2,
    eyebrow: '04 / Prepared',
    title: 'Doctor-ready summary',
    copy: 'A clear, structured handoff helps physicians spend more time on care.',
    tone: 'lavender',
  },
];

const patientSteps = [
  { title: 'Language', caption: 'Choose how you speak', icon: Languages },
  { title: 'Your story', caption: 'Tell us what brings you in', icon: Mic },
  { title: 'Records', caption: 'Add helpful context', icon: FileText },
  { title: 'Ready', caption: 'Review before your doctor', icon: CheckCircle2 },
];

const queuePatients = [
  { name: 'Meena Kumari', id: 'SV-2048', age: '54 yrs', lang: 'हिन्दी', reason: 'Persistent cough', wait: '04 min', priority: 'Priority', initials: 'MK', color: 'coral' },
  { name: 'Rakesh Sharma', id: 'SV-2047', age: '31 yrs', lang: 'English', reason: 'Lower back pain', wait: '11 min', priority: 'Routine', initials: 'RS', color: 'blue' },
  { name: 'Lakshmi Devi', id: 'SV-2046', age: '67 yrs', lang: 'తెలుగు', reason: 'Medication follow-up', wait: '18 min', priority: 'Routine', initials: 'LD', color: 'purple' },
  { name: 'Aarav Menon', id: 'SV-2045', age: '8 yrs', lang: 'English', reason: 'Fever since yesterday', wait: '24 min', priority: 'Priority', initials: 'AM', color: 'green' },
];

const auditRows = [
  { action: 'Summary reviewed', user: 'Dr. Ananya Rao', detail: 'SV-2048 · OPD 2', time: 'Today, 10:42 AM', kind: 'review' },
  { action: 'Patient intake completed', user: 'Kiosk 04', detail: 'SV-2047 · English', time: 'Today, 10:38 AM', kind: 'complete' },
  { action: 'Room status updated', user: 'Nurse station', detail: 'Consultation Room 3', time: 'Today, 10:31 AM', kind: 'room' },
  { action: 'Report uploaded', user: 'Meena Kumari', detail: 'SV-2048 · 1 document', time: 'Today, 10:27 AM', kind: 'upload' },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark"><Activity size={18} strokeWidth={2.5} /></span>
      <span>
        <strong>Swasthya<span>Vaani</span></strong>
        <small>CARE, UNDERSTOOD</small>
      </span>
    </div>
  );
}

function AppButton({
  children,
  onClick,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'dark' | 'soft' | 'amber';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      className={`app-button ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function ShellNav() {
  const [, setLocation] = useLocation();
  return (
    <header className="site-nav">
      <button className="brand-button" onClick={() => setLocation('/')} aria-label="SwasthyaVaani home"><Brand light /></button>
      <nav className="desktop-nav" aria-label="Main navigation">
        {navigation.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
      </nav>
      <div className="nav-actions">
        <button className="login-link" onClick={() => setLocation('/doctor')}>Portal login <ArrowRight size={15} /></button>
        <AppButton onClick={() => setLocation('/patient')} className="nav-cta">Start intake <ArrowRight size={15} /></AppButton>
      </div>
    </header>
  );
}

function Home() {
  const [, setLocation] = useLocation();
  return (
    <main className="home-page">
      <ShellNav />
      <section className="hero">
        <div className="hero-grid" aria-hidden="true">
          <CursorGrid
            cellSize={70}
            color="#EABA61"
            radius={160}
            falloff="smooth"
            holdTime={300}
            fadeDuration={900}
            lineWidth={1}
            maxOpacity={0.65}
            fillOpacity={0.04}
            gridOpacity={0.06}
            cellRadius={0}
            clickPulse={false}
          />
        </div>
        <div className="hero-copy">
          <div className="eyebrow light-eyebrow"><span className="live-dot" /> THE NEW PATIENT FIRST</div>
          <h1>Your story.<br /><em>Understood</em> before<br />you meet the doctor.</h1>
          <p className="hero-lede">An AI-powered multilingual patient intake platform that listens, organizes and summarizes medical history—so every consultation starts with the full picture.</p>
          <div className="hero-actions">
            <AppButton onClick={() => setLocation('/patient')} className="hero-primary">Start patient intake <ArrowRight size={17} /></AppButton>
            <button className="watch-button" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}><span className="play-icon"><Play size={13} fill="currentColor" /></span> See how it works</button>
          </div>
          <div className="trust-note"><ShieldCheck size={16} /> Physician-controlled. Never diagnoses or prescribes.</div>
        </div>
        <div className="hero-visual" aria-label="Patient intake flow preview">
          <div className="visual-glow" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-panel panel-patient">
            <div className="mini-panel-top"><span className="mini-status"><span /> Live intake</span><MoreHorizontal size={17} /></div>
            <div className="patient-avatar"><UserRound size={28} /></div>
            <div className="mini-label">PATIENT STORY</div>
            <strong>“I’ve had a cough<br />for about two weeks.”</strong>
            <div className="voice-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <span className="audio-label"><Volume2 size={12} /> Hindi · 00:18</span>
          </div>
          <div className="hero-panel panel-ai">
            <div className="ai-icon"><Sparkles size={17} /></div>
            <div><span className="mini-label">AI INTAKE</span><strong>Listening for context</strong></div>
            <div className="ai-pulse" />
          </div>
          <div className="hero-panel panel-summary">
            <div className="summary-title"><span className="summary-check"><Check size={12} /></span><span><span className="mini-label">CLINICAL SUMMARY</span><strong>Ready for review</strong></span></div>
            <div className="summary-line"><span>Chief concern</span><b>Persistent cough</b></div>
            <div className="summary-line"><span>Duration</span><b>2 weeks</b></div>
            <div className="summary-line"><span>Records</span><b className="safe-text"><CheckCircle2 size={12} /> 2 attached</b></div>
            <div className="review-bar"><span>Physician review</span><b>100%</b></div>
          </div>
          <div className="flow-tag tag-top"><span className="tag-number">01</span> Patient speaks</div>
          <div className="flow-tag tag-bottom"><span className="tag-number tag-green">03</span> Doctor reviews</div>
          <svg className="connector connector-one" viewBox="0 0 150 110" fill="none"><path d="M4 104C65 103 52 8 147 7" stroke="rgba(110,213,200,.6)" strokeDasharray="4 6" /></svg>
          <svg className="connector connector-two" viewBox="0 0 150 110" fill="none"><path d="M2 5C72 3 53 104 148 103" stroke="rgba(110,213,200,.6)" strokeDasharray="4 6" /></svg>
        </div>
        <div className="hero-footnote"><span>Scroll to explore</span><span className="scroll-line" /></div>
      </section>

      <section className="flow-section" id="how-it-works">
        <div className="section-kicker">A better beginning to every consultation</div>
        <div className="flow-heading"><h2>From first word<br />to <em>full picture.</em></h2><p>One connected experience for the patient, the care team and the hospital. Designed to make busy OPDs feel more human.</p></div>
        <div className="journey-line">
          {[
            { n: '01', icon: UserRound, title: 'Patient arrives', copy: 'A welcoming kiosk meets them where they are.' },
            { n: '02', icon: Sparkles, title: 'AI listens', copy: 'Adaptive questions, in their language and voice.' },
            { n: '03', icon: FileText, title: 'Story takes shape', copy: 'Records and answers become clear context.' },
            { n: '04', icon: Stethoscope, title: 'Doctor is ready', copy: 'A structured summary, always for review.' },
          ].map((item, index) => {
            const Icon = item.icon;
            return <div className="journey-step" key={item.n}><div className="journey-icon"><Icon size={20} /></div><span className="step-number">{item.n}</span><h3>{item.title}</h3><p>{item.copy}</p>{index < 3 && <span className="journey-arrow"><ArrowRight size={15} /></span>}</div>;
          })}
        </div>
      </section>

      <section className="feature-section" id="features">
        <div className="section-intro"><div><div className="section-kicker">Built around the patient</div><h2>Technology that<br /><em>feels like care.</em></h2></div><p>Every detail is made to reduce friction, preserve dignity and give clinicians a clearer starting point.</p></div>
        <div className="feature-grid">{featureCards.map((feature) => { const Icon = feature.icon; return <article key={feature.title} className={`feature-card ${feature.tone}`}><div className="feature-icon"><Icon size={22} /></div><div className="feature-eyebrow">{feature.eyebrow}</div><h3>{feature.title}</h3><p>{feature.copy}</p><ArrowRight className="feature-arrow" size={18} /></article>; })}</div>
      </section>

      <section className="opd-section" id="hospitals">
        <div className="opd-copy"><div className="section-kicker light-eyebrow">For high-volume OPDs</div><h2>More clarity.<br /><em>Less waiting.</em></h2><p>SwasthyaVaani turns the minutes before a consultation into meaningful clinical context—without taking control away from the physician.</p><AppButton variant="outline" onClick={() => setLocation('/admin')}>Explore the hospital portal <ArrowRight size={16} /></AppButton></div>
        <div className="opd-metrics"><div className="metric-main"><span>UP TO</span><strong>34%</strong><p>faster patient intake</p><div className="metric-spark"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div><div className="metric-list"><div><span className="metric-number">12+</span><span>languages ready<br />to listen</span></div><div><span className="metric-number">3×</span><span>more structured<br />history at a glance</span></div><div><span className="metric-number">100%</span><span>physician-controlled<br />review</span></div></div></div>
      </section>

      <section className="principles-section" id="technology">
        <div className="principles-art"><div className="principle-orb" /><div className="principle-card principle-card-one"><LockKeyhole size={15} /><span>Privacy by design</span><b>Encrypted & secure</b></div><div className="principle-card principle-card-two"><Activity size={15} /><span>Always learning</span><b>Never diagnosing</b></div></div>
        <div className="principles-copy"><div className="section-kicker">The SwasthyaVaani promise</div><h2>Advanced where<br />it matters.<br /><em>Human always.</em></h2><p>AI handles the structure. Doctors hold the expertise. Patients keep their voice. That’s the line we never cross.</p><div className="principle-points"><div><ShieldCheck size={18} /><span>Built for trust</span></div><div><Hospital size={18} /><span>Ready for real hospitals</span></div><div><Languages size={18} /><span>Made for India’s diversity</span></div></div></div>
      </section>

      <footer className="site-footer"><div className="footer-top"><Brand light /><div className="footer-callout">Every patient has a story.<br /><em>Let’s make it heard.</em></div><AppButton onClick={() => setLocation('/patient')}>Start with SwasthyaVaani <ArrowRight size={16} /></AppButton></div><div className="footer-bottom"><span>SIH 2026 · PS 26047</span><span>Ministry of AYUSH</span><span>ABDM-ready architecture</span><span>Privacy & security</span><span>© 2026 SwasthyaVaani</span></div></footer>
    </main>
  );
}

function PortalTopbar({ title, subtitle, onMenu }: { title: string; subtitle: string; onMenu?: () => void }) {
  const [, setLocation] = useLocation();
  return <header className="portal-topbar"><button className="mobile-menu" onClick={onMenu}><Menu size={20} /></button><div><div className="portal-title">{title}</div><div className="portal-subtitle">{subtitle}</div></div><div className="portal-actions"><button className="icon-button"><Bell size={18} /><span className="notification-dot" /></button><div className="portal-user"><div className="user-avatar">AR</div><div><b>Dr. Ananya Rao</b><span>General Medicine</span></div><ChevronDown size={15} /></div><button className="exit-button" onClick={() => setLocation('/')}>Exit portal</button></div></header>;
}

function PortalSidebar({ active, onNavigate, mobileOpen }: { active: string; onNavigate: (path: string) => void; mobileOpen?: boolean }) {
  const links = [
    { label: 'Overview', icon: LayoutDashboard, path: '/doctor' },
    { label: 'Triage queue', icon: Users, path: '/doctor' },
    { label: 'Patient summaries', icon: FileText, path: '/doctor' },
    { label: 'Analytics', icon: BarChart3, path: '/admin' },
  ];
  return <aside className={`portal-sidebar ${mobileOpen ? 'mobile-open' : ''}`}><div className="portal-brand" onClick={() => onNavigate('/')}><Brand /></div><div className="portal-context"><span className="context-icon"><Hospital size={16} /></span><div><b>District Hospital</b><span>North wing · OPD 2</span></div><ChevronDown size={14} /></div><div className="side-label">WORKSPACE</div><nav className="portal-nav">{links.map((link, index) => { const Icon = link.icon; return <button key={link.label} className={active === link.label ? 'active' : ''} onClick={() => onNavigate(link.path)}><Icon size={18} /><span>{link.label}</span>{index === 1 && <b className="queue-count">08</b>}</button>; })}</nav><div className="side-label side-label-spaced">SYSTEM</div><nav className="portal-nav"><button><Settings2 size={18} /><span>Settings</span></button><button><CircleHelp size={18} /><span>Help & support</span></button></nav><div className="sidebar-bottom"><div className="secure-badge"><LockKeyhole size={15} /><span><b>Secure workspace</b><small>Last synced just now</small></span></div><button className="sidebar-home" onClick={() => onNavigate('/')}><ArrowLeft size={15} /> Back to welcome</button></div></aside>;
}

function DoctorPortal() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const patient = queuePatients[selected];
  return <main className="portal-page"><PortalSidebar active="Triage queue" onNavigate={setLocation} mobileOpen={mobileOpen} /><div className="portal-content"><PortalTopbar title="Good morning, Ananya" subtitle="Tuesday, 18 June 2026 · District Hospital" onMenu={() => setMobileOpen(!mobileOpen)} /><div className="portal-main"><div className="portal-heading-row"><div><div className="section-kicker">Tuesday OPD · 10:44 AM</div><h1>Your triage queue</h1><p>Review patient stories before they enter the consultation room.</p></div><AppButton variant="soft" onClick={() => setLocation('/patient')}><Plus size={16} /> New intake</AppButton></div><div className="doctor-stats"><div className="doctor-stat accent"><span className="stat-icon"><Users size={17} /></span><div><span>Waiting now</span><strong>08</strong></div><small>+2 this hour</small></div><div className="doctor-stat"><span className="stat-icon"><Clock3 size={17} /></span><div><span>Avg. wait time</span><strong>14 <small>min</small></strong></div><small className="good">↓ 18% today</small></div><div className="doctor-stat"><span className="stat-icon"><CheckCircle2 size={17} /></span><div><span>Reviewed today</span><strong>26</strong></div><small>of 34 patients</small></div><div className="doctor-stat"><span className="stat-icon"><Languages size={17} /></span><div><span>Languages today</span><strong>07</strong></div><small>across OPD</small></div></div><div className="doctor-workspace"><section className="queue-panel"><div className="panel-heading"><div><h2>Live patient queue <span className="live-pill"><span /> Live</span></h2><p>Prioritized by arrival and clinical flags</p></div><button className="filter-button"><span>All patients</span><ChevronDown size={14} /></button></div><div className="queue-list">{queuePatients.map((item, index) => <button className={`queue-row ${selected === index ? 'selected' : ''}`} key={item.id} onClick={() => setSelected(index)}><div className={`queue-avatar ${item.color}`}>{item.initials}</div><div className="queue-patient"><b>{item.name}</b><span>{item.id} · {item.age}</span></div><div className="queue-reason"><b>{item.reason}</b><span><Languages size={12} /> {item.lang}</span></div><div className={`priority ${item.priority === 'Priority' ? 'priority-high' : ''}`}><span />{item.priority}</div><div className="queue-wait"><span>Waiting</span><b>{item.wait}</b></div><ArrowRight size={17} className="row-arrow" /></button>)}</div><button className="view-all-button">View all 8 patients <ArrowRight size={15} /></button></section><aside className="summary-panel"><div className="summary-panel-top"><div><span className="section-kicker">Selected patient</span><h2>Patient summary</h2></div><button className="more-button"><MoreHorizontal size={18} /></button></div><div className="selected-profile"><div className={`queue-avatar ${patient.color}`}>{patient.initials}</div><div><h3>{patient.name}</h3><span>{patient.id} · {patient.age} · {patient.lang}</span></div><span className="profile-status">Waiting {patient.wait}</span></div><div className="ai-notice"><Sparkles size={16} /><span><b>AI-structured summary</b><small>For physician review only</small></span><CheckCircle2 size={15} /></div><div className="summary-block"><span className="summary-block-label">CHIEF CONCERN</span><h3>{patient.reason}</h3><p>Patient reports a persistent cough with intermittent throat irritation, more noticeable at night. No shortness of breath reported during intake.</p></div><div className="summary-block"><span className="summary-block-label">INTAKE SIGNALS</span><div className="signal-row"><span>Duration</span><b>About 2 weeks</b></div><div className="signal-row"><span>Severity</span><b className="amber-text">Moderate · 5/10</b></div><div className="signal-row"><span>Previous history</span><b>Seasonal allergies</b></div></div><div className="summary-block"><span className="summary-block-label">ATTACHMENTS <small>2</small></span><div className="attachment-row"><FileText size={16} /><span><b>Prescription_May2026.pdf</b><small>Uploaded 10:27 AM · 1.2 MB</small></span><button><ArrowRight size={14} /></button></div><div className="attachment-row"><FileText size={16} /><span><b>Chest_Xray_Report.jpg</b><small>Uploaded 10:27 AM · 840 KB</small></span><button><ArrowRight size={14} /></button></div></div><div className="summary-actions"><AppButton onClick={() => setSelected((selected + 1) % queuePatients.length)}><Check size={16} /> Mark reviewed</AppButton><button className="secondary-action"><MoreHorizontal size={17} /> More actions</button></div></aside></div></div></div></main>;
}

function PatientKiosk() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
<<<<<<< HEAD
  const [language, setLanguage] = useState('');
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [searchQuery, setSearchQuery] = useState('');
=======
  const [language, setLanguage] = useState('English');
  const [mode, setMode] = useState<'voice' | 'touch'>('voice');
  const [workflow, setWorkflow] = useState<'GENERAL_CLINICAL' | 'AYUSH'>('GENERAL_CLINICAL');
  const [patientName, setPatientName] = useState('Ananya Sharma');
  const [patientAge, setPatientAge] = useState(34);
  const [patientGender, setPatientGender] = useState('Female');
  
  // Live Intake Session State
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [token, setToken] = useState<string>('A-028');
  const [activeQuestion, setActiveQuestion] = useState('What brings you in today?');
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [targetField, setTargetField] = useState<string>('chief_complaint');
  const [patientAnswer, setPatientAnswer] = useState('');
  const [extractedSummary, setExtractedSummary] = useState<Record<string, any>>({});
>>>>>>> c0701e87aba21e9a22f978a12f3421a235608298
  const [uploaded, setUploaded] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
<<<<<<< HEAD

  const t = getKioskTranslation(language || 'English');

  const languages = [
    { name: 'English', sub: 'English' },
    { name: 'हिन्दी', sub: 'Hindi' },
    { name: 'বাংলা', sub: 'Bengali' },
    { name: 'मराठी', sub: 'Marathi' },
    { name: 'తెలుగు', sub: 'Telugu' },
    { name: 'தமிழ்', sub: 'Tamil' },
    { name: 'ગુજરાતી', sub: 'Gujarati' },
    { name: 'ಕನ್ನಡ', sub: 'Kannada' },
    { name: 'മലയാളം', sub: 'Malayalam' },
    { name: 'ਪੰਜਾਬੀ', sub: 'Punjabi' },
    { name: 'ଓଡ଼ିଆ', sub: 'Odia' },
    { name: 'অসমীয়া', sub: 'Assamese' },
    { name: 'اردو', sub: 'Urdu' },
  ];

  const filteredLanguages = languages.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sub.toLowerCase().includes(q)
    );
  });

  const dynamicSteps = [
    { title: t.steps.language.title, caption: t.steps.language.caption, icon: Languages },
    { title: t.steps.story.title, caption: t.steps.story.caption, icon: Mic },
    { title: t.steps.records.title, caption: t.steps.records.caption, icon: FileText },
    { title: t.steps.ready.title, caption: t.steps.ready.caption, icon: CheckCircle2 },
  ];

  const next = () => {
    if (!language && step === 0) return;
    setStep(Math.min(3, step + 1));
=======
  const [loading, setLoading] = useState(false);

  const languages = ['English', 'हिन्दी', 'বাংলা', 'मराठी', 'తెలుగు', 'தமிழ்'];

  // Start Session when leaving Step 0
  const handleStartIntake = async () => {
    setLoading(true);
    const langCode = language === 'हिन्दी' ? 'hi' : 'en';
    try {
      const res = await fetch('/api/v1/intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          patient_age: patientAge,
          patient_gender: patientGender,
          hospital_id: 'hosp_district_01',
          doctor_id: 'doc_001',
          workflow_type: workflow,
          language_code: langCode,
          interaction_mode: mode.toUpperCase(),
          consent_given: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntakeId(data.id);
        setToken(data.token);
      }
    } catch (e) {
      console.warn('Using offline intake session:', e);
    } finally {
      setLoading(false);
      setStep(1);
    }
  };

  // Submit answer and receive next adaptive question
  const handleSubmitAnswer = async () => {
    if (!patientAnswer.trim()) {
      setStep(2);
      return;
    }
    setLoading(true);
    const langCode = language === 'हिन्दी' ? 'hi' : 'en';
    try {
      if (intakeId) {
        const res = await fetch(`/api/v1/intakes/${intakeId}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_event_id: activeQuestionId,
            raw_text: patientAnswer,
            input_mode: mode.toUpperCase(),
            language_code: langCode,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setExtractedSummary(prev => ({ ...prev, ...data.extracted_facts }));
          if (data.decision && data.decision.action === 'ASK' && data.decision.question) {
            setActiveQuestion(data.decision.question);
            setTargetField(data.decision.target_field || '');
            setPatientAnswer('');
            setRecording(false);
            setLoading(false);
            return; // Ask next adaptive question
          }
        }
      }
    } catch (e) {
      console.warn('Offline answer ingestion:', e);
    } finally {
      setLoading(false);
      setStep(2);
    }
  };

  // Document upload
  const handleFileUpload = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    const fileName = file ? file.name : 'Prescription_May2026.pdf';
    setUploadedDocName(fileName);
    setUploaded(true);
    if (file && intakeId) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', 'pat_demo');
      formData.append('intake_session_id', intakeId);
      formData.append('document_type', 'PRESCRIPTION');
      try {
        await fetch('/api/v1/documents/upload', {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        console.warn('Doc upload error:', err);
      }
    }
  };

  // Final submission into Doctor Queue
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      if (intakeId) {
        await fetch(`/api/v1/intakes/${intakeId}/submit`, {
          method: 'POST',
        });
      }
    } catch (e) {
      console.warn('Submit offline:', e);
    } finally {
      setLoading(false);
      setLocation('/clinician/queue');
    }
>>>>>>> c0701e87aba21e9a22f978a12f3421a235608298
  };

  return (
    <main className="kiosk-page">
<<<<<<< HEAD
      <div className="kiosk-layout">
        <aside className="kiosk-progress">
          <div className="kiosk-brand">
            <button
              className="brand-button"
              onClick={() => setLocation('/')}
              aria-label="SwasthyaVaani home"
            >
              <Brand light />
            </button>
          </div>
          <div className="kiosk-welcome">
            <span className="eyebrow">{t.intakeEyebrow}</span>
            <h1>
              {t.careStartsHere}
              <br />
              <em>{t.careStartsHereEm}</em>
            </h1>
            <p>{t.careDescription}</p>
          </div>
          <div className="step-list">
            {dynamicSteps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  className={`kiosk-step ${index === step ? 'current' : ''} ${index < step ? 'done' : ''}`}
                  key={item.title + index}
                >
                  <span className="step-icon">
                    {index < step ? <Check size={17} /> : <Icon size={17} />}
                  </span>
=======
      <header className="kiosk-topbar">
        <button className="brand-button" onClick={() => setLocation('/')}>
          <Brand />
        </button>
        <div className="kiosk-right">
          <span className="kiosk-secure">
            <ShieldCheck size={15} /> Private & Secure
          </span>
          <button className="language-mini">
            <Languages size={16} /> {language} <ChevronDown size={13} />
          </button>
          <button className="kiosk-close" onClick={() => setLocation('/')}>
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="kiosk-layout">
        <aside className="kiosk-progress">
          <div className="kiosk-welcome">
            <span className="eyebrow">PATIENT INTAKE</span>
            <h1>Your care<br /><em>starts here.</em></h1>
            <p>Take a few quiet minutes to share what brings you in today.</p>
          </div>
          <div className="step-list">
            {patientSteps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div className={`kiosk-step ${index === step ? 'current' : ''} ${index < step ? 'done' : ''}`} key={item.title}>
                  <span className="step-icon">{index < step ? <Check size={17} /> : <Icon size={17} />}</span>
>>>>>>> c0701e87aba21e9a22f978a12f3421a235608298
                  <span>
                    <b>{item.title}</b>
                    <small>{item.caption}</small>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="kiosk-help">
            <CircleHelp size={16} />
<<<<<<< HEAD
            <span>{t.needHelp}</span>
          </div>
        </aside>
        <section className="kiosk-main">
          <div className="kiosk-main-inner">
            <div className="kiosk-progress-top">
              <span>
                {t.stepPrefix} {String(step + 1).padStart(2, '0')} {t.stepOf} 04
              </span>
=======
            <span>Need help? Ask a staff member nearby.</span>
          </div>
        </aside>

        <section className="kiosk-main">
          <div className="kiosk-main-inner">
            <div className="kiosk-progress-top">
              <span>STEP {String(step + 1).padStart(2, '0')} OF 04</span>
>>>>>>> c0701e87aba21e9a22f978a12f3421a235608298
              <div>
                <i className={step >= 0 ? 'filled' : ''} />
                <i className={step >= 1 ? 'filled' : ''} />
                <i className={step >= 2 ? 'filled' : ''} />
                <i className={step >= 3 ? 'filled' : ''} />
              </div>
              <span className="time-note">
<<<<<<< HEAD
                <Clock3 size={14} /> {t.durationNote}
              </span>
            </div>
            {step === 0 && (
              <div className="kiosk-card language-card">
                <div className="kiosk-card-heading">
                  <span className="section-kicker">{t.langKicker}</span>
                  <h2>{t.langHeading}</h2>
                  <p>{t.langSubtitle}</p>
                </div>
                <div className="language-search-wrap">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    className="language-search-input"
                    placeholder="Search your language..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {filteredLanguages.length === 0 ? (
                  <div className="language-no-results">
                    No languages found matching &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div className="language-grid-wrap">
                    <div className="language-grid">
                      {filteredLanguages.map((item) => (
                        <button
                          key={item.sub}
                          className={language === item.name || language === item.sub ? 'selected' : ''}
                          onClick={() => setLanguage(item.name)}
                        >
                          <span className="language-radio">
                            {(language === item.name || language === item.sub) && <Check size={14} />}
                          </span>
                          <b>{item.name}</b>
                          <small>{item.sub}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mode-heading">
                  <span className="section-kicker">{t.modeKicker}</span>
                  <div className="mode-toggle">
                    <button
                      className={mode === 'voice' ? 'active' : ''}
                      onClick={() => setMode('voice')}
                    >
                      <Mic size={19} /> {t.modeVoice}
                    </button>
                    <button
                      className={mode === 'text' ? 'active' : ''}
                      onClick={() => setMode('text')}
                    >
                      <Keyboard size={19} /> {t.modeText}
                    </button>
                  </div>
                </div>
                <AppButton
                  variant="amber"
                  onClick={next}
                  disabled={!language}
                  className="kiosk-next"
                >
                  {t.btnContinue} <ArrowRight size={17} />
                </AppButton>
              </div>
            )}
            {step === 1 && (
              mode === 'text' ? (
                <PatientTextChat
                  language={language}
                  onComplete={() => setStep(2)}
                  onSwitchToVoice={() => setMode('voice')}
                />
              ) : (
                <div className="kiosk-card story-card">
                  <div className={`listen-orb ${recording ? 'recording' : ''}`}>
                    <div className="listen-inner">
                      {recording ? <Activity size={29} /> : <Mic size={29} />}
                    </div>
                  </div>
                  <span className="section-kicker">
                    {t.speakingIn} {language}
                  </span>
                  <h2>{t.storyHeading}</h2>
                  <p className="story-instruction">
                    {recording ? t.storyInstructionActive : t.storyInstructionIdle}
                  </p>
                  <button
                    className={`record-button ${recording ? 'recording' : ''}`}
                    onClick={() => setRecording(!recording)}
                  >
                    {recording ? (
                      <>
                        <span className="recording-bars">
                          <i />
                          <i />
                          <i />
                        </span>{' '}
                        {t.btnListening}
                      </>
                    ) : (
                      <>
                        <Mic size={19} /> {t.btnTapToSpeak}
                      </>
                    )}
                  </button>
                  <div className="touch-fallback">
                    <span>{t.preferTyping}</span>
                    <button onClick={() => setMode('text')}>
                      {t.useTouchInstead} <ArrowRight size={14} />
                    </button>
                  </div>
                  <AppButton onClick={next} className="kiosk-next">
                    {t.btnContinue} <ArrowRight size={17} />
                  </AppButton>
                </div>
              )
            )}
=======
                <Clock3 size={14} /> Token: <strong className="font-mono text-[#a06f42]">{token}</strong>
              </span>
            </div>

            {/* STEP 0: LANGUAGE & WORKFLOW SELECTION */}
            {step === 0 && (
              <div className="kiosk-card language-card">
                <div className="kiosk-card-icon">
                  <Languages size={25} />
                </div>
                <div className="kiosk-card-heading">
                  <span className="section-kicker">Welcome to SwasthyaVaani</span>
                  <h2>Which language would<br />you like to speak?</h2>
                  <p>Choose your preferred language for the voice interview.</p>
                </div>
                <div className="language-grid">
                  {languages.map((item) => (
                    <button
                      key={item}
                      className={language === item ? 'selected' : ''}
                      onClick={() => setLanguage(item)}
                    >
                      <span className="language-radio">{language === item && <Check size={14} />}</span>
                      <b>{item}</b>
                      {item === 'English' && <small>English</small>}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <span className="section-kicker">Clinical Stream</span>
                  <div className="mode-toggle mt-2">
                    <button
                      className={workflow === 'GENERAL_CLINICAL' ? 'active' : ''}
                      onClick={() => setWorkflow('GENERAL_CLINICAL')}
                    >
                      <Stethoscope size={18} /> General Medicine
                    </button>
                    <button
                      className={workflow === 'AYUSH' ? 'active' : ''}
                      onClick={() => setWorkflow('AYUSH')}
                    >
                      <HeartPulse size={18} /> AYUSH OPD
                    </button>
                  </div>
                </div>

                <div className="mode-heading">
                  <span className="section-kicker">How would you like to answer?</span>
                  <div className="mode-toggle">
                    <button className={mode === 'voice' ? 'active' : ''} onClick={() => setMode('voice')}>
                      <Mic size={19} /> Voice
                    </button>
                    <button className={mode === 'touch' ? 'active' : ''} onClick={() => setMode('touch')}>
                      <ScanLine size={19} /> Text / Touch
                    </button>
                  </div>
                </div>
                <AppButton onClick={handleStartIntake} className="kiosk-next" disabled={loading}>
                  {loading ? 'Initializing…' : <>Start Intake <ArrowRight size={17} /></>}
                </AppButton>
              </div>
            )}

            {/* STEP 1: ADAPTIVE STORY & VOICE */}
            {step === 1 && (
              <div className="kiosk-card story-card">
                <div className={`listen-orb ${recording ? 'recording' : ''}`}>
                  <div className="listen-inner">
                    {recording ? <Activity size={29} /> : <Mic size={29} />}
                  </div>
                </div>
                <span className="section-kicker">Adaptive Question · {language}</span>
                <h2 className="text-2xl font-serif">{activeQuestion}</h2>
                <p className="story-instruction">
                  {recording
                    ? 'Listening… speak naturally about your symptoms.'
                    : 'Tap to speak, or type your answer below.'}
                </p>

                <div className="my-4 w-full">
                  <textarea
                    rows={2}
                    value={patientAnswer}
                    onChange={(e) => setPatientAnswer(e.target.value)}
                    placeholder={
                      language === 'हिन्दी'
                        ? 'उदा. मुझे 3 दिनों से तेज बुखार और सिरदर्द है...'
                        : 'e.g. I have had fever and chest discomfort since 3 days...'
                    }
                    className="w-full rounded-xl border border-[#cbd6ca] bg-[#fbfaf4] p-3 text-sm text-[#173e35] outline-none focus:border-[#1f5b4e]"
                  />
                </div>

                <div className="flex gap-2 w-full">
                  <button
                    className={`record-button flex-1 ${recording ? 'recording' : ''}`}
                    onClick={() => {
                      setRecording(!recording);
                      if (!recording && !patientAnswer) {
                        setPatientAnswer(
                          language === 'हिन्दी'
                            ? 'मुझे 3 दिनों से तेज बुखार और खांसी है, दर्द 6/10 है'
                            : 'I have had persistent chest tightness and mild fever for 2 days, severity 6 out of 10'
                        );
                      }
                    }}
                  >
                    {recording ? (
                      <><span className="recording-bars"><i /><i /><i /></span> Listening…</>
                    ) : (
                      <><Mic size={19} /> {patientAnswer ? 'Audio recorded' : 'Tap to speak'}</>
                    )}
                  </button>
                </div>

                {Object.keys(extractedSummary).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {Object.entries(extractedSummary).map(([k, v]) => (
                      <span key={k} className="rounded-full bg-[#dbeade] px-3 py-1 font-mono text-[#245746]">
                        ✓ {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                )}

                <AppButton onClick={handleSubmitAnswer} className="kiosk-next mt-4" disabled={loading}>
                  {loading ? 'Analyzing with AI…' : <>Next Question <ArrowRight size={17} /></>}
                </AppButton>
              </div>
            )}

            {/* STEP 2: DOCUMENTS UPLOAD */}
>>>>>>> c0701e87aba21e9a22f978a12f3421a235608298
            {step === 2 && (
              <div className="kiosk-card records-card">
                <div className="kiosk-card-icon amber-icon">
                  <Paperclip size={25} />
                </div>
                <div className="kiosk-card-heading">
<<<<<<< HEAD
                  <span className="section-kicker">{t.recordsKicker}</span>
                  <h2>{t.recordsHeading}</h2>
                  <p>{t.recordsSubtitle}</p>
                </div>
                {uploaded ? (
                  <div className="uploaded-file">
                    <span className="file-check">
                      <Check size={16} />
                    </span>
                    <span>
                      <b>Prescription_May2026.pdf</b>
                      <small>{t.recordReadySub}</small>
                    </span>
                    <button onClick={() => setUploaded(false)}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="upload-options">
                    <button onClick={() => setUploaded(true)}>
                      <span>
                        <Upload size={21} />
                      </span>
                      <b>{t.uploadDeviceTitle}</b>
                      <small>{t.uploadDeviceSub}</small>
                    </button>
                    <button onClick={() => setUploaded(true)}>
                      <span>
                        <Camera size={21} />
                      </span>
                      <b>{t.takePhotoTitle}</b>
                      <small>{t.takePhotoSub}</small>
                    </button>
                  </div>
                )}
                <button className="skip-link" onClick={next}>
                  {uploaded ? t.btnContinueWithoutMore : t.btnSkip} <ArrowRight size={14} />
                </button>
                <AppButton onClick={next} className="kiosk-next">
                  {uploaded ? t.btnContinue : t.btnContinueWithoutReport} <ArrowRight size={17} />
                </AppButton>
              </div>
            )}
=======
                  <span className="section-kicker">Helpful context</span>
                  <h2>Do you have an old<br />prescription or lab report?</h2>
                  <p>Our secure OCR pipeline extracts relevant facts for your doctor.</p>
                </div>
                {uploaded ? (
                  <div className="uploaded-file">
                    <span className="file-check"><Check size={16} /></span>
                    <span>
                      <b>{uploadedDocName || 'Prescription_May2026.pdf'}</b>
                      <small>Attached for doctor review · OCR Processed</small>
                    </span>
                    <button onClick={() => setUploaded(false)}><X size={15} /></button>
                  </div>
                ) : (
                  <div className="upload-options">
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#b8cabe] bg-[#fbfaf4] p-5 text-center transition hover:border-[#1f5b4e]">
                      <Upload size={24} className="text-[#1f5b4e]" />
                      <b className="mt-2 text-sm text-[#173e35]">Upload from device</b>
                      <small className="text-xs text-[#7b9086]">PDF, JPG or PNG</small>
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button onClick={() => handleFileUpload()}>
                      <span><Camera size={21} /></span>
                      <b>Use demo sample</b>
                      <small>Sample prescription</small>
                    </button>
                  </div>
                )}
                <button className="skip-link" onClick={() => setStep(3)}>
                  {uploaded ? 'Continue with attached file' : 'Skip for now'} <ArrowRight size={14} />
                </button>
                <AppButton onClick={() => setStep(3)} className="kiosk-next">
                  Continue to Summary <ArrowRight size={17} />
                </AppButton>
              </div>
            )}

            {/* STEP 3: PATIENT REVIEW & SUBMIT TO QUEUE */}
>>>>>>> c0701e87aba21e9a22f978a12f3421a235608298
            {step === 3 && (
              <div className="kiosk-card ready-card">
                <div className="ready-check">
                  <Check size={32} />
                </div>
<<<<<<< HEAD
                <span className="section-kicker">{t.readyKicker}</span>
                <h2>
                  {t.readyHeading}
                  <br />
                  <em>{t.readyHeadingEm}</em>
                </h2>
                <p>{t.readySubtitle}</p>
                <div className="ready-summary">
                  <div>
                    <span>
                      <UserRound size={15} /> {t.summaryPatient}
                    </span>
                    <b>Meena Kumari</b>
                  </div>
                  <div>
                    <span>
                      <Languages size={15} /> {t.summaryLanguage}
                    </span>
                    <b>{language}</b>
                  </div>
                  <div>
                    <span>
                      <FileText size={15} /> {t.summaryRecords}
                    </span>
                    <b>{uploaded ? t.summaryOneAttached : t.summaryNoneAdded}</b>
                  </div>
                </div>
                <div className="privacy-callout">
                  <ShieldCheck size={17} />
                  <span>
                    <b>{t.privacyTitle}</b>
                    <small>{t.privacySub}</small>
                  </span>
                </div>
                <AppButton onClick={() => setLocation('/doctor')} className="kiosk-next">
                  {t.btnFinishNotify} <ArrowRight size={17} />
=======
                <span className="section-kicker">You are all set</span>
                <h2>Your intake summary<br />is ready for the doctor.</h2>
                <p>We’ve organized your answers into a clear structured brief for the clinician.</p>
                
                <div className="ready-summary">
                  <div>
                    <span><UserRound size={15} /> Patient</span>
                    <b>{patientName} ({patientAge} yrs)</b>
                  </div>
                  <div>
                    <span><Languages size={15} /> Language</span>
                    <b>{language}</b>
                  </div>
                  <div>
                    <span><FileText size={15} /> Queue Token</span>
                    <b className="font-mono text-[#a06f42]">#{token}</b>
                  </div>
                </div>

                <div className="privacy-callout">
                  <ShieldCheck size={17} />
                  <span>
                    <b>Physician-Controlled AI</b>
                    <small>Your doctor remains the sole clinical decision maker.</small>
                  </span>
                </div>
                <AppButton onClick={handleFinalSubmit} className="kiosk-next" disabled={loading}>
                  {loading ? 'Submitting to Queue…' : <>Submit & Enter Doctor Queue <ArrowRight size={17} /></>}
>>>>>>> c0701e87aba21e9a22f978a12f3421a235608298
                </AppButton>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


function AdminPortal() {
  const [, setLocation] = useLocation();
  const [range, setRange] = useState('Today');
  const bars = useMemo(() => [42, 55, 48, 68, 61, 77, 72, 88, 70, 94, 83, 97], []);
  return <main className="portal-page admin-page"><PortalSidebar active="Analytics" onNavigate={setLocation} /><div className="portal-content"><PortalTopbar title="Hospital operations" subtitle="District Hospital · North wing" /><div className="portal-main"><div className="portal-heading-row"><div><div className="section-kicker">SYSTEM OVERVIEW · LIVE</div><h1>Good morning, admin</h1><p>A clear view of intake, people and the spaces that keep care moving.</p></div><div className="range-switch">{['Today', '7 days', '30 days'].map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}</button>)}</div></div><div className="admin-stats"><div className="admin-stat"><span className="admin-stat-icon mint"><Users size={18} /></span><div><span>Patients processed</span><strong>186</strong><small><b>+12%</b> vs last {range.toLowerCase()}</small></div></div><div className="admin-stat"><span className="admin-stat-icon blue"><Clock3 size={18} /></span><div><span>Average wait</span><strong>16 <small>min</small></strong><small><b>↓ 21%</b> improvement</small></div></div><div className="admin-stat"><span className="admin-stat-icon amber"><Building2 size={18} /></span><div><span>Active departments</span><strong>06</strong><small>24 rooms online</small></div></div><div className="admin-stat"><span className="admin-stat-icon lavender"><ShieldCheck size={18} /></span><div><span>System uptime</span><strong>99.8<small>%</small></strong><small><b>Healthy</b> · last 30 days</small></div></div></div><div className="admin-grid"><section className="analytics-panel"><div className="panel-heading"><div><h2>Intake activity</h2><p>Completed patient intakes by hour</p></div><button className="export-button"><Upload size={14} /> Export</button></div><div className="chart-wrap"><div className="chart-y"><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="bar-chart">{bars.map((height, index) => <div className="bar-column" key={index}><div className="bar" style={{ height: `${height}%` }}><span>{height === 97 ? '28' : ''}</span></div><small>{['8 AM', '', '10 AM', '', '12 PM', '', '2 PM', '', '4 PM', '', '6 PM', ''][index]}</small></div>)}</div></div><div className="chart-footer"><span><i className="legend-dot" /> Completed intakes</span><span><i className="legend-dot teal" /> Doctor reviews</span><b>Peak hour · 2 PM</b></div></section><section className="departments-panel"><div className="panel-heading"><div><h2>Departments</h2><p>Live room status</p></div><button className="more-button"><MoreHorizontal size={18} /></button></div><div className="department-list">{[['General Medicine', '08 rooms', 'green'], ['Pediatrics', '04 rooms', 'green'], ['Women’s Health', '03 rooms', 'amber'], ['Orthopedics', '05 rooms', 'green']].map(([name, rooms, color]) => <div className="department-row" key={name}><span className={`department-dot ${color}`} /><div><b>{name}</b><small>{rooms}</small></div><span className="department-status">{color === 'green' ? 'Operational' : 'Busy'}</span><ChevronDown size={14} /></div>)}</div><button className="manage-button" onClick={() => setLocation('/doctor')}>Manage departments <ArrowRight size={15} /></button></section></div><section className="audit-panel"><div className="panel-heading"><div><h2>Recent audit activity</h2><p>Every important action, accounted for.</p></div><button className="filter-button"><span>All activity</span><ChevronDown size={14} /></button></div><div className="audit-table"><div className="audit-head"><span>ACTIVITY</span><span>ACTOR</span><span>TIME</span><span>STATUS</span></div>{auditRows.map((row) => <div className="audit-row" key={row.action}><span className="audit-action"><i className={`audit-icon ${row.kind}`} /> <b>{row.action}</b></span><span className="audit-actor"><b>{row.user}</b><small>{row.detail}</small></span><span className="audit-time">{row.time}</span><span className="audit-status"><CheckCircle2 size={14} /> Logged</span></div>)}</div></section></div></div></main>;
}

function Router() {
  return <Switch><Route path="/clinician/login" component={ClinicianLogin} /><Route path="/clinician/queue" component={Queue} /><Route path="/clinician/patient/:id" component={RecordPage} /><Route path="/" component={Home} /><Route path="/patient" component={PatientKiosk} /><Route path="/doctor" component={DoctorPortal} /><Route path="/admin" component={AdminPortal} /><Route component={Home} /></Switch>;
}

export default function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>;
}