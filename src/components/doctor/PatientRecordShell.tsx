import { type ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  History,
  Leaf,
  Menu,
  BellRing,
  ArrowLeft,
  Hospital,
  ChevronDown,
  CircleHelp,
  LockKeyhole,
  UsersRound,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Brand } from '../Brand';
import {
  clearClinicianSession,
  getClinicianSession,
} from '../../lib/clinicianAuth';

export interface PatientRecordShellProps {
  patientId: string;
  children: ReactNode;
}

export function PatientRecordShell({ patientId, children }: PatientRecordShellProps) {
  const [location, setLocation] = useLocation();
  const [mobile, setMobile] = useState(false);
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

  const isConversation = location.includes('/conversation');
  const isAyush = location.includes('/ayush');
  const isHistory = location.includes('/history');
  const isSummary = location.includes('/summary') || (!isConversation && !isAyush && !isHistory);

  return (
    <div className={`portal-page ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Patient Specific Sidebar matching /doctor sidebar orientation and color */}
      <aside className={`portal-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobile ? 'mobile-open' : ''}`}>
        <div
          className={`portal-brand ${sidebarCollapsed ? 'flex justify-center px-0' : ''}`}
          onClick={() => setLocation('/')}
          title={sidebarCollapsed ? 'SwasthyaVaani · Clinical Workspace' : undefined}
        >
          {sidebarCollapsed ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1f5b4e] to-[#2e7d6b] flex items-center justify-center text-white mx-auto shadow-md cursor-pointer hover:scale-105 transition-transform border border-[#eaba61]/30">
              <Hospital size={20} className="text-[#eaba61]" />
            </div>
          ) : (
            <Brand />
          )}
        </div>

        {sidebarCollapsed ? (
          <div className="py-2 flex justify-center">
            <div
              className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[#eaba61]/20 flex items-center justify-center text-[#eaba61] cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              title="Clinical Workspace · Patient record"
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
              <span>Patient record</span>
            </div>
            <ChevronDown size={14} />
          </div>
        )}

        {/* Section 1: Doctor Workspace */}
        {!sidebarCollapsed ? (
          <div className="side-label">DOCTOR WORKSPACE</div>
        ) : (
          <div className="my-2 border-t border-[rgba(255,255,255,0.08)]" />
        )}
        <nav className="portal-nav">
          <div className="relative group">
            <button
              type="button"
              className={`w-full flex items-center rounded-lg transition-all cursor-pointer ${sidebarCollapsed ? 'justify-center p-2.5' : ''}`}
              onClick={() => {
                setMobile(false);
                setLocation('/doctor');
              }}
            >
              <LayoutDashboard size={18} />
              {!sidebarCollapsed && <span>Doctor Dashboard</span>}
            </button>
            {sidebarCollapsed && (
              <div className="hidden lg:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[#0d222b] text-white text-xs font-semibold shadow-xl border border-[#264552] pointer-events-none items-center gap-2">
                <span>Doctor Dashboard</span>
              </div>
            )}
          </div>
        </nav>

        {/* Section 2: Patient Record Navigation */}
        {!sidebarCollapsed ? (
          <div className="side-label side-label-spaced">PATIENT RECORD</div>
        ) : (
          <div className="my-2 border-t border-[rgba(255,255,255,0.08)]" />
        )}
        <nav className="portal-nav">
          <div className="relative group">
            <button
              type="button"
              className={`w-full flex items-center rounded-lg transition-all relative cursor-pointer ${isSummary ? 'active' : ''} ${sidebarCollapsed ? 'justify-center p-2.5' : ''}`}
              onClick={() => {
                setMobile(false);
                setLocation(`/doctor/patient/${patientId}/summary`);
              }}
            >
              <FileText size={18} />
              {!sidebarCollapsed && <span>Clinical Summary</span>}
              {sidebarCollapsed && isSummary && (
                <span className="absolute left-0.5 top-2.5 bottom-2.5 w-1 rounded-full bg-[#eaba61]" />
              )}
            </button>
            {sidebarCollapsed && (
              <div className="hidden lg:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[#0d222b] text-white text-xs font-semibold shadow-xl border border-[#264552] pointer-events-none items-center gap-2">
                <span>Clinical Summary</span>
              </div>
            )}
          </div>

          <div className="relative group">
            <button
              type="button"
              className={`w-full flex items-center rounded-lg transition-all relative cursor-pointer ${isHistory ? 'active' : ''} ${sidebarCollapsed ? 'justify-center p-2.5' : ''}`}
              onClick={() => {
                setMobile(false);
                setLocation(`/doctor/patient/${patientId}/history`);
              }}
            >
              <History size={18} />
              {!sidebarCollapsed && <span>Clinical History</span>}
              {sidebarCollapsed && isHistory && (
                <span className="absolute left-0.5 top-2.5 bottom-2.5 w-1 rounded-full bg-[#eaba61]" />
              )}
            </button>
            {sidebarCollapsed && (
              <div className="hidden lg:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[#0d222b] text-white text-xs font-semibold shadow-xl border border-[#264552] pointer-events-none items-center gap-2">
                <span>Clinical History</span>
              </div>
            )}
          </div>

          <div className="relative group">
            <button
              type="button"
              className={`w-full flex items-center rounded-lg transition-all relative cursor-pointer ${isConversation ? 'active' : ''} ${sidebarCollapsed ? 'justify-center p-2.5' : ''}`}
              onClick={() => {
                setMobile(false);
                setLocation(`/doctor/patient/${patientId}/conversation`);
              }}
            >
              <MessageSquare size={18} />
              {!sidebarCollapsed && <span>Patient Conversation</span>}
              {sidebarCollapsed && isConversation && (
                <span className="absolute left-0.5 top-2.5 bottom-2.5 w-1 rounded-full bg-[#eaba61]" />
              )}
            </button>
            {sidebarCollapsed && (
              <div className="hidden lg:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[#0d222b] text-white text-xs font-semibold shadow-xl border border-[#264552] pointer-events-none items-center gap-2">
                <span>Patient Conversation</span>
              </div>
            )}
          </div>

          <div className="relative group">
            <button
              type="button"
              className={`w-full flex items-center rounded-lg transition-all relative cursor-pointer ${isAyush ? 'active' : ''} ${sidebarCollapsed ? 'justify-center p-2.5' : ''}`}
              onClick={() => {
                setMobile(false);
                setLocation(`/doctor/patient/${patientId}/ayush`);
              }}
            >
              <Leaf size={18} />
              {!sidebarCollapsed && <span>AYUSH Assessment</span>}
              {sidebarCollapsed && isAyush && (
                <span className="absolute left-0.5 top-2.5 bottom-2.5 w-1 rounded-full bg-[#eaba61]" />
              )}
            </button>
            {sidebarCollapsed && (
              <div className="hidden lg:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[#0d222b] text-white text-xs font-semibold shadow-xl border border-[#264552] pointer-events-none items-center gap-2">
                <span>AYUSH Assessment</span>
              </div>
            )}
          </div>
        </nav>

        {/* Section 3: System */}
        {!sidebarCollapsed ? (
          <div className="side-label side-label-spaced">SYSTEM</div>
        ) : (
          <div className="my-2 border-t border-[rgba(255,255,255,0.08)]" />
        )}
        <nav className="portal-nav">
          <div className="relative group">
            <button
              type="button"
              className={`w-full flex items-center rounded-lg transition-all cursor-pointer ${sidebarCollapsed ? 'justify-center p-2.5' : ''}`}
              onClick={() => alert('Support workflow is not connected in this prototype.')}
            >
              <CircleHelp size={18} />
              {!sidebarCollapsed && <span>Help & support</span>}
            </button>
            {sidebarCollapsed && (
              <div className="hidden lg:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[#0d222b] text-white text-xs font-semibold shadow-xl border border-[#264552] pointer-events-none items-center gap-2">
                <span>Help & support</span>
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Profile Info and Secure Badge */}
        <div className="sidebar-bottom">
          {/* Collapse/Expand Toggle Button (Desktop) */}
          <button
            type="button"
            onClick={handleToggleSidebar}
            className={`
              hidden lg:flex items-center w-full py-2 px-2.5 mb-2.5 rounded-xl text-[#9ab2a4] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors text-xs font-medium cursor-pointer
              ${sidebarCollapsed ? 'justify-center' : 'justify-between'}
            `}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon-Only'}
          >
            {!sidebarCollapsed && <span>Collapse Sidebar</span>}
            {sidebarCollapsed ? (
              <PanelLeftOpen size={16} className="text-[#eaba61]" />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>

          <div className="relative mb-2.5" ref={menuRef}>
            {profileOpen && (
              <div className={`absolute ${sidebarCollapsed ? 'left-full ml-3 bottom-0' : 'left-0 bottom-full mb-2'} w-64 rounded-2xl border border-[#264552] bg-[#0d222b] p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-white`}>
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
                      setLocation('/');
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
              className={`flex items-center ${sidebarCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2'} w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.09)] transition cursor-pointer text-left`}
              title={`${clinicianName} · Click for profile options`}
            >
              <div className="grid place-items-center w-8 h-8 rounded-full bg-[#1e4e46] text-[#78decb] font-bold text-xs shrink-0 border border-[#2b6d61]">
                {clinicianInitials}
              </div>
              {!sidebarCollapsed && (
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

          {sidebarCollapsed ? (
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

      {/* Main Content Area */}
      <div className={`portal-content bg-[#f5f8f5] ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#e2e8e0] bg-[#f5f8f5]/95 px-5 backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobile(true)}
              data-testid="button-open-menu"
              className="text-[#476b5e] lg:hidden cursor-pointer"
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
            <Link
              href="/doctor"
              className="hover:text-[#143d34] flex items-center gap-1.5 text-xs font-bold text-[#44685c] transition"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-3.5">
            <BellRing size={17} className="text-[#597e71]" />
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
