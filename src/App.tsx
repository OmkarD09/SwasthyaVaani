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
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'dark' | 'soft';
  className?: string;
  type?: 'button' | 'submit';
}) {
  return <button type={type} className={`app-button ${variant} ${className}`} onClick={onClick}>{children}</button>;
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
        <div className="hero-grid" />
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
  const [language, setLanguage] = useState('English');
  const [mode, setMode] = useState<'voice' | 'touch'>('voice');
  const [uploaded, setUploaded] = useState(false);
  const [recording, setRecording] = useState(false);
  const languages = ['English', 'हिन्दी', 'বাংলা', 'मराठी', 'తెలుగు', 'தமிழ்'];
  const next = () => setStep(Math.min(3, step + 1));
  return <main className="kiosk-page"><header className="kiosk-topbar"><button className="brand-button" onClick={() => setLocation('/')}><Brand /></button><div className="kiosk-right"><span className="kiosk-secure"><ShieldCheck size={15} /> Private & secure</span><button className="language-mini"><Languages size={16} /> {language} <ChevronDown size={13} /></button><button className="kiosk-close" onClick={() => setLocation('/')}><X size={18} /></button></div></header><div className="kiosk-layout"><aside className="kiosk-progress"><div className="kiosk-welcome"><span className="eyebrow">PATIENT INTAKE</span><h1>Your care<br /><em>starts here.</em></h1><p>Take a few quiet minutes to share what brings you in today.</p></div><div className="step-list">{patientSteps.map((item, index) => { const Icon = item.icon; return <div className={`kiosk-step ${index === step ? 'current' : ''} ${index < step ? 'done' : ''}`} key={item.title}><span className="step-icon">{index < step ? <Check size={17} /> : <Icon size={17} />}</span><span><b>{item.title}</b><small>{item.caption}</small></span></div>; })}</div><div className="kiosk-help"><CircleHelp size={16} /><span>Need help? Ask a staff member nearby.</span></div></aside><section className="kiosk-main"><div className="kiosk-main-inner"><div className="kiosk-progress-top"><span>STEP {String(step + 1).padStart(2, '0')} OF 04</span><div><i className={step >= 0 ? 'filled' : ''} /><i className={step >= 1 ? 'filled' : ''} /><i className={step >= 2 ? 'filled' : ''} /><i className={step >= 3 ? 'filled' : ''} /></div><span className="time-note"><Clock3 size={14} /> Takes about 3 min</span></div>{step === 0 && <div className="kiosk-card language-card"><div className="kiosk-card-icon"><Languages size={25} /></div><div className="kiosk-card-heading"><span className="section-kicker">First, let’s get comfortable</span><h2>Which language would<br />you like to use?</h2><p>You can change this at any time.</p></div><div className="language-grid">{languages.map((item) => <button key={item} className={language === item ? 'selected' : ''} onClick={() => setLanguage(item)}><span className="language-radio">{language === item && <Check size={14} />}</span><b>{item}</b>{item === 'English' && <small>English</small>}</button>)}</div><div className="mode-heading"><span className="section-kicker">How would you like to answer?</span><div className="mode-toggle"><button className={mode === 'voice' ? 'active' : ''} onClick={() => setMode('voice')}><Mic size={19} /> Voice</button><button className={mode === 'touch' ? 'active' : ''} onClick={() => setMode('touch')}><ScanLine size={19} /> Touch</button></div></div><AppButton onClick={next} className="kiosk-next">Continue <ArrowRight size={17} /></AppButton></div>}{step === 1 && <div className="kiosk-card story-card"><div className={`listen-orb ${recording ? 'recording' : ''}`}><div className="listen-inner">{recording ? <Activity size={29} /> : <Mic size={29} />}</div></div><span className="section-kicker">You’re speaking in {language}</span><h2>What brings you<br />in today?</h2><p className="story-instruction">{recording ? 'I’m listening. Take your time…' : 'Tap the microphone and tell us in your own words.'}</p><button className={`record-button ${recording ? 'recording' : ''}`} onClick={() => setRecording(!recording)}>{recording ? <><span className="recording-bars"><i /><i /><i /></span> Listening…</> : <><Mic size={19} /> Tap to speak</>}</button><div className="touch-fallback"><span>Prefer typing?</span><button onClick={() => setMode('touch')}>Use touch instead <ArrowRight size={14} /></button></div><AppButton onClick={next} className="kiosk-next">Continue <ArrowRight size={17} /></AppButton></div>}{step === 2 && <div className="kiosk-card records-card"><div className="kiosk-card-icon amber-icon"><Paperclip size={25} /></div><div className="kiosk-card-heading"><span className="section-kicker">Helpful, not required</span><h2>Do you have an old<br />prescription or report?</h2><p>It helps your doctor see the full picture.</p></div>{uploaded ? <div className="uploaded-file"><span className="file-check"><Check size={16} /></span><span><b>Prescription_May2026.pdf</b><small>Ready for your doctor · 1.2 MB</small></span><button onClick={() => setUploaded(false)}><X size={15} /></button></div> : <div className="upload-options"><button onClick={() => setUploaded(true)}><span><Upload size={21} /></span><b>Upload from device</b><small>PDF, JPG or PNG</small></button><button onClick={() => setUploaded(true)}><span><Camera size={21} /></span><b>Take a photo</b><small>Use the camera to scan</small></button></div>}<button className="skip-link" onClick={next}>{uploaded ? 'Continue without adding more' : 'Skip for now'} <ArrowRight size={14} /></button><AppButton onClick={next} className="kiosk-next">{uploaded ? 'Continue' : 'Continue without a report'} <ArrowRight size={17} /></AppButton></div>}{step === 3 && <div className="kiosk-card ready-card"><div className="ready-check"><Check size={32} /></div><span className="section-kicker">You’re all set</span><h2>Your story is ready<br />for <em>Dr. Rao.</em></h2><p>We’ve organized your answers and records into a clear summary for your doctor to review before you meet.</p><div className="ready-summary"><div><span><UserRound size={15} /> Patient</span><b>Meena Kumari</b></div><div><span><Languages size={15} /> Language</span><b>{language}</b></div><div><span><FileText size={15} /> Records</span><b>{uploaded ? '1 attached' : 'None added'}</b></div></div><div className="privacy-callout"><ShieldCheck size={17} /><span><b>Your information stays private</b><small>Only your care team can view this summary.</small></span></div><AppButton onClick={() => setLocation('/doctor')} className="kiosk-next">Finish and notify doctor <ArrowRight size={17} /></AppButton></div>}</div></section></div></main>;
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