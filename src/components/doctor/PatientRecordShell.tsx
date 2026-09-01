import { type ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Leaf,
  Menu,
  X,
  BellRing,
  ArrowLeft,
  Hospital,
  ChevronDown,
  CircleHelp,
  LockKeyhole,
  UsersRound,
} from 'lucide-react';
import { Brand } from '../Brand';

export interface PatientRecordShellProps {
  patientId: string;
  children: ReactNode;
}

export function PatientRecordShell({ patientId, children }: PatientRecordShellProps) {
  const [location, setLocation] = useLocation();
  const [mobile, setMobile] = useState(false);
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

  const isConversation = location.includes('/conversation');
  const isAyush = location.includes('/ayush');
  const isSummary = location.includes('/summary') || (!isConversation && !isAyush);

  return (
    <div className="portal-page">
      {/* Patient Specific Sidebar matching /doctor sidebar orientation and color */}
      <aside className={`portal-sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="portal-brand" onClick={() => setLocation('/')}>
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

        {/* Section 1: Doctor Workspace */}
        <div className="side-label">DOCTOR WORKSPACE</div>
        <nav className="portal-nav">
          <button
            type="button"
            onClick={() => {
              setMobile(false);
              setLocation('/doctor');
            }}
          >
            <LayoutDashboard size={18} />
            <span>Doctor Dashboard</span>
          </button>
        </nav>

        {/* Section 2: Patient Record Navigation */}
        <div className="side-label side-label-spaced">PATIENT RECORD</div>
        <nav className="portal-nav">
          <button
            type="button"
            className={isSummary ? 'active' : ''}
            onClick={() => {
              setMobile(false);
              setLocation(`/doctor/patient/${patientId}/summary`);
            }}
          >
            <FileText size={18} />
            <span>Clinical Summary</span>
          </button>

          <button
            type="button"
            className={isConversation ? 'active' : ''}
            onClick={() => {
              setMobile(false);
              setLocation(`/doctor/patient/${patientId}/conversation`);
            }}
          >
            <MessageSquare size={18} />
            <span>Patient Conversation</span>
          </button>

          <button
            type="button"
            className={isAyush ? 'active' : ''}
            onClick={() => {
              setMobile(false);
              setLocation(`/doctor/patient/${patientId}/ayush`);
            }}
          >
            <Leaf size={18} />
            <span>AYUSH Assessment</span>
          </button>
        </nav>

        {/* Section 3: System */}
        <div className="side-label side-label-spaced">SYSTEM</div>
        <nav className="portal-nav">
          <button type="button" onClick={() => alert('Support line: OPD Helpdesk Ext 402')}>
            <CircleHelp size={18} />
            <span>Help & support</span>
          </button>
        </nav>

        {/* Bottom Profile Info and Secure Badge */}
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

      {/* Main Content Area */}
      <div className="portal-content">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#d8ddd3] bg-[#f8f7ef]/95 px-5 backdrop-blur md:px-8">
          <button
            onClick={() => setMobile(true)}
            data-testid="button-open-menu"
            className="text-[#476b5e] lg:hidden cursor-pointer"
          >
            <Menu size={22} />
          </button>
          <div className="hidden text-xs text-[#71877c] sm:flex items-center gap-2">
            <Link href="/doctor" className="hover:text-[#1f5b4e] flex items-center gap-1 font-medium">
              <ArrowLeft size={13} /> Doctor Dashboard
            </Link>
            <span className="text-[#bdc8bb]">/</span>
            <span className="font-mono font-semibold text-[#173e35]">Patient #{patientId}</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="flex items-center gap-2 font-mono text-[10px] text-[#668075]">
              <span className="h-2 w-2 rounded-full bg-[#6e9b76] animate-pulse" /> FASTAPI &
              SUPABASE LIVE
            </span>
            <BellRing size={18} className="text-[#668075]" />
          </div>
        </header>

        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
