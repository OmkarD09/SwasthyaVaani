import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Leaf,
  LogOut,
  Menu,
  X,
  BellRing,
  ArrowLeft,
} from 'lucide-react';
import { Logo } from '../clinician/ClinicianShared';

export interface PatientRecordShellProps {
  patientId: string;
  children: ReactNode;
}

export function PatientRecordShell({ patientId, children }: PatientRecordShellProps) {
  const [location, setLocation] = useLocation();
  const [mobile, setMobile] = useState(false);

  const isConversation = location.includes('/conversation');
  const isAyush = location.includes('/ayush');
  const isSummary = location.includes('/summary') || (!isConversation && !isAyush);

  return (
    <div className="min-h-[100dvh] bg-[#eef0e8] text-[#173e35]">
      {/* Patient Specific Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-[#31594e] bg-[#173e35] px-4 py-5 transition-transform lg:translate-x-0 ${
          mobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-3">
          <Logo dark />
          <button
            onClick={() => setMobile(false)}
            data-testid="button-close-menu"
            className="text-[#a9c5b5] lg:hidden cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Section 1: Doctor Workspace */}
        <div className="mt-9 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-[#86a899]">
          Doctor Workspace
        </div>
        <nav className="mt-2 space-y-1">
          <Link
            href="/doctor"
            onClick={() => setMobile(false)}
            data-testid="link-doctor-dashboard"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-[#b6cdbf] hover:bg-[#234d43] hover:text-[#f7f0df] transition cursor-pointer"
          >
            <LayoutDashboard size={17} />
            <span>Doctor Dashboard</span>
          </Link>
        </nav>

        {/* Section 2: Patient Record Navigation */}
        <div className="mt-7 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-[#86a899]">
          Patient Record
        </div>
        <nav className="mt-2 space-y-1.5">
          <Link
            href={`/doctor/patient/${patientId}/summary`}
            onClick={() => setMobile(false)}
            data-testid="link-patient-summary"
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition cursor-pointer ${
              isSummary
                ? 'bg-[#2b6154] font-semibold text-[#f7f0df] shadow-sm'
                : 'text-[#b6cdbf] hover:bg-[#234d43] hover:text-[#f7f0df]'
            }`}
          >
            <FileText size={17} />
            <span>Clinical Summary</span>
          </Link>

          <Link
            href={`/doctor/patient/${patientId}/conversation`}
            onClick={() => setMobile(false)}
            data-testid="link-patient-conversation"
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition cursor-pointer ${
              isConversation
                ? 'bg-[#2b6154] font-semibold text-[#f7f0df] shadow-sm'
                : 'text-[#b6cdbf] hover:bg-[#234d43] hover:text-[#f7f0df]'
            }`}
          >
            <MessageSquare size={17} />
            <span>Patient Conversation</span>
          </Link>

          <Link
            href={`/doctor/patient/${patientId}/ayush`}
            onClick={() => setMobile(false)}
            data-testid="link-patient-ayush"
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition cursor-pointer ${
              isAyush
                ? 'bg-[#2b6154] font-semibold text-[#f7f0df] shadow-sm'
                : 'text-[#b6cdbf] hover:bg-[#234d43] hover:text-[#f7f0df]'
            }`}
          >
            <Leaf size={17} />
            <span>AYUSH Assessment</span>
          </Link>
        </nav>

        {/* Bottom Profile Info */}
        <div className="absolute bottom-6 left-7 right-7 border-t border-[#31594e] pt-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e1b968] font-semibold text-[#173e35]">
              DR
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f7f0df]">Dr. Ananya Rao</p>
              <p className="font-mono text-[10px] text-[#86a899]">OPD 02 · DISTRICT HOSP</p>
            </div>
          </div>
          <button
            onClick={() => setLocation('/')}
            data-testid="button-clinician-logout"
            className="mt-5 flex items-center gap-2 text-xs text-[#9ebcaf] hover:text-[#f7f0df] cursor-pointer"
          >
            <LogOut size={14} /> Exit demo
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#d8ddd3] bg-[#f5f4ec]/95 px-5 backdrop-blur md:px-8">
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
