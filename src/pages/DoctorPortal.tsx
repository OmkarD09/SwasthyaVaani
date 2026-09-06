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
  PanelLeftClose,
  PanelLeftOpen,
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
import { formatLocalTime, isTodayLocal } from '../lib/dateUtils';

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
  collapsed = false,
  onToggleCollapse,
}: {
  active: string;
  onNavigate: (path: string) => void;
  mobileOpen?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
    <aside className={`portal-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div
        className={`portal-brand ${collapsed ? 'flex justify-center px-0' : ''}`}
        onClick={() => onNavigate('/')}
        title={collapsed ? 'SwasthyaVaani · Clinical Workspace' : undefined}
      >
        {collapsed ? (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1f5b4e] to-[#2e7d6b] flex items-center justify-center text-white mx-auto shadow-md cursor-pointer hover:scale-105 transition-transform border border-[#eaba61]/30">
            <Hospital size={20} className="text-[#eaba61]" />
          </div>
        ) : (
          <Brand />
        )}
      </div>

      {collapsed ? (
        <div className="py-2 flex justify-center">
          <div
            className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[#eaba61]/20 flex items-center justify-center text-[#eaba61] cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-colors"
            title="Clinical Workspace · Live triage queue"
          >
            <Hospital size={18} />
          </div>
        </div>
      ) : (
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
      )}

      {!collapsed ? (
        <div className="side-label">DOCTOR WORKSPACE</div>
      ) : (
        <div className="my-2 border-t border-[rgba(255,255,255,0.08)]" />
      )}

      <nav className="portal-nav">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = active === link.label;
          return (
            <div key={link.label} className="relative group">
              <button
                type="button"
                className={`
                  ${isActive ? 'active' : ''}
                  ${collapsed ? 'justify-center p-2.5' : ''}
                  w-full flex items-center rounded-lg transition-all relative cursor-pointer
                `}
                onClick={() => onNavigate(link.path)}
              >
                <Icon size={18} />
                {!collapsed && <span>{link.label}</span>}
                {collapsed && isActive && (
                  <span className="absolute left-0.5 top-2.5 bottom-2.5 w-1 rounded-full bg-[#eaba61]" />
                )}
              </button>
              {collapsed && (
                <div className="hidden lg:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[#0d222b] text-white text-xs font-semibold shadow-xl border border-[#264552] pointer-events-none items-center gap-2">
                  <span>{link.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="side-label side-label-spaced">SYSTEM</div>
      ) : (
        <div className="my-2 border-t border-[rgba(255,255,255,0.08)]" />
      )}

      <nav className="portal-nav">
        <div className="relative group">
          <button
            type="button"
            className={`w-full flex items-center rounded-lg transition-all cursor-pointer ${collapsed ? 'justify-center p-2.5' : ''}`}
            onClick={() => alert('Support line: OPD Helpdesk Ext 402')}
          >
            <CircleHelp size={18} />
            {!collapsed && <span>Help & support</span>}
          </button>
          {collapsed && (
            <div className="hidden lg:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[#0d222b] text-white text-xs font-semibold shadow-xl border border-[#264552] pointer-events-none items-center gap-2">
              <span>Help & support</span>
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-bottom">
        {/* Collapse/Expand Toggle Button (Desktop) */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`
              hidden lg:flex items-center w-full py-2 px-2.5 mb-2.5 rounded-xl text-[#9ab2a4] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors text-xs font-medium cursor-pointer
              ${collapsed ? 'justify-center' : 'justify-between'}
            `}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon-Only'}
          >
            {!collapsed && <span>Collapse Sidebar</span>}
            {collapsed ? (
              <PanelLeftOpen size={16} className="text-[#eaba61]" />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        )}

        <div className="relative mb-2.5" ref={menuRef}>
          {profileOpen && (
            <div className={`absolute ${collapsed ? 'left-full ml-3 bottom-0' : 'left-0 bottom-full mb-2'} w-64 rounded-2xl border border-[#264552] bg-[#0d222b] p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-white`}>
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
            className={`flex items-center ${collapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2'} w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.09)] transition cursor-pointer text-left`}
            title={`${clinicianName} · Click for profile options`}
          >
            <div className="grid place-items-center w-8 h-8 rounded-full bg-[#1e4e46] text-[#78decb] font-bold text-xs shrink-0 border border-[#2b6d61]">
              {clinicianInitials}
            </div>
            {!collapsed && (
              <>
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
              </>
            )}
          </button>
        </div>

        {collapsed ? (
          <div
            className="py-2 flex justify-center text-[#73dacb] cursor-help"
            title="Secure clinician workspace · Authenticated session active"
          >
            <LockKeyhole size={16} />
          </div>
        ) : (
          <div className="secure-badge">
            <LockKeyhole size={16} />
            <span>
              <b>Secure clinician workspace</b>
              <small>Authenticated session active</small>
            </span>
          </div>
        )}
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

function formatQueueItems(data: any[]): any[] {
  const colors = ['coral', 'amber', 'mint', 'blue', 'lavender'];
  const langNames: Record<string, string> = {
    hi: 'हिन्दी',
    mr: 'मराठी',
    bn: 'বাংলা',
    ta: 'தமிழ்',
    te: 'తెలుగు',
    en: 'English',
  };
  return data.map((item: any, idx: number) => {
    const patientName = item.patient_name || 'Patient';
    const initials = patientName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'PT';

    const displayId =
      item.display_id ||
      item.patient_display_id ||
      (item.patient_id && /^P\d+$/.test(item.patient_id) ? item.patient_id : null) ||
      item.token ||
      `P${String(idx + 1).padStart(3, '0')}`;

    return {
      id: displayId,
      display_id: item.display_id || item.patient_display_id || displayId,
      patient_display_id: item.patient_display_id || item.display_id || displayId,
      token: item.token,
      intake_session_id: item.intake_session_id,
      patient_id: item.patient_id,
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
      review_status: item.review_status,
      reviewed_by: item.reviewed_by,
      reviewed_at: item.reviewed_at,
    };
  });
}

type StatFilterType = 'all' | 'priority' | 'reviewed';

// Module-level cache to keep queue state across route navigation and tab switches without loading flickers
let cachedLiveQueue: any[] | null = null;
let cachedReviewedQueue: any[] | null = null;

export function DoctorPortal() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'live' | 'reviewed'>(() => {
    return location.startsWith('/doctor/reviewed') || location.includes('/reviewed')
      ? 'reviewed'
      : 'live';
  });

  // Sync activeTab when location changes (e.g. browser back/forward buttons or direct URL)
  useEffect(() => {
    const isReviewed = location.startsWith('/doctor/reviewed') || location.includes('/reviewed');
    const targetTab = isReviewed ? 'reviewed' : 'live';
    setActiveTab(targetTab);
  }, [location]);

  const viewMode = activeTab;

  const [selected, setSelected] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('doctor_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('doctor_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [liveQueue, setLiveQueue] = useState<any[] | null>(() => cachedLiveQueue);
  const [reviewedQueue, setReviewedQueue] = useState<any[] | null>(() => cachedReviewedQueue);
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

  useEffect(() => {
    setSelected(0);
  }, [viewMode]);

  const getRelativeUpdatedText = () => {
    const seconds = Math.floor((now - lastUpdated.getTime()) / 1000);
    if (seconds < 10) return 'Updated just now';
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins === 1) return 'Updated 1 min ago';
    return `Updated ${mins} mins ago`;
  };

  const fetchQueues = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const [liveRes, reviewedRes] = await Promise.all([
        authorizedClinicianFetch('/api/v1/doctor/queue'),
        authorizedClinicianFetch('/api/v1/doctor/patients/reviewed'),
      ]);

      if (liveRes.ok) {
        const liveData = await liveRes.json();
        if (Array.isArray(liveData)) {
          const formattedLive = sortPatientQueue(formatQueueItems(liveData));
          cachedLiveQueue = formattedLive;
          setLiveQueue(formattedLive);
        } else {
          cachedLiveQueue = [];
          setLiveQueue([]);
        }
      } else {
        if (liveQueue === null && cachedLiveQueue === null) setLiveQueue([]);
      }

      if (reviewedRes.ok) {
        const reviewedData = await reviewedRes.json();
        if (Array.isArray(reviewedData)) {
          const formattedReviewed = formatQueueItems(reviewedData);
          cachedReviewedQueue = formattedReviewed;
          setReviewedQueue(formattedReviewed);
        } else {
          cachedReviewedQueue = [];
          setReviewedQueue([]);
        }
      } else {
        if (reviewedQueue === null && cachedReviewedQueue === null) setReviewedQueue([]);
      }

      if (!liveRes.ok && !reviewedRes.ok) {
        setError(`Failed to retrieve clinical queues (status ${liveRes.status}).`);
      } else {
        setError(null);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('DoctorPortal queues fetch error:', err);
      setError('Unable to connect to backend clinical database.');
      if (liveQueue === null && cachedLiveQueue === null) setLiveQueue([]);
      if (reviewedQueue === null && cachedReviewedQueue === null) setReviewedQueue([]);
    } finally {
      if (manual) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  };

  const handleSwitchTab = (tab: 'live' | 'reviewed') => {
    setActiveTab(tab);
    setSelected(0);
    const targetPath = tab === 'reviewed' ? '/doctor/reviewed' : '/doctor';
    if (location !== targetPath) {
      setLocation(targetPath);
    }
    fetchQueues(false);
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(() => fetchQueues(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for patient review confirmations from clinical summary
  useEffect(() => {
    const handlePatientReviewed = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const sessionId = detail.intake_session_id;

      // Instantly remove confirmed patient from Live Queue
      setLiveQueue((prev) => {
        if (!prev) return prev;
        const updated = prev.filter((p) => p.intake_session_id !== sessionId && p.id !== sessionId);
        cachedLiveQueue = updated;
        return updated;
      });

      // Instantly add to Reviewed Queue
      setReviewedQueue((prev) => {
        const existing = prev ? [...prev] : [];
        const alreadyReviewed = existing.some((p) => p.intake_session_id === sessionId || p.id === sessionId);
        if (!alreadyReviewed) {
          const newItem = {
            id: detail.display_id || detail.patient_id || `P${String(existing.length + 1).padStart(3, '0')}`,
            display_id: detail.display_id,
            patient_display_id: detail.display_id,
            token: detail.token,
            intake_session_id: sessionId,
            patient_id: detail.patient_id,
            name: detail.name || 'Patient',
            age: 'Age unavailable',
            gender: 'Not recorded',
            lang: 'en',
            reason: 'Clinical history confirmed',
            wait: '00 min',
            wait_time_minutes: 0,
            priority: 'Routine',
            initials: (detail.name || 'PT').slice(0, 2).toUpperCase(),
            color: 'teal',
            has_red_flags: false,
            status: 'REVIEWED',
            review_status: 'REVIEWED',
            reviewed_by: detail.reviewed_by || 'Clinician',
            reviewed_at: detail.reviewed_at || new Date().toISOString(),
          };
          const updated = [newItem, ...existing];
          cachedReviewedQueue = updated;
          return updated;
        }
        return existing;
      });

      // Also trigger network fetch in background to sync fully
      fetchQueues(false);
    };

    window.addEventListener('swasthyavaani-patient-reviewed', handlePatientReviewed);
    return () => {
      window.removeEventListener('swasthyavaani-patient-reviewed', handlePatientReviewed);
    };
  }, []);

  // WebSocket connection for real-time triage queue updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: any = null;
    let isUnmounted = false;

    const connectWs = () => {
      if (isUnmounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}/api/v1/doctor/ws`);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'NEW_PATIENT_INTAKE' || data.event === 'QUEUE_UPDATED') {
              fetchQueues(false);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            retryTimer = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch {
        if (!isUnmounted) {
          retryTimer = setTimeout(connectWs, 5000);
        }
      }
    };

    connectWs();

    return () => {
      isUnmounted = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  const activeLiveQueue = liveQueue ?? [];
  const activeReviewedQueue = reviewedQueue ?? [];
  const activeQueue = viewMode === 'reviewed' ? activeReviewedQueue : activeLiveQueue;

  const filteredQueue = activeQueue.filter((item) => {
    if (viewMode === 'live') {
      if (statFilter === 'priority') {
        if (getPriorityWeight(item.priority, item.has_red_flags) !== 3) return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (item.name || '').toLowerCase().includes(q);
    const idMatch = (item.id || '').toLowerCase().includes(q);
    const tokenMatch = (item.token || '').toLowerCase().includes(q);
    const displayIdMatch = (item.display_id || item.patient_display_id || '').toLowerCase().includes(q);
    const sessionMatch = (item.intake_session_id || '').toLowerCase().includes(q);
    const reasonMatch = (item.reason || '').toLowerCase().includes(q);
    const reviewerMatch = (item.reviewed_by || '').toLowerCase().includes(q);
    return nameMatch || idMatch || tokenMatch || displayIdMatch || sessionMatch || reasonMatch || reviewerMatch;
  });

  const waitingCount = activeLiveQueue.length;
  const highPriorityCount = activeLiveQueue.filter(
    (item) => getPriorityWeight(item.priority, item.has_red_flags) === 3
  ).length;
  const avgWaitTime =
    activeLiveQueue.length > 0
      ? Math.round(
        activeLiveQueue.reduce((acc, curr) => acc + (curr.wait_time_minutes || 0), 0) /
        activeLiveQueue.length
      )
      : 0;
  const reviewedCount = activeReviewedQueue.filter((item) =>
    isTodayLocal(item.reviewed_at || item.submitted_at)
  ).length;

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
    <main className={`portal-page ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <DoctorPortalSidebar
        active="Doctor Dashboard"
        onNavigate={setLocation}
        mobileOpen={mobileOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />
      <div className={`portal-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="portal-main">
          <div className="portal-heading-row">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  className="mobile-menu"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label="Toggle navigation menu"
                >
                  <Menu size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleToggleSidebar}
                  className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#52776c] hover:text-[#173e35] hover:bg-[#e4ede8] transition-colors cursor-pointer border border-[#c5d8d3]"
                  title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon-Only'}
                  aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen size={17} className="text-[#1f5b4e]" />
                  ) : (
                    <PanelLeftClose size={17} />
                  )}
                </button>
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
              className={`doctor-stat accent clickable-stat ${viewMode === 'live' && statFilter === 'all' ? 'active-filter' : ''}`}
              onClick={() => {
                handleSwitchTab('live');
                setStatFilter('all');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSwitchTab('live');
                  setStatFilter('all');
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
                {viewMode === 'live' && statFilter === 'all' && <span className="stat-filter-indicator">All waiting</span>}
              </div>
              <small>Live connected</small>
            </div>

            {/* Card 2: High Priority */}
            <div
              className={`doctor-stat priority-alert-stat clickable-stat ${highPriorityCount > 0 ? 'has-priority-alert' : ''
                } ${viewMode === 'live' && statFilter === 'priority' ? 'active-filter' : ''}`}
              onClick={() => {
                if (viewMode !== 'live') {
                  handleSwitchTab('live');
                  setStatFilter('priority');
                } else {
                  setStatFilter((prev) => (prev === 'priority' ? 'all' : 'priority'));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (viewMode !== 'live') {
                    handleSwitchTab('live');
                    setStatFilter('priority');
                  } else {
                    setStatFilter((prev) => (prev === 'priority' ? 'all' : 'priority'));
                  }
                }
              }}
              role="button"
              tabIndex={0}
              title={
                viewMode === 'live' && statFilter === 'priority'
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
                {viewMode === 'live' && statFilter === 'priority' ? (
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
              className={`doctor-stat clickable-stat ${viewMode === 'reviewed' ? 'active-filter' : ''}`}
              onClick={() => {
                handleSwitchTab('reviewed');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSwitchTab('reviewed');
                }
              }}
              role="button"
              tabIndex={0}
              title="Click to view reviewed patients"
              aria-label={`Reviewed today: ${reviewedCount} patients. Click to view reviewed patients.`}
            >
              <span className="stat-icon stat-icon-reviewed flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <span>Reviewed today</span>
                <strong>
                  <AnimatedCounter value={reviewedCount} pad={2} />
                </strong>
                {viewMode === 'reviewed' && (
                  <span className="stat-filter-indicator">Viewing Reviewed</span>
                )}
              </div>
              <small>Confirmed records</small>
            </div>
          </div>

          <div className="doctor-workspace">
            <section className="queue-panel">
              {/* Tabs for Live Queue vs Reviewed Patients */}
              <div className="flex items-center gap-2 border-b border-[#dce6e9] px-4 pt-3 bg-[#f8faf9] rounded-t-2xl">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('live')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${viewMode === 'live'
                      ? 'border-[#1f5b4e] text-[#1f5b4e] bg-white rounded-t-lg shadow-2xs'
                      : 'border-transparent text-[#6e828e] hover:text-[#1e394c]'
                    }`}
                >
                  <Users size={14} />
                  <span>Live Queue</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${viewMode === 'live'
                        ? 'bg-[#1f5b4e] text-white'
                        : 'bg-[#e2eaec] text-[#6e828e]'
                      }`}
                  >
                    {waitingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchTab('reviewed')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${viewMode === 'reviewed'
                      ? 'border-[#16a34a] text-[#16a34a] bg-white rounded-t-lg shadow-2xs'
                      : 'border-transparent text-[#6e828e] hover:text-[#1e394c]'
                    }`}
                >
                  <CheckCircle2 size={14} />
                  <span>Reviewed Patients</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${viewMode === 'reviewed'
                        ? 'bg-[#16a34a] text-white'
                        : 'bg-[#e2eaec] text-[#6e828e]'
                      }`}
                  >
                    {reviewedCount}
                  </span>
                </button>
              </div>

              <div className="panel-heading">
                <div>
                  <h2>{viewMode === 'live' ? 'Live Patient Queue' : 'Reviewed Patients Queue'}</h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#6e828e]">
                    {viewMode === 'live' ? (
                      <span className="live-pill">
                        <span /> LIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#166534] bg-[#dcfce7] px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} className="text-[#16a34a]" /> CONFIRMED & SYNCED
                      </span>
                    )}
                    <span className="text-[#8ca0ab]">·</span>
                    <span className="font-mono text-[11px] text-[#607784]">{getRelativeUpdatedText()}</span>
                  </div>
                  <p className="text-[11px] text-[#7d919d] mt-1 font-medium">
                    {viewMode === 'live'
                      ? 'Prioritized by AI triage flags (High Priority first) · Requires clinical review'
                      : 'Patients who have completed physician clinical review · Clinical record locked & synced'}
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
                      placeholder={viewMode === 'live' ? 'Search patients, token...' : 'Search reviewed patients...'}
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
                    onClick={() => fetchQueues(true)}
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
                {viewMode === 'live' && statFilter !== 'all' && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl bg-[#eef7f4] border border-[#cbe4dc] text-xs text-[#1e4d41] transition-all">
                    <div className="flex items-center gap-2 font-medium">
                      <Filter size={13} className="text-[#1f5b4e] shrink-0" />
                      <span>
                        Active filter: <b>High Priority Patients</b> ({filteredQueue.length}{' '}
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
                {(viewMode === 'live' ? liveQueue : reviewedQueue) === null ? (
                  /* Initial loading state */
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dce6e9] bg-[#fbfdfd] my-3">
                    <RefreshCw size={24} className="mx-auto mb-2 text-[#1f5b4e] animate-spin" />
                    <p className="font-semibold text-xs text-[#274457]">Connecting to clinical database...</p>
                  </div>
                ) : error ? (
                  <div className="py-12 px-4 text-center rounded-xl border border-[#f2c9c4] bg-[#fff8f7] my-3">
                    <AlertTriangle size={26} className="mx-auto mb-2 text-[#b5473c]" />
                    <p className="font-semibold text-sm text-[#713b36]">Queue unavailable</p>
                    <p className="text-xs text-[#8b5954] mt-1 max-w-sm mx-auto">{error}</p>
                    <button
                      type="button"
                      onClick={() => fetchQueues(true)}
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
                          {viewMode === 'reviewed' && item.reviewed_by && (
                            <span className="block text-[11px] font-semibold text-[#15803d] mt-0.5 truncate">
                              Reviewed by: {item.reviewed_by}
                            </span>
                          )}
                        </div>
                        {viewMode === 'reviewed' ? (
                          <div
                            className="priority bg-[#dcfce7] text-[#14532d] border border-[#86efac] font-bold text-[11px]"
                            title="Clinician verified & confirmed"
                          >
                            <CheckCircle2 size={12} className="inline mr-1 text-[#16a34a]" />
                            REVIEWED
                          </div>
                        ) : (
                          <div
                            className={`priority ${badgeClass}`}
                            title="AI-assisted triage priority · Subject to clinical verification"
                          >
                            <span />
                            {badgeLabel}
                          </div>
                        )}
                        <div className="queue-wait">
                          {viewMode === 'reviewed' ? (
                            <>
                              <span className="text-[#16a34a] font-bold">Reviewed</span>
                              <b className="text-[11px] font-medium text-[#4b6358]">
                                {item.reviewed_at
                                  ? formatLocalTime(item.reviewed_at)
                                  : 'Done'}
                              </b>
                            </>
                          ) : (
                            <>
                              <span>Waiting</span>
                              <b>{item.wait}</b>
                            </>
                          )}
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
                ) : viewMode === 'live' && statFilter !== 'all' ? (
                  /* Empty state for active stat filter with no matches */
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dce6e9] bg-[#fbfdfd] my-3">
                    <Filter size={26} className="mx-auto mb-2 text-[#9bb0ba]" />
                    <p className="font-semibold text-sm text-[#274457]">No matching patients</p>
                    <p className="text-xs text-[#758a96] mt-1">
                      No patients in queue currently match the high priority filter.
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
                ) : viewMode === 'reviewed' ? (
                  /* Empty state for reviewed queue */
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dce6e9] bg-[#fbfdfd] my-3">
                    <CheckCircle2 size={26} className="mx-auto mb-2 text-[#9bb0ba]" />
                    <p className="font-semibold text-sm text-[#274457]">No reviewed patients yet</p>
                    <p className="text-xs text-[#758a96] mt-1 max-w-sm mx-auto">
                      When you review and confirm patient records from the Live Queue, they will automatically move here.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('live')}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1f5b4e] hover:underline cursor-pointer"
                    >
                      <ArrowLeft size={13} /> Return to Live Queue
                    </button>
                  </div>
                ) : (
                  /* Empty state for empty live queue */
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-[#dce6e9] bg-[#fbfdfd] my-3">
                    <Users size={26} className="mx-auto mb-2 text-[#9bb0ba]" />
                    <p className="font-semibold text-sm text-[#274457]">No patients waiting</p>
                    <p className="text-xs text-[#758a96] mt-1 max-w-sm mx-auto">
                      The live queue is currently clear. New patients from intake will appear here automatically.
                    </p>
                    <button
                      type="button"
                      onClick={() => fetchQueues(true)}
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

              {(viewMode === 'live' ? liveQueue : reviewedQueue) === null ? (
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
                    {viewMode === 'reviewed' ? (
                      <span className="profile-status bg-[#dcfce7] text-[#14532d] border border-[#86efac] px-2.5 py-0.5 rounded-full font-bold text-xs">
                        ✓ Reviewed
                      </span>
                    ) : (
                      <span className="profile-status">Waiting {patient.wait}</span>
                    )}
                  </div>

                  {viewMode === 'reviewed' ? (
                    <div className="ai-notice bg-[#ecfdf5] border-[#a2d4ba] text-[#065f46]">
                      <CheckCircle2 size={16} className="text-[#16a34a]" />
                      <span>
                        <b>Physician Reviewed & Confirmed</b>
                        <small>
                          {patient.reviewed_by ? `Sign-off by ${patient.reviewed_by}` : 'Clinical verification complete'}
                          {patient.reviewed_at ? ` · ${formatLocalTime(patient.reviewed_at)}` : ''}
                        </small>
                      </span>
                      <CheckCircle2 size={16} className="text-[#16a34a]" />
                    </div>
                  ) : (
                    <div className="ai-notice">
                      <Sparkles size={16} />
                      <span>
                        <b>AI-structured summary</b>
                        <small>For physician review only</small>
                      </span>
                      <CheckCircle2 size={16} />
                    </div>
                  )}

                  <div className="summary-block">
                    <span className="summary-block-label">CHIEF CONCERN</span>
                    <h3>{patient.reason}</h3>
                    <p>
                      {viewMode === 'reviewed'
                        ? `Clinical intake and symptom facts for ${patient.name} have been reviewed, verified, and signed off.`
                        : `Patient shared symptoms in ${patient.lang} during adaptive intake. Structured clinical facts and red flag checks are ready for clinician review.`}
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
                    {viewMode === 'reviewed'
                      ? 'Select a patient from the reviewed list to inspect their confirmed clinical summary.'
                      : 'Select a patient from the live queue to inspect their clinical summary.'}
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
