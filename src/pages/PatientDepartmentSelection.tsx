import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Ambulance,
  Stethoscope,
  Bone,
  Eye,
  Baby,
  HeartHandshake,
  Sparkles,
  Flower2,
  Building2,
  Bot,
  ArrowRight,
  ArrowLeft,
  Check,
  UserCheck,
} from 'lucide-react';
import { AppButton } from '../components/Brand';
import { getKioskTranslation } from '../lib/kioskTranslations';
import {
  getStoredLanguage,
  getStoredDepartment,
  setStoredDepartment,
} from '../lib/kioskState';
import {
  KioskProgressSidebar,
  KioskTopProgressBar,
} from '../components/patient/KioskProgress';
import { PatientFlowTransition } from '../components/patient/PatientFlowTransition';

interface DepartmentItem {
  id: string;
  code: string;
  name_en: string;
  name_hi: string;
  ayush_name: string;
  priority: number;
  icon: string;
  active_doctors_count?: number;
}

const FALLBACK_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'dept_emergency',
    code: 'DEPT_EMERGENCY',
    name_en: 'Emergency & Trauma',
    name_hi: 'आपातकालीन एवं ट्रॉमा',
    ayush_name: 'Aatyayika Chikitsa',
    priority: 1,
    icon: 'Ambulance',
    active_doctors_count: 3,
  },
  {
    id: 'dept_gen_med',
    code: 'DEPT_GEN_MED',
    name_en: 'General Medicine',
    name_hi: 'सामान्य चिकित्सा',
    ayush_name: 'Kayachikitsa',
    priority: 3,
    icon: 'Stethoscope',
    active_doctors_count: 5,
  },
  {
    id: 'dept_ortho_shalya',
    code: 'DEPT_ORTHO_SHALYA',
    name_en: 'Orthopedics & Joint Care',
    name_hi: 'हड्डी एवं जोड़ रोग',
    ayush_name: 'Shalya Tantra',
    priority: 3,
    icon: 'Bone',
    active_doctors_count: 2,
  },
  {
    id: 'dept_ent_eye',
    code: 'DEPT_ENT_EYE',
    name_en: 'Eye & ENT',
    name_hi: 'नेत्र, कान, नाक व गला',
    ayush_name: 'Shalakya Tantra',
    priority: 3,
    icon: 'Eye',
    active_doctors_count: 2,
  },
  {
    id: 'dept_peds',
    code: 'DEPT_PEDS',
    name_en: 'Child Health & Pediatrics',
    name_hi: 'शिशु एवं बाल रोग',
    ayush_name: 'Kaumarbhritya',
    priority: 3,
    icon: 'Baby',
    active_doctors_count: 2,
  },
  {
    id: 'dept_gynec',
    code: 'DEPT_GYNEC',
    name_en: "Women's Health & Maternity",
    name_hi: 'महिला स्वास्थ्य एवं प्रसूति',
    ayush_name: 'Prasuti Tantra & Stri Roga',
    priority: 3,
    icon: 'HeartHandshake',
    active_doctors_count: 2,
  },
  {
    id: 'dept_derm',
    code: 'DEPT_DERM',
    name_en: 'Skin & Dermatology',
    name_hi: 'त्वचा एवं चर्म रोग',
    ayush_name: 'Twak Roga',
    priority: 4,
    icon: 'Sparkles',
    active_doctors_count: 1,
  },
  {
    id: 'dept_panchakarma',
    code: 'DEPT_PANCHAKARMA',
    name_en: 'Panchakarma & Detox',
    name_hi: 'पंचकर्म एवं विषहरण',
    ayush_name: 'Panchakarma',
    priority: 4,
    icon: 'Flower2',
    active_doctors_count: 2,
  },
];

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Ambulance,
  Stethoscope,
  Bone,
  Eye,
  Baby,
  HeartHandshake,
  Sparkles,
  Flower2,
  Building2,
};

export function PatientDepartmentSelection() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState(getStoredLanguage);
  const [selectedCode, setSelectedCode] = useState<string>(getStoredDepartment() || 'AUTO');
  const [departments, setDepartments] = useState<DepartmentItem[]>(FALLBACK_DEPARTMENTS);
  const [, setLoading] = useState(false);

  useEffect(() => {
    const lang = getStoredLanguage();
    if (lang) setLanguage(lang);

    const savedDept = getStoredDepartment();
    if (savedDept) setSelectedCode(savedDept);

    // Fetch dynamic live department list from backend
    let isMounted = true;
    setLoading(true);
    fetch('/api/v1/departments/public')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch departments');
        return res.json();
      })
      .then((data: DepartmentItem[]) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setDepartments(data);
        }
      })
      .catch((err) => {
        console.warn('Using fallback department metadata:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const t = getKioskTranslation(language || 'English');
  const isHindi = language === 'हिन्दी' || language?.toLowerCase() === 'hindi';

  const handleSelect = (code: string) => {
    setSelectedCode(code);
    setStoredDepartment(code);
  };

  const handleContinue = () => {
    setStoredDepartment(selectedCode);
    setLocation('/patient/mode');
  };

  return (
    <main className="kiosk-page">
      <div className="kiosk-layout">
        <KioskProgressSidebar currentStep={2} t={t} />

        {/* Right Main Panel */}
        <section className="kiosk-main">
          <div className="kiosk-main-inner max-w-5xl">
            <KioskTopProgressBar currentStep={2} t={t} />

            <PatientFlowTransition stepKey="department">
              <div className="kiosk-card department-selection-card">
                <div className="kiosk-card-heading">
                  <span className="section-kicker">
                    <Building2 size={14} className="inline mr-1.5 align-middle" />
                    {isHindi ? 'चरण 2B · ओपीडी विभाग चयन' : 'STEP 02B OF 05 · OPD DEPARTMENT TRIAGE'}
                  </span>
                  <h2>{isHindi ? 'उपयुक्त विभाग चुनें' : 'Select Hospital Department'}</h2>
                  <p className="text-base text-[#688680] mt-1">
                    {isHindi
                      ? 'अपनी समस्या के अनुसार विभाग चुनें, या AI को आपकी बातचीत के आधार पर स्वतः निर्णय लेने दें।'
                      : 'Choose the OPD department best suited for your concern, or let our Clinical AI route you automatically.'}
                  </p>
                </div>

                {/* Top Banner: Auto Triage Assistant Card */}
                <div className="my-5">
                  <button
                    type="button"
                    id="dept-option-auto"
                    onClick={() => handleSelect('AUTO')}
                    className={`w-full p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer ${
                      selectedCode === 'AUTO'
                        ? 'border-[#006A4E] bg-[#E8F5E9] shadow-md ring-2 ring-[#006A4E]/30'
                        : 'border-[#173e35]/20 bg-gradient-to-r from-[#F4F9F6] to-[#EBF3EF] hover:border-[#006A4E]/60 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div
                        className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 ${
                          selectedCode === 'AUTO'
                            ? 'bg-[#006A4E] text-white shadow-sm'
                            : 'bg-white text-[#006A4E] border border-[#d6e5df]'
                        }`}
                      >
                        <Bot size={28} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-bold text-[#173e35]">
                            Not Sure? Auto Triage Assistant
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#006A4E]/10 text-[#006A4E] border border-[#006A4E]/20">
                            Recommended / अनुशंसित
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[#2d6a5e] mt-0.5">
                          मुझे नहीं पता (स्वतः विभाग चयन)
                        </p>
                        <p className="text-xs sm:text-sm text-[#5c726a] mt-1 max-w-2xl">
                          {isHindi
                            ? 'यदि आप सुनिश्चित नहीं हैं, तो चिंता न करें। नैदानिक AI आपके लक्षणों का विश्लेषण कर आपको सही चिकित्सक के पास निर्देशित करेगा।'
                            : 'Unsure which OPD to select? SwasthyaVaani Clinical AI will dynamically analyze your symptoms and route you to the correct specialist.'}
                        </p>
                      </div>
                    </div>

                    <div className="self-end sm:self-center shrink-0">
                      <span
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedCode === 'AUTO'
                            ? 'border-[#006A4E] bg-[#006A4E]'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {selectedCode === 'AUTO' && <Check size={16} className="text-white stroke-[3]" />}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Section Sub-heading */}
                <div className="flex items-center justify-between mb-3 pt-2 border-t border-[#edf3f1]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5c726a]">
                    {isHindi ? 'या विशिष्ट विभाग चुनें:' : 'Or Select a Specific Department:'}
                  </span>
                  <span className="text-xs text-[#829b93]">
                    {departments.length} {isHindi ? 'सक्रिय ओपीडी उपलब्ध' : 'Active OPDs available'}
                  </span>
                </div>

                {/* Grid of Department Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {departments.map((dept) => {
                    const isSelected = selectedCode === dept.code;
                    const isEmergency = dept.code === 'DEPT_EMERGENCY' || dept.priority === 1;
                    const IconComponent = ICON_MAP[dept.icon] || Building2;

                    return (
                      <button
                        key={dept.code}
                        type="button"
                        id={`dept-option-${dept.code.toLowerCase()}`}
                        onClick={() => handleSelect(dept.code)}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[160px] ${
                          isSelected
                            ? isEmergency
                              ? 'border-rose-600 bg-rose-50/80 shadow-md ring-2 ring-rose-500/40'
                              : 'border-[#eaba61] bg-[#fffdfa] shadow-md ring-2 ring-[#eaba61]/40'
                            : isEmergency
                            ? 'border-rose-200 bg-rose-50/40 hover:border-rose-400 hover:shadow-sm'
                            : 'border-[#e0ebe8] bg-white hover:border-[#173e35]/30 hover:shadow-sm'
                        }`}
                      >
                        {/* Header: Icon + Radio */}
                        <div className="flex items-start justify-between w-full mb-2">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? isEmergency
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-[#173e35] text-[#eaba61]'
                                : isEmergency
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-[#eef5f3] text-[#173e35]'
                            }`}
                          >
                            <IconComponent size={22} />
                          </div>

                          <span
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? isEmergency
                                  ? 'border-rose-600 bg-rose-600'
                                  : 'border-[#c98e20] bg-[#eaba61]'
                                : 'border-stone-300 bg-stone-50'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-white stroke-[3]" />}
                          </span>
                        </div>

                        {/* Department Names */}
                        <div className="my-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-base font-bold text-[#173e35] leading-tight">
                              {dept.name_en}
                            </h4>
                            {isEmergency && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white tracking-wide uppercase">
                                Red Flag
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#48635c] mt-0.5">
                            {dept.name_hi}
                          </p>
                        </div>

                        {/* AYUSH Equivalent & Doctor Count Badges */}
                        <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-1 flex-wrap text-[11px]">
                          <span
                            className="px-2 py-0.5 rounded-md font-medium bg-[#f0f4f1] text-[#1e4d42] border border-[#d6e2dd] truncate max-w-[170px]"
                            title={dept.ayush_name}
                          >
                            🌿 {dept.ayush_name}
                          </span>

                          {dept.active_doctors_count !== undefined && dept.active_doctors_count > 0 && (
                            <span className="text-[11px] font-medium text-[#688680] flex items-center gap-1 shrink-0">
                              <UserCheck size={12} className="text-emerald-600" />
                              {dept.active_doctors_count} on duty
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Navigation Actions */}
                <div className="kiosk-form-actions mt-auto pt-4 border-t border-[#edf3f1] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setLocation('/patient/details')}
                    className="kiosk-back-btn"
                  >
                    <ArrowLeft size={16} />
                    <span>{isHindi ? 'पीछे जाएं' : 'Back'}</span>
                  </button>

                  <AppButton
                    variant="amber"
                    onClick={handleContinue}
                    className="kiosk-submit-btn"
                  >
                    <span>{isHindi ? 'आगे बढ़ें (मोड चयन)' : 'Continue to Mode'}</span>
                    <ArrowRight size={17} />
                  </AppButton>
                </div>
              </div>
            </PatientFlowTransition>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PatientDepartmentSelection;
