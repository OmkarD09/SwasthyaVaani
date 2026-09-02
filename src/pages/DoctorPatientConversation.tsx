import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useParams } from 'wouter';

import { type ConversationExchange } from '../components/doctor/ConversationMessage';
import { ConversationTimeline } from '../components/doctor/ConversationTimeline';
import { PatientContextHeader } from '../components/doctor/PatientContextHeader';
import { PatientRecordShell } from '../components/doctor/PatientRecordShell';
import { usePatientRecord } from '../hooks/usePatientRecord';
import { authorizedClinicianFetch } from '../lib/clinicianAuth';

export function DoctorPatientConversation() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id || '';
  const {
    patientDetail,
    loading: patientLoading,
    error: patientError,
    confirmed,
  } = usePatientRecord(patientId);
  const [exchanges, setExchanges] = useState<ConversationExchange[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientDetail?.intake_session_id) return;

    let active = true;
    setTimelineLoading(true);
    setTimelineError(null);
    authorizedClinicianFetch(
      `/api/v1/doctor/patients/${patientDetail.intake_session_id}/conversation`,
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Conversation request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setExchanges(Array.isArray(data.exchanges) ? data.exchanges : []);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setExchanges([]);
        setTimelineError(
          error instanceof Error ? error.message : 'Conversation timeline is unavailable.',
        );
      })
      .finally(() => {
        if (active) setTimelineLoading(false);
      });

    return () => {
      active = false;
    };
  }, [patientDetail?.intake_session_id]);

  if (patientLoading) {
    return (
      <PatientRecordShell patientId={patientId}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-sm text-[#5f786d]">
            <RefreshCw className="animate-spin" size={20} /> Loading patient record...
          </div>
        </div>
      </PatientRecordShell>
    );
  }

  if (!patientDetail) {
    return (
      <PatientRecordShell patientId={patientId}>
        <div className="rounded-2xl border border-[#e5c7bd] bg-[#fff9f7] p-8 text-center">
          <AlertTriangle size={30} className="mx-auto mb-3 text-[#b4533f]" />
          <p className="font-semibold text-[#713b36]">Patient record unavailable</p>
          <p className="mt-1 text-xs text-[#8b5954]">{patientError}</p>
        </div>
      </PatientRecordShell>
    );
  }

  const cs = patientDetail.clinical_state || {};

  return (
    <PatientRecordShell patientId={patientId}>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
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

        {timelineLoading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef]">
            <RefreshCw className="mr-2 animate-spin text-[#1f5b4e]" size={18} />
            <span className="text-sm text-[#5f786d]">Loading persisted conversation...</span>
          </div>
        ) : timelineError ? (
          <div className="rounded-2xl border border-[#e5c7bd] bg-[#fff9f7] p-6 text-center text-sm text-[#713b36]">
            {timelineError}
          </div>
        ) : (
          <ConversationTimeline exchanges={exchanges} />
        )}
      </div>
    </PatientRecordShell>
  );
}

export default DoctorPatientConversation;
