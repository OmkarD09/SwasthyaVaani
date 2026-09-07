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
  status: 'WAITING' | 'HISTORY_READY' | 'PRIORITY_REVIEW' | 'IN_REVIEW' | 'CONFIRMED' | 'REVIEWED';
  status_tone: 'teal' | 'amber' | 'red' | 'emerald';
  priority: 'Priority' | 'Routine';
  has_red_flags: boolean;
  submitted_at: string;
  wait_time_minutes: number;
  abha_id?: string | null;
  abha_status?: string | null;
  review_status?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};

export type PatientDetail = {
  intake_session_id: string;
  token: string;
  patient_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  abha_id?: string | null;
  abha_address?: string | null;
  abha_status?: string | null;
  consent_recorded?: boolean;
  hospital_name: string;
  doctor_name: string;
  workflow_type: string;
  language_code: string;
  status: string;
  review_status: 'AI_DRAFT' | 'NEEDS_VERIFICATION' | 'PHYSICIAN_CONFIRMED' | 'REVIEWED' | 'PENDING_REVIEW';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
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
    medical_history?: string | string[];
    past_medical_history?: string | string[];
    allergies?: string | string[];
    family_history?: string | string[];
    social_history?: string | string[];
    confidence?: number;
    [key: string]: unknown;
  };
  ayush_assessment?: AyushAssessmentData;
  submitted_at: string;
  clinician_notes?: string;
  fhir_bundle_id?: string;
  documents: Array<{
    id: string;
    document_id?: string;
    name: string;
    file_name: string;
    size: string;
    file_size?: number;
    mime_type?: string;
    type: string;
    document_type?: string;
    status?: string;
    failure_code?: string;
    uploaded_at?: string;
    localOnly?: boolean;
    url?: string;
    extractions?: Array<MedicalRecordExtraction>;
    [key: string]: unknown;
  }>;
  medical_records?: Array<MedicalRecordExtraction>;
  timeline: Array<Record<string, unknown>>;
};

export type MedicalRecordExtraction = {
  id: string;
  document_id: string;
  document_name: string;
  document_type: string;
  field_type: string;
  field_name: string;
  value: Record<string, any> | string;
  confidence: number;
  ocr_confidence?: number;
  source_page?: number;
  source_text?: string;
  status?: string;
};

export type AyushProvenanceSource =
  | 'PATIENT_STATED'
  | 'AI_INFERRED'
  | 'DOCUMENT'
  | 'PHYSICIAN_CONFIRMED'
  | 'SYSTEM_DERIVED';

export type AyushAssessmentStatus =
  | 'INCOMPLETE'
  | 'PRELIMINARY'
  | 'NEEDS_REVIEW'
  | 'PHYSICIAN_CONFIRMED';

export type AyushDimensionData = {
  dimension: string;
  value?: any;
  status: AyushAssessmentStatus;
  confidence?: number;
  source?: AyushProvenanceSource | null;
  source_id?: string;
  evidence?: string[];
  last_updated_turn?: number;
};

export type AyushAssessmentData = {
  system: string;
  overall_status: AyushAssessmentStatus;
  prakriti?: AyushDimensionData;
  vikriti?: AyushDimensionData;
  agni?: AyushDimensionData;
  koshtha?: AyushDimensionData;
  ahara_vihara?: AyushDimensionData;
  doshas?: [number, number, number] | number[];
  dosha_evidence?: string[];
  sara?: AyushDimensionData;
  samhanana?: AyushDimensionData;
  pramana?: AyushDimensionData;
  satmya?: AyushDimensionData;
  sattva?: AyushDimensionData;
  ahara_shakti?: AyushDimensionData;
  vyayama_shakti?: AyushDimensionData;
  vaya?: AyushDimensionData;
  evidence?: string[];
  uncertainties?: string[];
  confidence?: number;
  physician_review_state?: Record<string, any>;
  last_updated_at?: string;
};

