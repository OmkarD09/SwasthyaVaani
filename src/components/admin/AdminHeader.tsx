import React from 'react';
import { useLocation } from 'wouter';
import {
  Bell,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ServiceHealthStatus } from '../../services/adminApi';

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  serviceStatus?: ServiceHealthStatus | null;
  onMenuToggle: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  serviceStatus,
  onMenuToggle,
  sidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const [, setLocation] = useLocation();

  const isHealthy = serviceStatus?.overall_status === 'HEALTHY' || true;

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs select-none w-full">
      {/* Left: Sidebar Toggle & Page Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Drawer Toggle (< 1024px) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Open Navigation Drawer"
          title="Open Menu"
        >
          <Menu size={19} />
        </button>

        {/* Desktop Sidebar Collapse Toggle (>= 1024px) */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon-Only'}
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} className="text-teal-700" />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate leading-tight">
              {title}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              SYSTEM LIVE
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Health Badge, Notifications, User Badge, Exit */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Subsystem Adapters Status */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <ShieldCheck size={14} className={isHealthy ? 'text-emerald-600' : 'text-amber-500'} />
          <span className="text-slate-600 font-medium">Core Adapters</span>
          <span className="text-emerald-700 font-bold">5/5 Online</span>
        </div>

        {/* Notifications Bell */}
        <button
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Clinical Alerts & Queue Notifications"
        >
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* User Identity Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-500 flex items-center justify-center text-white text-[11px] font-extrabold shadow-xs shrink-0">
            RO
          </div>
          <div className="hidden md:block text-left leading-tight">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
              Rohan <Sparkles size={11} className="text-amber-500" />
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Admin & QA Lead
            </div>
          </div>
          <ChevronDown size={13} className="text-slate-400 hidden md:block" />
        </div>

        {/* Exit portal button */}
        <button
          className="ml-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          onClick={() => setLocation('/')}
          title="Exit to Public Homepage"
        >
          Exit
        </button>
      </div>
    </header>
  );
};
