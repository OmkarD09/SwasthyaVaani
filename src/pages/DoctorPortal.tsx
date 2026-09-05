import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Filter,
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
import {
  authorizedClinicianFetch,
  clearClinicianSession,
  getClinicianSession,
} from '../lib/clinicianAuth';

function SlideDigit({ char, direction }: { char: string; direction: number }) {
  const isDigit = /^[0-9]$/.test(char);

  if (!isDigit) {
    return <span className="inline-block px-0.5">{char}</span>;
  }

  return (
    <span
      className="relative inline-block overflow-hidden align-top text-center tabular-nums"
      style={{
        height: '1.2em',
        lineHeight: '1.2em',
        minWidth: '0.62em',
      }}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.span
          key={char}
          custom={direction}
          variants={{
            initial: (dir: number) => ({
              y: dir > 0 ? '100%' : dir < 0 ? '-100%' : '0%',
              opacity: dir === 0 ? 1 : 0.25,
            }),
            animate: {
              y: '0%',
              opacity: 1,
              transition: {
                type: 'spring',
                stiffness: 380,
                damping: 26,
                mass: 0.65,
              },
            },
            exit: (dir: number) => ({
              y: dir > 0 ? '-100%' : dir < 0 ? '100%' : '0%',
              opacity: 0.25,
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              transition: {
                type: 'spring',
                stiffness: 380,
                damping: 26,
                mass: 0.65,
              },
            }),
          }}
          initial="initial"
          animate="animate"
          exit="exit"
          className="inline-block w-full"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function useSteppedCounter(targetValue: number) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const targetRef = useRef(targetValue);
  targetRef.current = targetValue;
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      if (targetValue > 0) {
        setDisplayValue(0);
      } else {
        return;
      }
    }

    if (displayValue === targetValue) return;

    const diff = targetValue - displayValue;
    const absDiff = Math.abs(diff);

    const totalSteps = Math.min(absDiff, 8);
    const stepDuration = Math.max(35, Math.min(75, 350 / totalSteps));

    let currentStep = 0;
    const startVal = displayValue;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        setDisplayValue(targetRef.current);
        clearInterval(interval);
      } else {
        const progress = currentStep / totalSteps;
        const ease = 1 - (1 - progress) * (1 - progress);
        const nextVal = Math.round(startVal + diff * ease);
        setDisplayValue(nextVal);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [targetValue]);

  return displayValue;
}

function AnimatedCounter({
  value,
  pad = 2,
  suffix = '',
}: {
  value: number;
  pad?: number;
  suffix?: string;
}) {
  const displayValue = useSteppedCounter(value);
  const prevValRef = useRef(displayValue);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (displayValue > prevValRef.current) {
      setDirection(1);
    } else if (displayValue < prevValRef.current) {
      setDirection(-1);
    }
    prevValRef.current = displayValue;
  }, [displayValue]);

  const formattedStr = pad > 0 ? String(displayValue).padStart(pad, '0') : String(displayValue);
  const chars = formattedStr.split('');

  return (
    <span className="inline-flex items-baseline font-inherit tabular-nums">
      {chars.map((char, idx) => (
        <SlideDigit key={`slot-${idx}-${chars.length}`} char={char} direction={direction} />
      ))}
      {suffix && <small className="ml-1 text-[13px] font-medium text-[#657b87]">{suffix}</small>}
    </span>
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
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const clinicianSession = getClinicianSession();
  const clinicianName = clinicianSession?.display_name || 'Authorized clinician';
  const clinicianInitials =
    clinicianName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CL';

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
          <b>Clinical Workspace</b>
          <span>Live triage queue</span>
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
                <p className="font-bold text-xs text-[#6bdbca]">{clinicianName}</p>
                <p className="font-mono text-[10px] text-[#91b3bf] mt-0.5">
                  {clinicianSession?.role || 'CLINICIAN'}
                </p>
                <p className="text-[10px] text-[#6d8d99] mt-0.5">Authenticated prototype session</p>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    alert('Profile management is not connected in this prototype.');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#a8cbdb] hover:bg-[#193845] hover:text-[#76ddcd] transition cursor-pointer font-medium"
                >
                  <UsersRound size={14} className="text-[#76ddcd]" /> Profile details
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    alert('Workspace configuration is not connected in this prototype.');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#a8cbdb] hover:bg-[#193845] hover:text-[#76ddcd] transition cursor-pointer font-medium"
                >
                  <Hospital size={14} className="text-[#76ddcd]" /> Workspace details
                </button>
              </div>

              <div className="border-t border-[#1b3945] mt-1.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    clearClinicianSession();
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
            title={`${clinicianName} · Click for profile options`}
          >
            <div className="grid place-items-center w-8 h-8 rounded-full bg-[#1e4e46] text-[#78decb] font-bold text-xs shrink-0 border border-[#2b6d61]">
              {clinicianInitials}
            </div>
            <div className="min-w-0 flex-1">
              <b className="block text-xs font-bold text-white truncate">{clinicianName}</b>
              <span className="block text-[10px] text-[#86a2ab] truncate">
                {clinicianSession?.role || 'Clinician'} session
              </span>
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
            <small>Authenticated session active</small>
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

type StatFilterType = 'all' | 'priority' | 'reviewed';

export function DoctorPortal() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queue, setQueue] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statFilter, setStatFilter] = useState<StatFilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [now, setNow] = useState<number>(Date.now());

  const clinicianSession = getClinicianSession();
  const clinicianName = clinicianSession?.display_name
    ? `Dr. ${clinicianSession.display_name.replace(/^(dr\.?\s*)/i, '')}`
    : 'Doctor';

  const getGreeting = () => {
    const hour = new Date(now).getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
      const res = await authorizedClinicianFetch('/api/v1/doctor/queue');
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
                age: item.patient_age ? `${item.patient_age} yrs` : 'Age unavailable',
                gender: item.patient_gender || 'Not recorded',
                lang: langNames[item.language_code] || item.language_code || 'Language unavailable',
                reason: item.chief_complaint || 'Chief complaint not recorded',
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
    if (statFilter === 'priority') {
      if (getPriorityWeight(item.priority, item.has_red_flags) !== 3) return false;
    } else if (statFilter === 'reviewed') {
      if (item.status !== 'CONFIRMED') return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (item.name || '').toLowerCase().includes(q);
    const idMatch = (item.id || '').toLowerCase().includes(q);
    const sessionMatch = (item.intake_session_id || '').toLowerCase().includes(q);
    const reasonMatch = (item.reason || '').toLowerCase().includes(q);
    return nameMatch || idMatch || sessionMatch || reasonMatch;
  });

  const waitingCount = activeQueue.length;
  const highPriorityCount = activeQueue.filter(
    (item) => getPriorityWeight(item.priority, item.has_red_flags) === 3
  ).length;
  const avgWaitTime =
    activeQueue.length > 0
      ? Math.round(
        activeQueue.reduce((acc, curr) => acc + (curr.wait_time_minutes || 0), 0) /
        activeQueue.length
      )
      : 0;
  const reviewedCount = activeQueue.filter((item) => item.status === 'CONFIRMED').length;

  const patient = filteredQueue.length > 0
    ? filteredQueue[Math.min(selected, filteredQueue.length - 1)]
    : null;
  const currentDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(now));

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
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-800 tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  OPD TRIAGE · LIVE CONNECTED
                </span>
                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-[#edf4f2] text-[11px] font-medium text-[#234d40]">
                  Consultation Desk · Live Triage
                </span>
              </div>
              <h1>{getGreeting()}, {clinicianName}</h1>
              <p>{currentDate} · Clinical Workspace · AI-assisted Triage</p>
            </div>
          </div>
          <div className="doctor-stats">
            {/* Card 1: Waiting Now */}
            <div
              className={`doctor-stat accent clickable-stat ${statFilter === 'all' ? 'active-filter' : ''}`}
              onClick={() => {
                setStatFilter('all');
                setSelected(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setStatFilter('all');
                  setSelected(0);
                }
              }}
              role="button"
              tabIndex={0}
              title="Click to view all waiting patients"
              aria-label={`Waiting now: ${waitingCount} patients. Click to view all waiting patients.`}
            >
              <span className="stat-icon stat-icon-waiting flex items-center justify-center shrink-0">
                <Users size={18} />
              </span>
              <div>
                <span>Waiting now</span>
                <strong>
                  <AnimatedCounter value={waitingCount} pad={2} />
                </strong>
                {statFilter === 'all' && <span className="stat-filter-indicator">All waiting</span>}
              </div>
              <small>Live connected</small>
            </div>

            {/* Card 2: High Priority */}
            <div
              className={`doctor-stat priority-alert-stat clickable-stat ${highPriorityCount > 0 ? 'has-priority-alert' : ''
                } ${statFilter === 'priority' ? 'active-filter' : ''}`}
              onClick={() => {
                setStatFilter((prev) => (prev === 'priority' ? 'all' : 'priority'));
                setSelected(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setStatFilter((prev) => (prev === 'priority' ? 'all' : 'priority'));
                  setSelected(0);
                }
              }}
              role="button"
              tabIndex={0}
              title={
                statFilter === 'priority'
                  ? 'Click to reset filter'
                  : 'Click to filter queue to high priority patients'
              }
              aria-label={`High priority: ${highPriorityCount} patients. Click to toggle high priority filter.`}
            >
              <span className="stat-icon priority-icon flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </span>
              <div>
                <span>High priority</span>
                <strong className="priority-number">
                  <AnimatedCounter value={highPriorityCount} pad={2} />
                </strong>
                {statFilter === 'priority' ? (
                  <span className="stat-filter-indicator priority">Filtering Priority</span>
                ) : highPriorityCount > 0 ? (
                  <span className="stat-filter-indicator priority">Action needed</span>
                ) : null}
              </div>
              <small className="priority-badge-sub">
                {highPriorityCount > 0 ? 'Needs prompt review' : 'All clear'}
              </small>
            </div>

            {/* Card 3: Avg Wait Time */}
            <div
              className="doctor-stat"
              title="Average real-time wait duration across current queue"
              aria-label={`Average wait time: ${avgWaitTime} minutes`}
            >
              <span className="stat-icon stat-icon-wait-time flex items-center justify-center shrink-0">
                <Clock3 size={18} />
              </span>
              <div>
                <span>Avg. wait time</span>
                <strong>
                  <AnimatedCounter value={avgWaitTime} pad={0} suffix="min" />
                </strong>
              </div>
              <small className="good">
                {avgWaitTime <= 15 ? 'Optimal flow' : 'Real-time calculate'}
              </small>
            </div>

            {/* Card 4: Reviewed Today */}
            <div
              className={`doctor-stat clickable-stat ${statFilter === 'reviewed' ? 'active-filter' : ''}`}
              onClick={() => {
                setStatFilter((prev) => (prev === 'reviewed' ? 'all' : 'reviewed'));
                setSelected(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setStatFilter((prev) => (prev === 'reviewed' ? 'all' : 'reviewed'));
                  setSelected(0);
                }
              }}
              role="button"
              tabIndex={0}
              title={
                statFilter === 'reviewed'
                  ? 'Click to reset filter'
                  : 'Click to filter queue to reviewed patients'
              }
              aria-label={`Reviewed today: ${reviewedCount} patients. Click to toggle reviewed patients filter.`}
            >
              <span className="stat-icon stat-icon-reviewed flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <span>Reviewed today</span>
                <strong>
                  <AnimatedCounter value={reviewedCount} pad={2} />
                </strong>
                {statFilter === 'reviewed' && (
                  <span className="stat-filter-indicator">Filtering Reviewed</span>
                )}
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
                      className={`inline mr-1 transition-transform ${isRefreshing ? 'animate-spin text-[#1f5b4e]' : ''
                        }`}
                    />
                    <span>{isRefreshing ? 'Syncing...' : 'Refresh queue'}</span>
                  </button>
                </div>
              </div>

              <div className="queue-list">
                {statFilter !== 'all' && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl bg-[#eef7f4] border border-[#cbe4dc] text-xs text-[#1e4d41] transition-all">
                    <div className="flex items-center gap-2 font-medium">
                      <Filter size={13} className="text-[#1f5b4e] shrink-0" />
                      <span>
                        Active filter:{' '}
                        <b>
                          {statFilter === 'priority'
                            ? 'High Priority Patients'
                            : 'Reviewed Patients'}
                        </b>{' '}
                        ({filteredQueue.length}{' '}
                        {filteredQueue.length === 1 ? 'patient' : 'patients'})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStatFilter('all');
                        setSelected(0);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1f5b4e] hover:text-[#12382f] underline cursor-pointer"
                    >
                      <X size={12} /> Clear filter
                    </button>
                  </div>
                )}
                {queue === null ? (
                  /* Initial loading state */
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dce6e9] bg-[#fbfdfd] my-3">
                    <RefreshCw size={24} className="mx-auto mb-2 text-[#1f5b4e] animate-spin" />
                    <p className="font-semibold text-xs text-[#274457]">Connecting to live triage database...</p>
                  </div>
                ) : error ? (
                  <div className="py-12 px-4 text-center rounded-xl border border-[#f2c9c4] bg-[#fff8f7] my-3">
                    <AlertTriangle size={26} className="mx-auto mb-2 text-[#b5473c]" />
                    <p className="font-semibold text-sm text-[#713b36]">Live queue unavailable</p>
                    <p className="text-xs text-[#8b5954] mt-1 max-w-sm mx-auto">{error}</p>
                    <button
                      type="button"
                      onClick={() => fetchLiveQueue(true)}
                      disabled={isRefreshing}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8b3f37] hover:underline cursor-pointer"
                    >
                      <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                      {isRefreshing ? 'Retrying...' : 'Retry connection'}
                    </button>
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
                ) : statFilter !== 'all' ? (
                  /* Empty state for active stat filter with no matches */
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dce6e9] bg-[#fbfdfd] my-3">
                    <Filter size={26} className="mx-auto mb-2 text-[#9bb0ba]" />
                    <p className="font-semibold text-sm text-[#274457]">No matching patients</p>
                    <p className="text-xs text-[#758a96] mt-1">
                      No patients in queue currently match the {statFilter === 'priority' ? 'high priority' : 'reviewed'} filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatFilter('all');
                        setSelected(0);
                      }}
                      className="mt-3 text-xs font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                    >
                      Show all waiting patients
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
                      ATTACHMENTS <small>0</small>
                    </span>
                    <p>Document metadata is not available in the current doctor API contract.</p>
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
