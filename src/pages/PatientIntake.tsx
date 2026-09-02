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
  getStoredLanguage,
  getStoredMode,
  setStoredMode,
} from '../lib/kioskState';
import {
  buildClinicalSummary,
} from '../lib/conversationStore';
import {
  clearStoredDocumentUpload,
  getStoredDocumentUpload,
  storeDocumentUpload,
} from '../lib/documentUploadState';
import { patientApi } from '../services/patientApi';

export function PatientIntake() {
  const [, setLocation] = useLocation();
  // Flow:
  // 0: Story (Voice/Text Chat)
  // 1: Records Upload
  // 2: Final Submission (Default directly after Records)
  // 3: Review Summary (Opened ONLY when clicking "Review Summary" on Final Submission)
  const [subStep, setSubStep] = useState<number>(0);
  const [language, setLanguage] = useState(getStoredLanguage);
  const [mode, setMode] = useState<'voice' | 'text'>(getStoredMode);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('Ananya Sharma');
  const [patientAge, setPatientAge] = useState('34');
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewingStory, setIsReviewingStory] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLanguage(getStoredLanguage());
    setMode(getStoredMode());
    patientApi.getProfile().then((p) => {
      if (p.name) setPatientName(p.name);
      if (p.age) setPatientAge(p.age);
    });

    const activeIntakeId = localStorage.getItem('swasthya_active_intake_id');
    const savedDocument = getStoredDocumentUpload(activeIntakeId);
    setUploadedDocName(savedDocument?.file_name ?? null);
    setUploaded(Boolean(savedDocument));
  }, [subStep]);

  const t = getKioskTranslation(language || 'English');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file || isUploading) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const intakeSessionId = localStorage.getItem('swasthya_active_intake_id');
      let patientId = localStorage.getItem('swasthya_active_patient_id');

      if (!patientId && intakeSessionId) {
        const intakeResponse = await fetch(`/api/v1/intakes/${intakeSessionId}`);
        if (intakeResponse.ok) {
          const intake = await intakeResponse.json();
          if (typeof intake.patient_id === 'string' && intake.patient_id) {
            const resolvedPatientId: string = intake.patient_id;
            patientId = resolvedPatientId;
            localStorage.setItem('swasthya_active_patient_id', resolvedPatientId);
          }
        }
      }

      if (!patientId) {
        throw new Error('Start an intake session before uploading a document.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', patientId);
      if (intakeSessionId) formData.append('intake_session_id', intakeSessionId);
      formData.append('document_type', 'PRESCRIPTION');

      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.status !== 202) {
        let message = `Document upload failed with status ${response.status}.`;
        try {
          const body = await response.json();
          const detail = body?.detail;
          if (typeof detail?.message === 'string') message = detail.message;
          else if (typeof detail === 'string') message = detail;
        } catch {
          // Preserve the status-based message when the response is not JSON.
        }
        throw new Error(message);
      }

      const uploadedDocument = await response.json();
      if (!uploadedDocument.document_id || !uploadedDocument.file_name) {
        throw new Error('The upload response did not include document metadata.');
      }

      storeDocumentUpload({
        document_id: uploadedDocument.document_id,
        file_name: uploadedDocument.file_name,
        status: uploadedDocument.status,
        intake_session_id: intakeSessionId,
      });
      localStorage.removeItem('swasthya_uploaded_doc_name');
      setUploadedDocName(uploadedDocument.file_name);
      setUploaded(true);
    } catch (error: unknown) {
      setUploaded(false);
      setUploadedDocName(null);
      setUploadError(
        error instanceof Error ? error.message : 'Unable to upload this document.',
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
    clearStoredDocumentUpload();
  };

  const handleBack = () => {
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

  return (
    <main className="kiosk-page">
      <div className="kiosk-layout">
        {/* Left Progress Sidebar */}
        <aside className="kiosk-progress">
          <div className="kiosk-brand">
            <button
              className="brand-button"
              onClick={() => setLocation('/')}
              aria-label="SwasthyaVaani home"
            >
              <Brand light />
            </button>
          </div>
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
            <div className="kiosk-step done">
              <span className="step-icon">
                <Check size={20} />
              </span>
              <span>
                <b>{t.steps.language.title}</b>
                <small>{t.steps.language.caption}</small>
              </span>
            </div>
            <div className="kiosk-step done">
              <span className="step-icon">
                <Check size={20} />
              </span>
              <span>
                <b>Your Details</b>
                <small>Personal info</small>
              </span>
            </div>
            <div className={`kiosk-step ${subStep === 0 ? 'current' : 'done'}`}>
              <span className="step-icon">
                {subStep > 0 ? <Check size={20} /> : <Mic size={20} />}
              </span>
              <span>
                <b>{t.steps.story.title}</b>
                <small>{t.steps.story.caption}</small>
              </span>
            </div>
            <div
              className={`kiosk-step ${
                subStep === 1 ? 'current' : subStep > 1 ? 'done' : ''
              }`}
            >
              <span className="step-icon">
                {subStep > 1 ? <Check size={20} /> : <FileText size={20} />}
              </span>
              <span>
                <b>{t.steps.records.title}</b>
                <small>{t.steps.records.caption}</small>
              </span>
            </div>
            <div className={`kiosk-step ${subStep >= 2 ? 'current' : ''}`}>
              <span className="step-icon">
                <CheckCircle2 size={20} />
              </span>
              <span>
                <b>{t.steps.ready.title}</b>
                <small>{t.steps.ready.caption}</small>
              </span>
            </div>
          </div>
          <div className="kiosk-help">
            <CircleHelp size={18} />
            <span>{t.needHelp}</span>
          </div>
        </aside>

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

              <div className="kiosk-progress-top" style={{ margin: 0 }}>
                <span>
                  {subStep === 0
                    ? 'STEP 03 OF 04 · CONVERSATION'
                    : subStep === 1
                    ? 'STEP 04 OF 04 · RECORDS'
                    : subStep === 3
                    ? 'REVIEW SUMMARY'
                    : 'STEP 04 OF 04 · FINAL SUBMISSION'}
                </span>
                <div>
                  <i className="filled" />
                  <i className="filled" />
                  <i className={subStep >= 0 ? 'filled' : ''} />
                  <i className={subStep >= 1 ? 'filled' : ''} />
                </div>
                <span className="time-note">
                  <Clock3 size={14} /> {t.durationNote}
                </span>
              </div>
            </div>

            {/* Substep 0: Story (Voice/Text Chat) */}
            {subStep === 0 &&
              (mode === 'text' ? (
                <PatientTextChat
                  language={language}
                  patientName={patientName}
                  patientAge={patientAge}
                  onComplete={() => {
                    if (isReviewingStory) {
                      setIsReviewingStory(false);
                      setSubStep(2);
                    } else {
                      setSubStep(1);
                    }
                  }}
                  onSwitchToVoice={() => {
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
                    if (isReviewingStory) {
                      setIsReviewingStory(false);
                      setSubStep(2);
                    } else {
                      setSubStep(1);
                    }
                  }}
                  onSwitchToText={() => {
                    setMode('text');
                    setStoredMode('text');
                  }}
                />
              ))}

            {/* Substep 1: Medical Records Upload */}
            {subStep === 1 && (
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
                      onClick={() => setSubStep(2)}
                    >
                      {uploaded ? t.btnContinueWithoutMore : t.btnSkip}
                    </button>
                    <AppButton
                      variant="amber"
                      onClick={() => setSubStep(2)}
                      className="kiosk-submit-btn"
                    >
                      {uploaded ? t.btnContinue : t.btnContinueWithoutReport} <ArrowRight size={17} />
                    </AppButton>
                  </div>
                </div>
              </div>
            )}

            {/* Substep 2: Final Submission Page (Opens directly after Records) */}
            {subStep === 2 && (
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
                    onClick={() => setSubStep(3)}
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

                      const activeId = localStorage.getItem('swasthya_active_intake_id');
                      if (!activeId) {
                        setSubmissionError('Your intake session could not be found. Please retry the patient intake flow.');
                        return;
                      }

                      setSubmissionError(null);
                      setIsSubmitting(true);
                      try {
                        const res = await fetch(`/api/v1/intakes/${activeId}/submit`, {
                          method: 'POST',
                        });
                        if (!res.ok) {
                          throw new Error(`Submission failed with status ${res.status}`);
                        }

                        const data = await res.json();
                        if (data.intake_session_id !== activeId) {
                          throw new Error('Submission response did not match the active intake session');
                        }

                        const backendToken = typeof data.token === 'string' ? data.token : '';
                        if (backendToken) {
                          localStorage.setItem('swasthya_active_token', backendToken);
                        }

                        const submissionData = {
                          patientName,
                          patientAge,
                          language,
                          department: 'General Medicine',
                          token: backendToken,
                          documentCount: uploaded ? 1 : 0,
                          documentName: uploaded ? uploadedDocName : null,
                          submittedAt: new Date().toISOString(),
                          intakeId: data.intake_session_id,
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
                        setSubmissionError('We could not submit your intake. Please check your connection and try again.');
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
            )}

            {/* Substep 3: Review Summary View (Opened ONLY when clicking "Review Summary") */}
            {subStep === 3 && (
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
                    onClick={() => setSubStep(2)}
                    className="kiosk-submit-btn"
                  >
                    Back to Final Review <ArrowRight size={17} />
                  </AppButton>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default PatientIntake;
