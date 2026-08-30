import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  UserRound,
  Calendar,
  Languages as LangIcon,
  FileText,
  Home,
} from 'lucide-react';
import { getTranslation, type LanguageCode } from '../i18n';
import { intakeApi, type IntakeSession, type IntakeQuestion } from '../services/intakeApi';
import { patientApi, type PatientProfileData } from '../services/patientApi';
import { PatientReviewCard } from '../components/patient/PatientReviewCard';

export function PatientReview() {
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([intakeApi.getSession(), intakeApi.getQuestions(), patientApi.getProfile()]).then(
      ([sess, qList, prof]) => {
        setSession(sess);
        setQuestions(qList);
        setProfile(prof);
      }
    );
  }, []);

  const language: LanguageCode = session?.language || profile?.preferredLanguage || 'en';

  const handleUpdateAnswer = async (questionId: string, newAnswer: string) => {
    if (!session) return;
    const updatedAnswers = { ...session.answers, [questionId]: newAnswer };
    const updatedSession = { ...session, answers: updatedAnswers };
    setSession(updatedSession);
    await intakeApi.saveSession(updatedSession);
  };

  const handleConfirm = async () => {
    if (session) {
      await intakeApi.saveSession({
        ...session,
        completedAt: new Date().toISOString(),
      });
    }
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-[var(--sv-paper)] text-[var(--sv-ink)] p-4 md:p-8 flex flex-col justify-between">
        <header className="w-full max-w-2xl mx-auto flex items-center justify-between pb-6 border-b border-emerald-900/10">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-400/30 text-emerald-900 flex items-center justify-center font-bold">
              <Sparkles size={18} />
            </span>
            <span className="font-serif font-bold text-xl tracking-tight">
              Swasthya<span className="text-amber-600">Vaani</span>
            </span>
          </div>
        </header>

        <div className="w-full max-w-lg mx-auto my-auto py-8">
          <div className="kiosk-card p-6 md:p-10 rounded-2xl shadow-xl border border-emerald-900/10 bg-[var(--sv-card)] text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800">
                {getTranslation(language, 'brandName')}
              </span>
              <h1 className="text-2xl md:text-3xl font-serif font-semibold text-emerald-950">
                {getTranslation(language, 'submissionSuccessTitle')}
              </h1>
              <p className="text-stone-600 text-sm md:text-base">
                {getTranslation(language, 'submissionSuccessSubtitle')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-900/5 border border-emerald-900/10 text-left space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-emerald-900/5">
                <span className="text-stone-500 font-mono text-xs">Patient</span>
                <span className="font-semibold text-emerald-950">{profile?.name || 'Patient Name'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-emerald-900/5">
                <span className="text-stone-500 font-mono text-xs">Language</span>
                <span className="font-semibold uppercase text-emerald-950 font-mono">{language}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500 font-mono text-xs">Records Attached</span>
                <span className="font-semibold text-emerald-950">
                  {session?.hasRecords ? session.uploadedRecordName || '1 document' : 'None'}
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => setLocation('/patient')}
                className="app-button outline px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Home size={16} />
                <span>{getTranslation(language, 'returnHome')}</span>
              </button>
            </div>
          </div>
        </div>

        <footer className="w-full max-w-2xl mx-auto pt-6 text-center text-xs text-stone-500 font-mono">
          <div className="flex items-center justify-center gap-1.5 text-emerald-900/80">
            <ShieldCheck size={15} />
            <span>{getTranslation(language, 'privateAndSecure')}</span>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--sv-paper)] text-[var(--sv-ink)] p-4 md:p-8 flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full max-w-3xl mx-auto flex items-center justify-between pb-6 border-b border-emerald-900/10">
        <button
          type="button"
          onClick={() => setLocation('/patient/consultation')}
          className="flex items-center gap-1.5 text-sm font-medium text-emerald-900 hover:text-emerald-950 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{getTranslation(language, 'editAnswers')}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-400/30 text-emerald-900 flex items-center justify-center font-bold">
            <Sparkles size={16} />
          </span>
          <span className="font-serif font-bold text-lg text-emerald-950">
            Swasthya<span className="text-amber-600">Vaani</span>
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-mono text-emerald-900/80">
          <ShieldCheck size={15} />
          <span className="hidden sm:inline">{getTranslation(language, 'privateAndSecure')}</span>
        </div>
      </header>

      {/* Main Review Container */}
      <main className="w-full max-w-3xl mx-auto my-6 space-y-6">
        <div className="text-center space-y-2">
          <span className="section-kicker text-xs font-mono uppercase text-emerald-800">
            {getTranslation(language, 'stepReview')}
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-emerald-950">
            {getTranslation(language, 'reviewTitle')}
          </h1>
          <p className="text-sm md:text-base text-stone-600 max-w-xl mx-auto">
            {getTranslation(language, 'reviewSubtitle')}
          </p>
        </div>

        {/* Patient Demographics Summary Chip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-white/60 dark:bg-emerald-950/20 border border-emerald-900/10 text-xs">
          <div className="flex items-center gap-2">
            <UserRound size={16} className="text-emerald-800 shrink-0" />
            <div>
              <span className="text-stone-500 block font-mono">Patient</span>
              <strong className="text-emerald-950">{profile?.name || 'Patient Name'}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-emerald-800 shrink-0" />
            <div>
              <span className="text-stone-500 block font-mono">Age</span>
              <strong className="text-emerald-950">{profile?.age || '21'}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangIcon size={16} className="text-emerald-800 shrink-0" />
            <div>
              <span className="text-stone-500 block font-mono">Language</span>
              <strong className="text-emerald-950 uppercase font-mono">{language}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-800 shrink-0" />
            <div>
              <span className="text-stone-500 block font-mono">ABHA Number</span>
              <strong className="text-emerald-950 font-mono">
                {profile?.abhaNumber || 'Not provided'}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-800 shrink-0" />
            <div>
              <span className="text-stone-500 block font-mono">Records</span>
              <strong className="text-emerald-950">
                {session?.hasRecords ? session.uploadedRecordName || '1 Attached' : 'None'}
              </strong>
            </div>
          </div>
        </div>

        {/* Questions and Answers Review List */}
        <div className="space-y-4">
          {questions.map((q) => {
            const promptText = q.prompt[language] || q.prompt.en;
            const answerText = session?.answers[q.id] || '';

            return (
              <PatientReviewCard
                key={q.id}
                title={promptText}
                answer={answerText}
                category={q.category}
                language={language}
                onUpdateAnswer={(newAns) => handleUpdateAnswer(q.id, newAns)}
              />
            );
          })}
        </div>

        {/* Submission Action Bar */}
        <div className="pt-6 border-t border-emerald-900/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setLocation('/patient/consultation')}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-emerald-900/20 text-emerald-950 text-sm font-medium hover:bg-emerald-900/5 transition-colors"
          >
            {getTranslation(language, 'editAnswers')}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="app-button primary w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            <span>{getTranslation(language, 'confirmAndSubmit')}</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-3xl mx-auto pt-6 text-center text-xs text-stone-500 font-mono">
        <div className="flex items-center justify-center gap-1.5 text-emerald-900/80">
          <ShieldCheck size={15} />
          <span>{getTranslation(language, 'privateAndSecure')}</span>
        </div>
      </footer>
    </main>
  );
}
