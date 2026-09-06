import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  Mic,
  FileText,
  Clock3,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  CircleHelp,
  Paperclip,
  Upload,
  Camera,
  X,
  UserRound,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Stethoscope,
  Pill,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { Brand, AppButton } from '../components/Brand';
import { PatientTextChat } from '../components/PatientTextChat';
import { PatientVoiceChat } from '../components/PatientVoiceChat';
import { getKioskTranslation } from '../lib/kioskTranslations';
import {
  KioskProgressSidebar,
  KioskTopProgressBar,
  type PatientFlowStep,
} from '../components/patient/KioskProgress';
import { PatientFlowTransition } from '../components/patient/PatientFlowTransition';
import {
  getStoredLanguage,
  getStoredMode,
  setStoredMode,
} from '../lib/kioskState';
import {
  buildClinicalSummary,
  getUnifiedConversation,
} from '../lib/conversationStore';
import {
  clearStoredDocumentUpload,
  getStoredDocumentUpload,
  storeDocumentUpload,
} from '../lib/documentUploadState';
import { getStoredPatientProfile } from '../services/patientApi';

function getStoredPatientIdentity(): { name: string; age: string } {
  try {
    const storedProfile = localStorage.getItem('sv_patient_profile');
    if (storedProfile) {
      const profile = JSON.parse(storedProfile);
      return {
        name: typeof profile.name === 'string' ? profile.name.trim() : '',
        age: typeof profile.age === 'string' ? profile.age.trim() : '',
      };
    }
  } catch {
    // Invalid or unavailable profile storage is handled by the identity guard below.
  }
  return { name: '', age: '' };
}

export function PatientIntake() {
  const [, setLocation] = useLocation();
  // Flow:
  // 0: Story (Voice/Text Chat)
  // 1: Records Upload
  // 2: Final Submission (Default directly after Records)
  // 3: Review Summary (Opened ONLY when clicking "Review Summary" on Final Submission)
  const [subStep, setSubStep] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [language, setLanguage] = useState(getStoredLanguage);
  const [mode, setMode] = useState<'voice' | 'text'>(getStoredMode);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [{ name: patientName, age: patientAge }] = useState(getStoredPatientIdentity);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewingStory, setIsReviewingStory] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLanguage(getStoredLanguage());
    setMode(getStoredMode());
    const activeIntakeId = localStorage.getItem('swasthya_active_intake_id');
    const savedDocument = getStoredDocumentUpload(activeIntakeId);
    setUploadedDocName(savedDocument?.file_name ?? null);
    setUploaded(Boolean(savedDocument));
  }, [subStep]);

  const t = getKioskTranslation(language || 'English');
  const parsedPatientAge = Number.parseInt(patientAge, 10);
  const hasValidPatientIdentity =
    patientName.length > 0 && Number.isInteger(parsedPatientAge) && parsedPatientAge > 0;

  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file || isUploading) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds the 10MB limit.');
      }
      setSelectedDocumentFile(file);
      setUploadedDocName(file.name);
      setUploaded(true);
      storeDocumentUpload({
        document_id: `pending-${Date.now()}`,
        file_name: file.name,
        status: 'PENDING',
        intake_session_id: null,
      });
    } catch (error: unknown) {
      setUploaded(false);
      setUploadedDocName(null);
      setUploadError(
        error instanceof Error ? error.message : 'Unable to select this document.',
      );
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  const handleFileRemove = () => {
    setUploaded(false);
    setUploadedDocName(null);
    setUploadError(null);
    setSelectedDocumentFile(null);
    clearStoredDocumentUpload();
    localStorage.removeItem('swasthya_uploaded_doc_name');
  };

  const handleBack = () => {
    setDirection(-1);
    if (isReviewingStory) {
      setIsReviewingStory(false);
      setSubStep(2);
      return;
    }
    if (subStep === 3) {
      // Return from Review Summary directly to Final Submission
      setSubStep(2);
      return;
    }
    if (subStep === 0) {
      setLocation('/patient/mode');
    } else {
      setSubStep((prev) => prev - 1);
    }
  };

  // Build unified summary from both text and voice conversation data
  const summary = buildClinicalSummary();

  const modeBadgeText =
    summary.interactionModes.includes('voice') && summary.interactionModes.includes('text')
      ? 'Captured via Voice & Text AI Intake'
      : summary.interactionModes.includes('voice')
      ? 'Captured via Voice AI Intake'
      : 'Captured via Text AI Intake';

  const currentFlowStep: PatientFlowStep = subStep === 0 ? 3 : subStep === 1 ? 4 : 5;
  const stepSuffix =
    subStep === 0
      ? 'CONVERSATION'
      : subStep === 1
      ? 'RECORDS'
      : subStep === 3
      ? 'REVIEW SUMMARY'
      : 'FINAL SUBMISSION';

  return (
    <main className="kiosk-page">
      <div className="kiosk-layout">
        <KioskProgressSidebar currentStep={currentFlowStep} t={t} />

        {/* Right Main Content */}
        <section className="kiosk-main">
          <div className="kiosk-main-inner">
            {/* Top Navigation & Progress Bar */}
            <div className="flex items-center justify-between mb-4 gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="kiosk-back-btn"
                aria-label="Go to previous step"
              >
                <ArrowLeft size={16} />
                <span>
                  {isReviewingStory || subStep === 3
                    ? 'Back to Final Review'
                    : 'Back'}
                </span>
              </button>

              <KioskTopProgressBar
                currentStep={currentFlowStep}
                t={t}
                stepSuffix={stepSuffix}
                className="!m-0"
              />
            </div>

            {/* Substep 0: Story (Voice/Text Chat) */}
            {subStep === 0 && (
              <PatientFlowTransition stepKey={`story-${mode}`} direction={direction}>
                {!hasValidPatientIdentity ? (
                  <div className="kiosk-card" role="alert">
                    <div className="kiosk-consent-error">
                      <AlertCircle size={14} />
                      <span>Please provide your name and age before starting the patient intake.</span>
                    </div>
                    <div className="kiosk-form-actions">
                      <button type="button" onClick={handleBack} className="kiosk-back-btn">
                        <ArrowLeft size={16} />
                        <span>Return to patient details</span>
                      </button>
                    </div>
                  </div>
                ) : mode === 'text' ? (
                  <PatientTextChat
                    language={language}
                    patientName={patientName}
                    patientAge={patientAge}
                    onComplete={() => {
                      setDirection(1);
                      if (isReviewingStory) {
                        setIsReviewingStory(false);
                        setSubStep(2);
                      } else {
                        setSubStep(1);
                      }
                    }}
                    onSwitchToVoice={() => {
                      setDirection(1);
                      setMode('voice');
                      setStoredMode('voice');
                    }}
                  />
                ) : (
                  <PatientVoiceChat
                    language={language}
                    patientName={patientName}
                    patientAge={patientAge}
                    onComplete={() => {
                      setDirection(1);
                      if (isReviewingStory) {
                        setIsReviewingStory(false);
                        setSubStep(2);
                      } else {
                        setSubStep(1);
                      }
                    }}
                    onSwitchToText={() => {
                      setDirection(-1);
                      setMode('text');
                      setStoredMode('text');
                    }}
                  />
                )}
              </PatientFlowTransition>
            )}

            {/* Substep 1: Medical Records Upload */}
            {subStep === 1 && (
              <PatientFlowTransition stepKey="records" direction={direction}>
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
                        <b>{uploadedDocName}</b>
                        <small>{t.recordReadySub}</small>
                      </span>
                      <button onClick={handleFileRemove}>
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="upload-options">
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#b8cabe] bg-[#fbfaf4] p-5 text-center transition hover:border-[#1f5b4e]">
                        <Upload size={21} className="text-[#1f5b4e]" />
                        <b className="mt-2 text-sm text-[#173e35]">{t.uploadDeviceTitle}</b>
                        <small className="text-xs text-[#7b9086]">{t.uploadDeviceSub}</small>
                        <input
                          type="file"
                          accept="application/pdf,image/png,image/jpeg"
                          className="hidden"
                          disabled={isUploading}
                          onChange={handleFileUpload}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <span>
                          <Camera size={21} />
                        </span>
                        <b>{t.takePhotoTitle}</b>
                        <small>{t.takePhotoSub}</small>
                      </button>
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        capture="environment"
                        className="hidden"
                        disabled={isUploading}
                        onChange={handleFileUpload}
                      />
                    </div>
                  )}

                  {isUploading && (
                    <p className="mt-3 text-center text-sm text-[#1f5b4e]">
                      Uploading document securely...
                    </p>
                  )}
                  {uploadError && (
                    <p className="mt-3 text-center text-sm text-[#9f3f32]" role="alert">
                      {uploadError}
                    </p>
                  )}

                  <div className="kiosk-form-actions">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="kiosk-back-btn"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="kiosk-back-btn"
                        style={{ border: 'none', background: 'transparent' }}
                        onClick={() => {
                          setDirection(1);
                          setSubStep(2);
                        }}
                      >
                        {uploaded ? t.btnContinueWithoutMore : t.btnSkip}
                      </button>
                      <AppButton
                        variant="amber"
                        onClick={() => {
                          setDirection(1);
                          setSubStep(2);
                        }}
                        className="kiosk-submit-btn"
                      >
                        {uploaded ? t.btnContinue : t.btnContinueWithoutReport} <ArrowRight size={17} />
                      </AppButton>
                    </div>
                  </div>
                </div>
              </PatientFlowTransition>
            )}

            {/* Substep 2: Final Submission Page (Opens directly after Records) */}
            {subStep === 2 && (
              <PatientFlowTransition stepKey="ready" direction={direction}>
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
                      <b>
                        {patientName} ({patientAge} yrs)
                      </b>
                    </div>
                    <div>
                      <span>
                        <FileText size={15} /> {t.summaryRecords}
                      </span>
                      <b>{uploaded && uploadedDocName ? uploadedDocName : t.summaryNoneAdded}</b>
                    </div>
                  </div>

                  {/* Compact "Your Story" Status Section with "Review Summary" button */}
                  <div className="ready-story-status">
                    <div className="flex items-center gap-3">
                      <span className="story-status-icon">
                        <Mic size={16} />
                      </span>
                      <div>
                        <span className="story-status-title">Your Story</span>
                        <b className="story-status-badge">
                          <Check size={14} strokeWidth={2.5} /> Completed
                        </b>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDirection(1);
                        setSubStep(3);
                      }}
                      className="story-review-btn"
                      aria-label="Review Summary"
                    >
                      <span>Review Summary</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="privacy-callout">
                    <ShieldCheck size={17} />
                    <span>
                      <b>{t.privacyTitle}</b>
                      <small>{t.privacySub}</small>
                    </span>
                  </div>

                  {/* Patient Consent Checkbox Section */}
                  <div className={`kiosk-consent-box ${consentError ? 'has-error' : ''}`}>
                    <label className="kiosk-consent-label">
                      <input
                        type="checkbox"
                        checked={consentGiven}
                        onChange={(e) => {
                          setConsentGiven(e.target.checked);
                          if (e.target.checked) setConsentError(false);
                        }}
                        className="kiosk-consent-checkbox"
                      />
                      <span className="kiosk-consent-text">
                        I confirm that the information provided is accurate to the best of my knowledge and consent to share it with the healthcare provider for clinical review.
                      </span>
                    </label>
                    {consentError && (
                      <div className="kiosk-consent-error">
                        <AlertCircle size={14} />
                        <span>Please check the confirmation box above to proceed with submission.</span>
                      </div>
                    )}
                    {submissionError && (
                      <div className="kiosk-consent-error" role="alert">
                        <AlertCircle size={14} />
                        <span>{submissionError}</span>
                      </div>
                    )}
                  </div>

                  <div className="kiosk-form-actions">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="kiosk-back-btn"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>
                    <AppButton
                      variant="amber"
                      onClick={async () => {
                        if (isSubmitting) return;

                        if (!consentGiven) {
                          setConsentError(true);
                          return;
                        }

                        setSubmissionError(null);
                        setIsSubmitting(true);
                        try {
                          const profile = getStoredPatientProfile();
                          const isDefaultDemoAbha = profile?.abhaNumber === '91-4521-8890-1234' && !profile?.isAbhaFromQr;
                          const abhaIdToSend = isDefaultDemoAbha ? null : (profile?.abhaNumber || null);
                          const abhaAddressToSend = isDefaultDemoAbha ? null : (profile?.abhaAddress || null);
                          const phoneToSend = profile?.phone === '9876543210' && !profile?.isAbhaFromQr ? null : (profile?.phone || null);
                          const langCode = language === 'हिन्दी' ? 'hi' : language === 'मराठी' ? 'mr' : 'en';

                          // Create intake session in DB only now
                          const conversationTurns = getUnifiedConversation().map((m) => ({
                            role: m.role,
                            content: m.content,
                            mode: m.mode,
                            category: m.category,
                          }));

                          const createRes = await fetch('/api/v1/intakes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              patient_name: profile?.name || patientName || 'Patient',
                              patient_age: (profile?.age ? parseInt(profile.age, 10) : null) ?? (parseInt(patientAge, 10) || null),
                              patient_gender: profile?.gender || 'Female',
                              phone: phoneToSend,
                              date_of_birth: profile?.dateOfBirth || null,
                              abha_id: abhaIdToSend,
                              abha_address: abhaAddressToSend,
                              language_code: langCode,
                              workflow_type: 'GENERAL_CLINICAL',
                              interaction_mode: mode.toUpperCase(),
                              consent_given: true,
                              chief_complaint: summary.chiefConcern,
                              symptoms: summary.symptoms.length > 0 ? summary.symptoms : [summary.chiefConcern],
                              duration: summary.duration,
                              severity: summary.severity,
                              medical_history: summary.medicalHistory,
                              conversation_history: conversationTurns,
                              submit_now: true,
                            }),
                          });

                          if (!createRes.ok) {
                            let detail = '';
                            try {
                              const errData = await createRes.json();
                              detail = typeof errData?.detail === 'string' ? errData.detail : JSON.stringify(errData?.detail || errData);
                            } catch {
                              // ignore
                            }
                            throw new Error(detail ? `Intake creation failed: ${detail}` : `Failed to create intake session (${createRes.status})`);
                          }

                          const createdData = await createRes.json();
                          const activeId = createdData.id;
                          const patientId = createdData.patient_id;
                          const backendToken = typeof createdData.token === 'string' ? createdData.token : '';

                          localStorage.setItem('swasthya_active_intake_id', activeId);
                          if (patientId) {
                            localStorage.setItem('swasthya_active_patient_id', patientId);
                          }
                          if (backendToken) {
                            localStorage.setItem('swasthya_active_token', backendToken);
                          }

                          // If a document was attached on the Records page, upload it in background without blocking UI transition
                          if (selectedDocumentFile && patientId) {
                            const formData = new FormData();
                            formData.append('file', selectedDocumentFile);
                            formData.append('patient_id', patientId);
                            formData.append('intake_session_id', activeId);
                            formData.append('document_type', 'PRESCRIPTION');
                            formData.append('auto_process', 'false');

                            fetch('/api/v1/documents/upload', {
                              method: 'POST',
                              body: formData,
                            })
                              .then(async (docRes) => {
                                if (docRes.ok) {
                                  const docData = await docRes.json();
                                  storeDocumentUpload({
                                    document_id: docData.document_id,
                                    file_name: docData.file_name,
                                    status: docData.status,
                                    intake_session_id: activeId,
                                  });
                                }
                              })
                              .catch((docErr) => {
                                console.warn('Document upload notice:', docErr);
                              });
                          }

                          const submissionData = {
                            patientName: profile?.name || patientName,
                            patientAge: profile?.age || patientAge,
                            language,
                            department: 'General Medicine',
                            token: backendToken,
                            documentCount: uploaded ? 1 : 0,
                            documentName: uploaded ? uploadedDocName : null,
                            submittedAt: new Date().toISOString(),
                            intakeId: activeId,
                            chiefConcern: summary.chiefConcern,
                            duration: summary.duration || 'Not provided',
                            symptoms: summary.symptoms.length > 0 ? summary.symptoms : [summary.chiefConcern],
                            medicalHistory: summary.medicalHistory || 'Not provided',
                            interactionModes: summary.interactionModes,
                          };
                          localStorage.setItem(
                            'swasthya_last_submission',
                            JSON.stringify(submissionData)
                          );
                          setLocation('/patient/complete');
                        } catch (err) {
                          console.error('Failed to submit intake:', err);
                          const errorMsg = err instanceof Error ? err.message : 'We could not submit your intake. Please check your connection and try again.';
                          setSubmissionError(errorMsg);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="kiosk-submit-btn"
                    >
                      {isSubmitting ? 'Submitting...' : t.btnFinishNotify} <ArrowRight size={17} />
                    </AppButton>
                  </div>
                </div>
              </PatientFlowTransition>
            )}

            {/* Substep 3: Review Summary View (Opened ONLY when clicking "Review Summary") */}
            {subStep === 3 && (
              <PatientFlowTransition stepKey="review-summary" direction={direction}>
                <div className="kiosk-card review-summary-card">
                  <div className="kiosk-card-heading" style={{ marginTop: 0 }}>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <span className="review-badge-ai">
                        <Sparkles size={13} /> AI-Generated Clinical Summary
                      </span>
                      <span className="text-xs font-semibold text-[#1f5b4e] bg-[#eef7f4] px-2.5 py-1 rounded-full border border-[#cbe4dc]">
                        {modeBadgeText}
                      </span>
                    </div>
                    <h2>Review Your Summary</h2>
                    <p>
                      This is an AI-generated summary of what you shared through {summary.interactionModes.join(' and ')} interaction. Please review before proceeding to final submission.
                    </p>
                  </div>

                  <div className="review-sections-grid">
                    {/* Patient Info */}
                    <div className="review-section-box">
                      <div className="review-section-header">
                        <span className="review-section-title">
                          <UserRound size={14} /> Patient Profile
                        </span>
                        <span className="text-xs text-[#5c726a]">Verified</span>
                      </div>
                      <div className="review-section-content font-bold text-[#173e35]">
                        {patientName}, {patientAge} years old
                      </div>
                    </div>

                    {/* Main Symptoms / Chief Concern */}
                    <div className="review-section-box">
                      <div className="review-section-header">
                        <span className="review-section-title">
                          <Stethoscope size={14} /> Main Symptoms & Health Concerns
                        </span>
                        <span className="text-xs text-[#1f5b4e] font-semibold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Recorded
                        </span>
                      </div>
                      <div className="review-section-content font-semibold text-[#173e35]">
                        {summary.chiefConcern}
                      </div>
                      {summary.associatedSymptoms && (
                        <div className="mt-2 pt-2 border-t border-[#e8ece7] text-xs text-[#4a635b]">
                          <b>Associated factors:</b> {summary.associatedSymptoms}
                        </div>
                      )}
                      {summary.radiation && (
                        <div className="mt-1 text-xs text-[#4a635b]">
                          <b>Location & Radiation:</b> {summary.radiation}
                        </div>
                      )}
                    </div>

                    {/* Timeline & Severity */}
                    <div className="review-section-box">
                      <div className="review-section-header">
                        <span className="review-section-title">
                          <Clock3 size={14} /> Duration & Severity
                        </span>
                      </div>
                      <div className="review-chips-list">
                        <span className="review-chip">
                          <b>Onset:</b> {summary.duration || 'Not provided'}
                        </span>
                        <span className="review-chip">
                          <b>Severity:</b> {summary.severity || 'Not provided'}
                        </span>
                      </div>
                    </div>

                    {/* Medications & Medical History */}
                    <div className="review-section-box">
                      <div className="review-section-header">
                        <span className="review-section-title">
                          <Pill size={14} /> Medications & Medical History
                        </span>
                      </div>
                      <div className="review-section-content text-xs">
                        {summary.medicalHistory || 'Not provided'}
                      </div>
                    </div>

                    {/* Daily Impact / Additional context (if available) */}
                    {summary.dailyImpact && (
                      <div className="review-section-box">
                        <div className="review-section-header">
                          <span className="review-section-title">
                            <Activity size={14} /> Daily Impact
                          </span>
                        </div>
                        <div className="review-section-content text-xs">
                          {summary.dailyImpact}
                        </div>
                      </div>
                    )}

                    {/* Attached Records */}
                    <div className="review-section-box">
                      <div className="review-section-header">
                        <span className="review-section-title">
                          <Paperclip size={14} /> Attached Medical Records
                        </span>
                        <span className="text-xs text-[#5c726a]">
                          {uploaded ? '1 document attached' : 'None added'}
                        </span>
                      </div>
                      <div className="review-section-content text-xs text-[#4a635b]">
                        {uploaded ? (
                          <span className="font-semibold text-[#173e35]">
                            📄 {uploadedDocName}
                          </span>
                        ) : (
                          'No previous prescriptions or diagnostic reports attached.'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="kiosk-form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setDirection(-1);
                        setIsReviewingStory(true);
                        setSubStep(0);
                      }}
                      className="kiosk-back-btn"
                    >
                      <RotateCcw size={15} />
                      <span>Edit answers</span>
                    </button>

                    <AppButton
                      variant="amber"
                      onClick={() => {
                        setDirection(-1);
                        setSubStep(2);
                      }}
                      className="kiosk-submit-btn"
                    >
                      Back to Final Review <ArrowRight size={17} />
                    </AppButton>
                  </div>
                </div>
              </PatientFlowTransition>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default PatientIntake;
