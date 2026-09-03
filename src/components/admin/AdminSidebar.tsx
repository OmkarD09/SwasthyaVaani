import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  AlertTriangle,
  FileText,
  Users,
  TestTube2,
  Building2,
  ArrowLeft,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Activity,
} from 'lucide-react';
import { Brand } from '../Brand';

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
  const navItems = [
    {
      id: 'overview' as AdminTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'ai_monitoring' as AdminTab,
      label: 'AI Monitoring',
      icon: Sparkles,
      badge: 'Core',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    },
    {
      id: 'emergency' as AdminTab,
      label: 'Critical & Emergency',
      icon: AlertTriangle,
      badge: criticalCount > 0 ? `${criticalCount}` : null,
      badgeColor: 'bg-rose-500 text-white font-bold animate-pulse shadow-xs shadow-rose-500/50',
    },
    {
      id: 'audit' as AdminTab,
      label: 'Security Audit Logs',
      icon: FileText,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'onboarding' as AdminTab,
      label: 'Staff & Onboarding',
      icon: Users,
      badge: 'RBAC',
      badgeColor: 'bg-slate-800 text-slate-300 border border-slate-700',
    },
    {
      id: 'qa_lab' as AdminTab,
      label: 'QA & Demo Control',
      icon: TestTube2,
      badge: 'Rohan',
      badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    },
  ];

  const handleSelect = (tab: AdminTab) => {
    onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  // Base sidebar classes
  // Desktop: in-flow flex item with smooth width animation (w-64 vs w-20)
  // Mobile (< 1024px): fixed drawer off-canvas
  return (
    <>
      <aside
        className={`
          bg-[#0c1e28] text-slate-200 flex flex-col justify-between select-none
          transition-all duration-300 ease-in-out border-r border-teal-950/60
          ${
          // Mobile styling
          mobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-72 translate-x-0 shadow-2xl flex'
            : 'fixed -translate-x-full lg:static lg:translate-x-0'
          }
          ${
          // Desktop width when in-flow
          collapsed ? 'lg:w-20' : 'lg:w-64'
          }
          h-full shrink-0
        `}
      >
        {/* Top Header Section */}
        <div className="flex flex-col min-h-0">
          {/* Brand Row */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            {collapsed ? (
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white mx-auto shadow-md shadow-teal-900/30 cursor-pointer"
                onClick={() => handleSelect('overview')}
                title="SwasthyaVaani Hospital Administration"
              >
                <Activity size={20} className="animate-pulse text-white" />
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div
                  className="cursor-pointer overflow-hidden text-white"
                  onClick={() => handleSelect('overview')}
                >
                  <Brand />
                </div>
                {/* Mobile Drawer Close Button */}
                {onCloseMobile && (
                  <button
                    onClick={onCloseMobile}
                    className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Close Menu"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Hospital Context Pill */}
          {!collapsed && (
            <div className="mx-3.5 my-3.5 p-2.5 rounded-xl bg-slate-900/70 border border-teal-900/40 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                <Building2 size={16} />
              </div>
              <div className="leading-tight overflow-hidden">
                <div className="text-xs font-bold text-slate-200 truncate">
                  District Hospital
                </div>
                <div className="text-[11px] text-teal-400/80 truncate">
                  North Wing · Main OPD
                </div>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="py-3 flex justify-center">
              <div
                className="w-9 h-9 rounded-xl bg-slate-900/70 border border-teal-900/40 flex items-center justify-center text-teal-400"
                title="District Hospital · North Wing"
              >
                <Building2 size={16} />
              </div>
            </div>
          )}

          {/* Section Heading */}
          {!collapsed && (
            <div className="px-4 pt-2 pb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Hospital Admin
            </div>
          )}

          {/* Navigation Links */}
          <nav className="px-2.5 py-1 space-y-1.5 overflow-y-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => handleSelect(item.id)}
                    className={`
                      w-full flex items-center rounded-xl transition-all duration-150 relative
                      ${collapsed
                        ? 'justify-center p-2.5'
                        : 'justify-between px-3 py-2.5 text-xs'
                      }
                      ${isActive
                        ? 'bg-teal-600 text-white font-semibold shadow-md shadow-teal-900/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={17}
                        className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-300'
                          }`}
                      />
                      {!collapsed && (
                        <span className="truncate font-medium">{item.label}</span>
                      )}
                    </div>

                    {!collapsed && item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${isActive ? 'bg-white/20 text-white' : item.badgeColor
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Collapsed Active Indicator Pill */}
                    {collapsed && isActive && (
                      <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-teal-300 shadow-xs shadow-teal-300" />
                    )}

                    {/* Collapsed notification dot for critical */}
                    {collapsed && item.id === 'emergency' && criticalCount > 0 && !isActive && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </button>

                  {/* Tooltip on hover when collapsed */}
                  {collapsed && (
                    <div className="hidden lg:group-hover:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-800 pointer-events-none items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 shrink-0">
          {/* Collapse/Expand Toggle Button (Desktop) */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`
                hidden lg:flex items-center w-full py-2 px-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors text-xs font-medium
                ${collapsed ? 'justify-center' : 'justify-between'}
              `}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon-Only'}
            >
              {!collapsed && <span>Collapse Sidebar</span>}
              {collapsed ? (
                <PanelLeftOpen size={16} className="text-teal-400" />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </button>
          )}

          {/* Security Badge */}
          {!collapsed && (
            <div className="p-2 rounded-xl bg-slate-900/60 border border-teal-950/40 flex items-center gap-2 text-[11px] text-slate-400">
              <LockKeyhole size={14} className="text-teal-400 shrink-0" />
              <div className="leading-tight truncate">
                <b className="text-slate-200 block text-[11px]">RBAC Enforced</b>
                <span className="text-[10px] text-slate-400">SIH PS-26047</span>
              </div>
            </div>
          )}

          {/* Back to Home button */}
          <button
            onClick={() => (window.location.href = '/')}
            className={`
              w-full flex items-center text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium py-2 rounded-xl hover:bg-slate-800/50
              ${collapsed ? 'justify-center' : 'justify-center gap-1.5'}
            `}
            title="Back to Welcome Portal"
          >
            <ArrowLeft size={14} />
            {!collapsed && <span>Back to Home</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
