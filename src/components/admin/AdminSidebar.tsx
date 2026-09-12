import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  AlertTriangle,
  FileText,
  Users,
  TestTube2,
  Building2,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Hospital,
  Stethoscope,
  HeartPulse,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { Brand } from '../Brand';
import { getClinicianSession, clearClinicianSession } from '../../lib/clinicianAuth';

export type AdminTab =
  | 'overview'
  | 'ai_monitoring'
  | 'emergency'
  | 'audit'
  | 'onboarding'
  | 'qa_lab';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  criticalCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  criticalCount = 0,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const session = getClinicianSession();
  const adminName = session?.display_name || 'Rohan';
  const adminRole = 'Lead Administrator';
  const adminInitials =
    adminName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'RO';

  // Handle click outside and Escape key for profile menu
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

  const handleSelect = (tab: AdminTab) => {
    onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  // Primary Hospital Operations
  const hospitalOperations = [
    {
      id: 'overview' as AdminTab,
      label: 'Overview',
      icon: LayoutDashboard,
      hasBadge: false,
    },
    {
      id: 'ai_monitoring' as AdminTab,
      label: 'AI Oversight',
      icon: Sparkles,
      hasBadge: false,
    },
    {
      id: 'emergency' as AdminTab,
      label: 'Critical & Emergency',
      icon: AlertTriangle,
      hasBadge: criticalCount > 0,
    },
    {
      id: 'audit' as AdminTab,
      label: 'Security & Audit',
      icon: FileText,
      hasBadge: false,
    },
    {
      id: 'onboarding' as AdminTab,
      label: 'Staff & Onboarding',
      icon: Users,
      hasBadge: false,
    },
  ];

  return (
    <>
      <aside
        className={`
          bg-[#1b3b31] text-[#dce8df] flex flex-col justify-between select-none
          transition-all duration-300 ease-in-out border-r border-[#234d40]/60
          ${
            // Mobile styling
            mobileOpen
              ? 'fixed inset-y-0 left-0 z-50 w-68 translate-x-0 shadow-2xl flex'
              : 'fixed -translate-x-full lg:static lg:translate-x-0'
          }
          ${
            // Desktop width when in-flow
            collapsed ? 'lg:w-18' : 'lg:w-60'
          }
          h-full shrink-0
        `}
      >
        {/* Top Static Header Area: Brand & Compact Collapse Button */}
        <div className="shrink-0">
          <div className="p-3.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <div
                  className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1f5b4e] to-[#2e7d6b] flex items-center justify-center text-white mx-auto shadow-md border border-[#eaba61]/30 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => handleSelect('overview')}
                  title="SwasthyaVaani · Administrative Workspace"
                >
                  <Hospital size={18} className="text-[#eaba61]" />
                </div>
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="hidden lg:flex p-1 rounded-md text-[#8da396] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer mt-1"
                    title="Expand Sidebar"
                    aria-label="Expand Sidebar"
                  >
                    <PanelLeftOpen size={15} className="text-[#eaba61]" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div
                  className="cursor-pointer overflow-hidden text-white"
                  onClick={() => handleSelect('overview')}
                  title="SwasthyaVaani · Administrative Workspace"
                >
                  <Brand light />
                </div>

                <div className="flex items-center gap-1">
                  {/* Desktop Compact Collapse Icon Button */}
                  {onToggleCollapse && (
                    <button
                      onClick={onToggleCollapse}
                      className="hidden lg:flex p-1.5 rounded-md text-[#8da396] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer"
                      title="Collapse Sidebar"
                      aria-label="Collapse Sidebar"
                    >
                      <PanelLeftClose size={15} />
                    </button>
                  )}

                  {/* Mobile Drawer Close Button */}
                  {onCloseMobile && (
                    <button
                      onClick={onCloseMobile}
                      className="lg:hidden p-1.5 rounded-md text-[#8da396] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                      title="Close Menu"
                      aria-label="Close Menu"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hospital Identity Card */}
          {!collapsed ? (
            <div className="mx-3 my-2.5 px-3 py-2 rounded-xl bg-[rgba(35,77,64,0.45)] border border-[rgba(234,186,97,0.14)] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[rgba(234,186,97,0.12)] border border-[rgba(234,186,97,0.2)] flex items-center justify-center text-[#eaba61] shrink-0">
                <Building2 size={14} />
              </div>
              <div className="leading-tight overflow-hidden flex-1 min-w-0">
                <div className="text-[11.5px] font-bold text-[#f7f4ee] truncate">
                  District Hospital
                </div>
                <div className="text-[10px] text-[#9ab2a4] truncate mt-0.5">
                  Hospital Operations
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2 flex justify-center">
              <div
                className="w-8 h-8 rounded-lg bg-[rgba(35,77,64,0.45)] border border-[rgba(234,186,97,0.14)] flex items-center justify-center text-[#eaba61]"
                title="District Hospital · Hospital Operations"
              >
                <Building2 size={15} />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Navigation Area with INVISIBLE Scrollbar (Mouse-wheel, trackpad, touch, keyboard scrollable) */}
        <div
          className="admin-sidebar-scroll flex-1 overflow-y-auto px-2.5 py-1.5 space-y-4 min-h-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* SECTION 1: PRIMARY HOSPITAL OPERATIONS */}
          <div>
            {!collapsed ? (
              <div className="px-2 pb-1.5 text-[9px] font-bold tracking-[0.15em] text-[#7e998d] uppercase">
                Hospital Operations
              </div>
            ) : (
              <div className="my-1 border-t border-[rgba(255,255,255,0.06)]" />
            )}

            <nav className="space-y-0.5">
              {hospitalOperations.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => handleSelect(item.id)}
                      className={`
                        w-full flex items-center rounded-lg transition-all duration-150 relative cursor-pointer text-[12px]
                        ${collapsed ? 'justify-center p-2' : 'justify-between py-1.5 px-2.5'}
                        ${
                          isActive
                            ? 'bg-[rgba(234,186,97,0.1)] text-[#f7f4ee] font-semibold border-l-2 border-[#eaba61]'
                            : 'text-[#a9beb1] hover:text-white hover:bg-[rgba(255,255,255,0.05)] font-normal'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={15}
                          className={`shrink-0 transition-colors ${
                            isActive
                              ? 'text-[#eaba61]'
                              : 'text-[#7e998d] group-hover:text-white'
                          }`}
                        />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>

                      {/* Operationally Meaningful Emergency Badge Only */}
                      {!collapsed && item.hasBadge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#c6362f] text-white shrink-0 shadow-xs shadow-red-950/40 animate-pulse">
                          {criticalCount}
                        </span>
                      )}

                      {/* Collapsed Active Indicator Pill */}
                      {collapsed && isActive && (
                        <span className="absolute left-0.5 top-2 bottom-2 w-0.5 rounded-full bg-[#eaba61]" />
                      )}

                      {/* Collapsed Critical Alert Notification Dot */}
                      {collapsed && item.id === 'emergency' && criticalCount > 0 && !isActive && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#c6362f] animate-ping" />
                      )}
                    </button>

                    {/* Tooltip on Hover When Collapsed */}
                    {collapsed && (
                      <div className="hidden lg:group-hover:flex absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1 rounded-md bg-[#16332a] text-white text-[11px] font-medium shadow-xl border border-[#234d40] pointer-events-none items-center gap-2">
                        <span>{item.label}</span>
                        {item.hasBadge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#c6362f] text-white font-bold">
                            {criticalCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* SECTION 2: SYSTEM PORTALS */}
          <div>
            {!collapsed ? (
              <div className="px-2 pt-1 pb-1.5 text-[9px] font-bold tracking-[0.15em] text-[#7e998d] uppercase">
                Portals
              </div>
            ) : (
              <div className="my-1 border-t border-[rgba(255,255,255,0.06)]" />
            )}

            <nav className="space-y-0.5">
              <div className="relative group">
                <a
                  href="/doctor"
                  className={`
                    w-full flex items-center rounded-lg transition-colors text-[12px] font-normal text-[#a9beb1] hover:text-white hover:bg-[rgba(255,255,255,0.05)] cursor-pointer
                    ${collapsed ? 'justify-center p-2' : 'gap-2.5 py-1.5 px-2.5'}
                  `}
                  title="Doctor Workstation"
                >
                  <Stethoscope size={15} className="text-[#7e998d] group-hover:text-[#eaba61] transition-colors shrink-0" />
                  {!collapsed && <span>Doctor Workstation</span>}
                </a>
                {collapsed && (
                  <div className="hidden lg:group-hover:flex absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1 rounded-md bg-[#16332a] text-white text-[11px] font-medium shadow-xl border border-[#234d40] pointer-events-none">
                    Doctor Workstation
                  </div>
                )}
              </div>

              <div className="relative group">
                <a
                  href="/patient"
                  className={`
                    w-full flex items-center rounded-lg transition-colors text-[12px] font-normal text-[#a9beb1] hover:text-white hover:bg-[rgba(255,255,255,0.05)] cursor-pointer
                    ${collapsed ? 'justify-center p-2' : 'gap-2.5 py-1.5 px-2.5'}
                  `}
                  title="Patient Intake Kiosk"
                >
                  <HeartPulse size={15} className="text-[#7e998d] group-hover:text-[#eaba61] transition-colors shrink-0" />
                  {!collapsed && <span>Patient Kiosk</span>}
                </a>
                {collapsed && (
                  <div className="hidden lg:group-hover:flex absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1 rounded-md bg-[#16332a] text-white text-[11px] font-medium shadow-xl border border-[#234d40] pointer-events-none">
                    Patient Kiosk
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* SECTION 3: DEMO / DEVELOPER TOOLS (UTILITY SECTION) */}
          <div>
            {!collapsed ? (
              <div className="px-2 pt-1 pb-1.5 text-[9px] font-bold tracking-[0.15em] text-[#7e998d] uppercase">
                Demo / Developer Tools
              </div>
            ) : (
              <div className="my-1 border-t border-[rgba(255,255,255,0.06)]" />
            )}

            <nav className="space-y-0.5">
              <div className="relative group">
                <button
                  onClick={() => handleSelect('qa_lab')}
                  className={`
                    w-full flex items-center rounded-lg transition-all duration-150 relative cursor-pointer text-[12px]
                    ${collapsed ? 'justify-center p-2' : 'gap-2.5 py-1.5 px-2.5'}
                    ${
                      activeTab === 'qa_lab'
                        ? 'bg-[rgba(234,186,97,0.1)] text-[#f7f4ee] font-semibold border-l-2 border-[#eaba61]'
                        : 'text-[#a9beb1] hover:text-white hover:bg-[rgba(255,255,255,0.05)] font-normal'
                    }
                  `}
                >
                  <TestTube2
                    size={15}
                    className={`shrink-0 transition-colors ${
                      activeTab === 'qa_lab'
                        ? 'text-[#eaba61]'
                        : 'text-[#7e998d] group-hover:text-white'
                    }`}
                  />
                  {!collapsed && <span>QA & Demo Lab</span>}

                  {collapsed && activeTab === 'qa_lab' && (
                    <span className="absolute left-0.5 top-2 bottom-2 w-0.5 rounded-full bg-[#eaba61]" />
                  )}
                </button>

                {collapsed && (
                  <div className="hidden lg:group-hover:flex absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1 rounded-md bg-[#16332a] text-white text-[11px] font-medium shadow-xl border border-[#234d40] pointer-events-none">
                    QA & Demo Lab
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>

        {/* SECTION 4: REFINED FOOTER (ADMINISTRATOR PROFILE + SUBTLE LINK) */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)] space-y-1.5 shrink-0">
          {/* Administrator Profile Card */}
          <div className="relative" ref={menuRef}>
            {profileOpen && (
              <div
                className={`absolute ${
                  collapsed ? 'left-full ml-3 bottom-0' : 'left-0 bottom-full mb-2'
                } w-58 rounded-xl border border-[#234d40] bg-[#16332a] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-white`}
              >
                <div className="px-2.5 py-2 border-b border-[#234d40]/80 mb-1">
                  <p className="font-bold text-xs text-[#f7f4ee]">{adminName}</p>
                  <p className="text-[10px] text-[#9ab2a4] mt-0.5">{adminRole}</p>
                </div>

                <div className="space-y-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      handleSelect('onboarding');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[#c8d8cb] hover:bg-[#234d40] hover:text-[#eaba61] transition cursor-pointer text-xs font-medium"
                  >
                    <Users size={13} className="text-[#eaba61]" /> Staff & RBAC
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      handleSelect('audit');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[#c8d8cb] hover:bg-[#234d40] hover:text-[#eaba61] transition cursor-pointer text-xs font-medium"
                  >
                    <ShieldCheck size={13} className="text-[#eaba61]" /> Security & Audit
                  </button>
                </div>

                <div className="border-t border-[#234d40]/80 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      clearClinicianSession();
                      window.location.href = '/admin/login';
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[#f59e97] hover:bg-[#331c1e] transition cursor-pointer text-xs font-medium"
                  >
                    <ArrowLeft size={13} /> Sign Out
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
              aria-haspopup="true"
              className={`flex items-center ${
                collapsed ? 'justify-center p-1' : 'gap-2.5 px-2 py-1.5'
              } w-full rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition cursor-pointer text-left`}
              title={`${adminName} · ${adminRole}`}
            >
              <div className="grid place-items-center w-7 h-7 rounded-full bg-[#234d40] text-[#eaba61] font-bold text-[11px] shrink-0 border border-[#eaba61]/25">
                {adminInitials}
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 leading-tight">
                    <b className="block text-xs font-semibold text-[#f7f4ee] truncate">
                      {adminName}
                    </b>
                    <span className="block text-[10px] text-[#9ab2a4] truncate">
                      {adminRole}
                    </span>
                  </div>
                  <ChevronDown
                    size={13}
                    className={`text-[#7e998d] transition-transform duration-200 shrink-0 ${
                      profileOpen ? 'rotate-180 text-[#eaba61]' : ''
                    }`}
                  />
                </>
              )}
            </button>
          </div>

          {/* Subtle Back to Home Link */}
          {!collapsed ? (
            <a
              href="/"
              className="flex items-center gap-1.5 text-[11px] text-[#7e998d] hover:text-[#dce8df] transition-colors py-1 px-2 rounded-md hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
              title="Back to Welcome Portal"
            >
              <ArrowLeft size={12} />
              <span>Back to Home</span>
            </a>
          ) : (
            <a
              href="/"
              className="flex justify-center text-[#7e998d] hover:text-[#dce8df] transition-colors py-1 rounded-md hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
              title="Back to Welcome Portal"
            >
              <ArrowLeft size={13} />
            </a>
          )}
        </div>
      </aside>
    </>
  );
};
