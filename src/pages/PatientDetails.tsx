import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  UserRound,
  Mic,
  FileText,
  Clock3,
  Check,
  ArrowRight,
  ArrowLeft,
  CircleHelp,
  QrCode,
  AtSign,
} from 'lucide-react';
import { Brand, AppButton } from '../components/Brand';
import { AbhaVerificationModal } from '../components/AbhaVerificationModal';
import { type ParsedQrPatientData } from '../utils/parseAbhaQr';
import { getKioskTranslation } from '../lib/kioskTranslations';
import {
  getStoredLanguage,
} from '../lib/kioskState';
import { patientApi, type PatientProfileData } from '../services/patientApi';

export function PatientDetails() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState(getStoredLanguage);
  const [patientData, setPatientData] = useState<PatientProfileData>({
    name: 'Ananya Sharma',
    age: '34',
    gender: 'Female',
    abhaNumber: '91-4521-8890-1234',
    phone: '9876543210',
    preferredLanguage: 'en',
  });
  const [profileErrors, setProfileErrors] = useState<{ name?: string; age?: string }>({});
  const [savedNotice, setSavedNotice] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrNotice, setQrNotice] = useState(false);
  const [isAbhaFromQr, setIsAbhaFromQr] = useState(false);

  useEffect(() => {
    const l = getStoredLanguage() || localStorage.getItem('sv_selected_language');
    if (l) setLanguage(l);

    patientApi.getProfile().then((profile) => {
      if (profile) {
        setPatientData(profile);
      }
    });
  }, []);

  const t = getKioskTranslation(language || 'English');

  const handleApplyQrData = (data: ParsedQrPatientData) => {
    setPatientData((prev) => {
      const updated: PatientProfileData = { ...prev };
      if (data.fullName) updated.name = data.fullName;
      if (data.age !== undefined) updated.age = String(data.age);
      if (data.gender) updated.gender = data.gender;
      if (data.phone) updated.phone = data.phone;
      if (data.abhaId) {
        updated.abhaNumber = data.abhaId;
        updated.isAbhaFromQr = true;
      }
      if (data.abhaAddress) updated.abhaAddress = data.abhaAddress;
      if (data.dateOfBirth) updated.dateOfBirth = data.dateOfBirth;
      return updated;
    });

    if (data.abhaId) {
      setIsAbhaFromQr(true);
    }
    setQrNotice(true);
    setTimeout(() => {
      setQrNotice(false);
    }, 4000);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; age?: string } = {};

    if (!patientData.name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!patientData.age.trim()) {
      errors.age = 'Age is required';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    await patientApi.updateProfile({
      ...patientData,
      isAbhaFromQr: isAbhaFromQr || Boolean(patientData.isAbhaFromQr),
    });
    setSavedNotice(true);

    setTimeout(() => {
      setLocation('/patient/mode');
    }, 300);
  };

  return (
    <main className="kiosk-page">
      <div className="kiosk-layout">
        {/* Left Side Progress Sidebar */}
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
            {/* Step 1: Language (Completed) */}
            <div className="kiosk-step done">
              <span className="step-icon">
                <Check size={20} />
              </span>
              <span>
                <b>{t.steps.language.title}</b>
                <small>{t.steps.language.caption}</small>
              </span>
            </div>

            {/* Step 2: Patient Details (Current Step) */}
            <div className="kiosk-step current">
              <span className="step-icon">
                <UserRound size={20} />
              </span>
              <span>
                <b>Your Details</b>
                <small>Personal info</small>
              </span>
            </div>

            {/* Step 3: Interaction Mode (Upcoming) */}
            <div className="kiosk-step">
              <span className="step-icon">
                <Mic size={20} />
              </span>
              <span>
                <b>Your Story</b>
                <small>Voice or Text</small>
              </span>
            </div>

            {/* Step 4: Records (Upcoming) */}
            <div className="kiosk-step">
              <span className="step-icon">
                <FileText size={20} />
              </span>
              <span>
                <b>{t.steps.records.title}</b>
                <small>{t.steps.records.caption}</small>
              </span>
            </div>
          </div>

          <div className="kiosk-help">
            <CircleHelp size={18} />
            <span>{t.needHelp}</span>
          </div>
        </aside>

        {/* Right Main Panel */}
        <section className="kiosk-main">
          <div className="kiosk-main-inner">
            {/* Top Progress Indicator */}
            <div className="kiosk-progress-top">
              <span>
                {t.stepPrefix} 02 {t.stepOf} 04
              </span>
              <div>
                <i className="filled" />
                <i className="filled" />
                <i />
                <i />
              </div>
              <span className="time-note">
                <Clock3 size={14} /> {t.durationNote}
              </span>
            </div>

            {/* Patient Details Form Card */}
            <div className="kiosk-card profile-details-card">
              <div className="kiosk-card-heading">
                <span className="section-kicker">STEP 02 · PATIENT INFORMATION</span>
                <h2>Patient Details</h2>
                <p>Please enter or verify your details to prepare your pre-consultation record.</p>
              </div>

              {savedNotice && (
                <div className="kiosk-alert-success">
                  <Check size={16} />
                  <span>Details saved! Opening next step…</span>
                </div>
              )}

              {qrNotice && (
                <div className="kiosk-alert-success" style={{ marginBottom: '14px', marginTop: '0' }}>
                  <Check size={16} />
                  <span>Patient details imported from QR</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="kiosk-form">
                {/* Full Name */}
                <div className="kiosk-form-group">
                  <label className="kiosk-form-label">
                    Full Name <span style={{ color: '#d33c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`kiosk-form-input ${profileErrors.name ? 'has-error' : ''}`}
                    value={patientData.name}
                    onChange={(e) =>
                      setPatientData({ ...patientData, name: e.target.value })
                    }
                    placeholder="e.g. Ananya Sharma"
                  />
                  {profileErrors.name && (
                    <span className="kiosk-form-error">{profileErrors.name}</span>
                  )}
                </div>

                {/* Age & Gender in same row */}
                <div className="kiosk-form-row">
                  <div className="kiosk-form-group">
                    <label className="kiosk-form-label">
                      Age <span style={{ color: '#d33c3c' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      className={`kiosk-form-input ${profileErrors.age ? 'has-error' : ''}`}
                      value={patientData.age}
                      onChange={(e) =>
                        setPatientData({ ...patientData, age: e.target.value })
                      }
                      placeholder="e.g. 34"
                    />
                    {profileErrors.age && (
                      <span className="kiosk-form-error">{profileErrors.age}</span>
                    )}
                  </div>

                  <div className="kiosk-form-group">
                    <label className="kiosk-form-label">Gender</label>
                    <select
                      className="kiosk-form-select"
                      value={patientData.gender}
                      onChange={(e) =>
                        setPatientData({ ...patientData, gender: e.target.value })
                      }
                    >
                      <option value="Not specified">Not specified</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Phone & ABHA Number */}
                <div className="kiosk-form-row">
                  <div className="kiosk-form-group">
                    <label className="kiosk-form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="kiosk-form-input font-mono"
                      value={patientData.phone || ''}
                      onChange={(e) =>
                        setPatientData({ ...patientData, phone: e.target.value })
                      }
                      placeholder="e.g. 9876543210"
                    />
                  </div>

                  <div className="kiosk-form-group">
                    <div className="flex items-center justify-between">
                      <label className="kiosk-form-label" style={{ marginBottom: 0 }}>
                        ABHA Card / Number
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQrModalOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200/90 border border-emerald-300/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Scan ABHA / Health QR Code"
                      >
                        <QrCode size={13} />
                        <span>Scan QR</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      className="kiosk-form-input font-mono mt-1"
                      value={patientData.abhaNumber || ''}
                      onChange={(e) => {
                        setPatientData({ ...patientData, abhaNumber: e.target.value });
                        setIsAbhaFromQr(false);
                      }}
                      placeholder="e.g. 91-4521-8890-1234"
                    />
                    {isAbhaFromQr && patientData.abhaNumber && (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
                        <Check size={12} /> ABHA number detected from QR
                      </span>
                    )}
                    {patientData.abhaAddress && (
                      <span className="text-[11px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                        <AtSign size={12} /> {patientData.abhaAddress}
                      </span>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="kiosk-form-actions">
                  <button
                    type="button"
                    onClick={() => setLocation('/patient/language')}
                    className="kiosk-back-btn"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <AppButton
                    variant="amber"
                    type="submit"
                    className="kiosk-submit-btn"
                  >
                    {t.btnContinue} <ArrowRight size={17} />
                  </AppButton>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>

      <AbhaVerificationModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onApplyData={handleApplyQrData}
      />
    </main>
  );
}

export default PatientDetails;
