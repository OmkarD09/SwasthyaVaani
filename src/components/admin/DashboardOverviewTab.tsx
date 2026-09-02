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
  ArrowUpRight,
  RefreshCw,
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
import { AdminDashboardStats } from '../../services/adminApi';

interface DashboardOverviewTabProps {
  stats: AdminDashboardStats;
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardOverviewTab: React.FC<DashboardOverviewTabProps> = ({
  stats,
  loading,
  onRefresh,
  onNavigateTab,
}) => {
  const [timeRange, setTimeRange] = useState<'Today' | '7 Days' | '30 Days'>('Today');

  // Colors for complaints chart
  const COMPLAINT_COLORS = ['#0d9488', '#0284c7', '#e11d48', '#d97706', '#7c3aed'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 tracking-wider uppercase">
            <Activity size={14} className="animate-pulse text-teal-600" />
            Hospital Operations & Clinical Intake Oversight
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            System & Intake Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time telemetry across patient intake, triage queues, AI assessments, and emergency signals.
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
      {/* PRIMARY DIFFERENTIATORS (VISUALLY DOMINANT STAT CARDS) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dominant Card 1: AI Clinical Assessments */}
        <div
          onClick={() => onNavigateTab('ai_monitoring')}
          className="cursor-pointer group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-teal-950 text-white shadow-lg shadow-indigo-950/20 border border-indigo-500/30 transition-all hover:scale-[1.01]"
        >
          <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-25 transition-opacity">
            <Sparkles size={110} />
          </div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-semibold tracking-wide">
              <Sparkles size={12} className="text-indigo-400" />
              <span>CORE DIFFERENTIATOR</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-indigo-200 group-hover:text-white transition-colors">
              Explore AI Oversight <ArrowUpRight size={14} />
            </span>
          </div>

          <div className="relative z-10 mt-5 flex items-baseline gap-4">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              {stats.ai_assessments_today}
            </span>
            <div className="text-xs text-slate-300 leading-tight">
              <b className="text-emerald-400 font-semibold">+18%</b> vs previous shift
              <span className="block text-[11px] text-slate-400">
                Structured clinical histories generated
              </span>
            </div>
          </div>

          <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span>Avg Duration: <b>3.2m</b></span>
              <span>•</span>
              <span>Physician Verified: <b>88.4%</b></span>
            </div>
            <span className="text-[11px] text-indigo-300">Zero Autonomous Prescribing</span>
          </div>
        </div>

        {/* Dominant Card 2: Critical / Red-Flag Cases */}
        <div
          onClick={() => onNavigateTab('emergency')}
          className="cursor-pointer group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 text-white shadow-lg shadow-rose-950/20 border border-rose-500/30 transition-all hover:scale-[1.01]"
        >
          <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-25 transition-opacity">
            <AlertTriangle size={110} />
          </div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[11px] font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>SAFETY GUARDRAIL</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-rose-200 group-hover:text-white transition-colors">
              View Emergency Queue <ArrowUpRight size={14} />
            </span>
          </div>

          <div className="relative z-10 mt-5 flex items-baseline gap-4">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              {stats.critical_cases_count}
            </span>
            <div className="text-xs text-slate-300 leading-tight">
              <span className="text-rose-400 font-semibold">Priority Triage Open</span>
              <span className="block text-[11px] text-slate-400">
                Triggered by deterministic red-flag rules
              </span>
            </div>
          </div>

          <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span>Avg Wait Time: <b>12 mins</b></span>
              <span>•</span>
              <span>Handoff: <b>Doctor Review</b></span>
            </div>
            <span className="text-[11px] text-rose-300 font-medium">Auto-escalated #A-027</span>
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
          <div className="text-2xl font-bold text-slate-800">{stats.total_patients}</div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <b className="text-teal-700">+{stats.new_patients_today}</b> new today
          </div>
        </div>

        {/* Active Patients */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Active Now
            </span>
            <Activity size={15} className="text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.active_patients}</div>
          <div className="text-[10px] text-slate-500 mt-1">In kiosk / waiting</div>
        </div>

        {/* Total & Available Doctors */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Doctors
            </span>
            <Stethoscope size={15} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
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
          <div className="text-2xl font-bold text-slate-800">{stats.appointments_today}</div>
          <div className="text-[10px] text-slate-500 mt-1">Scheduled sessions</div>
        </div>

        {/* Consultations Done / Pending */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-200 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Consultations
            </span>
            <TrendingUp size={15} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
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
          <div className="text-2xl font-bold text-slate-800">{stats.reports_pending_review}</div>
          <div className="text-[10px] text-amber-700 font-medium mt-1">Needs Rx verify</div>
        </div>
      </div>

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
                <span className="w-3 h-3 rounded-sm bg-indigo-300" />
                <span>Total Patient Intakes</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.intake_volume_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="secondary_value"
                  name="Total Intakes"
                  stroke="#818cf8"
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
              <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
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
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
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
            {stats.common_complaints.slice(0, 3).map((item, idx) => (
              <div key={item.complaint} className="flex items-center justify-between text-slate-600">
                <span className="truncate pr-2">{item.complaint}</span>
                <b className="text-slate-800">{item.count}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
