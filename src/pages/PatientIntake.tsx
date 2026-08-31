import { useState, useEffect } from 'react';
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
  Languages,
  ShieldCheck,
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
import { patientApi } from '../services/patientApi';

export function PatientIntake() {
  const [, setLocation] = useLocation();
  const [subStep, setSubStep] = useState<number>(0); // 0: Story (Voice/Text), 1: Records, 2: Ready
  const [language, setLanguage] = useState(getStoredLanguage);
  const [mode, setMode] = useState<'voice' | 'text'>(getStoredMode);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('Ananya Sharma');
  const [patientAge, setPatientAge] = useState('34');

  useEffect(() => {
    setLanguage(getStoredLanguage());
    setMode(getStoredMode());
    patientApi.getProfile().then((p) => {
      if (p.name) setPatientName(p.name);
      if (p.age) setPatientAge(p.age);
    });
  }, []);

  const t = getKioskTranslation(language || 'English');

  const handleFileUpload = (e?: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    const fileName = file ? file.name : 'Prescription_May2026.pdf';
    setUploadedDocName(fileName);
    setUploaded(true);
  };

  const handleBack = () => {
    if (subStep === 0) {
      setLocation('/patient/mode');
    } else {
      setSubStep((prev) => prev - 1);
    }
  };

  return (
    <main className="kiosk-page">
      <div className="kiosk-layout">
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
                <Check size={17} />
              </span>
              <span>
                <b>{t.steps.language.title}</b>
                <small>{t.steps.language.caption}</small>
              </span>
            </div>
            <div className="kiosk-step done">
              <span className="step-icon">
                <Check size={17} />
              </span>
              <span>
                <b>Patient Details</b>
                <small>Personal info</small>
              </span>
            </div>
            <div className={`kiosk-step ${subStep === 0 ? 'current' : 'done'}`}>
              <span className="step-icon">
                {subStep > 0 ? <Check size={17} /> : <Mic size={17} />}
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
                {subStep > 1 ? <Check size={17} /> : <FileText size={17} />}
              </span>
              <span>
                <b>{t.steps.records.title}</b>
                <small>{t.steps.records.caption}</small>
              </span>
            </div>
            <div className={`kiosk-step ${subStep === 2 ? 'current' : ''}`}>
              <span className="step-icon">
                <CheckCircle2 size={17} />
              </span>
              <span>
                <b>{t.steps.ready.title}</b>
                <small>{t.steps.ready.caption}</small>
              </span>
            </div>
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
                {t.stepPrefix} {String(subStep + 3).padStart(2, '0')} {t.stepOf} 04
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

            {subStep === 0 &&
              (mode === 'text' ? (
                <PatientTextChat
                  language={language}
                  patientName={patientName}
                  patientAge={patientAge}
                  onComplete={() => setSubStep(1)}
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
                  onComplete={() => setSubStep(1)}
                  onSwitchToText={() => {
                    setMode('text');
                    setStoredMode('text');
                  }}
                />
              ))}

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
                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button className="skip-link" onClick={() => setSubStep(2)}>
                    {uploaded ? t.btnContinueWithoutMore : t.btnSkip} <ArrowRight size={14} />
                  </button>
                </div>
                <AppButton onClick={() => setSubStep(2)} className="kiosk-next">
                  {uploaded ? t.btnContinue : t.btnContinueWithoutReport} <ArrowRight size={17} />
                </AppButton>
              </div>
            )}

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
                      <Languages size={15} /> {t.summaryLanguage}
                    </span>
                    <b>{language}</b>
                  </div>
                  <div>
                    <span>
                      <FileText size={15} /> {t.summaryRecords}
                    </span>
                    <b>{uploaded ? uploadedDocName || t.summaryOneAttached : t.summaryNoneAdded}</b>
                  </div>
                </div>
                <div className="privacy-callout">
                  <ShieldCheck size={17} />
                  <span>
                    <b>{t.privacyTitle}</b>
                    <small>{t.privacySub}</small>
                  </span>
                </div>
                <div className="pt-4 border-t border-[#e6efed] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <AppButton
                    onClick={async () => {
                      const activeId = localStorage.getItem('swasthya_active_intake_id');
                      let generatedToken = localStorage.getItem('swasthya_active_token') || '';
                      if (activeId) {
                        try {
                          const res = await fetch(`/api/v1/intakes/${activeId}/submit`, {
                            method: 'POST',
                          });
                          if (res.ok) {
                            const data = await res.json();
                            if (data.token) {
                              generatedToken = data.token;
                              localStorage.setItem('swasthya_active_token', data.token);
                            }
                          }
                        } catch (err) {
                          console.warn('Submit intake note:', err);
                        }
                      }
                      if (!generatedToken) {
                        generatedToken = 'A-' + Math.floor(100 + Math.random() * 900);
                        localStorage.setItem('swasthya_active_token', generatedToken);
                      }
                      const submissionData = {
                        patientName,
                        patientAge,
                        language,
                        department: 'General Medicine',
                        token: generatedToken,
                        documentCount: uploaded ? 1 : 0,
                        documentName:
                          uploadedDocName || (uploaded ? 'Prescription_May2026.pdf' : null),
                        submittedAt: new Date().toISOString(),
                        intakeId: activeId,
                        chiefConcern: 'Persistent cough and throat discomfort',
                        duration: '2 weeks',
                        symptoms: [
                          'Persistent cough',
                          'Mild throat irritation',
                          'No high fever',
                          'Worse during evening',
                        ],
                      };
                      localStorage.setItem(
                        'swasthya_last_submission',
                        JSON.stringify(submissionData)
                      );
                      setLocation('/patient/complete');
                    }}
                    className="kiosk-next"
                  >
                    {t.btnFinishNotify} <ArrowRight size={17} />
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
