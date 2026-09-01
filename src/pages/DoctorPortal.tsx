import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Hospital,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { Brand, AppButton } from '../components/Brand';

function DoctorPortalSidebar({
  active,
  onNavigate,
  mobileOpen,
}: {
  active: string;
  onNavigate: (path: string) => void;
  mobileOpen?: boolean;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileOpen]);

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
        <div className="relative mb-2.5" ref={menuRef}>
          {profileOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-64 rounded-2xl border border-[#264552] bg-[#0d222b] p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-white">
              <div className="px-3 py-2.5 border-b border-[#1b3945] mb-1.5 bg-[#122e3a] rounded-xl">
                <p className="font-bold text-xs text-[#6bdbca]">Dr. Ananya Rao</p>
                <p className="font-mono text-[10px] text-[#91b3bf] mt-0.5">OPD 02 · General Medicine</p>
                <p className="text-[10px] text-[#6d8d99] mt-0.5">District Hospital, North Wing</p>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    alert('Physician ID: DOC-001\nLicense: MCI-2018-8472\nSpecialty: General Medicine');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#a8cbdb] hover:bg-[#193845] hover:text-[#76ddcd] transition cursor-pointer font-medium"
                >
                  <UsersRound size={14} className="text-[#76ddcd]" /> Profile details
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    alert('OPD Station: 02 (Active)\nConnected to live triage queue');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#a8cbdb] hover:bg-[#193845] hover:text-[#76ddcd] transition cursor-pointer font-medium"
                >
                  <Hospital size={14} className="text-[#76ddcd]" /> OPD Station 02
                </button>
              </div>

              <div className="border-t border-[#1b3945] mt-1.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('/');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#f59e97] hover:bg-[#331c1e] transition cursor-pointer font-medium text-xs"
                >
                  <ArrowLeft size={14} /> Exit portal
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            className="flex items-center gap-2.5 w-full p-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.09)] transition cursor-pointer text-left"
            title="Dr. Ananya Rao · Click for profile options"
          >
            <div className="grid place-items-center w-8 h-8 rounded-full bg-[#1e4e46] text-[#78decb] font-bold text-xs shrink-0 border border-[#2b6d61]">
              AR
            </div>
            <div className="min-w-0 flex-1">
              <b className="block text-xs font-bold text-white truncate">Dr. Ananya Rao</b>
              <span className="block text-[10px] text-[#86a2ab] truncate">General Medicine · OPD 2</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-[#7f98a2] transition-transform duration-200 shrink-0 ${profileOpen ? 'rotate-180 text-[#76ddcd]' : ''}`}
            />
          </button>
        </div>

        <div className="secure-badge">
          <LockKeyhole size={16} />
          <span>
            <b>Secure clinician workspace</b>
            <small>Last synced just now</small>
          </span>
        </div>
      </div>
    </aside>
  );
}

function getPriorityWeight(priorityStr?: string, hasRedFlags?: boolean): number {
  if (hasRedFlags) return 3;
  const p = (priorityStr || '').toUpperCase();
  if (p === 'HIGH' || p === 'PRIORITY' || p === 'EMERGENCY' || p === 'RED' || p === 'CRITICAL') return 3;
  if (p === 'MEDIUM' || p === 'URGENT' || p === 'AMBER' || p === 'YELLOW') return 2;
  return 1;
}

function parseWaitTimeMinutes(waitStr?: string | number): number {
  if (typeof waitStr === 'number') return waitStr;
  if (!waitStr) return 0;
  const match = String(waitStr).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function sortPatientQueue(patients: any[]): any[] {
  return [...patients].sort((a, b) => {
    const weightA = getPriorityWeight(a.priority, a.has_red_flags);
    const weightB = getPriorityWeight(b.priority, b.has_red_flags);
    if (weightA !== weightB) {
      return weightB - weightA;
    }
    const waitA = parseWaitTimeMinutes(a.wait_time_minutes ?? a.wait);
    const waitB = parseWaitTimeMinutes(b.wait_time_minutes ?? b.wait);
    return waitB - waitA;
  });
}

export function DoctorPortal() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queue, setQueue] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const getRelativeUpdatedText = () => {
    const seconds = Math.floor((now - lastUpdated.getTime()) / 1000);
    if (seconds < 10) return 'Updated just now';
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins === 1) return 'Updated 1 min ago';
    return `Updated ${mins} mins ago`;
  };

  const fetchLiveQueue = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/v1/doctor/queue');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          if (data.length > 0) {
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
              const patientName = item.patient_name || 'Patient';
              const initials = patientName
                .split(' ')
                .filter(Boolean)
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'PT';

              return {
                id: item.token || `SV-${item.intake_session_id?.slice(0, 4)}`,
                intake_session_id: item.intake_session_id,
                name: patientName,
                age: item.patient_age ? `${item.patient_age} yrs` : '34 yrs',
                gender: item.patient_gender || 'Female',
                lang: langNames[item.language_code] || item.language_code || 'हिन्दी',
                reason: item.chief_complaint || 'General consultation',
                wait: `${String(item.wait_time_minutes || 0).padStart(2, '0')} min`,
                wait_time_minutes: item.wait_time_minutes || 0,
                priority: item.priority || 'Routine',
                initials: initials,
                color: colors[idx % colors.length],
                has_red_flags: Boolean(item.has_red_flags),
                status: item.status,
              };
            });
            setQueue(sortPatientQueue(formatted));
          } else {
            setQueue([]);
          }
          setError(null);
          setLastUpdated(new Date());
        }
      } else {
        setError(`Failed to retrieve live queue (status ${res.status}).`);
        if (queue === null) setQueue([]);
      }
    } catch (err: any) {
      console.error('DoctorPortal queue fetch error:', err);
      setError('Unable to connect to backend clinical database.');
      if (queue === null) setQueue([]);
    } finally {
      if (manual) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  };

  useEffect(() => {
    fetchLiveQueue();
    const interval = setInterval(() => fetchLiveQueue(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const activeQueue = queue ?? [];
  const sortedQueue = sortPatientQueue(activeQueue);
  const filteredQueue = sortedQueue.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (item.name || '').toLowerCase().includes(q);
    const idMatch = (item.id || '').toLowerCase().includes(q);
    const sessionMatch = (item.intake_session_id || '').toLowerCase().includes(q);
    const reasonMatch = (item.reason || '').toLowerCase().includes(q);
    return nameMatch || idMatch || sessionMatch || reasonMatch;
  });

  const patient = filteredQueue.length > 0
    ? filteredQueue[Math.min(selected, filteredQueue.length - 1)]
    : null;

  return (
    <main className="portal-page">
      <DoctorPortalSidebar
        active="Doctor Dashboard"
        onNavigate={setLocation}
        mobileOpen={mobileOpen}
      />
      <div className="portal-content">
        <div className="portal-main">
          <div className="portal-heading-row">
            <div>
              <button
                type="button"
                className="mobile-menu mb-3"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle navigation menu"
              >
                <Menu size={20} />
              </button>
              <div className="section-kicker">OPD TRIAGE · LIVE CONNECTED</div>
              <h1>Good morning, Doctor</h1>
              <p>Tuesday, 18 June 2026 · District Hospital</p>
            </div>
          </div>
          <div className="doctor-stats">
            <div className="doctor-stat accent">
              <span className="stat-icon stat-icon-waiting">
                <Users size={18} />
              </span>
              <div>
                <span>Waiting now</span>
                <strong>{String(activeQueue.length).padStart(2, '0')}</strong>
              </div>
              <small>Live connected</small>
            </div>
            <div className="doctor-stat priority-alert-stat">
              <span className="stat-icon priority-icon">
                <AlertTriangle size={18} />
              </span>
              <div>
                <span>High priority</span>
                <strong className="priority-number">
                  {String(
                    activeQueue.filter(
                      (item) => getPriorityWeight(item.priority, item.has_red_flags) === 3
                    ).length
                  ).padStart(2, '0')}
                </strong>
              </div>
              <small className="priority-badge-sub">Needs prompt review</small>
            </div>
            <div className="doctor-stat">
              <span className="stat-icon stat-icon-wait-time">
                <Clock3 size={18} />
              </span>
              <div>
                <span>Avg. wait time</span>
                <strong>
                  {activeQueue.length > 0
                    ? Math.round(
                        activeQueue.reduce((acc, curr) => acc + (curr.wait_time_minutes || 0), 0) /
                          activeQueue.length
                      )
                    : 0}{' '}
                  <small>min</small>
                </strong>
              </div>
              <small className="good">Real-time calculate</small>
            </div>
            <div className="doctor-stat">
              <span className="stat-icon stat-icon-reviewed">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <span>Reviewed today</span>
                <strong>
                  {activeQueue.filter((item) => item.status === 'CONFIRMED').length}
                </strong>
              </div>
              <small>of {activeQueue.length} total</small>
            </div>
          </div>

          <div className="doctor-workspace">
            <section className="queue-panel">
              <div className="panel-heading">
                <div>
                  <h2>Live Patient Queue</h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#6e828e]">
                    <span className="live-pill">
                      <span /> LIVE
                    </span>
                    <span className="text-[#8ca0ab]">·</span>
                    <span className="font-mono text-[11px] text-[#607784]">{getRelativeUpdatedText()}</span>
                  </div>
                  <p className="text-[11px] text-[#7d919d] mt-1 font-medium">
                    Prioritized by AI triage flags (High Priority first) · Requires clinical review
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex items-center">
                    <Search size={15} className="absolute left-3 text-[#7b909a] pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelected(0);
                      }}
                      placeholder="Search patients, token..."
                      className="h-9 w-44 sm:w-56 pl-8 pr-7 text-xs rounded-lg border border-[#dbe5e8] bg-[#fbfdfd] text-[#1e394c] placeholder:text-[#8b9da6] focus:border-[#1f5b4e] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1f5b4e] transition"
                      aria-label="Search patients by name or token"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelected(0);
                        }}
                        className="absolute right-2 text-[#8b9da6] hover:text-[#1e394c] p-0.5 cursor-pointer"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    className="filter-button"
                    onClick={() => fetchLiveQueue(true)}
                    disabled={isRefreshing}
                    title="Refresh queue list"
                  >
                    <RefreshCw
                      size={14}
                      className={`inline mr-1 transition-transform ${
                        isRefreshing ? 'animate-spin text-[#1f5b4e]' : ''
                      }`}
                    />
                    <span>{isRefreshing ? 'Syncing...' : 'Refresh queue'}</span>
                  </button>
                </div>
              </div>

              <div className="queue-list">
                {queue === null ? (
                  /* Initial loading state */
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dce6e9] bg-[#fbfdfd] my-3">
                    <RefreshCw size={24} className="mx-auto mb-2 text-[#1f5b4e] animate-spin" />
                    <p className="font-semibold text-xs text-[#274457]">Connecting to live triage database...</p>
                  </div>
                ) : filteredQueue.length > 0 ? (
                  filteredQueue.map((item, index) => {
                    const patientId = item.intake_session_id || item.id || 'intake_001';
                    const weight = getPriorityWeight(item.priority, item.has_red_flags);
                    const badgeLabel = weight === 3 ? 'High Priority' : weight === 2 ? 'Medium' : 'Routine';
                    const badgeClass = weight === 3 ? 'priority-high' : weight === 2 ? 'priority-medium' : '';

                    return (
                      <button
                        type="button"
                        className={`queue-row ${selected === index ? 'selected' : ''}`}
                        key={item.id || item.intake_session_id || index}
                        onClick={() => {
                          setSelected(index);
                          setLocation(`/doctor/patient/${patientId}`);
                        }}
                        onMouseEnter={() => setSelected(index)}
                        title={`Open clinical record for ${item.name}`}
                        aria-label={`Open clinical record for ${item.name} (${item.id})`}
                      >
                        <div className={`queue-avatar ${item.color || 'coral'}`}>{item.initials}</div>
                        <div className="queue-patient">
                          <b>{item.name}</b>
                          <span>
                            {item.id} · {item.age}
                          </span>
                        </div>
                        <div className="queue-reason">
                          <b>{item.reason}</b>
                        </div>
                        <div
                          className={`priority ${badgeClass}`}
                          title="AI-assisted triage priority · Subject to clinical verification"
                        >
                          <span />
                          {badgeLabel}
                        </div>
                        <div className="queue-wait">
                          <span>Waiting</span>
                          <b>{item.wait}</b>
                        </div>
                        <ArrowRight size={16} className="row-arrow" />
                      </button>
                    );
                  })
                ) : searchQuery.trim() !== '' ? (
                  /* Empty state for search with no matches */
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dce6e9] bg-[#fbfdfd] my-3">
                    <Search size={26} className="mx-auto mb-2 text-[#9bb0ba]" />
                    <p className="font-semibold text-sm text-[#274457]">No patients found</p>
                    <p className="text-xs text-[#758a96] mt-1">
                      Try searching by patient name or token.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelected(0);
                      }}
                      className="mt-3 text-xs font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  /* Empty state for empty queue */
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dce6e9] bg-[#fbfdfd] my-3">
                    <Users size={26} className="mx-auto mb-2 text-[#9bb0ba]" />
                    <p className="font-semibold text-sm text-[#274457]">No patients waiting</p>
                    <p className="text-xs text-[#758a96] mt-1 max-w-sm mx-auto">
                      The live queue is currently clear. New patients from intake will appear here automatically.
                    </p>
                    <button
                      type="button"
                      onClick={() => fetchLiveQueue(true)}
                      disabled={isRefreshing}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                    >
                      <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                      {isRefreshing ? 'Syncing...' : 'Refresh queue'}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <aside className="summary-panel">
              <div className="summary-panel-top">
                <div>
                  <span className="section-kicker">Selected patient</span>
                  <h2>Patient summary</h2>
                </div>
                <button className="more-button" aria-label="More options">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              {queue === null ? (
                <div className="py-16 text-center">
                  <RefreshCw size={22} className="mx-auto mb-2 text-[#1f5b4e] animate-spin" />
                  <p className="text-xs font-semibold text-[#274457]">Loading patient data...</p>
                </div>
              ) : patient ? (
                <>
                  <div className="selected-profile">
                    <div className={`queue-avatar ${patient.color || 'coral'}`}>{patient.initials}</div>
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
                    <CheckCircle2 size={16} />
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
                    <span className="summary-block-label">
                      ATTACHMENTS <small>1</small>
                    </span>
                    <div className="attachment-row">
                      <FileText size={16} />
                      <span>
                        <b>Prescription_Uploaded.pdf</b>
                        <small>Uploaded at intake</small>
                      </span>
                    </div>
                  </div>
                  <div className="summary-actions">
                    <AppButton
                      onClick={() => {
                        const id = patient.intake_session_id || patient.id;
                        setLocation(`/doctor/patient/${id}`);
                      }}
                    >
                      <Check size={16} /> Open Clinical Record
                    </AppButton>
                    <button
                      className="secondary-action"
                      onClick={() => {
                        if (filteredQueue.length > 0) {
                          setSelected((selected + 1) % filteredQueue.length);
                        }
                      }}
                    >
                      Next patient <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-16 px-4 text-center">
                  <Users size={30} className="mx-auto mb-2 text-[#9bb0ba]" />
                  <p className="font-semibold text-sm text-[#274457]">No patient selected</p>
                  <p className="text-xs text-[#758a96] mt-1 max-w-xs mx-auto">
                    Select a patient from the live queue to inspect their clinical summary.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

export default DoctorPortal;
