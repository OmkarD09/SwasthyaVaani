import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  ShieldCheck,
  Languages,
  X,
  CircleHelp,
  Paperclip,
  Upload,
  Camera,
  Check,
  ArrowRight,
  Sparkles,
  FileText,
  Ban,
  UserRound,
} from 'lucide-react';
import { getTranslation, type LanguageCode } from '../i18n';
import { intakeApi, type IntakeQuestion, type IntakeSession } from '../services/intakeApi';
import { patientApi } from '../services/patientApi';
import { LanguageSelector } from '../components/patient/LanguageSelector';
import { ProgressIndicator } from '../components/patient/ProgressIndicator';
import { QuestionCard } from '../components/patient/QuestionCard';

export function Consultation() {
  const [, setLocation] = useLocation();
  const [stage, setStage] = useState<'language' | 'profile' | 'questions' | 'records'>('language');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [patientData, setPatientData] = useState<PatientProfileData>({
    name: 'Patient Name',
    age: '21',
    gender: 'Not specified',
    abhaNumber: '',
    phone: '',
    preferredLanguage: 'en',
  });
  const [profileErrors, setProfileErrors] = useState<{ name?: string; age?: string }>({});
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hasRecords, setHasRecords] = useState(false);
  const [uploadedRecordName, setUploadedRecordName] = useState<string | undefined>();
  const [uploadedRecordSize, setUploadedRecordSize] = useState<string | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load initial profile language and session if available
    Promise.all([patientApi.getProfile(), intakeApi.getQuestions(), intakeApi.getSession()]).then(
      ([profile, qList, session]) => {
        setQuestions(qList);
        if (profile) {
          setPatientData(profile);
          if (profile.preferredLanguage) {
            setLanguage(profile.preferredLanguage);
          }
        }
        if (session) {
          setLanguage(session.language);
          setAnswers(session.answers);
          setHasRecords(session.hasRecords);
          setUploadedRecordName(session.uploadedRecordName);
        }
      }
    );
  }, []);

  const saveCurrentProgress = async (
    updatedAnswers: Record<string, string>,
    recStatus: boolean,
    recName?: string
  ) => {
    const session: IntakeSession = {
      language,
      answers: updatedAnswers,
      hasRecords: recStatus,
      uploadedRecordName: recName,
    };
    await intakeApi.saveSession(session);
  };

  const handleLanguageSelect = (lang: LanguageCode) => {
    setLanguage(lang);
    setPatientData((prev) => ({ ...prev, preferredLanguage: lang }));
    patientApi.updateProfile({ ...patientData, preferredLanguage: lang });
  };

  const proceedToProfile = () => {
    setStage('profile');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; age?: string } = {};
    if (!patientData.name.trim()) {
      errors.name = getTranslation(language, 'requiredField');
    }
    if (!patientData.age.trim()) {
      errors.age = getTranslation(language, 'requiredField');
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    await patientApi.updateProfile({ ...patientData, preferredLanguage: language });
    setStage('questions');
    setCurrentQuestionIndex(0);
  };

  const handleQuestionAnswer = async (answerText: string) => {
    const activeQuestion = questions[currentQuestionIndex];
    const updatedAnswers = { ...answers, [activeQuestion.id]: answerText };
    setAnswers(updatedAnswers);
    await saveCurrentProgress(updatedAnswers, hasRecords, uploadedRecordName);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Finished all questions -> go to records
      setStage('records');
    }
  };

  const handleQuestionBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      setStage('profile');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;
      setHasRecords(true);
      setUploadedRecordName(file.name);
      setUploadedRecordSize(sizeStr);
      await saveCurrentProgress(answers, true, file.name);
    }
  };

  const handleRemoveFile = async () => {
    setHasRecords(false);
    setUploadedRecordName(undefined);
    setUploadedRecordSize(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    await saveCurrentProgress(answers, false, undefined);
  };

  const handleProceedWithoutRecords = async () => {
    await handleRemoveFile();
    await saveCurrentProgress(answers, false, undefined);
    setLocation('/patient/review');
  };

  const handleFinishToReview = async () => {
    await saveCurrentProgress(answers, hasRecords, uploadedRecordName);
    setLocation('/patient/review');
  };

  const totalSteps = questions.length + 3; // Language (1) + Details (1) + Questions (N) + Records (1)
  const currentOverallStep =
    stage === 'language'
      ? 1
      : stage === 'profile'
      ? 2
      : stage === 'questions'
      ? currentQuestionIndex + 3
      : totalSteps;

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <main className="kiosk-page min-h-screen flex flex-col justify-between">
      {/* Hidden file inputs for real device upload & camera capture */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf,image/png,image/jpeg,image/jpg"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Top Bar */}
      <header className="kiosk-topbar">
        <button className="brand-button flex items-center gap-2" onClick={() => setLocation('/')}>
          <span className="brand-mark">
            <Sparkles size={18} strokeWidth={2.5} />
          </span>
          <span className="font-serif font-bold text-lg text-emerald-950">
            Swasthya<span className="text-amber-600">Vaani</span>
          </span>
        </button>

        <div className="kiosk-right flex items-center gap-3">
          <span className="kiosk-secure flex items-center gap-1 text-xs font-mono">
            <ShieldCheck size={15} /> {getTranslation(language, 'privateAndSecure')}
          </span>

          {/* Quick Language Dropdown/Mini Switcher */}
          <LanguageSelector
            currentLanguage={language}
            onSelectLanguage={handleLanguageSelect}
            variant="compact"
          />

          <button
            className="kiosk-close p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors"
            onClick={() => setLocation('/')}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Kiosk Layout */}
      <div className="kiosk-layout flex-1">
        {/* Left Side Progress Sidebar */}
        <aside className="kiosk-progress flex flex-col justify-between">
          <div>
            <div className="kiosk-welcome mb-8">
              <span className="eyebrow uppercase text-xs font-mono tracking-wider text-amber-400">
                PATIENT INTAKE
              </span>
              <h1 className="text-2xl md:text-3xl font-serif text-emerald-50 mt-2">
                Your care<br />
                <em>starts here.</em>
              </h1>
              <p className="text-xs md:text-sm text-emerald-100/70 mt-2">
                Answer simple questions one at a time to prepare your consultation summary.
              </p>
            </div>

            {/* Step list indicator */}
            <div className="step-list space-y-4">
              <div
                className={`kiosk-step flex items-center gap-3 ${
                  stage === 'language' ? 'current' : 'done'
                }`}
              >
                <span className="step-icon w-8 h-8 rounded-full flex items-center justify-center border text-sm font-semibold">
                  <Languages size={15} />
                </span>
                <div>
                  <b className="block text-sm leading-tight">{getTranslation(language, 'stepLanguage')}</b>
                  <small className="text-xs opacity-70">Choose language</small>
                </div>
              </div>

              <div
                className={`kiosk-step flex items-center gap-3 ${
                  stage === 'profile' ? 'current' : stage === 'questions' || stage === 'records' ? 'done' : ''
                }`}
              >
                <span className="step-icon w-8 h-8 rounded-full flex items-center justify-center border text-sm font-semibold">
                  <UserRound size={15} />
                </span>
                <div>
                  <b className="block text-sm leading-tight">{getTranslation(language, 'stepDetails')}</b>
                  <small className="text-xs opacity-70">Name, Age & ABHA</small>
                </div>
              </div>

              <div
                className={`kiosk-step flex items-center gap-3 ${
                  stage === 'questions' ? 'current' : stage === 'records' ? 'done' : ''
                }`}
              >
                <span className="step-icon w-8 h-8 rounded-full flex items-center justify-center border text-sm font-semibold">
                  <FileText size={15} />
                </span>
                <div>
                  <b className="block text-sm leading-tight">{getTranslation(language, 'stepStory')}</b>
                  <small className="text-xs opacity-70">
                    {stage === 'questions'
                      ? `Question ${currentQuestionIndex + 1} of ${questions.length}`
                      : 'Clinical context'}
                  </small>
                </div>
              </div>

              <div
                className={`kiosk-step flex items-center gap-3 ${
                  stage === 'records' ? 'current' : ''
                }`}
              >
                <span className="step-icon w-8 h-8 rounded-full flex items-center justify-center border text-sm font-semibold">
                  <Paperclip size={15} />
                </span>
                <div>
                  <b className="block text-sm leading-tight">{getTranslation(language, 'stepRecords')}</b>
                  <small className="text-xs opacity-70">Prescriptions & reports</small>
                </div>
              </div>
            </div>
          </div>

          <div className="kiosk-help flex items-center gap-2 text-xs font-mono text-emerald-200/80 pt-6">
            <CircleHelp size={16} />
            <span>{getTranslation(language, 'needHelp')}</span>
          </div>
        </aside>

        {/* Right Side Interaction Area */}
        <section className="kiosk-main flex items-center justify-center p-4 md:p-10">
          <div className="kiosk-main-inner w-full max-w-2xl space-y-6">
            {/* Top progress indicators */}
            <ProgressIndicator
              currentStep={currentOverallStep}
              totalSteps={totalSteps}
              language={language}
              stepLabel={`STEP ${String(currentOverallStep).padStart(2, '0')} OF ${String(
                totalSteps
              ).padStart(2, '0')}`}
            />

            {/* 1. Language Stage */}
            {stage === 'language' && (
              <div className="kiosk-card language-card p-6 md:p-8 rounded-2xl shadow-lg border border-emerald-900/10 space-y-6 animate-fadeIn">
                <div className="kiosk-card-icon w-12 h-12 rounded-xl bg-amber-400/20 text-emerald-900 flex items-center justify-center">
                  <Languages size={24} />
                </div>
                <div className="kiosk-card-heading">
                  <span className="section-kicker text-xs font-mono uppercase text-emerald-800">
                    {getTranslation(language, 'chooseLanguageSubtitle')}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-semibold text-emerald-950 mt-1">
                    {getTranslation(language, 'chooseLanguageTitle')}
                  </h2>
                </div>

                <LanguageSelector
                  currentLanguage={language}
                  onSelectLanguage={handleLanguageSelect}
                />

                <div className="pt-4 border-t border-emerald-900/10 flex justify-end">
                  <button
                    type="button"
                    onClick={proceedToProfile}
                    className="app-button primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <span>{getTranslation(language, 'continue')}</span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            )}

            {/* 2. Patient Profile Information Stage (Name, Age, Gender, ABHA Number) */}
            {stage === 'profile' && (
              <div className="kiosk-card profile-card p-6 md:p-8 rounded-2xl shadow-lg border border-emerald-900/10 space-y-6 animate-fadeIn">
                <div className="kiosk-card-icon w-12 h-12 rounded-xl bg-amber-400/20 text-emerald-900 flex items-center justify-center">
                  <UserRound size={24} />
                </div>
                <div className="kiosk-card-heading">
                  <span className="section-kicker text-xs font-mono uppercase text-emerald-800">
                    {getTranslation(language, 'stepDetails')}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-semibold text-emerald-950 mt-1">
                    {getTranslation(language, 'patientRegistrationTitle')}
                  </h2>
                  <p className="text-sm text-stone-600 mt-1">
                    {getTranslation(language, 'patientRegistrationSubtitle')}
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label htmlFor="patient-name" className="block text-xs font-mono font-semibold uppercase text-stone-700 mb-1">
                      {getTranslation(language, 'nameLabel')} *
                    </label>
                    <input
                      id="patient-name"
                      type="text"
                      value={patientData.name}
                      onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar / Patient Name"
                      className={`w-full p-3.5 rounded-xl border bg-white dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-50 text-base focus:outline-none focus:ring-2 ${
                        profileErrors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-emerald-900/20 focus:border-amber-500'
                      }`}
                    />
                    {profileErrors.name && (
                      <span className="text-xs text-red-600 mt-1 block">{profileErrors.name}</span>
                    )}
                  </div>

                  {/* Age and Gender Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="patient-age" className="block text-xs font-mono font-semibold uppercase text-stone-700 mb-1">
                        {getTranslation(language, 'ageLabel')} *
                      </label>
                      <input
                        id="patient-age"
                        type="number"
                        min="1"
                        max="120"
                        value={patientData.age}
                        onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                        placeholder="e.g. 21"
                        className={`w-full p-3.5 rounded-xl border bg-white dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-50 text-base focus:outline-none focus:ring-2 ${
                          profileErrors.age ? 'border-red-500 ring-1 ring-red-500' : 'border-emerald-900/20 focus:border-amber-500'
                        }`}
                      />
                      {profileErrors.age && (
                        <span className="text-xs text-red-600 mt-1 block">{profileErrors.age}</span>
                      )}
                    </div>

                    <div>
                      <label htmlFor="patient-gender" className="block text-xs font-mono font-semibold uppercase text-stone-700 mb-1">
                        {getTranslation(language, 'genderLabel')}
                      </label>
                      <select
                        id="patient-gender"
                        value={patientData.gender}
                        onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })}
                        className="w-full p-3.5 rounded-xl border border-emerald-900/20 bg-white dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-50 text-base focus:outline-none focus:ring-2 focus:border-amber-500"
                      >
                        <option value="Not specified">Not specified / इतर</option>
                        <option value="Male">Male / पुरुष</option>
                        <option value="Female">Female / महिला</option>
                        <option value="Other">Other / अन्य</option>
                      </select>
                    </div>
                  </div>

                  {/* ABHA Card Number */}
                  <div>
                    <label htmlFor="patient-abha" className="block text-xs font-mono font-semibold uppercase text-stone-700 mb-1">
                      {getTranslation(language, 'abhaNumberLabel')}
                    </label>
                    <input
                      id="patient-abha"
                      type="text"
                      value={patientData.abhaNumber || ''}
                      onChange={(e) => setPatientData({ ...patientData, abhaNumber: e.target.value })}
                      placeholder="e.g. 91-4521-8890-1234 (ABDM)"
                      className="w-full p-3.5 rounded-xl border border-emerald-900/20 bg-white dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-50 text-base focus:outline-none focus:ring-2 focus:border-amber-500 font-mono"
                    />
                  </div>

                  {/* Action Bar */}
                  <div className="pt-4 border-t border-emerald-900/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStage('language')}
                      className="text-sm font-medium text-stone-600 hover:text-stone-900"
                    >
                      {getTranslation(language, 'previousQuestion')}
                    </button>

                    <button
                      type="submit"
                      className="app-button primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <span>{getTranslation(language, 'createProfileAndContinue')}</span>
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. Questions Stage (One Question at a Time) */}
            {stage === 'questions' && currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={questions.length}
                initialAnswer={answers[currentQuestion.id] || ''}
                language={language}
                onNext={handleQuestionAnswer}
                onBack={handleQuestionBack}
                isLastQuestion={currentQuestionIndex === questions.length - 1}
              />
            )}

            {/* 4. Records Stage */}
            {stage === 'records' && (
              <div className="kiosk-card records-card p-6 md:p-8 rounded-2xl shadow-lg border border-emerald-900/10 space-y-6 animate-fadeIn">
                <div className="kiosk-card-icon amber-icon w-12 h-12 rounded-xl bg-amber-400/20 text-amber-800 flex items-center justify-center">
                  <Paperclip size={24} />
                </div>
                <div className="kiosk-card-heading">
                  <span className="section-kicker text-xs font-mono uppercase text-emerald-800">
                    {getTranslation(language, 'recordsOptional')}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-semibold text-emerald-950 mt-1">
                    {getTranslation(language, 'recordsTitle')}
                  </h2>
                  <p className="text-sm text-stone-600 mt-1">
                    {getTranslation(language, 'recordsSubtitle')}
                  </p>
                </div>

                {hasRecords ? (
                  <div className="uploaded-file flex items-center justify-between p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <span className="file-check w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
                        <Check size={16} />
                      </span>
                      <div>
                        <b className="block text-sm text-emerald-950">
                          {uploadedRecordName || 'Prescription_Document.pdf'}
                        </b>
                        <small className="text-xs text-stone-500">
                          Ready for review {uploadedRecordSize ? `· ${uploadedRecordSize}` : ''}
                        </small>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 rounded-md hover:bg-red-100 text-stone-600 hover:text-red-700 transition-colors"
                      aria-label="Remove record"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="upload-options grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-5 rounded-xl border border-dashed border-emerald-900/30 hover:border-amber-500 bg-white/70 hover:bg-amber-50/50 text-left transition-all group"
                    >
                      <span className="w-10 h-10 rounded-lg bg-emerald-900/10 group-hover:bg-amber-400/30 text-emerald-900 flex items-center justify-center mb-3 transition-colors">
                        <Upload size={20} />
                      </span>
                      <b className="block text-sm text-emerald-950">
                        {getTranslation(language, 'uploadFromDevice')}
                      </b>
                      <small className="text-xs text-stone-500">
                        {getTranslation(language, 'uploadFormats')}
                      </small>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-5 rounded-xl border border-dashed border-emerald-900/30 hover:border-amber-500 bg-white/70 hover:bg-amber-50/50 text-left transition-all group"
                    >
                      <span className="w-10 h-10 rounded-lg bg-emerald-900/10 group-hover:bg-amber-400/30 text-emerald-900 flex items-center justify-center mb-3 transition-colors">
                        <Camera size={20} />
                      </span>
                      <b className="block text-sm text-emerald-950">
                        {getTranslation(language, 'takePhoto')}
                      </b>
                      <small className="text-xs text-stone-500">Scan using camera</small>
                    </button>
                  </div>
                )}

                {/* Option to explicitly proceed without a prescription */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleProceedWithoutRecords}
                    className="w-full py-3 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100/70 hover:bg-stone-200/80 text-stone-700 dark:text-stone-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Ban size={15} />
                    <span>{getTranslation(language, 'noPrescriptionButton')}</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-emerald-900/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStage('questions');
                      setCurrentQuestionIndex(questions.length - 1);
                    }}
                    className="text-sm font-medium text-stone-600 hover:text-stone-900"
                  >
                    {getTranslation(language, 'previousQuestion')}
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishToReview}
                    className="app-button primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <span>
                      {hasRecords
                        ? getTranslation(language, 'continueWithReport')
                        : getTranslation(language, 'continueWithoutReport')}
                    </span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
