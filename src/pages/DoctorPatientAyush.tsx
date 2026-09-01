import { useParams } from 'wouter';
import { RefreshCw } from 'lucide-react';
import { usePatientRecord } from '../hooks/usePatientRecord';
import { PatientRecordShell } from '../components/doctor/PatientRecordShell';
import { PatientContextHeader } from '../components/doctor/PatientContextHeader';
import { AyushAssessmentSection } from '../components/doctor/AyushAssessmentSection';

export function DoctorPatientAyush() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id || 'pat_001';

  const { patientDetail, loading, confirmed } = usePatientRecord(patientId);

  if (loading || !patientDetail) {
    return (
      <PatientRecordShell patientId={patientId}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-sm text-[#5f786d]">
            <RefreshCw className="animate-spin" size={20} /> Loading AYUSH assessment…
          </div>
        </div>
      </PatientRecordShell>
    );
  }

  const cs = patientDetail?.clinical_state || {};

  return (
    <PatientRecordShell patientId={patientId}>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Patient Context Header */}
        <PatientContextHeader
          token={patientDetail.token}
          patientName={patientDetail.patient_name}
          patientAge={patientDetail.patient_age}
          patientGender={patientDetail.patient_gender}
          patientId={patientDetail.patient_id}
          reviewStatus={patientDetail.review_status}
          confirmed={confirmed}
          confidence={cs.confidence}
        />

        {/* AYUSH Assessment Section / Scalable Empty State */}
        <AyushAssessmentSection ayushData={cs.ayush} />
      </div>
    </PatientRecordShell>
  );
}

export default DoctorPatientAyush;
