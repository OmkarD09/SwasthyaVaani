import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  HeartPulse,
  Hospital,
  Languages,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Mic,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  UserRound,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import './index.css';
import { ClinicianLogin, Queue, RecordPage } from './pages/ClinicianDashboard';
import { getKioskTranslation } from './lib/kioskTranslations';
import { patientApi } from './services/patientApi';
import { AudioWaveformRecorder } from './components/AudioWaveformRecorder';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

function AppButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled,
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-full transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-[#1f5b4e] text-white hover:bg-[#17473d] shadow-sm',
    secondary: 'bg-[#e4be6c] text-[#173e35] hover:bg-[#d8b05c] font-semibold',
    ghost: 'bg-transparent text-[#173e35] hover:bg-[#e7e3d4]',
    outline: 'border border-[#d0d7cf] text-[#173e35] hover:bg-[#f3eee0]',
  };
  const sizes: Record<string, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5 font-semibold',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className={`brand-mark ${light ? 'light' : ''}`}>
        <HeartPulse size={18} />
      </span>
      <span className={`brand-text ${light ? 'light' : ''}`}>
        Swasthya<b>Vaani</b>
      </span>
    </div>
  );
}

function PatientKiosk() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState('English');
  const [mode, setMode] = useState<'voice' | 'touch'>('voice');
  const [workflow, setWorkflow] = useState<'GENERAL_CLINICAL' | 'AYUSH'>('GENERAL_CLINICAL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Patient details
  const [patientName, setPatientName] = useState('Ananya Sharma');
  const [patientAge, setPatientAge] = useState(34);
  const [patientGender, setPatientGender] = useState('Female');

  // Live Intake Session State
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [token, setToken] = useState<string>('A-028');
  const [activeQuestion, setActiveQuestion] = useState('What brings you in today?');
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [targetField, setTargetField] = useState<string>('chief_complaint');
  const [patientAnswer, setPatientAnswer] = useState('');
  const [extractedSummary, setExtractedSummary] = useState<Record<string, any>>({});
  const [uploaded, setUploaded] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    patientApi.getProfile().then((p) => {
      if (p.name) setPatientName(p.name);
      if (p.age) setPatientAge(Number(p.age) || 34);
    });
  }, []);

  const t = getKioskTranslation(language || 'English');

  const languages = [
    { name: 'English', sub: 'English' },
    { name: 'हिन्दी', sub: 'Hindi' },
    { name: 'বাংলা', sub: 'Bengali' },
    { name: 'मराठी', sub: 'Marathi' },
    { name: 'తెలుగు', sub: 'Telugu' },
    { name: 'தமிழ்', sub: 'Tamil' },
    { name: 'ગુજરાતી', sub: 'Gujarati' },
    { name: 'ಕನ್ನಡ', sub: 'Kannada' },
    { name: 'മലയാളം', sub: 'Malayalam' },
    { name: 'ਪੰਜਾਬੀ', sub: 'Punjabi' },
    { name: 'ଓଡ଼ିଆ', sub: 'Odia' },
    { name: 'অসমীয়া', sub: 'Assamese' },
    { name: 'اردو', sub: 'Urdu' },
  ];

  const filteredLanguages = languages.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sub.toLowerCase().includes(q)
    );
  });

  const dynamicSteps = [
    { title: t.steps.language.title, caption: t.steps.language.caption, icon: Languages },
    { title: t.steps.story.title, caption: t.steps.story.caption, icon: Mic },
    { title: t.steps.records.title, caption: t.steps.records.caption, icon: FileText },
    { title: t.steps.ready.title, caption: t.steps.ready.caption, icon: CheckCircle2 },
  ];

  // Start Session when leaving Step 0
  const handleStartIntake = async () => {
    setLoading(true);
    const langCode = language === 'हिन्दी' ? 'hi' : 'en';
    try {
      const res = await fetch('/api/v1/intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          patient_age: patientAge,
          patient_gender: patientGender,
          hospital_id: 'hosp_district_01',
          doctor_id: 'doc_001',
          workflow_type: workflow,
          language_code: langCode,
          interaction_mode: mode.toUpperCase(),
          consent_given: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntakeId(data.id);
        setToken(data.token);
      }
    } catch (e) {
      console.warn('Using offline intake session:', e);
    } finally {
      setLoading(false);
      setStep(1);
    }
  };

  // Submit answer and receive next adaptive question
  const handleSubmitAnswer = async () => {
    if (!patientAnswer.trim()) {
      setStep(2);
      return;
    }
    setLoading(true);
    const langCode = language === 'हिन्दी' ? 'hi' : 'en';
    try {
      if (intakeId) {
        const res = await fetch(`/api/v1/intakes/${intakeId}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_event_id: activeQuestionId,
            raw_text: patientAnswer,
            input_mode: mode.toUpperCase(),
            language_code: langCode,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setExtractedSummary((prev) => ({ ...prev, ...data.extracted_facts }));
          if (data.decision && data.decision.action === 'ASK' && data.decision.question) {
            setActiveQuestion(data.decision.question);
            setTargetField(data.decision.target_field || '');
            setPatientAnswer('');
            setLoading(false);
            return; // Ask next adaptive question
          }
        }
      }
    } catch (e) {
      console.warn('Offline answer ingestion:', e);
    } finally {
      setLoading(false);
      setStep(2);
    }
  };

  // Document upload
  const handleFileUpload = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    const fileName = file ? file.name : 'Prescription_May2026.pdf';
    setUploadedDocName(fileName);
    setUploaded(true);
    if (file && intakeId) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', 'pat_demo');
      formData.append('intake_session_id', intakeId);
      formData.append('document_type', 'PRESCRIPTION');
      try {
        await fetch('/api/v1/documents/upload', {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        console.warn('Doc upload error:', err);
      }
    }
  };

  // Final submission into Doctor Queue
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      if (intakeId) {
        await fetch(`/api/v1/intakes/${intakeId}/submit`, {
          method: 'POST',
        });
      }
    } catch (e) {
      console.warn('Submit offline:', e);
    } finally {
      setLoading(false);
      setLocation('/clinician/queue');
    }
  };

  // Play question aloud using Sarvam AI Bulbul TTS with Web Speech fallback
  const playQuestionAudio = async () => {
    try {
      const langCode = language === 'हिन्दी' ? 'hi' : 'en';
      const form = new FormData();
      form.append('text', activeQuestion);
      form.append('language_code', langCode);
      const res = await fetch('/api/v1/speech/tts', { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
          audio.play();
          return;
        }
      }
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(activeQuestion);
        utterance.lang = langCode === 'hi' ? 'hi-IN' : 'en-IN';
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(activeQuestion);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <main className="kiosk-page">
      <header className="kiosk-topbar">
        <button className="brand-button" onClick={() => setLocation('/')}>
          <Brand />
        </button>
        <div className="kiosk-right">
          <span className="kiosk-secure">
            <ShieldCheck size={15} /> {t.topbarSecure}
          </span>
          <button className="language-mini">
            <Languages size={16} /> {language} <ChevronDown size={13} />
          </button>
          <button className="kiosk-close" onClick={() => setLocation('/')}>
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="kiosk-layout">
        <aside className="kiosk-progress">
          <div className="kiosk-welcome">
            <span className="eyebrow">{t.intakeEyebrow}</span>
            <h1>
              {t.careStartsHere}
              <br />
              <em>{t.careStartsHereEm}</em>
            </h1>
            <p>{t.careDescription}</p>
          </div>
          <div className="step-list">
            {dynamicSteps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  className={`kiosk-step ${index === step ? 'current' : ''} ${index < step ? 'done' : ''}`}
                  key={item.title + index}
                >
                  <span className="step-icon">
                    {index < step ? <Check size={17} /> : <Icon size={17} />}
                  </span>
                  <span>
                    <b>{item.title}</b>
                    <small>{item.caption}</small>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="kiosk-help">
            <CircleHelp size={16} />
            <span>{t.needHelp}</span>
          </div>
        </aside>

        <section className="kiosk-main">
          <div className="kiosk-main-inner">
            <div className="kiosk-progress-top">
              <span>
                {t.stepPrefix} {String(step + 1).padStart(2, '0')} {t.stepOf} 04
              </span>
              <div>
                <i className={step >= 0 ? 'filled' : ''} />
                <i className={step >= 1 ? 'filled' : ''} />
                <i className={step >= 2 ? 'filled' : ''} />
                <i className={step >= 3 ? 'filled' : ''} />
              </div>
              <span className="time-note">
                <Clock3 size={14} /> Token: <strong className="font-mono text-[#a06f42]">#{token}</strong>
              </span>
            </div>

            {/* STEP 0: LANGUAGE & WORKFLOW SELECTION */}
            {step === 0 && (
              <div className="kiosk-card language-card">
                <div className="kiosk-card-heading">
                  <span className="section-kicker">{t.langKicker}</span>
                  <h2>{t.langHeading}</h2>
                  <p>{t.langSubtitle}</p>
                </div>

                <div className="language-search-wrap">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    className="language-search-input"
                    placeholder="Search your language..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="language-grid-wrap">
                  <div className="language-grid">
                    {filteredLanguages.map((item) => (
                      <button
                        key={item.sub}
                        className={language === item.name || language === item.sub ? 'selected' : ''}
                        onClick={() => setLanguage(item.name)}
                      >
                        <span className="language-radio">
                          {(language === item.name || language === item.sub) && <Check size={14} />}
                        </span>
                        <b>{item.name}</b>
                        <small>{item.sub}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <span className="section-kicker">Clinical Stream</span>
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 rounded-xl border p-3 text-left text-sm font-semibold transition ${
                        workflow === 'GENERAL_CLINICAL'
                          ? 'border-[#1f5b4e] bg-[#eef5f1] text-[#173e35]'
                          : 'border-[#cbd6ca] bg-white text-[#5c756a]'
                      }`}
                      onClick={() => setWorkflow('GENERAL_CLINICAL')}
                    >
                      🏥 General Allopathy / OPD
                    </button>
                    <button
                      className={`flex-1 rounded-xl border p-3 text-left text-sm font-semibold transition ${
                        workflow === 'AYUSH'
                          ? 'border-[#1f5b4e] bg-[#eef5f1] text-[#173e35]'
                          : 'border-[#cbd6ca] bg-white text-[#5c756a]'
                      }`}
                      onClick={() => setWorkflow('AYUSH')}
                    >
                      🌿 AYUSH / Integrated
                    </button>
                  </div>
                </div>

                <div className="mode-heading mt-4">
                  <span className="section-kicker">{t.howAnswer}</span>
                  <div className="mode-toggle">
                    <button className={mode === 'voice' ? 'active' : ''} onClick={() => setMode('voice')}>
                      <Mic size={19} /> {t.modeVoice}
                    </button>
                    <button className={mode === 'touch' ? 'active' : ''} onClick={() => setMode('touch')}>
                      <ScanLine size={19} /> {t.modeText}
                    </button>
                  </div>
                </div>

                <AppButton onClick={handleStartIntake} className="kiosk-next mt-4" disabled={loading}>
                  {loading ? 'Initializing…' : <>{t.btnStart} <ArrowRight size={17} /></>}
                </AppButton>
              </div>
            )}

            {/* STEP 1: ADAPTIVE STORY & VOICE */}
            {step === 1 && (
              <div className="kiosk-card story-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="section-kicker">Adaptive Question · {language}</span>
                  <button
                    onClick={playQuestionAudio}
                    className="flex items-center gap-1 rounded-full border border-[#cbd6ca] bg-[#f2f7f4] px-3 py-1 text-xs font-semibold text-[#1f5b4e] transition hover:bg-[#e4eee8]"
                    title="Listen to question spoken aloud"
                  >
                    <Volume2 size={14} className="text-[#1f5b4e]" />
                    <span>{language === 'हिन्दी' ? 'प्रश्न सुनें' : 'Listen'}</span>
                  </button>
                </div>
                <h2 className="text-2xl font-serif text-[#173e35]">{activeQuestion}</h2>
                <p className="story-instruction">
                  Speak clearly into your microphone or type your response below.
                </p>

                {/* Real-time Waveform Audio Recorder with Sarvam AI */}
                <div className="my-4 w-full">
                  <AudioWaveformRecorder
                    language={language}
                    onTranscriptComplete={(transcript) => {
                      setPatientAnswer(transcript);
                    }}
                    disabled={loading}
                  />
                </div>

                <div className="my-2 w-full">
                  <span className="mb-1 block text-xs font-medium text-[#5c756a]">
                    Verify or edit your answer transcript:
                  </span>
                  <textarea
                    rows={2}
                    value={patientAnswer}
                    onChange={(e) => setPatientAnswer(e.target.value)}
                    placeholder={
                      language === 'हिन्दी'
                        ? 'उदा. मुझे 3 दिनों से तेज बुखार और सिरदर्द है...'
                        : 'e.g. I have had fever and chest discomfort since 3 days...'
                    }
                    className="w-full rounded-xl border border-[#cbd6ca] bg-[#fbfaf4] p-3 text-sm text-[#173e35] outline-none focus:border-[#1f5b4e]"
                  />
                </div>

                {Object.keys(extractedSummary).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {Object.entries(extractedSummary).map(([k, v]) => (
                      <span key={k} className="rounded-full bg-[#dbeade] px-3 py-1 font-mono text-[#245746]">
                        ✓ {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                )}

                <AppButton onClick={handleSubmitAnswer} className="kiosk-next mt-4" disabled={loading}>
                  {loading ? 'Analyzing with AI…' : <>Next Question <ArrowRight size={17} /></>}
                </AppButton>
              </div>
            )}

            {/* STEP 2: DOCUMENTS UPLOAD */}
            {step === 2 && (
              <div className="kiosk-card records-card">
                <div className="kiosk-card-icon amber-icon">
                  <Paperclip size={25} />
                </div>
                <div className="kiosk-card-heading">
                  <span className="section-kicker">{t.recordsKicker}</span>
                  <h2>{t.recordsHeading}</h2>
                  <p>{t.recordsSubtitle}</p>
                </div>
                {uploaded ? (
                  <div className="uploaded-file">
                    <span className="file-check">
                      <Check size={16} />
                    </span>
                    <span>
                      <b>{uploadedDocName || 'Prescription_May2026.pdf'}</b>
                      <small>{t.recordReadySub}</small>
                    </span>
                    <button onClick={() => setUploaded(false)}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="upload-options">
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#b8cabe] bg-[#fbfaf4] p-5 text-center transition hover:border-[#1f5b4e]">
                      <Upload size={21} className="text-[#1f5b4e]" />
                      <b className="mt-2 text-sm text-[#173e35]">{t.uploadDeviceTitle}</b>
                      <small className="text-xs text-[#7b9086]">{t.uploadDeviceSub}</small>
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button onClick={() => handleFileUpload()}>
                      <span>
                        <Camera size={21} />
                      </span>
                      <b>{t.takePhotoTitle}</b>
                      <small>{t.takePhotoSub}</small>
                    </button>
                  </div>
                )}
                <button className="skip-link" onClick={() => setStep(3)}>
                  {uploaded ? t.btnContinueWithoutMore : t.btnSkip} <ArrowRight size={14} />
                </button>
                <AppButton onClick={() => setStep(3)} className="kiosk-next">
                  {uploaded ? t.btnContinue : t.btnContinueWithoutReport} <ArrowRight size={17} />
                </AppButton>
              </div>
            )}

            {/* STEP 3: PATIENT REVIEW & SUBMIT TO QUEUE */}
            {step === 3 && (
              <div className="kiosk-card ready-card">
                <div className="ready-check">
                  <Check size={32} />
                </div>
                <span className="section-kicker">{t.readyKicker}</span>
                <h2>
                  {t.readyHeading}
                  <br />
                  <em>{t.readyHeadingEm}</em>
                </h2>
                <p>{t.readySubtitle}</p>
                <div className="ready-summary">
                  <div>
                    <span>
                      <UserRound size={15} /> {t.summaryPatient}
                    </span>
                    <b>{patientName} ({patientAge} yrs)</b>
                  </div>
                  <div>
                    <span>
                      <Languages size={15} /> {t.summaryLanguage}
                    </span>
                    <b>{language}</b>
                  </div>
                  <div>
                    <span>
                      <FileText size={15} /> Token Number
                    </span>
                    <b className="font-mono text-[#a06f42]">#{token}</b>
                  </div>
                </div>
                <div className="privacy-callout">
                  <ShieldCheck size={17} />
                  <span>
                    <b>{t.privacyTitle}</b>
                    <small>{t.privacySub}</small>
                  </span>
                </div>
                <AppButton onClick={handleFinalSubmit} className="kiosk-next" disabled={loading}>
                  {loading ? 'Submitting to Queue…' : <>{t.btnFinishNotify} <ArrowRight size={17} /></>}
                </AppButton>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="home-page min-h-screen bg-[#f7f5ed] text-[#173e35]">
      {/* Top bar */}
      <header className="home-header flex items-center justify-between border-b border-[#dcd7c5] px-6 py-4">
        <Brand />
        <div className="flex items-center gap-3">
          <AppButton variant="ghost" size="sm" onClick={() => setLocation('/clinician/login')}>
            Clinician Login
          </AppButton>
          <AppButton variant="primary" size="sm" onClick={() => setLocation('/kiosk')}>
            Patient Intake <ArrowRight size={15} />
          </AppButton>
        </div>
      </header>

      {/* Hero */}
      <main className="hero-section mx-auto flex max-w-5xl flex-col items-center px-6 py-16 text-center">
        <span className="eyebrow rounded-full bg-[#1f5b4e]/10 px-4 py-1 font-mono text-xs font-semibold text-[#1f5b4e]">
          SIH PROBLEM STATEMENT 26047
        </span>
        <h1 className="mt-4 font-serif text-4xl leading-tight font-bold text-[#173e35] md:text-6xl">
          Voice-first clinical intake.<br />
          <em className="text-[#1f5b4e]">Zero doctor burnout.</em>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[#5c756a] md:text-lg">
          AI-assisted, multilingual patient intake with real-time SOCRATES symptom exploration,
          Sarvam AI Indic voice synthesis, and physician-controlled FHIR R4 clinical summaries.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <AppButton size="lg" onClick={() => setLocation('/kiosk')}>
            <Mic size={18} /> Start Patient Intake
          </AppButton>
          <AppButton variant="secondary" size="lg" onClick={() => setLocation('/clinician/queue')}>
            <Stethoscope size={18} /> Doctor Workstation
          </AppButton>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid w-full grid-cols-1 gap-6 text-left md:grid-cols-3">
          <div className="rounded-2xl border border-[#cbd6ca] bg-white p-6 shadow-xs">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1f5b4e]/10 text-[#1f5b4e]">
              <Languages size={22} />
            </span>
            <h3 className="mt-4 font-serif text-lg font-bold text-[#173e35]">10+ Indic Languages</h3>
            <p className="mt-1 text-sm text-[#5c756a]">
              Sarvam AI Saaras ASR and Bulbul TTS empower illiterate and regional patients to speak naturally.
            </p>
          </div>
          <div className="rounded-2xl border border-[#cbd6ca] bg-white p-6 shadow-xs">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4be6c]/20 text-[#a06f42]">
              <Sparkles size={22} />
            </span>
            <h3 className="mt-4 font-serif text-lg font-bold text-[#173e35]">Adaptive GenAI Intake</h3>
            <p className="mt-1 text-sm text-[#5c756a]">
              Google Gemini 2.5 Flash extracts clinical entities and asks dynamic follow-up questions with safe guardrails.
            </p>
          </div>
          <div className="rounded-2xl border border-[#cbd6ca] bg-white p-6 shadow-xs">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1f5b4e]/10 text-[#1f5b4e]">
              <FileCheck2 size={22} />
            </span>
            <h3 className="mt-4 font-serif text-lg font-bold text-[#173e35]">ABDM & FHIR R4 Ready</h3>
            <p className="mt-1 text-sm text-[#5c756a]">
              Instant generation of NRCES India Core document bundles with ABHA verification.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WouterRouter>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/kiosk" component={PatientKiosk} />
        <Route path="/clinician/login" component={ClinicianLogin} />
        <Route path="/clinician/queue" component={Queue} />
        <Route path="/clinician/patient/:id" component={RecordPage} />
      </Switch>
    </WouterRouter>
  );
}