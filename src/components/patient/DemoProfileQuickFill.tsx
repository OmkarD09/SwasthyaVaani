import React from 'react';
import { Sparkles } from 'lucide-react';
import type { PatientProfileData } from '../../services/patientApi';

interface DemoProfileQuickFillProps {
  onApplyDemo: (data: PatientProfileData) => void;
  isHindi?: boolean;
}

export const DEMO_PATIENT_PRESET: PatientProfileData = {
  name: 'Ananya Sharma',
  age: '34',
  gender: 'Female',
  abhaNumber: '91-4521-8890-1234',
  abhaAddress: 'ananya.sharma@abdm',
  phone: '9876543210',
  dateOfBirth: '1990-05-15',
  preferredLanguage: 'hi',
  isAbhaFromQr: false,
};

export function DemoProfileQuickFill({ onApplyDemo, isHindi = false }: DemoProfileQuickFillProps) {
  // Only display in development mode or when explicitly enabled via env/storage flag
  const isEnabled =
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_DEMO_PRESETS === 'true' ||
    (typeof window !== 'undefined' && localStorage.getItem('sv_enable_demo_presets') === 'true');

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="pt-3 flex justify-center">
      <button
        type="button"
        id="btn-demo-quick-fill"
        onClick={() => onApplyDemo({ ...DEMO_PATIENT_PRESET })}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#855711] bg-[#fffbf2] hover:bg-[#faeed3] border border-[#f0dcaf] rounded-full transition-all duration-150 shadow-2xs cursor-pointer"
        title="Developer / Evaluator Quick Fill"
      >
        <Sparkles size={12} className="text-[#c98e20]" />
        <span>{isHindi ? '⚡ डेमो मरीज भरें (परीक्षण)' : '⚡ Quick Fill Demo Patient (Judge Presentation)'}</span>
      </button>
    </div>
  );
}

export default DemoProfileQuickFill;
