import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  CheckCircle2,
  FileText,
  UserRound,
  Building2,
  Ticket,
  Languages,
  Check,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Eye,
  X,
  RotateCcw,
  Paperclip,
  Activity,
} from 'lucide-react';
import { clearStoredDocumentUpload } from '../lib/documentUploadState';
import { patientApi } from '../services/patientApi';

interface SubmissionData {
  patientName: string;
  patientAge: string;
  patientGender?: string;
  language: string;
  department: string;
  token: string;
  documentCount: number;
  documentName: string | null;
  submittedAt: string;
  intakeId?: string | null;
  chiefConcern?: string;
  duration?: string;
  symptoms?: string[];
}

const SUCCESS_TRANSLATIONS: Record<string, {
  heading: string;
  subheading: string;
  tokenLabel: string;
  tokenHelp: string;
  patientNameLabel: string;
  deptLabel: string;
  statusLabel: string;
  statusSuccess: string;
  docsLabel: string;
  langLabel: string;
  stepIntake: string;
  stepDocs: string;
  stepSent: string;
  stepReview: string;
  stepReviewSub: string;
  btnDone: string;
  btnViewSummary: string;
  autoReturnMessage: string;
  secondsSuffix: string;
  pauseTimer: string;
  resumeTimer: string;
  kioskSafetyNote: string;
  summaryModalTitle: string;
  chiefConcernLabel: string;
  durationLabel: string;
  symptomsLabel: string;
  closeBtn: string;
}> = {
  English: {
    heading: 'Your information has been submitted',
    subheading: 'Your health information and uploaded records have been securely shared with your healthcare team.',
    tokenLabel: 'Queue Token Number',
    tokenHelp: 'Please note down your token number or wait for it to be displayed in the OPD waiting area.',
    patientNameLabel: 'Patient Name',
    deptLabel: 'Department',
    statusLabel: 'Submission Status',
    statusSuccess: 'Submitted Successfully',
    docsLabel: 'Documents Submitted',
    langLabel: 'Language',
    stepIntake: 'Intake Completed',
    stepDocs: 'Medical Records Submitted',
    stepSent: 'Information Sent',
    stepReview: 'Doctor Review',
    stepReviewSub: 'Waiting for clinician call',
    btnDone: 'Done',
    btnViewSummary: 'View Submitted Summary',
    autoReturnMessage: 'Returning to the welcome screen in',
    secondsSuffix: 'seconds',
    pauseTimer: 'Pause timer',
    resumeTimer: 'Resume timer',
    kioskSafetyNote: 'For your security, temporary details will be cleared from this kiosk when finished.',
    summaryModalTitle: 'Submitted Intake Summary',
    chiefConcernLabel: 'Primary Health Concern',
    durationLabel: 'Duration of Symptoms',
    symptomsLabel: 'Reported Symptoms & Notes',
    closeBtn: 'Close Summary',
  },
  'हिन्दी': {
    heading: 'आपकी जानकारी सफलतापूर्वक जमा कर दी गई है',
    subheading: 'आपकी स्वास्थ्य संबंधी जानकारी और अपलोड किए गए दस्तावेज़ सुरक्षित रूप से आपकी देखभाल टीम को भेज दिए गए हैं।',
    tokenLabel: 'टोकन / कतार क्रमांक',
    tokenHelp: 'कृपया अपना टोकन नंबर नोट कर लें अथवा प्रतीक्षा कक्ष में अपने नंबर के पुकारे जाने की प्रतीक्षा करें।',
    patientNameLabel: 'मरीज़ का नाम',
    deptLabel: 'विभाग',
    statusLabel: 'स्थिति',
    statusSuccess: 'सफलतापूर्वक जमा',
    docsLabel: 'जमा किए गए दस्तावेज़',
    langLabel: 'भाषा',
    stepIntake: 'पंजीकरण पूर्ण',
    stepDocs: 'दस्तावेज़ जमा',
    stepSent: 'जानकारी भेजी गई',
    stepReview: 'डॉक्टर द्वारा समीक्षा',
    stepReviewSub: 'चिकित्सक की बारी की प्रतीक्षा',
    btnDone: 'समाप्त करें (Done)',
    btnViewSummary: 'जमा की गई जानकारी देखें',
    autoReturnMessage: 'स्वागत स्क्रीन पर वापस जा रहे हैं:',
    secondsSuffix: 'सेकंड में',
    pauseTimer: 'समय रोकें',
    resumeTimer: 'समय शुरू करें',
    kioskSafetyNote: 'आपकी सुरक्षा के लिए, समाप्त होने पर इस कियोस्क से व्यक्तिगत विवरण हटा दिया जाएगा।',
    summaryModalTitle: 'जमा की गई जानकारी का सारांश',
    chiefConcernLabel: 'मुख्य समस्या',
    durationLabel: 'लक्षणों की अवधि',
    symptomsLabel: 'बताए गए लक्षण व विवरण',
    closeBtn: 'बंद करें',
  },
  'मराठी': {
    heading: 'तुमची माहिती यशस्वीरीत्या सबमिट झाली आहे',
    subheading: 'तुमची आरोग्य माहिती आणि अपलोड केलेले कागदपत्रे सुरक्षितपणे तुमच्या डॉक्टर टीमकडे पाठवली गेली आहेत.',
    tokenLabel: 'टोकन क्रमांक',
    tokenHelp: 'कृपया आपला टोकन नंबर नोंदवून घ्या किंवा ओपीडी प्रतीक्षा कक्षात नंबर येण्याची वाट पहा.',
    patientNameLabel: 'रुग्णाचे नाव',
    deptLabel: 'विभाग',
    statusLabel: 'स्थिती',
    statusSuccess: 'यशस्वीरीत्या सबमिट',
    docsLabel: 'सादर केलेले दस्तऐवज',
    langLabel: 'भाषा',
    stepIntake: 'माहिती पूर्ण',
    stepDocs: 'दस्तऐवज सबमिट',
    stepSent: 'माहिती पाठवली',
    stepReview: 'डॉक्टर तपासणी',
    stepReviewSub: 'डॉक्टरांच्या बोलावण्याची प्रतीक्षा',
    btnDone: 'पूर्ण झाले (Done)',
    btnViewSummary: 'सबमिट केलेला सारांश पहा',
    autoReturnMessage: 'स्वागत स्क्रीनवर परत जात आहे:',
    secondsSuffix: 'सेकंदात',
    pauseTimer: 'टाइमर थांबवा',
    resumeTimer: 'टाइमर सुरू करा',
    kioskSafetyNote: 'तुमच्या सुरक्षेसाठी, हे कियोस्क पूर्ण झाल्यावर तात्पुरती माहिती सुरक्षितपणे हटवेल.',
    summaryModalTitle: 'सादर केलेला माहिती सारांश',
    chiefConcernLabel: 'मुख्य तक्रार',
    durationLabel: 'कालावधी',
    symptomsLabel: 'नोंदवलेली लक्षणे',
    closeBtn: 'बंद करा',
  },
};

function getSuccessText(lang: string) {
  if (SUCCESS_TRANSLATIONS[lang]) return SUCCESS_TRANSLATIONS[lang];
  if (lang === 'Hindi' || lang === 'hi') return SUCCESS_TRANSLATIONS['हिन्दी'];
  if (lang === 'Marathi' || lang === 'mr') return SUCCESS_TRANSLATIONS['मराठी'];
  return SUCCESS_TRANSLATIONS.English;
}

export function PatientComplete() {
  const [, setLocation] = useLocation();
  const [submission, setSubmission] = useState<SubmissionData>({
    patientName: 'Patient',
    patientAge: '',
    patientGender: undefined,
    language: 'English',
    department: 'General Medicine',
    token: 'Pending',
    documentCount: 0,
    documentName: null,
    submittedAt: new Date().toISOString(),
    chiefConcern: 'Not provided',
    duration: 'Not provided',
    symptoms: [],
  });

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear temporary patient intake state securely from the kiosk
  const clearTemporaryPatientState = useCallback(() => {
    try {
      localStorage.removeItem('swasthya_active_intake_id');
      localStorage.removeItem('swasthya_active_patient_id');
      localStorage.removeItem('swasthya_active_token');
      localStorage.removeItem('swasthya_last_submission');
      localStorage.removeItem('swasthya_chat_history');
      localStorage.removeItem('swasthya_uploaded_doc_name');
      clearStoredDocumentUpload();
    } catch {
      // ignore storage clear errors
    }
  }, []);

  // Finish intake and return directly to Patient Welcome/Home
  const handleDone = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    clearTemporaryPatientState();
    setLocation('/patient');
  }, [clearTemporaryPatientState, setLocation]);

  // Load latest submission from localStorage or API on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('swasthya_last_submission');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSubmission((prev) => ({
          ...prev,
          ...parsed,
        }));
      } else {
        // Fallback: check profile and active token
        patientApi.getProfile().then((p) => {
          const activeToken = localStorage.getItem('swasthya_active_token') || 'Pending';
          const lang = localStorage.getItem('sv_selected_language') || 'English';
          setSubmission((prev) => ({
            ...prev,
            patientName: p.name || prev.patientName,
            patientAge: p.age || prev.patientAge,
            patientGender: p.gender || prev.patientGender,
            language: lang,
            token: activeToken,
          }));
        });
      }
    } catch (e) {
      console.warn('Error reading submission data:', e);
    }
  }, []);

  // 30-second kiosk auto-return timer
  useEffect(() => {
    if (isTimerPaused) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerPaused, handleDone]);

  const t = getSuccessText(submission.language);

  return (
    <main className="kiosk-page min-h-screen flex flex-col justify-between bg-[#f4f7f6] text-[#173e35]">
      {/* Top Navigation Bar */}
      <header className="kiosk-topbar flex items-center justify-between p-4 md:px-8 border-b border-emerald-900/10 bg-white shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#173e35] text-[#eaba61] flex items-center justify-center font-bold">
            <Sparkles size={18} strokeWidth={2.5} />
          </span>
          <span className="font-serif font-bold text-lg text-[#173e35]">
            Swasthya<span className="text-[#c98e20]">Vaani</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>{submission.language}</span>
          </span>

          <button
            onClick={handleDone}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1"
            title="Return to Welcome Screen"
          >
            <X size={14} />
            <span>{t.btnDone}</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center items-center">
        <div className="w-full bg-white rounded-3xl shadow-xl border border-[#dce8e4] overflow-hidden">
          {/* Header Banner with Success Animation */}
          <div className="bg-gradient-to-br from-[#173e35] to-[#23584c] text-white p-6 md:p-8 text-center relative">
            <div className="absolute top-4 right-4 text-emerald-200/40">
              <Sparkles size={32} />
            </div>

            {/* Success Icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-[#eaba61]/20 border-2 border-[#eaba61] flex items-center justify-center text-[#eaba61] mb-4 shadow-lg animate-pulse">
              <CheckCircle2 size={44} strokeWidth={2.5} className="text-[#eaba61]" />
            </div>

            <span className="inline-block uppercase tracking-wider text-xs font-mono px-3 py-1 rounded-full bg-[#eaba61]/20 text-[#eaba61] font-semibold mb-2">
              SUBMISSION CONFIRMED
            </span>

            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">
              {t.heading}
            </h1>
            <p className="text-emerald-100/90 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              {t.subheading}
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Prominent Queue Token Card */}
            <div className="bg-gradient-to-r from-[#fff9eb] to-[#fef6e2] border-2 border-[#eaba61]/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#eaba61] text-[#173e35] flex items-center justify-center shadow-inner shrink-0">
                  <Ticket size={30} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider font-mono font-bold text-[#8c6214]">
                    {t.tokenLabel}
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold text-[#173e35] tracking-tight font-mono">
                    {submission.token}
                  </div>
                </div>
              </div>

              <div className="text-xs text-[#6e5420] text-center sm:text-right max-w-xs leading-relaxed">
                {t.tokenHelp}
              </div>
            </div>

            {/* Summary Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Patient Name */}
              <div className="p-4 rounded-xl bg-[#f8faf9] border border-[#e4edea]">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#5a776e] mb-1">
                  <UserRound size={14} className="text-[#1f5b4e]" />
                  <span>{t.patientNameLabel}</span>
                </div>
                <div className="text-base font-bold text-[#173e35]">
                  {submission.patientName}
                  {submission.patientAge ? ` (${submission.patientAge} yrs)` : ''}
                </div>
                {submission.patientGender && (
                  <div className="text-xs text-[#728f85] mt-0.5">{submission.patientGender}</div>
                )}
              </div>

              {/* Department */}
              <div className="p-4 rounded-xl bg-[#f8faf9] border border-[#e4edea]">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#5a776e] mb-1">
                  <Building2 size={14} className="text-[#1f5b4e]" />
                  <span>{t.deptLabel}</span>
                </div>
                <div className="text-base font-bold text-[#173e35]">
                  {submission.department || 'General Medicine'}
                </div>
                <div className="text-xs text-[#728f85] mt-0.5">OPD Station</div>
              </div>

              {/* Status */}
              <div className="p-4 rounded-xl bg-[#f8faf9] border border-[#e4edea]">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#5a776e] mb-1">
                  <Activity size={14} className="text-[#1f5b4e]" />
                  <span>{t.statusLabel}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mt-1">
                  <Check size={12} strokeWidth={3} />
                  <span>{t.statusSuccess}</span>
                </div>
              </div>

              {/* Documents Submitted */}
              <div className="p-4 rounded-xl bg-[#f8faf9] border border-[#e4edea]">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#5a776e] mb-1">
                  <FileText size={14} className="text-[#1f5b4e]" />
                  <span>{t.docsLabel}</span>
                </div>
                <div className="text-sm font-bold text-[#173e35] truncate" title={submission.documentName || ''}>
                  {submission.documentCount > 0 && submission.documentName
                    ? `${submission.documentCount} ${submission.documentCount === 1 ? 'Record' : 'Records'} (${submission.documentName})`
                    : 'None attached'}
                </div>
              </div>

              {/* Language */}
              <div className="p-4 rounded-xl bg-[#f8faf9] border border-[#e4edea]">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#5a776e] mb-1">
                  <Languages size={14} className="text-[#1f5b4e]" />
                  <span>{t.langLabel}</span>
                </div>
                <div className="text-sm font-bold text-[#173e35]">
                  {submission.language}
                </div>
              </div>

              {/* Time */}
              <div className="p-4 rounded-xl bg-[#f8faf9] border border-[#e4edea]">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#5a776e] mb-1">
                  <Clock size={14} className="text-[#1f5b4e]" />
                  <span>Submitted Time</span>
                </div>
                <div className="text-sm font-bold text-[#173e35]">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Status Tracker */}
            <div className="border border-[#e0ece8] bg-[#fbfdfc] rounded-2xl p-5">
              <div className="text-xs uppercase font-mono font-bold tracking-wider text-[#3d5e54] mb-4 flex items-center gap-2">
                <Activity size={14} />
                <span>CONSULTATION STATUS TRACKER</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Step 1: Intake Completed */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">{t.stepIntake}</div>
                    <div className="text-[11px] text-emerald-700">Verified</div>
                  </div>
                </div>

                {/* Step 2: Records Submitted */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">{t.stepDocs}</div>
                    <div className="text-[11px] text-emerald-700">
                      {submission.documentCount > 0 ? `${submission.documentCount} uploaded` : 'None needed'}
                    </div>
                  </div>
                </div>

                {/* Step 3: Information Sent */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">{t.stepSent}</div>
                    <div className="text-[11px] text-emerald-700">Transferred</div>
                  </div>
                </div>

                {/* Step 4: Doctor Review (Pending - NOT automatically completed) */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/80 border border-amber-300">
                  <div className="w-7 h-7 rounded-full border-2 border-amber-500 bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Clock size={15} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-950">{t.stepReview}</div>
                    <div className="text-[11px] text-amber-700 font-medium">{t.stepReviewSub}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowSummaryModal(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#b9cfc7] bg-white text-[#173e35] hover:bg-[#f2f8f6] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Eye size={16} />
                <span>{t.btnViewSummary}</span>
              </button>

              <button
                type="button"
                onClick={handleDone}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#173e35] text-[#fff8ea] hover:bg-[#204d43] font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
              >
                <span>{t.btnDone}</span>
                <ArrowRight size={17} />
              </button>
            </div>

            {/* Kiosk Auto-Return Timer Banner */}
            <div className="border-t border-[#e6efed] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5c776f]">
              <div className="flex items-center gap-2">
                <RotateCcw size={14} className="text-[#c98e20]" />
                <span>
                  {t.autoReturnMessage}{' '}
                  <strong className="text-[#173e35] font-mono font-bold text-sm bg-amber-100/70 px-1.5 py-0.5 rounded">
                    {countdown} {t.secondsSuffix}
                  </strong>
                </span>
                <button
                  onClick={() => setIsTimerPaused((prev) => !prev)}
                  className="ml-2 underline text-[#1f5b4e] hover:text-[#173e35] cursor-pointer"
                >
                  {isTimerPaused ? t.resumeTimer : t.pauseTimer}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>{t.kioskSafetyNote}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submitted Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-stone-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2 text-[#173e35] font-bold font-serif text-lg">
                <FileText size={20} className="text-[#c98e20]" />
                <span>{t.summaryModalTitle}</span>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-[#173e35]">
              <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#e4edea]">
                <div className="text-xs font-mono uppercase text-[#5a776e] font-semibold mb-1">
                  {t.chiefConcernLabel}
                </div>
                <div className="font-semibold text-base">
                  {submission.chiefConcern || 'Persistent dry cough and fever'}
                </div>
              </div>

              <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#e4edea]">
                <div className="text-xs font-mono uppercase text-[#5a776e] font-semibold mb-1">
                  {t.durationLabel}
                </div>
                <div>{submission.duration || '2 weeks (started gradually)'}</div>
              </div>

              <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#e4edea]">
                <div className="text-xs font-mono uppercase text-[#5a776e] font-semibold mb-2">
                  {t.symptomsLabel}
                </div>
                <ul className="space-y-1.5 text-xs text-[#2b4c42]">
                  {(submission.symptoms && submission.symptoms.length > 0
                    ? submission.symptoms
                    : ['Not provided']
                  ).map((sym, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-600" />
                      <span>{sym}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#e4edea]">
                <div className="text-xs font-mono uppercase text-[#5a776e] font-semibold mb-1 flex items-center gap-1.5">
                  <Paperclip size={13} />
                  <span>{t.docsLabel}</span>
                </div>
                <div className="text-xs text-[#3d5e54]">
                  {submission.documentCount > 0 && submission.documentName
                    ? `✓ ${submission.documentName} (Uploaded for physician review)`
                    : 'No prior documents uploaded.'}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#173e35] text-white font-semibold text-xs hover:bg-[#204d43] transition-colors"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
