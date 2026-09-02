import React, { useState } from 'react';
import {
  FileText,
  Search,
  Download,
  Filter,
  RefreshCw,
  ShieldCheck,
  KeyRound,
  FileUp,
  UserCheck,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { AuditEventItem } from '../../services/adminApi';

interface AuditLogsTabProps {
  logs: AuditEventItem[];
  loading: boolean;
  onRefresh: () => void;
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({
  logs,
  loading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [actorRoleFilter, setActorRoleFilter] = useState('ALL');

  // Filter logs based on search and filters
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.resource_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actor_user_id && log.actor_user_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      eventTypeFilter === 'ALL' || log.event_type === eventTypeFilter;

    const matchesRole =
      actorRoleFilter === 'ALL' || log.actor_role === actorRoleFilter;

    return matchesSearch && matchesType && matchesRole;
  });

  // Export to CSV helper
  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Actor Role', 'Actor ID', 'Event Type', 'Resource Type', 'Resource ID', 'Metadata'];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.timestamp).toISOString(),
      l.actor_role,
      l.actor_user_id || 'System',
      l.event_type,
      l.resource_type,
      l.resource_id,
      JSON.stringify(l.metadata || {})
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `swasthyavaani_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEventIcon = (type: string) => {
    if (type.includes('LOGIN')) return <KeyRound size={13} className="text-indigo-600" />;
    if (type.includes('DOCUMENT')) return <FileUp size={13} className="text-emerald-600" />;
    if (type.includes('RED_FLAG')) return <AlertTriangle size={13} className="text-rose-600" />;
    if (type.includes('PERMISSION') || type.includes('ROLE')) return <UserCheck size={13} className="text-amber-600" />;
    if (type.includes('RECORD')) return <FileCheck size={13} className="text-teal-600" />;
    return <FileText size={13} className="text-slate-500" />;
  };

  const getActorBadgeColor = (role: string) => {
    switch (role) {
      case 'DOCTOR':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'HOSPITAL_ADMIN':
      case 'SUPER_ADMIN':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'KIOSK':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'SYSTEM_AI':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <ShieldCheck size={14} className="text-teal-600" />
            Compliance & System Audit Trail (GET /api/v1/admin/audit)
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Security & Clinical Audit Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of system logins, record accesses, intake submissions, doctor verifications, and permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
          >
            <Download size={13} className="text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs"
            title="Refresh logs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-teal-600' : ''} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by resource, token, actor, or metadata..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Event Type Select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={12} />
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="LOGIN">Logins</option>
              <option value="INTAKE_STARTED">Intake Started</option>
              <option value="INTAKE_SUBMITTED">Intake Submitted</option>
              <option value="RED_FLAG_ESCALATED">Red-Flag Escalation</option>
              <option value="RECORD_ACCESS">Record Access</option>
              <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
              <option value="DOCUMENT_PROCESSED">OCR Processed</option>
              <option value="PERMISSION_CHANGE">Permission Changes</option>
              <option value="DEMO_SCENARIO_INJECTED">Demo Scenarios</option>
            </select>
          </div>

          {/* Actor Role Select */}
          <select
            value={actorRoleFilter}
            onChange={(e) => setActorRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Roles</option>
            <option value="DOCTOR">Doctor</option>
            <option value="HOSPITAL_ADMIN">Admin</option>
            <option value="KIOSK">Kiosk Terminal</option>
            <option value="SYSTEM_AI">AI Engine</option>
            <option value="SYSTEM_OCR">OCR Worker</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Actor</th>
                <th className="pb-3">Action / Event</th>
                <th className="pb-3">Target Resource</th>
                <th className="pb-3">Metadata Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No matching audit events found for current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 font-mono text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Actor */}
                      <td className="py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getActorBadgeColor(
                            log.actor_role
                          )}`}
                        >
                          {log.actor_role}
                        </span>
                        {log.actor_user_id && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            {log.actor_user_id}
                          </span>
                        )}
                      </td>

                      {/* Action / Event */}
                      <td className="py-3 font-medium text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getEventIcon(log.event_type)}
                          <span>{log.event_type.replace(/_/g, ' ')}</span>
                        </div>
                      </td>

                      {/* Resource */}
                      <td className="py-3 whitespace-nowrap">
                        <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {log.resource_type}: {log.resource_id}
                        </span>
                      </td>

                      {/* Metadata */}
                      <td className="py-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                        {log.metadata ? (
                          <span title={JSON.stringify(log.metadata)}>
                            {Object.entries(log.metadata)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
