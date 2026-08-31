export type DoctorQueueItem = {
  intake_session_id: string;
  token: string;
  patient_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  chief_complaint: string;
  language_code: string;
  workflow_type: string;
  status: 'WAITING' | 'HISTORY_READY' | 'PRIORITY_REVIEW' | 'IN_REVIEW' | 'CONFIRMED';
  status_tone: 'teal' | 'amber' | 'red';
  priority: 'Priority' | 'Routine';
  has_red_flags: boolean;
  submitted_at: string;
  wait_time_minutes: number;
};

export type PatientDetail = {
  intake_session_id: string;
  token: string;
  patient_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  hospital_name: string;
  doctor_name: string;
  workflow_type: string;
  language_code: string;
  status: string;
  review_status: 'AI_DRAFT' | 'NEEDS_VERIFICATION' | 'PHYSICIAN_CONFIRMED';
  clinical_state: {
    chief_complaint?: string;
    symptoms?: string[];
    onset?: string;
    duration?: string;
    severity?: number;
    location?: string;
    character?: string;
    radiation?: string;
    associated_symptoms?: string[];
    timing?: string;
    aggravating_factors?: string[];
    relieving_factors?: string[];
    ayush?: {
      prakriti?: string;
      vikriti?: string;
      agni?: string;
      koshtha?: string;
      ahara_vihara?: string;
      doshas?: [number, number, number];
    };
    red_flags?: {
      rule_id: string;
      title: string;
      reason: string;
      severity: string;
    }[];
    vitals?: Record<string, any>;
    medications?: string[];
    confidence?: number;
  };
  submitted_at: string;
  clinician_notes?: string;
  fhir_bundle_id?: string;
};

export const fallbackQueue: DoctorQueueItem[] = [
  {
    intake_session_id: 'intake_001',
    token: 'A-204',
    patient_id: 'pat_001',
    patient_name: 'Ananya Sharma',
    patient_age: 34,
    patient_gender: 'Female',
    chief_complaint: 'Crushing chest pressure radiating to left arm',
    language_code: 'hi',
    workflow_type: 'GENERAL_CLINICAL',
    status: 'PRIORITY_REVIEW',
    status_tone: 'red',
    priority: 'Priority',
    has_red_flags: true,
    submitted_at: new Date().toISOString(),
    wait_time_minutes: 12,
  },
  {
    intake_session_id: 'intake_002',
    token: 'A-205',
    patient_id: 'pat_002',
    patient_name: 'Ramesh Patel',
    patient_age: 48,
    patient_gender: 'Male',
    chief_complaint: 'Knee stiffness, worse in the morning',
    language_code: 'en',
    workflow_type: 'AYUSH',
    status: 'HISTORY_READY',
    status_tone: 'amber',
    priority: 'Routine',
    has_red_flags: false,
    submitted_at: new Date().toISOString(),
    wait_time_minutes: 32,
  },
  {
    intake_session_id: 'intake_003',
    token: 'SV-2048',
    patient_id: 'pat_003',
    patient_name: 'Meena Kumari',
    patient_age: 54,
    patient_gender: 'Female',
    chief_complaint: 'Persistent cough and throat irritation',
    language_code: 'en',
    workflow_type: 'GENERAL_CLINICAL',
    status: 'HISTORY_READY',
    status_tone: 'teal',
    priority: 'Routine',
    has_red_flags: false,
    submitted_at: new Date().toISOString(),
    wait_time_minutes: 4,
  },
];
