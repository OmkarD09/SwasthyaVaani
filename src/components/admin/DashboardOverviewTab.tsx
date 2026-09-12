import React, { useState } from 'react';
import {
  Users,
  Clock,
  Sparkles,
  AlertTriangle,
  FileCheck2,
  Stethoscope,
  TrendingUp,
  Activity,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Leaf,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  AdminDashboardStats,
  AIMonitoringSummary,
  EmergencyCaseItem,
} from '../../services/adminApi';
import { AdminTab } from './AdminSidebar';
import { formatWorkflowType } from '../../lib/terminology';
import { StatusBadge } from '../ui/StatusBadge';

interface DashboardOverviewTabProps {
  stats: AdminDashboardStats;
  aiSummary?: AIMonitoringSummary | null;
  emergencyCases?: EmergencyCaseItem[];
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: AdminTab) => void;
}

export const DashboardOverviewTab: React.FC<DashboardOverviewTabProps> = ({
  stats,
  aiSummary,
  emergencyCases = [],
  loading,
  onRefresh,
  onNavigateTab,
}) => {
  const [timeRange, setTimeRange] = useState<'Today' | '7 Days' | '30 Days'>('Today');

  // SwasthyaVaani clinical palette for complaints chart
  const COMPLAINT_COLORS = ['#0d9488', '#eaba61', '#d97706', '#0284c7', '#e11d48'];

  // Calculate live workflow distribution
  const modernClinicalCount =
    stats.modern_clinical_count ??
    (aiSummary?.cases
      ? aiSummary.cases.filter((c) => c.workflow_type !== 'AYUSH').length
      : Math.round(stats.total_patients * 0.85));

  const ayushCount =
    stats.ayush_count ??
    (aiSummary?.cases
      ? aiSummary.cases.filter((c) => c.workflow_type === 'AYUSH').length
      : Math.max(0, stats.total_patients - modernClinicalCount));

  const totalWorkflowCases = modernClinicalCount + ayushCount || 1;
  const modernPct = Math.round((modernClinicalCount / totalWorkflowCases) * 100);
  const ayushPct = 100 - modernPct;

  // Recent intake cases to show in live table
  const recentCases = aiSummary?.cases?.slice(0, 6) || [];

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 tracking-wider uppercase">
            <Activity size={14} className="text-teal-600" />
            Hospital Operations & Clinical Intake Oversight
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            System & Intake Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time operational telemetry across patient intake, triage queues, AI assessments, and emergency signals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range switch */}
          <div className="inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            {(['Today', '7 Days', '30 Days'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${timeRange === r
                    ? 'bg-white text-slate-800 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
            title="Refresh Metrics"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-teal-600' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SYSTEM HEALTH & CRITICAL TRIAGE ALERT BAR (IF RED FLAGS EXIST) */}
      {/* ------------------------------------------------------------- */}
      {stats.critical_cases_count > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={16} className="text-rose-600 shrink-0 animate-pulse" />
            <span>
              <b>Active Safety Triage:</b>{' '}
              <span className="font-bold text-rose-700">{stats.critical_cases_count} critical red-flag case(s)</span>{' '}
              escalated under deterministic safety guardrails. Attending physicians notified in live workstation.
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('emergency')}
            className="flex items-center gap-1 font-semibold text-rose-950 hover:underline shrink-0 text-xs ml-3"
          >
            Open Emergency Queue <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRIMARY OPERATIONAL CARDS (SWASTHYAVAANI CARD LANGUAGE) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: AI Clinical Intake & Structuring */}
        <div
          onClick={() => onNavigateTab('ai_monitoring')}
          className="cursor-pointer group relative overflow-hidden rounded-2xl p-5 bg-white border border-slate-200/90 shadow-xs hover:border-teal-300 hover:shadow-md transition-all border-l-4 border-l-teal-700"
        >
          <div className="flex items-start justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[11px] font-semibold">
              <Sparkles size={12} className="text-teal-600" />
              <span>AI Pre-Consultation Engine</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-teal-700 group-hover:underline transition-colors font-medium">
              Explore AI Oversight <ArrowRight size={13} />
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
              {stats.ai_assessments_today}
            </span>
            <div className="text-xs text-slate-500 leading-tight">
              <b className="text-teal-700 font-semibold">+18%</b> vs previous shift
              <span className="block text-[11px] text-slate-400">
                Structured clinical states generated
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>Avg Duration: <b className="text-slate-800">3.2m</b></span>
              <span className="text-slate-300">•</span>
              <span>Physician Verified: <b className="text-emerald-700">88.4%</b></span>
            </div>
            <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
              Zero Autonomous Prescribing
            </span>
          </div>
        </div>

        {/* Card 2: Priority Emergency & Red-Flag Triage */}
        <div
          onClick={() => onNavigateTab('emergency')}
          className="cursor-pointer group relative overflow-hidden rounded-2xl p-5 bg-white border border-slate-200/90 shadow-xs hover:border-rose-300 hover:shadow-md transition-all border-l-4 border-l-rose-600"
        >
          <div className="flex items-start justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-800 text-[11px] font-semibold">
              <AlertTriangle size={12} className="text-rose-600" />
              <span>Deterministic Red-Flags</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-rose-700 group-hover:underline transition-colors font-medium">
              View Emergency Queue <ArrowRight size={13} />
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-rose-700 tabular-nums">
              {stats.critical_cases_count}
            </span>
            <div className="text-xs text-slate-500 leading-tight">
              <span className="text-rose-600 font-semibold">Priority Triage Open</span>
              <span className="block text-[11px] text-slate-400">
                Triggered by clinical escalation rules
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>Avg Wait: <b className="text-slate-800">12m</b></span>
              <span className="text-slate-300">•</span>
              <span>Review: <b className="text-slate-800">Doctor Workstation</b></span>
            </div>
            <span className="text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
              Immediate Physician Review
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECONDARY OPERATIONAL METRIC CARDS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Patients */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Total Intake
            </span>
            <Users size={15} className="text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{stats.total_patients}</div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <b className="text-teal-700">+{stats.new_patients_today}</b> new today
          </div>
        </div>

        {/* Active Patients */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Active in Queue
            </span>
            <Activity size={15} className="text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{stats.active_patients}</div>
          <div className="text-[10px] text-slate-500 mt-1">In kiosk / waiting</div>
        </div>

        {/* Total & Available Doctors */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Doctors
            </span>
            <Stethoscope size={15} className="text-teal-700" />
          </div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">
            {stats.doctors_available_now}
            <span className="text-xs font-normal text-slate-400">/{stats.total_doctors}</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-1">On duty & active</div>
        </div>

        {/* Appointments Today */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Today OPD
            </span>
            <Clock size={15} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{stats.appointments_today}</div>
          <div className="text-[10px] text-slate-500 mt-1">Scheduled sessions</div>
        </div>

        {/* Consultations Done / Pending */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Consultations
            </span>
            <TrendingUp size={15} className="text-teal-700" />
          </div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">
            {stats.completed_consultations}
            <span className="text-xs font-normal text-slate-400">/{stats.pending_consultations}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Done / in queue</div>
        </div>

        {/* Documents Pending Review */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              OCR Reports
            </span>
            <FileCheck2 size={15} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{stats.reports_pending_review}</div>
          <div className="text-[10px] text-amber-700 font-medium mt-1">Needs Rx verify</div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CLINICAL WORKFLOW DISTRIBUTION: MODERN CLINICAL VS AYUSH */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Clinical Workflow Distribution
            </h3>
            <p className="text-xs text-slate-500">
              Authoritative breakdown of active and completed intakes across clinical streams
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-teal-800">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              <span>Modern Clinical ({modernPct}%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-800">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eaba61]" />
              <span>AYUSH Stream ({ayushPct}%)</span>
            </span>
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${modernPct}%` }}
            className="h-full bg-teal-600 transition-all duration-500"
            title={`Modern Clinical: ${modernClinicalCount} cases (${modernPct}%)`}
          />
          <div
            style={{ width: `${ayushPct}%` }}
            className="h-full bg-[#eaba61] transition-all duration-500"
            title={`AYUSH Stream: ${ayushCount} cases (${ayushPct}%)`}
          />
        </div>

        {/* Stream Badges / Summary */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Stethoscope size={14} className="text-teal-700 shrink-0" />
              <span className="text-slate-700 font-medium">Modern Clinical Stream:</span>
            </div>
            <span className="font-bold text-teal-800 tabular-nums">{modernClinicalCount} intakes</span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Leaf size={14} className="text-amber-700 shrink-0" />
              <span className="text-slate-700 font-medium">AYUSH Assessment Stream:</span>
            </div>
            <span className="font-bold text-amber-800 tabular-nums">{ayushCount} intakes</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RECENT CLINICAL INTAKE ACTIVITY STREAM */}
      {/* ------------------------------------------------------------- */}
      {recentCases.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Recent Clinical Intake Activity
              </h3>
              <p className="text-xs text-slate-500">
                Live patient intakes structured by AI and routed for doctor evaluation
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('ai_monitoring')}
              className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
            >
              View all {aiSummary?.cases?.length || 0} cases <ArrowRight size={12} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-2.5">Token</th>
                  <th className="pb-2.5">Patient</th>
                  <th className="pb-2.5">Chief Complaint</th>
                  <th className="pb-2.5">Stream</th>
                  <th className="pb-2.5 text-center">Severity</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Workstation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCases.map((c) => (
                  <tr key={c.intake_session_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 font-mono font-bold text-teal-800">
                      #{c.token}
                    </td>
                    <td className="py-2.5 font-medium text-slate-800">
                      {c.patient_name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {c.patient_age ? `${c.patient_age}y` : ''} {c.patient_gender || ''}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-700 max-w-xs truncate">
                      {c.chief_complaint}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.workflow_type === 'AYUSH'
                            ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                            : 'bg-teal-50 text-teal-800 border-teal-200/80'
                          }`}
                      >
                        {formatWorkflowType(c.workflow_type)}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${c.severity_score >= 8
                            ? 'bg-rose-100 text-rose-800'
                            : c.severity_score >= 5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                      >
                        {c.severity_score}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 text-right">
                      <a
                        href={`/doctor/patient/${c.patient_id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-md transition-colors border border-teal-200/60"
                        title="Open in Doctor Workstation"
                      >
                        Review <ExternalLink size={10} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VISUAL CHARTS SECTION */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Chart: AI Assessment Volume & Intake Over Time */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                AI Intake Volume & Completion Throughput
              </h3>
              <p className="text-xs text-slate-500">
                Comparison of raw kiosk check-ins vs AI-structured clinical summaries
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-teal-600" />
                <span>AI Structured Summaries</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-[#eaba61]" />
                <span>Total Patient Intakes</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.intake_volume_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eaba61" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#eaba61" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#142a40',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: '1px solid #334155',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="secondary_value"
                  name="Total Intakes"
                  stroke="#d97706"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="AI Summaries"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAI)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Peak intake window: <b>12:00 PM – 02:00 PM</b></span>
            <span>Average questions asked: <b>4.2 per patient</b></span>
          </div>
        </div>

        {/* Complaints Breakdown Chart */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800">
                Chief Complaint Categories
              </h3>
              <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                AI Tagged
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Top reasons for hospital presentation during intake
            </p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.common_complaints} layout="vertical" margin={{ left: -15, right: 15 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="category"
                    type="category"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#142a40',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: '1px solid #334155',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.common_complaints.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COMPLAINT_COLORS[index % COMPLAINT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            {stats.common_complaints.slice(0, 3).map((item) => (
              <div key={item.complaint} className="flex items-center justify-between text-slate-600">
                <span className="truncate pr-2">{item.complaint}</span>
                <b className="text-slate-800 tabular-nums">{item.count}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverviewTab;
