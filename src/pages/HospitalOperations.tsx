import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { AdminHeader } from '../components/admin/AdminHeader';
import { AdminSidebar, AdminTab } from '../components/admin/AdminSidebar';
import { DashboardOverviewTab } from '../components/admin/DashboardOverviewTab';
import { AIMonitoringTab } from '../components/admin/AIMonitoringTab';
import { EmergencyCasesTab } from '../components/admin/EmergencyCasesTab';
import { AuditLogsTab } from '../components/admin/AuditLogsTab';
import { StaffOnboardingTab } from '../components/admin/StaffOnboardingTab';
import { QADemoLabTab } from '../components/admin/QADemoLabTab';
import {
  fetchAdminStats,
  fetchAIMonitoring,
  fetchEmergencyCases,
  fetchAuditLogs,
  fetchDoctors,
  fetchDepartments,
  fetchStaffUsers,
  fetchServiceStatus,
  AdminDashboardStats,
  AIMonitoringSummary,
  EmergencyCaseItem,
  AuditEventItem,
  DoctorProfile,
  DepartmentItem,
  StaffUserItem,
  ServiceHealthStatus,
} from '../services/adminApi';

export function HospitalOperations() {
  const [location, setLocation] = useLocation();

  // Determine active tab from URL path or local state
  const getInitialTab = (): AdminTab => {
    if (location.includes('/ai-monitoring')) return 'ai_monitoring';
    if (location.includes('/emergency')) return 'emergency';
    if (location.includes('/audit')) return 'audit';
    if (location.includes('/onboarding') || location.includes('/doctors')) return 'onboarding';
    if (location.includes('/qa')) return 'qa_lab';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getInitialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Core Data States
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [aiSummary, setAiSummary] = useState<AIMonitoringSummary | null>(null);
  const [emergencyCases, setEmergencyCases] = useState<EmergencyCaseItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEventItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUserItem[]>([]);
  const [serviceStatus, setServiceStatus] = useState<ServiceHealthStatus | null>(null);

  // Sync tab with URL changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location]);

  // Tab change handler updates URL & state
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'overview':
        setLocation('/admin');
        break;
      case 'ai_monitoring':
        setLocation('/admin/ai-monitoring');
        break;
      case 'emergency':
        setLocation('/admin/emergency');
        break;
      case 'audit':
        setLocation('/admin/audit');
        break;
      case 'onboarding':
        setLocation('/admin/onboarding');
        break;
      case 'qa_lab':
        setLocation('/admin/qa');
        break;
    }
  };

  // Stable refs for scroll direction and accumulated delta to prevent oscillation
  const lastScrollY = useRef(0);
  const accumulatedScroll = useRef(0);
  const isHeaderVisibleRef = useRef(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  // Intentional scroll listener:
  // - Accumulates continuous scroll distance to prevent jitter from inertial micro-bounces
  // - Requires > 60px continuous scroll down to retract, or > 45px continuous scroll up to reveal
  // - Always visible when near the top (scrollTop <= 60)
  // - Only triggers state updates when visibility actually changes
  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentY = e.currentTarget.scrollTop;
    const delta = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    // Always keep header visible when near the top of the dashboard
    if (currentY <= 60) {
      if (!isHeaderVisibleRef.current) {
        isHeaderVisibleRef.current = true;
        setHeaderVisible(true);
      }
      accumulatedScroll.current = 0;
      return;
    }

    // Accumulate scroll in current direction; reset if direction reverses
    if ((delta > 0 && accumulatedScroll.current < 0) || (delta < 0 && accumulatedScroll.current > 0)) {
      accumulatedScroll.current = delta;
    } else {
      accumulatedScroll.current += delta;
    }

    // Continuous downward scroll exceeded threshold -> retract header
    if (accumulatedScroll.current > 60 && isHeaderVisibleRef.current) {
      isHeaderVisibleRef.current = false;
      setHeaderVisible(false);
      accumulatedScroll.current = 0;
    }
    // Continuous upward scroll exceeded threshold -> reveal header
    else if (accumulatedScroll.current < -45 && !isHeaderVisibleRef.current) {
      isHeaderVisibleRef.current = true;
      setHeaderVisible(true);
      accumulatedScroll.current = 0;
    }
  };


  // Load all dashboard metrics
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        statsData,
        aiData,
        emergData,
        auditData,
        docsData,
        deptsData,
        usersData,
        statusData,
      ] = await Promise.all([
        fetchAdminStats(),
        fetchAIMonitoring(),
        fetchEmergencyCases(),
        fetchAuditLogs({ limit: 50 }),
        fetchDoctors(),
        fetchDepartments(),
        fetchStaffUsers(),
        fetchServiceStatus(),
      ]);

      setStats(statsData);
      setAiSummary(aiData);
      setEmergencyCases(emergData);
      setAuditLogs(auditData);
      setDoctors(docsData);
      setDepartments(deptsData);
      setStaffUsers(usersData);
      setServiceStatus(statusData);
    } catch (err) {
      console.error('[HospitalOperations] Failed to load admin dataset', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Section subtitle map
  const subtitleMap: Record<AdminTab, string> = {
    overview: 'Operational KPI analytics, active intake volume, and presentation frequency',
    ai_monitoring: 'Pre-consultation clinical AI performance, question heuristics, and doctor verification',
    emergency: 'Prioritized red-flag escalated cases under active triage protocol',
    audit: 'Immutable security, clinical edit, and authorization audit trail',
    onboarding: 'Doctor credentialing, active hospital departments, and staff RBAC roles',
    qa_lab: 'One-click demo scenario injection and automated regression test runner',
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50/70 font-sans text-slate-800 antialiased">
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setMobileOpen(false)}
          aria-label="Close Mobile Menu"
        />
      )}

      {/* Retractable Left Navigation Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        criticalCount={emergencyCases.length}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Viewport Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Retractable Top Header Bar - GPU-accelerated translateY only, ZERO layout shift */}
        <div
          className={`absolute top-0 left-0 right-0 z-20 h-16 transform transition-transform duration-300 ease-in-out will-change-transform ${headerVisible
              ? 'translate-y-0 shadow-xs'
              : '-translate-y-full shadow-none pointer-events-none'
            }`}
        >
          <AdminHeader
            title={
              activeTab === 'overview'
                ? 'Hospital Operations & Intake'
                : activeTab === 'ai_monitoring'
                  ? 'Clinical AI Oversight & Monitoring'
                  : activeTab === 'emergency'
                    ? 'Critical & Emergency Queue'
                    : activeTab === 'audit'
                      ? 'Security & Clinical Audit Trail'
                      : activeTab === 'onboarding'
                        ? 'Staff & Hospital Onboarding'
                        : 'QA & Demo Control Center'
            }
            subtitle={subtitleMap[activeTab]}
            serviceStatus={serviceStatus}
            onMenuToggle={() => setMobileOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Independently Scrollable Dashboard Body with permanent top padding */}
        <main
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden pt-20 px-4 sm:px-6 lg:px-8 pb-8"
        >
          <div className="max-w-7xl w-full mx-auto space-y-6">
            {activeTab === 'overview' && stats && (
              <DashboardOverviewTab
                stats={stats}
                loading={loading}
                onRefresh={loadAllData}
                onNavigateTab={handleTabChange}
              />
            )}

            {activeTab === 'ai_monitoring' && aiSummary && (
              <AIMonitoringTab
                summary={aiSummary}
                loading={loading}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'emergency' && (
              <EmergencyCasesTab
                cases={emergencyCases}
                loading={loading}
                onRefresh={loadAllData}
                onNavigateDoctorPortal={() => setLocation('/doctor')}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogsTab
                logs={auditLogs}
                loading={loading}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'onboarding' && (
              <StaffOnboardingTab
                doctors={doctors}
                departments={departments}
                staffUsers={staffUsers}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'qa_lab' && (
              <QADemoLabTab
                serviceStatus={serviceStatus}
                onRefreshAll={loadAllData}
                onNavigateTab={handleTabChange}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export { HospitalOperations as AdminPortal };
export default HospitalOperations;
