import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  User,
} from 'lucide-react';
import { storeClinicianSession, type ClinicianSession } from '../lib/clinicianAuth';

export function ClinicianLogin() {
  const [, setLocation] = useLocation();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const trimmedId = staffId.trim();
    const trimmedPw = password.trim();

    if (!trimmedId || !trimmedPw) {
      setError('Unable to sign in. Please check your credentials and try again.');
      return;
    }

    setBusy(true);
    const role = trimmedId.toUpperCase().startsWith('ADMIN') ? 'ADMIN' : 'DOCTOR';

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedId, password: trimmedPw, role }),
      });
      if (!response.ok) {
        setError(`Unable to sign in (status ${response.status}).`);
        return;
      }

      const session = (await response.json()) as ClinicianSession;
      if (!session.access_token || !['DOCTOR', 'ADMIN'].includes(session.role)) {
        setError('Authentication response did not contain an authorized clinician session.');
        return;
      }
      storeClinicianSession(session, rememberMe);
      setLocation(session.role === 'ADMIN' ? '/admin' : '/doctor');
    } catch {
      setError('Unable to reach the authentication service. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1c17] text-[#f7f0df] flex flex-col justify-between selection:bg-[#e1b968] selection:text-[#173e35]">
      {/* Top Minimal Navigation */}
      <header className="border-b border-[#1b3d33] bg-[#0e2720]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#e1b968] text-[#163c35] shadow-xs">
            <span className="font-serif text-lg font-bold leading-none">स्व</span>
          </div>
          <div>
            <div className="font-serif text-lg font-semibold tracking-tight text-[#f6efdf]">
              Swasthya<span className="text-[#e1b968]">Vaani</span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[.22em] text-[#8ea79b]">
              Clinical Workspace
            </div>
          </div>
        </div>

        <Link
          href="/"
          data-testid="link-login-home"
          className="text-xs font-medium text-[#9ebcaf] hover:text-[#e1b968] transition-colors flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-[#234b3f] hover:border-[#e1b968]/50 bg-[#13332a]/60"
        >
          <ArrowLeft size={14} />
          <span>Return to Patient Experience</span>
        </Link>
      </header>

      {/* Main Two-Column Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-62px)]">
        {/* Left Column: Clinical Brand Panel (~45% -> 5 cols in lg) */}
        <section className="lg:col-span-5 bg-gradient-to-b from-[#0f2a22] via-[#0d241d] to-[#091813] border-r border-[#1e4438] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Background Glows */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#1f5b4e]/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full bg-[#e1b968]/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-7 max-w-lg mx-auto lg:mx-0">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#183b31] border border-[#2b594b] text-[#e1b968] font-mono text-[11px] font-semibold uppercase tracking-wider">
              <Sparkles size={13} className="text-[#e1b968]" />
              <span>SWASTHYAVAANI · CLINICAL WORKSPACE</span>
            </div>

            {/* Main Heading */}
            <div>
              <h1 className="font-serif text-3xl md:text-4xl text-[#f6efdf] leading-[1.25] font-normal">
                Clinical intelligence,{' '}
                <span className="text-[#e1b968] font-semibold italic">
                  ready when you are.
                </span>
              </h1>
              <p className="mt-3.5 text-sm text-[#a2c2b3] leading-relaxed">
                Secure access to patient intake summaries, triage workflows, and clinical records.
              </p>
            </div>

            {/* Clinical Workspace Features */}
            <div className="space-y-3.5 pt-2">
              {/* Feature 1 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#13332a]/80 border border-[#214a3e]/80 transition-all hover:bg-[#163b30] hover:border-[#356f5f]">
                <div className="w-9 h-9 rounded-xl bg-[#e1b968]/15 border border-[#e1b968]/30 text-[#e1b968] flex items-center justify-center shrink-0 mt-0.5">
                  <Activity size={19} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-xs uppercase font-mono tracking-wider font-bold text-[#e1b968]">
                    REAL-TIME TRIAGE
                  </div>
                  <div className="text-xs text-[#b0cbc0] mt-0.5 leading-relaxed">
                    Review AI-organized patient information before consultation.
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#13332a]/80 border border-[#214a3e]/80 transition-all hover:bg-[#163b30] hover:border-[#356f5f]">
                <div className="w-9 h-9 rounded-xl bg-[#6ee7b7]/15 border border-[#6ee7b7]/30 text-[#6ee7b7] flex items-center justify-center shrink-0 mt-0.5">
                  <FileText size={19} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-xs uppercase font-mono tracking-wider font-bold text-[#f7f0df]">
                    PATIENT CONTEXT
                  </div>
                  <div className="text-xs text-[#b0cbc0] mt-0.5 leading-relaxed">
                    Access visit history, records, and structured summaries.
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#13332a]/80 border border-[#214a3e]/80 transition-all hover:bg-[#163b30] hover:border-[#356f5f]">
                <div className="w-9 h-9 rounded-xl bg-[#93c5fd]/15 border border-[#93c5fd]/30 text-[#93c5fd] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={19} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-xs uppercase font-mono tracking-wider font-bold text-[#f7f0df]">
                    SECURE WORKSPACE
                  </div>
                  <div className="text-xs text-[#b0cbc0] mt-0.5 leading-relaxed">
                    Protected access for authorized healthcare personnel.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Status Card */}
          <div className="mt-8 relative z-10 p-4 rounded-2xl bg-[#091b15] border border-[#1b3d32] shadow-inner">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#16332a]">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[#86a899]">
                SYSTEM STATUS
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                All clinical services operational
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#749688]">
              <span className="flex items-center gap-1">
                <span className="text-emerald-400">✓</span> FHIR Ready
              </span>
              <span className="text-[#2b4c41]">•</span>
              <span className="flex items-center gap-1">
                <span className="text-emerald-400">✓</span> Secure Session
              </span>
              <span className="text-[#2b4c41]">•</span>
              <span className="flex items-center gap-1">
                <span className="text-emerald-400">✓</span> Audit Logging Enabled
              </span>
            </div>
          </div>
        </section>

        {/* Right Column: Login Area (~55% -> 7 cols in lg) */}
        <section className="lg:col-span-7 bg-[#091713] p-6 md:p-12 flex flex-col justify-center items-center">
          <div className="w-full max-w-[460px] space-y-6">
            {/* Login Card Panel */}
            <div className="rounded-3xl border border-[#20463b] bg-[#112a23] p-7 md:p-9 shadow-2xl relative">
              {/* Header */}
              <div className="space-y-1 pb-5 border-b border-[#1c3e34]">
                <span className="font-mono text-[10px] uppercase tracking-[.22em] text-[#e1b968] font-bold">
                  AUTHORIZED STAFF ACCESS
                </span>
                <h2 className="font-serif text-2xl md:text-3xl font-semibold text-[#f7f0df]">
                  Welcome back
                </h2>
                <p className="text-xs text-[#9ebcaf] leading-relaxed">
                  Sign in to access your clinical workspace.
                </p>
              </div>

              {/* Error Notice */}
              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2 animate-fadeIn">
                  <TriangleAlert size={16} className="text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="mt-5 space-y-4">
                {/* Field 1: Staff ID */}
                <div>
                  <label className="block text-xs font-mono font-medium text-[#bad8cb] uppercase tracking-wider mb-1.5">
                    Staff ID or Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6e9385]">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      value={staffId}
                      onChange={(e) => {
                        setStaffId(e.target.value);
                        if (error) setError(null);
                      }}
                      data-testid="input-staff-id"
                      placeholder="Enter your staff ID or email"
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#2c584a] bg-[#0b1f1a] text-[#f7f0df] placeholder-[#4f7366] text-sm outline-none transition-all focus:border-[#e1b968] focus:ring-1 focus:ring-[#e1b968]"
                      required
                    />
                  </div>
                </div>

                {/* Field 2: Password */}
                <div>
                  <label className="block text-xs font-mono font-medium text-[#bad8cb] uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6e9385]">
                      <LockKeyhole size={16} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      data-testid="input-staff-passcode"
                      placeholder="Enter your password"
                      className="w-full h-11 pl-10 pr-11 rounded-xl border border-[#2c584a] bg-[#0b1f1a] text-[#f7f0df] placeholder-[#4f7366] text-sm outline-none transition-all focus:border-[#e1b968] focus:ring-1 focus:ring-[#e1b968]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6e9385] hover:text-[#e1b968] transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Options Row */}
                <div className="flex items-center justify-between pt-1 text-xs text-[#9ebcaf]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#326152] bg-[#0b1f1a] text-[#e1b968] accent-[#e1b968] focus:ring-0 cursor-pointer"
                    />
                    <span>Remember this device</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => alert('Please contact your administrator to reset your credentials.')}
                    className="text-[#e1b968] hover:underline cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="button-clinician-signin"
                  className="w-full mt-4 h-12 rounded-xl bg-[#e1b968] text-[#12332a] hover:bg-[#ecc77a] active:scale-[0.99] font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-xl shadow-[#071310] disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {busy ? (
                    <>
                      <RefreshCw size={16} className="animate-spin text-[#12332a]" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>SIGN IN TO WORKSPACE</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

            </div>

            {/* Security Footer */}
            <div className="text-center space-y-1.5 text-xs text-[#6e8f81]">
              <div className="flex items-center justify-center gap-1.5 text-[#9cbdb0]">
                <LockKeyhole size={13} className="text-[#e1b968]" />
                <span className="font-medium">Protected clinical access</span>
              </div>
              <p className="text-[11px] text-[#5e8072] max-w-sm mx-auto leading-relaxed">
                Patient information is accessible only to authorized healthcare personnel.
              </p>
              <div className="flex items-center justify-center gap-3 text-[11px] text-[#7d9e90] pt-0.5">
                <a
                  href="#privacy"
                  onClick={(e) => e.preventDefault()}
                  className="hover:text-[#e1b968] transition-colors"
                >
                  Privacy & Security
                </a>
                <span>•</span>
                <a
                  href="#support"
                  onClick={(e) => e.preventDefault()}
                  className="hover:text-[#e1b968] transition-colors"
                >
                  Hospital Support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ClinicianLogin;
