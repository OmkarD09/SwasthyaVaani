import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  BellRing,
  LayoutDashboard,
  LogOut,
  Menu,
  UsersRound,
  X,
} from 'lucide-react';

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-swasthyavaani">
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${
          dark ? 'bg-[#e1b968] text-[#163c35]' : 'bg-[#1f5b4e] text-[#f7f0df]'
        }`}
      >
        <span className="font-serif text-xl font-bold leading-none">स्व</span>
      </div>
      <div>
        <div
          className={`font-serif text-xl font-semibold tracking-tight ${
            dark ? 'text-[#f6efdf]' : 'text-[#163c35]'
          }`}
        >
          SwasthyaVaani
        </div>
        <div
          className={`font-mono text-[9px] uppercase tracking-[.2em] ${
            dark ? 'text-[#b9d1c4]' : 'text-[#70867b]'
          }`}
        >
          Clinical Intake
        </div>
      </div>
    </div>
  );
}

export function ClinicianButton({
  children,
  variant = 'primary',
  onClick,
  className = '',
  disabled = false,
  testId = 'button-action',
  type = 'button',
}: {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'quiet' | 'amber' | 'danger';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  testId?: string;
  type?: 'button' | 'submit';
}) {
  const styles = {
    primary:
      'bg-[#1f5b4e] text-[#f8f1e2] hover:bg-[#17483e] shadow-[0_4px_0_#153f36]',
    outline:
      'border border-[#b7c7bc] bg-[#fbf7ec] text-[#1f5b4e] hover:border-[#1f5b4e] hover:bg-[#eef3ea]',
    quiet: 'text-[#507165] hover:bg-[#e9efe7]',
    amber:
      'bg-[#e1b968] text-[#173c35] hover:bg-[#d6a951] shadow-[0_4px_0_#b2873b]',
    danger:
      'bg-[#b84940] text-white hover:bg-[#993b34] shadow-[0_4px_0_#83342f]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function DoshaArcGauge({
  doshas = [33, 33, 34],
}: {
  doshas?: [number, number, number] | number[];
}) {
  const [vata = 33, pitta = 33, kapha = 34] = doshas || [33, 33, 34];
  const items = [
    { label: 'Vata', val: vata, color: '#0ea5e9' },
    { label: 'Pitta', val: pitta, color: '#f59e0b' },
    { label: 'Kapha', val: kapha, color: '#10b981' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 py-1">
      {items.map(({ label, val, color }) => (
        <div
          key={label}
          className="relative flex flex-col items-center justify-center rounded-xl border border-[#d8ddd3] bg-[#fbfaf4] p-3 transition-all hover:border-[#1f5b4e]"
        >
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

export function StatusPill({
  tone,
  children,
}: {
  tone: 'teal' | 'amber' | 'red';
  children: ReactNode;
}) {
  const colors = {
    teal: 'bg-[#dbeade] text-[#27634f] border border-[#a8c9b3]',
    amber: 'bg-[#f7eac7] text-[#886326] border border-[#e1cc93]',
    red: 'bg-[#f6dcd7] text-[#a83d35] border border-[#e3b2aa]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide shadow-xs ${colors[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function ClinicianShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobile, setMobile] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-[#eef0e8] text-[#173e35]">
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
            className="text-[#a9c5b5] lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mt-12 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-[#86a899]">
          Doctor Workspace
        </div>
        <nav className="mt-3 space-y-1">
          <Link
            href="/doctor"
            onClick={() => setMobile(false)}
            data-testid="link-doctor-dashboard"
            className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm transition ${
              location.startsWith('/doctor')
                ? 'bg-[#2b6154] font-semibold text-[#f7f0df] shadow-sm'
                : 'text-[#b6cdbf] hover:bg-[#234d43]'
            }`}
          >
            <LayoutDashboard size={18} /> Doctor Dashboard
          </Link>
        </nav>
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
            className="mt-5 flex items-center gap-2 text-xs text-[#9ebcaf] hover:text-[#f7f0df]"
          >
            <LogOut size={14} /> Exit demo
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#d8ddd3] bg-[#f5f4ec]/95 px-5 backdrop-blur md:px-8">
          <button
            onClick={() => setMobile(true)}
            data-testid="button-open-menu"
            className="text-[#476b5e] lg:hidden"
          >
            <Menu size={22} />
          </button>
          <div className="hidden text-xs text-[#71877c] sm:block">
            SwasthyaVaani Clinical Gateway{' '}
            <span className="mx-2 text-[#bdc8bb]">/</span> Connected OPD Session
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
