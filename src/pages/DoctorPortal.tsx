import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Hospital,
  Languages,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { Brand, AppButton } from '../components/Brand';

const queuePatients = [
  {
    name: 'Meena Kumari',
    id: 'SV-2048',
    age: '54 yrs',
    lang: 'हिन्दी',
    reason: 'Persistent cough',
    wait: '04 min',
    priority: 'Priority',
    initials: 'MK',
    color: 'coral',
  },
  {
    name: 'Rakesh Sharma',
    id: 'SV-2047',
    age: '31 yrs',
    lang: 'English',
    reason: 'Lower back pain',
    wait: '11 min',
    priority: 'Routine',
    initials: 'RS',
    color: 'blue',
  },
  {
    name: 'Lakshmi Devi',
    id: 'SV-2046',
    age: '67 yrs',
    lang: 'తెలుగు',
    reason: 'Medication follow-up',
    wait: '18 min',
    priority: 'Routine',
    initials: 'LD',
    color: 'purple',
  },
  {
    name: 'Aarav Menon',
    id: 'SV-2045',
    age: '8 yrs',
    lang: 'English',
    reason: 'Fever since yesterday',
    wait: '24 min',
    priority: 'Priority',
    initials: 'AM',
    color: 'green',
  },
];

function DoctorPortalTopbar({
  title,
  subtitle,
  onMenu,
}: {
  title: string;
  subtitle: string;
  onMenu?: () => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <header className="portal-topbar">
      <button className="mobile-menu" onClick={onMenu}>
        <Menu size={20} />
      </button>
      <div>
        <div className="portal-title">{title}</div>
        <div className="portal-subtitle">{subtitle}</div>
      </div>
      <div className="portal-actions">
        <button className="icon-button">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
        <div className="portal-user">
          <div className="user-avatar">AR</div>
          <div>
            <b>Dr. Ananya Rao</b>
            <span>General Medicine · OPD 2</span>
          </div>
          <ChevronDown size={15} />
        </div>
        <button className="exit-button" onClick={() => setLocation('/')}>
          Exit portal
        </button>
      </div>
    </header>
  );
}

function DoctorPortalSidebar({
  active,
  onNavigate,
  mobileOpen,
}: {
  active: string;
  onNavigate: (path: string) => void;
  mobileOpen?: boolean;
}) {
  const links = [
    { label: 'Doctor Dashboard', icon: LayoutDashboard, path: '/doctor' },
  ];
  return (
    <aside className={`portal-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="portal-brand" onClick={() => onNavigate('/')}>
        <Brand />
      </div>
      <div className="portal-context">
        <span className="context-icon">
          <Hospital size={16} />
        </span>
        <div>
          <b>District Hospital</b>
          <span>North wing · OPD 2</span>
        </div>
        <ChevronDown size={14} />
      </div>
      <div className="side-label">DOCTOR WORKSPACE</div>
      <nav className="portal-nav">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.label}
              className={active === link.label ? 'active' : ''}
              onClick={() => onNavigate(link.path)}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="side-label side-label-spaced">SYSTEM</div>
      <nav className="portal-nav">
        <button onClick={() => alert('Support line: OPD Helpdesk Ext 402')}>
          <CircleHelp size={18} />
          <span>Help & support</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="secure-badge">
          <LockKeyhole size={15} />
          <span>
            <b>Secure clinician workspace</b>
            <small>Last synced just now</small>
          </span>
        </div>
        <button className="sidebar-home" onClick={() => onNavigate('/')}>
          <ArrowLeft size={15} /> Back to welcome
        </button>
      </div>
    </aside>
  );
}

export function DoctorPortal() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queue, setQueue] = useState<any[]>(queuePatients);

  const fetchLiveQueue = async () => {
    try {
      const res = await fetch('/api/v1/doctor/queue');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const colors = ['coral', 'amber', 'mint', 'blue', 'lavender'];
          const langNames: Record<string, string> = {
            hi: 'हिन्दी',
            mr: 'मराठी',
            bn: 'বাংলা',
            ta: 'தமிழ்',
            te: 'తెలుగు',
            en: 'English',
          };
          const formatted = data.map((item: any, idx: number) => {
            const initials = (item.patient_name || 'Patient')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            return {
              id: item.token || `SV-${item.intake_session_id?.slice(0, 4)}`,
              intake_session_id: item.intake_session_id,
              name: item.patient_name || 'Patient',
              age: item.patient_age ? `${item.patient_age} yrs` : '34 yrs',
              gender: item.patient_gender || 'Female',
              lang: langNames[item.language_code] || item.language_code || 'हिन्दी',
              reason: item.chief_complaint || 'General consultation',
              wait: `${String(item.wait_time_minutes || 2).padStart(2, '0')} min`,
              priority: item.priority || 'Routine',
              initials: initials || 'PT',
              color: colors[idx % colors.length],
              has_red_flags: item.has_red_flags,
              status: item.status,
            };
          });
          setQueue(formatted);
        }
      }
    } catch (err) {
      console.warn('DoctorPortal queue fetch notice:', err);
    }
  };

  useEffect(() => {
    fetchLiveQueue();
    const interval = setInterval(fetchLiveQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const patient = queue[selected] || queue[0] || queuePatients[0];

  return (
    <main className="portal-page">
      <DoctorPortalSidebar
        active="Doctor Dashboard"
        onNavigate={setLocation}
        mobileOpen={mobileOpen}
      />
      <div className="portal-content">
        <DoctorPortalTopbar
          title="Good morning, Doctor"
          subtitle="Tuesday, 18 June 2026 · District Hospital"
          onMenu={() => setMobileOpen(!mobileOpen)}
        />
        <div className="portal-main">
          <div className="portal-heading-row">
            <div>
              <div className="section-kicker">OPD TRIAGE · LIVE CONNECTED</div>
              <h1>Doctor Dashboard</h1>
              <p>Review patient stories and structured summaries before they enter the consultation room.</p>
            </div>
            <div className="flex gap-2">
              <AppButton variant="soft" onClick={() => setLocation('/patient')}>
                <Plus size={16} /> New intake
              </AppButton>
            </div>
          </div>
          <div className="doctor-stats">
            <div className="doctor-stat accent">
              <span className="stat-icon">
                <Users size={17} />
              </span>
              <div>
                <span>Waiting now</span>
                <strong>{String(queue.length).padStart(2, '0')}</strong>
              </div>
              <small>+2 this hour</small>
            </div>
            <div className="doctor-stat">
              <span className="stat-icon">
                <Clock3 size={17} />
              </span>
              <div>
                <span>Avg. wait time</span>
                <strong>
                  14 <small>min</small>
                </strong>
              </div>
              <small className="good">↓ 18% today</small>
            </div>
            <div className="doctor-stat">
              <span className="stat-icon">
                <CheckCircle2 size={17} />
              </span>
              <div>
                <span>Reviewed today</span>
                <strong>26</strong>
              </div>
              <small>of 34 patients</small>
            </div>
            <div className="doctor-stat">
              <span className="stat-icon">
                <Languages size={17} />
              </span>
              <div>
                <span>Languages today</span>
                <strong>07</strong>
              </div>
              <small>across OPD</small>
            </div>
          </div>
          <div className="doctor-workspace">
            <section className="queue-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Live patient queue{' '}
                    <span className="live-pill">
                      <span /> Live
                    </span>
                  </h2>
                  <p>Prioritized by arrival and clinical flags</p>
                </div>
                <button className="filter-button" onClick={fetchLiveQueue}>
                  <RefreshCw size={13} className="inline mr-1" />
                  <span>Refresh queue</span>
                </button>
              </div>
              <div className="queue-list">
                {queue.map((item, index) => (
                  <button
                    className={`queue-row ${selected === index ? 'selected' : ''}`}
                    key={item.id || index}
                    onClick={() => setSelected(index)}
                  >
                    <div className={`queue-avatar ${item.color}`}>{item.initials}</div>
                    <div className="queue-patient">
                      <b>{item.name}</b>
                      <span>
                        {item.id} · {item.age}
                      </span>
                    </div>
                    <div className="queue-reason">
                      <b>{item.reason}</b>
                      <span>
                        <Languages size={12} /> {item.lang}
                      </span>
                    </div>
                    <div
                      className={`priority ${
                        item.priority === 'Priority' || item.has_red_flags
                          ? 'priority-high'
                          : ''
                      }`}
                    >
                      <span />
                      {item.priority}
                    </div>
                    <div className="queue-wait">
                      <span>Waiting</span>
                      <b>{item.wait}</b>
                    </div>
                    <ArrowRight size={17} className="row-arrow" />
                  </button>
                ))}
              </div>
            </section>
            <aside className="summary-panel">
              <div className="summary-panel-top">
                <div>
                  <span className="section-kicker">Selected patient</span>
                  <h2>Patient summary</h2>
                </div>
                <button className="more-button">
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <div className="selected-profile">
                <div className={`queue-avatar ${patient.color}`}>{patient.initials}</div>
                <div>
                  <h3>{patient.name}</h3>
                  <span>
                    {patient.id} · {patient.age} · {patient.lang}
                  </span>
                </div>
                <span className="profile-status">Waiting {patient.wait}</span>
              </div>
              <div className="ai-notice">
                <Sparkles size={16} />
                <span>
                  <b>AI-structured summary</b>
                  <small>For physician review only</small>
                </span>
                <CheckCircle2 size={15} />
              </div>
              <div className="summary-block">
                <span className="summary-block-label">CHIEF CONCERN</span>
                <h3>{patient.reason}</h3>
                <p>
                  Patient shared symptoms in {patient.lang} during adaptive intake. Structured
                  clinical facts and red flag checks are ready for clinician review.
                </p>
              </div>
              <div className="summary-block">
                <span className="summary-block-label">INTAKE SIGNALS</span>
                <div className="signal-row">
                  <span>Language</span>
                  <b>{patient.lang}</b>
                </div>
                <div className="signal-row">
                  <span>Status</span>
                  <b className="amber-text">
                    {patient.priority} · {patient.status || 'READY'}
                  </b>
                </div>
                <div className="signal-row">
                  <span>Token</span>
                  <b>{patient.id}</b>
                </div>
              </div>
              <div className="summary-block">
                <span className="summary-block-label">
                  ATTACHMENTS <small>1</small>
                </span>
                <div className="attachment-row">
                  <FileText size={16} />
                  <span>
                    <b>Prescription_May2026.pdf</b>
                    <small>Uploaded today · 1.2 MB</small>
                  </span>
                  <button>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
              <div className="summary-actions">
                <AppButton
                  onClick={() => {
                    const id = patient.intake_session_id || patient.id || 'intake_001';
                    setLocation(`/doctor/patient/${id}`);
                  }}
                >
                  <Check size={16} /> Open Clinical Record
                </AppButton>
                <button
                  className="secondary-action"
                  onClick={() => setSelected((selected + 1) % queue.length)}
                >
                  Next patient <ArrowRight size={14} />
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

export default DoctorPortal;
