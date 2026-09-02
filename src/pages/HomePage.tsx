import { useLocation } from 'wouter';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Hospital,
  Languages,
  LockKeyhole,
  MoreHorizontal,
  Play,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Volume2,
} from 'lucide-react';
import CursorGrid from '../components/CursorGrid';
import { Brand, AppButton } from '../components/Brand';

const navigation = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'For hospitals', href: '#hospitals' },
  { label: 'Technology', href: '#technology' },
];

const featureCards = [
  {
    icon: Languages,
    eyebrow: '01 / Accessible',
    title: 'Speak in your language',
    copy: 'Patients can share what they feel in the language that comes naturally to them.',
    tone: 'mint',
  },
  {
    icon: Sparkles,
    eyebrow: '02 / Adaptive',
    title: 'Questions that listen',
    copy: 'The intake adapts gently, asking only what is relevant to the patient’s story.',
    tone: 'blue',
  },
  {
    icon: ScanLine,
    eyebrow: '03 / Connected',
    title: 'Scan medical records',
    copy: 'Old prescriptions and reports become searchable context for the care team.',
    tone: 'amber',
  },
  {
    icon: FileCheck2,
    eyebrow: '04 / Prepared',
    title: 'Doctor-ready summary',
    copy: 'A clear, structured handoff helps physicians spend more time on care.',
    tone: 'lavender',
  },
];

function ShellNav() {
  const [, setLocation] = useLocation();
  return (
    <header className="site-nav">
      <button className="brand-button" onClick={() => setLocation('/')} aria-label="SwasthyaVaani home">
        <Brand light />
      </button>
      <nav className="desktop-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <a key={item.label} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="nav-actions">
        <button className="login-link" onClick={() => setLocation('/clinician/login')}>
          Portal login <ArrowRight size={15} />
        </button>
        <AppButton onClick={() => setLocation('/patient')} className="nav-cta">
          Start intake <ArrowRight size={15} />
        </AppButton>
      </div>
    </header>
  );
}

export function HomePage() {
  const [, setLocation] = useLocation();
  return (
    <main className="home-page">
      <ShellNav />
      <section className="hero">
        <div className="hero-grid" aria-hidden="true">
          <CursorGrid
            cellSize={70}
            color="#EABA61"
            radius={160}
            falloff="smooth"
            holdTime={300}
            fadeDuration={900}
            lineWidth={1}
            maxOpacity={0.65}
            fillOpacity={0.04}
            gridOpacity={0.06}
            cellRadius={0}
            clickPulse={false}
          />
        </div>
        <div className="hero-copy">
          <div className="eyebrow light-eyebrow">
            <span className="live-dot" /> THE NEW PATIENT FIRST
          </div>
          <h1>
            Your story.
            <br />
            <em>Understood</em> before
            <br />
            you meet the doctor.
          </h1>
          <p className="hero-lede">
            An AI-powered multilingual patient intake platform that listens, organizes and summarizes medical
            history—so every consultation starts with the full picture.
          </p>
          <div className="hero-actions">
            <AppButton onClick={() => setLocation('/patient')} className="hero-primary">
              Start patient intake <ArrowRight size={17} />
            </AppButton>
            <button
              className="watch-button"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="play-icon">
                <Play size={13} fill="currentColor" />
              </span>{' '}
              See how it works
            </button>
          </div>
          <div className="trust-note">
            <ShieldCheck size={16} /> Physician-controlled. Never diagnoses or prescribes.
          </div>
        </div>
        <div className="hero-visual" aria-label="Patient intake flow preview">
          <div className="visual-glow" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-panel panel-patient">
            <div className="mini-panel-top">
              <span className="mini-status">
                <span /> Live intake
              </span>
              <MoreHorizontal size={17} />
            </div>
            <div className="patient-avatar">
              <UserRound size={28} />
            </div>
            <div className="mini-label">PATIENT STORY</div>
            <strong>
              “I’ve had a cough
              <br />
              for about two weeks.”
            </strong>
            <div className="voice-wave">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="audio-label">
              <Volume2 size={12} /> Hindi · 00:18
            </span>
          </div>
          <div className="hero-panel panel-ai">
            <div className="ai-icon">
              <Sparkles size={17} />
            </div>
            <div>
              <span className="mini-label">AI INTAKE</span>
              <strong>Listening for context</strong>
            </div>
            <div className="ai-pulse" />
          </div>
          <div className="hero-panel panel-summary">
            <div className="summary-title">
              <span className="summary-check">
                <Check size={12} />
              </span>
              <span>
                <span className="mini-label">CLINICAL SUMMARY</span>
                <strong>Ready for review</strong>
              </span>
            </div>
            <div className="summary-line">
              <span>Chief concern</span>
              <b>Persistent cough</b>
            </div>
            <div className="summary-line">
              <span>Duration</span>
              <b>2 weeks</b>
            </div>
            <div className="summary-line">
              <span>Records</span>
              <b className="safe-text">
                <CheckCircle2 size={12} /> 2 attached
              </b>
            </div>
            <div className="review-bar">
              <span>Physician review</span>
              <b>100%</b>
            </div>
          </div>
          <div className="flow-tag tag-top">
            <span className="tag-number">01</span> Patient speaks
          </div>
          <div className="flow-tag tag-bottom">
            <span className="tag-number tag-green">03</span> Doctor reviews
          </div>
          <svg className="connector connector-one" viewBox="0 0 150 110" fill="none">
            <defs>
              <filter id="glow-dot-1" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#78ded0" floodOpacity="0.9" />
              </filter>
            </defs>
            <path className="connector-path" d="M4 104C65 103 52 8 147 7" stroke="rgba(110,213,200,.6)" strokeDasharray="4 6" />
            <circle r="3" fill="#78ded0" filter="url(#glow-dot-1)">
              <animateMotion
                dur="6s"
                repeatCount="indefinite"
                path="M4 104C65 103 52 8 147 7"
                keyPoints="0;0.05;0.95;1;1"
                keyTimes="0;0.05;0.42;0.45;1"
                calcMode="spline"
                keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"
              />
              <animate
                attributeName="opacity"
                values="0;0.95;0.95;0;0"
                keyTimes="0;0.05;0.40;0.44;1"
                dur="6s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          <svg className="connector connector-two" viewBox="0 0 150 110" fill="none">
            <defs>
              <filter id="glow-dot-2" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#78ded0" floodOpacity="0.9" />
              </filter>
            </defs>
            <path className="connector-path" d="M2 5C72 3 53 104 148 103" stroke="rgba(110,213,200,.6)" strokeDasharray="4 6" />
            <circle r="3" fill="#78ded0" filter="url(#glow-dot-2)">
              <animateMotion
                dur="6s"
                repeatCount="indefinite"
                path="M2 5C72 3 53 104 148 103"
                keyPoints="0;0;0.05;0.95;1"
                keyTimes="0;0.48;0.53;0.90;1"
                calcMode="spline"
                keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"
              />
              <animate
                attributeName="opacity"
                values="0;0;0.95;0.95;0"
                keyTimes="0;0.48;0.53;0.88;0.92"
                dur="6s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
        <div className="hero-footnote">
          <span>Scroll to explore</span>
          <span className="scroll-line" />
        </div>
      </section>

      <section className="flow-section" id="how-it-works">
        <div className="section-kicker">A better beginning to every consultation</div>
        <div className="flow-heading">
          <h2>
            From first word
            <br />
            to <em>full picture.</em>
          </h2>
          <p>
            One connected experience for the patient, the care team and the hospital. Designed to make busy OPDs
            feel more human.
          </p>
        </div>
        <div className="journey-line">
          {[
            { n: '01', icon: UserRound, title: 'Patient arrives', copy: 'A welcoming kiosk meets them where they are.' },
            { n: '02', icon: Sparkles, title: 'AI listens', copy: 'Adaptive questions, in their language and voice.' },
            { n: '03', icon: FileText, title: 'Story takes shape', copy: 'Records and answers become clear context.' },
            { n: '04', icon: Stethoscope, title: 'Doctor is ready', copy: 'A structured summary, always for review.' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div className="journey-step" key={item.n}>
                <div className="journey-icon">
                  <Icon size={20} />
                </div>
                <span className="step-number">{item.n}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                {index < 3 && (
                  <span className="journey-arrow">
                    <ArrowRight size={15} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="feature-section" id="features">
        <div className="section-intro">
          <div>
            <div className="section-kicker">Built around the patient</div>
            <h2>
              Technology that
              <br />
              <em>feels like care.</em>
            </h2>
          </div>
          <p>Every detail is made to reduce friction, preserve dignity and give clinicians a clearer starting point.</p>
        </div>
        <div className="feature-grid">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className={`feature-card ${feature.tone}`}>
                <div className="feature-icon">
                  <Icon size={22} />
                </div>
                <div className="feature-eyebrow">{feature.eyebrow}</div>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
                <ArrowRight className="feature-arrow" size={18} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="opd-section" id="hospitals">
        <div className="opd-copy">
          <div className="section-kicker light-eyebrow">For high-volume OPDs</div>
          <h2>
            More clarity.
            <br />
            <em>Less waiting.</em>
          </h2>
          <p>
            SwasthyaVaani turns the minutes before a consultation into meaningful clinical context—without taking
            control away from the physician.
          </p>
          <AppButton variant="outline" onClick={() => setLocation('/admin')}>
            Explore the hospital portal <ArrowRight size={16} />
          </AppButton>
        </div>
        <div className="opd-metrics">
          <div className="metric-main">
            <span>UP TO</span>
            <strong>34%</strong>
            <p>faster patient intake</p>
            <div className="metric-spark">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="metric-list">
            <div>
              <span className="metric-number">12+</span>
              <span>
                languages ready
                <br />
                to listen
              </span>
            </div>
            <div>
              <span className="metric-number">3×</span>
              <span>
                more structured
                <br />
                history at a glance
              </span>
            </div>
            <div>
              <span className="metric-number">100%</span>
              <span>
                physician-controlled
                <br />
                review
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="principles-section" id="technology">
        <div className="principles-art">
          <div className="principle-orb" />
          <div className="principle-card principle-card-one">
            <LockKeyhole size={15} />
            <span>Privacy by design</span>
            <b>Encrypted & secure</b>
          </div>
          <div className="principle-card principle-card-two">
            <Activity size={15} />
            <span>Always learning</span>
            <b>Never diagnosing</b>
          </div>
        </div>
        <div className="principles-copy">
          <div className="section-kicker">The SwasthyaVaani promise</div>
          <h2>
            Advanced where
            <br />
            it matters.
            <br />
            <em>Human always.</em>
          </h2>
          <p>AI handles the structure. Doctors hold the expertise. Patients keep their voice. That’s the line we never cross.</p>
          <div className="principle-points">
            <div>
              <ShieldCheck size={18} />
              <span>Built for trust</span>
            </div>
            <div>
              <Hospital size={18} />
              <span>Ready for real hospitals</span>
            </div>
            <div>
              <Languages size={18} />
              <span>Made for India’s diversity</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-top">
          <Brand light />
          <div className="footer-callout">
            Every patient has a story.
            <br />
            <em>Let’s make it heard.</em>
          </div>
          <AppButton onClick={() => setLocation('/patient')}>
            Start with SwasthyaVaani <ArrowRight size={16} />
          </AppButton>
        </div>
        <div className="footer-bottom">
          <span>SIH 2026 · PS 26047</span>
          <span>Ministry of AYUSH</span>
          <span>ABDM-ready architecture</span>
          <span>Privacy & security</span>
          <span>© 2026 SwasthyaVaani</span>
        </div>
      </footer>
    </main>
  );
}
export default HomePage;
