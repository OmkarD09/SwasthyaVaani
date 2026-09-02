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
  documents: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
};
