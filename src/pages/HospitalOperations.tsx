import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Hospital,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Settings2,
  ShieldCheck,
  Upload,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { Brand } from '../components/Brand';

export const auditRows = [
  {
    action: 'Summary reviewed',
    user: 'Dr. Ananya Rao',
    detail: 'SV-2048 · OPD 2',
    time: 'Today, 10:42 AM',
    kind: 'review',
  },
  {
    action: 'Patient intake completed',
    user: 'Kiosk 04',
    detail: 'SV-2047 · English',
    time: 'Today, 10:38 AM',
    kind: 'complete',
  },
  {
    action: 'Room status updated',
    user: 'Nurse station',
    detail: 'Consultation Room 3',
    time: 'Today, 10:31 AM',
    kind: 'room',
  },
  {
    action: 'Report uploaded',
    user: 'Meena Kumari',
    detail: 'SV-2048 · 1 document',
    time: 'Today, 10:27 AM',
    kind: 'upload',
  },
];

export function PortalTopbar({
  title,
  subtitle,
  onMenu,
}: {
  title: string;
  subtitle: string;
  onMenu?: () => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <header className="portal-topbar">
      <button className="mobile-menu" onClick={onMenu}>
        <Menu size={20} />
      </button>
      <div>
        <div className="portal-title">{title}</div>
        <div className="portal-subtitle">{subtitle}</div>
      </div>
      <div className="portal-actions">
        <button className="icon-button">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
        <div className="portal-user">
          <div className="user-avatar">AD</div>
          <div>
            <b>Hospital Administrator</b>
            <span>Operations & Governance</span>
          </div>
          <ChevronDown size={15} />
        </div>
        <button className="exit-button" onClick={() => setLocation('/')}>
          Exit portal
        </button>
      </div>
    </header>
  );
}

export function PortalSidebar({
  active,
  onNavigate,
  mobileOpen,
}: {
  active: string;
  onNavigate: (path: string) => void;
  mobileOpen?: boolean;
}) {
  const links = [
    { label: 'Overview', icon: LayoutDashboard, path: '/admin' },
    { label: 'Analytics', icon: BarChart3, path: '/admin' },
    { label: 'Departments', icon: Building2, path: '/admin' },
    { label: 'Hospital Operations', icon: Activity, path: '/admin' },
    { label: 'Audit Activity', icon: FileText, path: '/admin' },
  ];
  return (
    <aside className={`portal-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="portal-brand" onClick={() => onNavigate('/')}>
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
      <div className="side-label">ADMIN WORKSPACE</div>
      <nav className="portal-nav">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.label}
              className={active === link.label ? 'active' : ''}
              onClick={() => onNavigate(link.path)}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="side-label side-label-spaced">SYSTEM</div>
      <nav className="portal-nav">
        <button>
          <Settings2 size={18} />
          <span>Settings</span>
        </button>
        <button>
          <CircleHelp size={18} />
          <span>Help & support</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="secure-badge">
          <LockKeyhole size={15} />
          <span>
            <b>Secure admin workspace</b>
            <small>Last synced just now</small>
          </span>
        </div>
        <button className="sidebar-home" onClick={() => onNavigate('/')}>
          <ArrowLeft size={15} /> Back to welcome
        </button>
      </div>
    </aside>
  );
}

export function HospitalOperations() {
  const [, setLocation] = useLocation();
  const [range, setRange] = useState('Today');
  const bars = useMemo(() => [42, 55, 48, 68, 61, 77, 72, 88, 70, 94, 83, 97], []);

  return (
    <main className="portal-page admin-page">
      <PortalSidebar active="Analytics" onNavigate={setLocation} />
      <div className="portal-content">
        <PortalTopbar title="Hospital operations" subtitle="District Hospital · North wing" />
        <div className="portal-main">
          <div className="portal-heading-row">
            <div>
              <div className="section-kicker">SYSTEM OVERVIEW · LIVE</div>
              <h1>Good morning, admin</h1>
              <p>A clear view of intake, people and the spaces that keep care moving.</p>
            </div>
            <div className="range-switch">
              {['Today', '7 days', '30 days'].map((item) => (
                <button
                  key={item}
                  className={range === item ? 'active' : ''}
                  onClick={() => setRange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-stats">
            <div className="admin-stat">
              <span className="admin-stat-icon mint">
                <Users size={18} />
              </span>
              <div>
                <span>Patients processed</span>
                <strong>186</strong>
                <small>
                  <b>+12%</b> vs last {range.toLowerCase()}
                </small>
              </div>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-icon blue">
                <Clock3 size={18} />
              </span>
              <div>
                <span>Average wait</span>
                <strong>
                  16 <small>min</small>
                </strong>
                <small>
                  <b>↓ 21%</b> improvement
                </small>
              </div>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-icon amber">
                <Building2 size={18} />
              </span>
              <div>
                <span>Active departments</span>
                <strong>06</strong>
                <small>24 rooms online</small>
              </div>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-icon lavender">
                <ShieldCheck size={18} />
              </span>
              <div>
                <span>System uptime</span>
                <strong>
                  99.8<small>%</small>
                </strong>
                <small>
                  <b>Healthy</b> · last 30 days
                </small>
              </div>
            </div>
          </div>
          <div className="admin-grid">
            <section className="analytics-panel">
              <div className="panel-heading">
                <div>
                  <h2>Intake activity</h2>
                  <p>Completed patient intakes by hour</p>
                </div>
                <button className="export-button">
                  <Upload size={14} /> Export
                </button>
              </div>
              <div className="chart-wrap">
                <div className="chart-y">
                  <span>30</span>
                  <span>20</span>
                  <span>10</span>
                  <span>0</span>
                </div>
                <div className="bar-chart">
                  {bars.map((height, index) => (
                    <div className="bar-column" key={index}>
                      <div className="bar" style={{ height: `${height}%` }}>
                        <span>{height === 97 ? '28' : ''}</span>
                      </div>
                      <small>
                        {
                          [
                            '8 AM',
                            '',
                            '10 AM',
                            '',
                            '12 PM',
                            '',
                            '2 PM',
                            '',
                            '4 PM',
                            '',
                            '6 PM',
                            '',
                          ][index]
                        }
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="chart-footer">
                <span>
                  <i className="legend-dot" /> Completed intakes
                </span>
                <span>
                  <i className="legend-dot teal" /> Doctor reviews
                </span>
                <b>Peak hour · 2 PM</b>
              </div>
            </section>
            <section className="departments-panel">
              <div className="panel-heading">
                <div>
                  <h2>Departments</h2>
                  <p>Live room status</p>
                </div>
                <button className="more-button">
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <div className="department-list">
                {[
                  ['General Medicine', '08 rooms', 'green'],
                  ['Pediatrics', '04 rooms', 'green'],
                  ['Women’s Health', '03 rooms', 'amber'],
                  ['Orthopedics', '05 rooms', 'green'],
                ].map(([name, rooms, color]) => (
                  <div className="department-row" key={name}>
                    <span className={`department-dot ${color}`} />
                    <div>
                      <b>{name}</b>
                      <small>{rooms}</small>
                    </div>
                    <span className="department-status">
                      {color === 'green' ? 'Operational' : 'Busy'}
                    </span>
                    <ChevronDown size={14} />
                  </div>
                ))}
              </div>
              <button
                className="manage-button"
                onClick={() => alert('Department management & wing configuration.')}
              >
                Configure departments <ArrowRight size={15} />
              </button>
            </section>
          </div>
          <section className="audit-panel">
            <div className="panel-heading">
              <div>
                <h2>Recent audit activity</h2>
                <p>Every important action, accounted for.</p>
              </div>
              <button className="filter-button">
                <span>All activity</span>
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="audit-table">
              <div className="audit-head">
                <span>ACTIVITY</span>
                <span>ACTOR</span>
                <span>TIME</span>
                <span>STATUS</span>
              </div>
              {auditRows.map((row) => (
                <div className="audit-row" key={row.action}>
                  <span className="audit-action">
                    <i className={`audit-icon ${row.kind}`} /> <b>{row.action}</b>
                  </span>
                  <span className="audit-actor">
                    <b>{row.user}</b>
                    <small>{row.detail}</small>
                  </span>
                  <span className="audit-time">{row.time}</span>
                  <span className="audit-status">
                    <CheckCircle2 size={14} /> Logged
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export { HospitalOperations as AdminPortal };
export default HospitalOperations;
