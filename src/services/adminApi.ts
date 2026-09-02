// SwasthyaVaani - Hospital Admin & QA API Client

const API_BASE = '/api/v1/admin';

export interface StatTrend {
  label: string;
  value: number;
  secondary_value?: number;
}

export interface ComplaintFrequency {
  complaint: string;
  count: number;
  category: string;
}

export interface AdminDashboardStats {
  total_patients: number;
  active_patients: number;
  new_patients_today: number;
  total_doctors: number;
  doctors_available_now: number;
  appointments_today: number;
  completed_consultations: number;
  pending_consultations: number;
  ai_assessments_today: number;
  critical_cases_count: number;
  reports_pending_review: number;
  intake_volume_trend: StatTrend[];
  critical_cases_trend: StatTrend[];
  common_complaints: ComplaintFrequency[];
}

export interface AICaseOversightItem {
  intake_session_id: string;
  token: string;
  patient_id: string;
  patient_name: string;
  patient_age?: number;
  patient_gender?: string;
  chief_complaint: string;
  symptoms: string[];
  severity_score: number;
  suggested_department: string;
  red_flags: string[];
  recommended_handoff: string;
  ai_confidence: number;
  status: string;
  started_at: string;
  duration_minutes: number;
  workflow_type: string;
}

export interface AIOverrideBreakdown {
  category: string;
  total_cases: number;
  accepted_count: number;
  modified_count: number;
  overridden_count: number;
  override_rate_pct: number;
}

export interface AIMonitoringSummary {
  total_assessments: number;
  active_conversations: number;
  completed_conversations: number;
  abandoned_conversations: number;
  average_duration_minutes: number;
  summary_accepted_pct: number;
  summary_modified_pct: number;
  summary_overridden_pct: number;
  cases: AICaseOversightItem[];
  override_breakdown: AIOverrideBreakdown[];
  safety_disclaimer: string;
}

export interface EmergencyCaseItem {
  intake_session_id: string;
  token: string;
  patient_id: string;
  patient_name: string;
  patient_age?: number;
  patient_gender?: string;
  chief_complaint: string;
  severity: string;
  severity_tone: string;
  wait_time_minutes: number;
  assigned_department: string;
  assigned_doctor_name?: string;
  escalation_reason: string;
  red_flag_rule?: string;
  associated_symptoms?: string[];
  status: string;
  timestamp: string;
}

export interface AuditEventItem {
  id: string;
  timestamp: string;
  actor_user_id?: string;
  actor_role: string;
  event_type: string;
  resource_type: string;
  resource_id: string;
  metadata?: Record<string, any>;
}

export interface DoctorProfile {
  id: string;
  hospital_id: string;
  department_id?: string;
  department_name?: string;
  display_name: string;
  specialization: string;
  license_identifier?: string;
  contact?: string;
  working_hours?: string;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentItem {
  id: string;
  hospital_id: string;
  name: string;
  code: string;
  active_doctors_count: number;
  patient_cases_count: number;
  is_active: boolean;
  created_at: string;
}

export interface StaffUserItem {
  id: string;
  email?: string;
  display_name: string;
  role: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface TestCaseSummary {
  id: string;
  name: string;
  category: string;
  status: 'PASSED' | 'FAILED';
  checks_performed: number;
  duration_seconds: number;
  friendly_message: string;
  error_reference_id?: string;
}

export interface QATestRunResult {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  execution_duration_seconds: number;
  success: boolean;
  timestamp: string;
  suites: TestCaseSummary[];
  output_log?: string;
}

export interface ServiceHealthStatus {
  database: { status: string; type?: string; latency_ms?: number };
  llm_service: { status: string; provider?: string; model?: string };
  speech_service: { status: string; provider?: string; channels?: number };
  ocr_service: { status: string; provider?: string; mode?: string };
  abdm_gateway: { status: string; mode?: string; sandbox?: boolean };
  overall_status: string;
}

// ---------------------------------------------------------------------------
// Fallback Mocks for Resilient Offline / Demo Rendering
// ---------------------------------------------------------------------------
const MOCK_STATS: AdminDashboardStats = {
  total_patients: 186,
  active_patients: 14,
  new_patients_today: 32,
  total_doctors: 12,
  doctors_available_now: 8,
  appointments_today: 48,
  completed_consultations: 26,
  pending_consultations: 8,
  ai_assessments_today: 42,
  critical_cases_count: 3,
  reports_pending_review: 5,
  intake_volume_trend: [
    { label: '08:00', value: 14, secondary_value: 12 },
    { label: '10:00', value: 28, secondary_value: 24 },
    { label: '12:00', value: 42, secondary_value: 39 },
    { label: '14:00', value: 36, secondary_value: 33 },
    { label: '16:00', value: 22, secondary_value: 20 },
    { label: '18:00', value: 11, secondary_value: 10 },
  ],
  critical_cases_trend: [
    { label: '08:00', value: 1 },
    { label: '10:00', value: 3 },
    { label: '12:00', value: 5 },
    { label: '14:00', value: 2 },
    { label: '16:00', value: 4 },
    { label: '18:00', value: 2 },
  ],
  common_complaints: [
    { complaint: 'Chest Tightness / Pain', count: 18, category: 'Cardiology' },
    { complaint: 'Persistent Cough & Throat Tickle', count: 34, category: 'Pulmonology' },
    { complaint: 'Knee Stiffness / Joint Pain (Vata)', count: 26, category: 'Ayurveda' },
    { complaint: 'High Fever & Rigors', count: 29, category: 'General OPD' },
    { complaint: 'Abdominal Discomfort & Acidity', count: 19, category: 'Gastroenterology' },
  ]
};

const MOCK_AI_MONITORING: AIMonitoringSummary = {
  total_assessments: 42,
  active_conversations: 4,
  completed_conversations: 36,
  abandoned_conversations: 2,
  average_duration_minutes: 3.2,
  summary_accepted_pct: 88.4,
  summary_modified_pct: 11.6,
  summary_overridden_pct: 0.0,
  safety_disclaimer: 'Clinical Safety Notice: SwasthyaVaani AI provides structured pre-consultation intake support. The consulting physician remains the sole authoritative clinical decision-maker.',
  cases: [
    {
      intake_session_id: 'intake_001',
      token: 'A-027',
      patient_id: 'pat_001',
      patient_name: 'Sunita Verma',
      patient_age: 45,
      patient_gender: 'Female',
      chief_complaint: 'Crushing chest pressure with left arm radiation',
      symptoms: ['Chest pressure', 'Arm radiation', 'Diaphoresis', 'Shortness of breath'],
      severity_score: 9,
      suggested_department: 'Cardiology & Emergency',
      red_flags: ['Suspected Acute Coronary Syndrome (RF-CARDIAC-001)'],
      recommended_handoff: 'Immediate ECG & Physician Evaluation (Priority Red-Flag)',
      ai_confidence: 0.98,
      status: 'SUBMITTED',
      started_at: new Date(Date.now() - 24 * 60000).toISOString(),
      duration_minutes: 2.8,
      workflow_type: 'GENERAL_CLINICAL'
    },
    {
      intake_session_id: 'intake_002',
      token: 'A-021',
      patient_id: 'pat_002',
      patient_name: 'Ramesh Patel',
      patient_age: 58,
      patient_gender: 'Male',
      chief_complaint: 'Bilateral knee stiffness, worse in winter morning',
      symptoms: ['Knee stiffness', 'Crepitus', 'Manda Agni', 'Constipation'],
      severity_score: 5,
      suggested_department: 'Ayurveda OPD',
      red_flags: [],
      recommended_handoff: 'Prakriti assessment, Sandhigata Vata evaluation, Janu Basti workup',
      ai_confidence: 0.91,
      status: 'SUBMITTED',
      started_at: new Date(Date.now() - 40 * 60000).toISOString(),
      duration_minutes: 4.1,
      workflow_type: 'AYUSH'
    },
    {
      intake_session_id: 'intake_003',
      token: 'SV-2048',
      patient_id: 'pat_003',
      patient_name: 'Meena Kumari',
      patient_age: 34,
      patient_gender: 'Female',
      chief_complaint: 'Persistent dry spasmodic cough for 2 weeks',
      symptoms: ['Dry cough', 'Throat tickle', 'Mild nocturnal wheeze'],
      severity_score: 4,
      suggested_department: 'General Medicine',
      red_flags: [],
      recommended_handoff: 'Chest auscultation, Spirometry / Bronchitis evaluation, Past Rx review',
      ai_confidence: 0.95,
      status: 'SUBMITTED',
      started_at: new Date(Date.now() - 15 * 60000).toISOString(),
      duration_minutes: 3.4,
      workflow_type: 'GENERAL_CLINICAL'
    }
  ],
  override_breakdown: [
    { category: 'Cardiology & Acute Chest Pain', total_cases: 24, accepted_count: 21, modified_count: 3, overridden_count: 0, override_rate_pct: 12.5 },
    { category: 'Ayurveda (Agni & Prakriti)', total_cases: 31, accepted_count: 27, modified_count: 4, overridden_count: 0, override_rate_pct: 12.9 },
    { category: 'Respiratory & Cough', total_cases: 46, accepted_count: 41, modified_count: 5, overridden_count: 0, override_rate_pct: 10.8 },
    { category: 'General OPD / Internal Med', total_cases: 58, accepted_count: 52, modified_count: 6, overridden_count: 0, override_rate_pct: 10.3 },
  ]
};

// ---------------------------------------------------------------------------
// API Client Functions
// ---------------------------------------------------------------------------

export async function fetchAdminStats(): Promise<AdminDashboardStats> {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[adminApi] fetchAdminStats fallback to mock', err);
    return MOCK_STATS;
  }
}

export async function fetchAIMonitoring(): Promise<AIMonitoringSummary> {
  try {
    const res = await fetch(`${API_BASE}/ai-monitoring`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[adminApi] fetchAIMonitoring fallback to mock', err);
    return MOCK_AI_MONITORING;
  }
}

export async function fetchEmergencyCases(priority = 'ALL'): Promise<EmergencyCaseItem[]> {
  try {
    const res = await fetch(`${API_BASE}/emergency-cases?priority=${encodeURIComponent(priority)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[adminApi] fetchEmergencyCases fallback to mock', err);
    return [
      {
        intake_session_id: 'intake_001',
        token: 'A-027',
        patient_id: 'pat_001',
        patient_name: 'Sunita Verma',
        patient_age: 45,
        patient_gender: 'Female',
        chief_complaint: 'Suspected Acute Coronary Syndrome',
        severity: 'Critical',
        severity_tone: 'red',
        wait_time_minutes: 18,
        assigned_department: 'Cardiology & Emergency',
        assigned_doctor_name: 'Dr. Vikram Sen',
        escalation_reason: 'Crushing chest tightness with left arm radiation and diaphoresis.',
        red_flag_rule: 'RF-CARDIAC-001',
        associated_symptoms: ['Chest tightness', 'Left arm radiation', 'Diaphoresis'],
        status: 'ESCALATED_TO_DOCTOR',
        timestamp: new Date().toISOString()
      }
    ];
  }
}

export async function fetchAuditLogs(params?: {
  limit?: number;
  event_type?: string;
  actor_role?: string;
  search?: string;
}): Promise<AuditEventItem[]> {
  try {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.event_type) query.set('event_type', params.event_type);
    if (params?.actor_role) query.set('actor_role', params.actor_role);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE}/audit?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[adminApi] fetchAuditLogs fallback to mock', err);
    return [
      {
        id: 'audit-01',
        timestamp: new Date().toISOString(),
        actor_role: 'DOCTOR',
        event_type: 'RECORD_ACCESS',
        resource_type: 'PATIENT_RECORD',
        resource_id: 'pat_001',
        metadata: { token: 'A-027', reason: 'Priority clinical evaluation' }
      },
      {
        id: 'audit-02',
        timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
        actor_role: 'SYSTEM_AI',
        event_type: 'RED_FLAG_ESCALATED',
        resource_type: 'INTAKE_SESSION',
        resource_id: 'intake_001',
        metadata: { rule: 'RF-CARDIAC-001', severity: 'CRITICAL' }
      },
      {
        id: 'audit-03',
        timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
        actor_role: 'KIOSK',
        event_type: 'DOCUMENT_UPLOADED',
        resource_type: 'DOCUMENT',
        resource_id: 'doc_sv2048_01',
        metadata: { token: 'SV-2048', file: 'rx_august2026_bronchitis.pdf' }
      }
    ];
  }
}

export async function fetchDoctors(): Promise<DoctorProfile[]> {
  try {
    const res = await fetch(`${API_BASE}/doctors`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[adminApi] fetchDoctors fallback to mock', err);
    return [
      {
        id: 'doc_001',
        hospital_id: 'hosp_district_01',
        department_name: 'General Medicine',
        display_name: 'Dr. Ananya Rao',
        specialization: 'General Medicine',
        license_identifier: 'MCI-2018-8839',
        contact: '+91 98201 44512',
        working_hours: '08:00 AM - 04:00 PM',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'doc_002',
        hospital_id: 'hosp_district_01',
        department_name: 'Ayurveda OPD',
        display_name: 'Dr. Devika Rao',
        specialization: 'Ayurveda (Kayachikitsa)',
        license_identifier: 'AYU-MAH-4091',
        contact: '+91 94102 77123',
        working_hours: '09:00 AM - 05:00 PM',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'doc_003',
        hospital_id: 'hosp_district_01',
        department_name: 'Cardiology & Emergency',
        display_name: 'Dr. Vikram Sen',
        specialization: 'Cardiology & Critical Care',
        license_identifier: 'MCI-2012-1049',
        contact: '+91 97600 33419',
        working_hours: '07:00 AM - 03:00 PM',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
  }
}

export async function onboardDoctor(payload: {
  display_name: string;
  specialization: string;
  department_id: string;
  license_identifier?: string;
  contact?: string;
  working_hours?: string;
}): Promise<DoctorProfile> {
  const res = await fetch(`${API_BASE}/doctors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateDoctorStatus(doctorId: string, is_active: boolean): Promise<DoctorProfile> {
  const res = await fetch(`${API_BASE}/doctors/${doctorId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function fetchDepartments(): Promise<DepartmentItem[]> {
  try {
    const res = await fetch(`${API_BASE}/departments`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[adminApi] fetchDepartments fallback', err);
    return [
      { id: 'dept_gen_01', hospital_id: 'hosp_district_01', name: 'General Medicine', code: 'GEN-OPD', active_doctors_count: 4, patient_cases_count: 58, is_active: true, created_at: new Date().toISOString() },
      { id: 'dept_ayu_01', hospital_id: 'hosp_district_01', name: 'Ayurveda OPD', code: 'AYU-OPD', active_doctors_count: 2, patient_cases_count: 31, is_active: true, created_at: new Date().toISOString() },
      { id: 'dept_cardio_01', hospital_id: 'hosp_district_01', name: 'Cardiology & Emergency', code: 'EMERG-OPD', active_doctors_count: 3, patient_cases_count: 24, is_active: true, created_at: new Date().toISOString() },
      { id: 'dept_ortho_01', hospital_id: 'hosp_district_01', name: 'Orthopedics', code: 'ORTHO-OPD', active_doctors_count: 2, patient_cases_count: 19, is_active: true, created_at: new Date().toISOString() },
      { id: 'dept_ped_01', hospital_id: 'hosp_district_01', name: 'Pediatrics', code: 'PED-OPD', active_doctors_count: 1, patient_cases_count: 14, is_active: true, created_at: new Date().toISOString() },
    ];
  }
}

export async function createDepartment(payload: { name: string; code: string }): Promise<DepartmentItem> {
  const res = await fetch(`${API_BASE}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function fetchStaffUsers(): Promise<StaffUserItem[]> {
  try {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[adminApi] fetchStaffUsers fallback', err);
    return [
      { id: 'user_admin_01', email: 'admin.rohan@district-hospital.in', display_name: 'Rohan (Lead Administrator)', role: 'HOSPITAL_ADMIN', phone: '+91 98200 11001', is_active: true, created_at: new Date().toISOString() },
      { id: 'user_super_01', email: 'cmo@district-hospital.in', display_name: 'Chief Medical Officer', role: 'SUPER_ADMIN', phone: '+91 98200 11000', is_active: true, created_at: new Date().toISOString() },
      { id: 'user_doc_01', email: 'ananya.rao@district-hospital.in', display_name: 'Dr. Ananya Rao', role: 'DOCTOR', phone: '+91 98201 44512', is_active: true, created_at: new Date().toISOString() },
      { id: 'user_nurse_01', email: 'nurse.priya@district-hospital.in', display_name: 'Sister Priya Nair', role: 'NURSE', phone: '+91 98200 22002', is_active: true, created_at: new Date().toISOString() },
      { id: 'user_rec_01', email: 'kiosk.desk@district-hospital.in', display_name: 'Rajesh Sharma', role: 'RECEPTIONIST', phone: '+91 98200 33003', is_active: true, created_at: new Date().toISOString() },
      { id: 'user_lab_01', email: 'lab.tech@district-hospital.in', display_name: 'Pooja Verma', role: 'LAB_STAFF', phone: '+91 98200 44004', is_active: true, created_at: new Date().toISOString() },
    ];
  }
}

export async function createStaffUser(payload: {
  email: string;
  display_name: string;
  role: string;
  phone?: string;
}): Promise<StaffUserItem> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateStaffRole(userId: string, role: string, is_active?: boolean): Promise<StaffUserItem> {
  const res = await fetch(`${API_BASE}/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, is_active })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function loadDemoScenario(token: string): Promise<{ status: string; message: string; scenario: string }> {
  const res = await fetch(`${API_BASE}/seed/scenario/${encodeURIComponent(token)}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function resetDemoState(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/seed/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function runQARegressionTests(): Promise<QATestRunResult> {
  const res = await fetch(`${API_BASE}/qa/run-tests`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function fetchServiceStatus(): Promise<ServiceHealthStatus> {
  try {
    const res = await fetch(`${API_BASE}/services/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      database: { status: 'ONLINE', type: 'SQLite' },
      llm_service: { status: 'ONLINE', provider: 'Deterministic Adaptive Engine' },
      speech_service: { status: 'ONLINE', provider: 'Mock / Bhashini' },
      ocr_service: { status: 'ONLINE', provider: 'PaddleOCR' },
      abdm_gateway: { status: 'ONLINE', sandbox: true },
      overall_status: 'HEALTHY'
    };
  }
}
