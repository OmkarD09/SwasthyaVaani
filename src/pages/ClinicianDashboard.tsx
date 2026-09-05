// Re-export clinician pages and components for backwards compatibility
export { ClinicianLogin } from './ClinicianLogin';
export { DoctorPatientReview, RecordPage } from './DoctorPatientReview';
export {
  ClinicianShell,
  ClinicianButton as Button,
  DoshaArcGauge,
  StatusPill,
  Logo,
} from '../components/clinician/ClinicianShared';
export {
  type DoctorQueueItem,
  type PatientDetail,
} from '../lib/clinicianData';
