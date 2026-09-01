import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Sparkles,
  Stethoscope,
  Clock3,
  FileText,
  ArrowRight,
  ArrowLeft,
  CircleHelp,
  CheckCircle2,
  AlertCircle,
  Pill,
  RotateCcw,
  Check,
  UserRound,
  ShieldCheck,
  Paperclip,
  Activity,
} from 'lucide-react';
import { Brand, AppButton } from '../components/Brand';
import { getKioskTranslation } from '../lib/kioskTranslations';
import { getStoredLanguage } from '../lib/kioskState';
import { buildClinicalSummary } from '../lib/conversationStore';
import { patientApi } from '../services/patientApi';

export function PatientReviewSummary() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState(getStoredLanguage);
  const [patientName, setPatientName] = useState('Ananya Sharma');
  const [patientAge, setPatientAge] = useState('34');
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);

  useEffect(() => {
    const l = getStoredLanguage();
    if (l) setLanguage(l);

    patientApi.getProfile().then((p) => {
      if (p.name) setPatientName(p.name);
      if (p.age) setPatientAge(p.age);
    });

    try {
      const savedDoc = localStorage.getItem('swasthya_uploaded_doc_name');
      if (savedDoc) setUploadedDocName(savedDoc);
    } catch (e) {
      console.warn('Load review summary error:', e);
    }
  }, []);

  const t = getKioskTranslation(language || 'English');

  // Build unified summary from both text and voice conversation data
  const summary = buildClinicalSummary();

  const modeBadgeText =
    summary.interactionModes.includes('voice') && summary.interactionModes.includes('text')
      ? 'Captured via Voice & Text AI Intake'
      : summary.interactionModes.includes('voice')
      ? 'Captured via Voice AI Intake'
      : 'Captured via Text AI Intake';

  const handleEditAnswers = () => {
    // Navigate back to conversation with answers preserved
    setLocation('/patient/intake');
  };

  const handleContinueToFinal = () => {
    // Navigate to final submission
    setLocation('/patient/intake');
  };

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
            <div className="kiosk-step done">
              <span className="step-icon">
                <Check size={20} />
              </span>
              <span>
                <b>{t.steps.story.title}</b>
                <small>{t.steps.story.caption}</small>
              </span>
            </div>
            <div className="kiosk-step current">
              <span className="step-icon">
                <FileText size={20} />
              </span>
              <span>
                <b>Review Summary</b>
                <small>Verify AI intake</small>
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
            <div className="flex items-center justify-between mb-4 gap-4">
              <button
                type="button"
                onClick={handleContinueToFinal}
                className="kiosk-back-btn"
                aria-label="Back to final review"
              >
                <ArrowLeft size={16} />
                <span>Back to Final Review</span>
              </button>

              <div className="kiosk-progress-top" style={{ margin: 0 }}>
                <span>REVIEW SUMMARY</span>
                <div>
                  <i className="filled" />
                  <i className="filled" />
                  <i className="filled" />
                  <i className="filled" />
                </div>
                <span className="time-note">
                  <Clock3 size={14} /> 1 min review
                </span>
              </div>
            </div>

            {/* Review Summary Card */}
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

              {/* Summary Sections */}
              <div className="review-sections-grid">
                {/* Patient Information Box */}
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

                {/* Main Health Concern / Symptoms */}
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

                {/* Duration & Severity */}
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

                {/* Daily Impact (if available) */}
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

                {/* Uploaded Documents */}
                <div className="review-section-box">
                  <div className="review-section-header">
                    <span className="review-section-title">
                      <Paperclip size={14} /> Attached Medical Records
                    </span>
                    <span className="text-xs text-[#5c726a]">
                      {uploadedDocName ? '1 document attached' : 'None added'}
                    </span>
                  </div>
                  <div className="review-section-content text-xs text-[#4a635b]">
                    {uploadedDocName ? (
                      <span className="font-semibold text-[#173e35]">
                        📄 {uploadedDocName}
                      </span>
                    ) : (
                      'No previous prescription or reports attached.'
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="kiosk-form-actions">
                <button
                  type="button"
                  onClick={handleEditAnswers}
                  className="kiosk-back-btn"
                >
                  <RotateCcw size={15} />
                  <span>Edit answers</span>
                </button>

                <AppButton
                  variant="amber"
                  onClick={handleContinueToFinal}
                  className="kiosk-submit-btn"
                >
                  Back to Final Review <ArrowRight size={17} />
                </AppButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PatientReviewSummary;
