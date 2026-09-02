import { useState, useEffect } from 'react';
import { type PatientDetail } from '../lib/clinicianData';
import { authorizedClinicianFetch } from '../lib/clinicianAuth';

export interface PatientRecordState {
  patientDetail: PatientDetail | null;
  loading: boolean;
  error: string | null;
  confirmed: boolean;
  fhirId: string | null;
  note: string;
  setNote: (note: string) => void;
  confirmPatient: (edits?: Record<string, string>) => Promise<boolean>;
}

export function usePatientRecord(patientId: string | undefined): PatientRecordState {
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [fhirId, setFhirId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      setError('Invalid patient ID');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadDetail = async () => {
      try {
        const res = await authorizedClinicianFetch(`/api/v1/doctor/patients/${patientId}`);
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          setPatientDetail(data);
          setNote(data.clinician_notes || '');
          if (data.review_status === 'PHYSICIAN_CONFIRMED') setConfirmed(true);
          setError(null);
        } else if (res.status === 404) {
          setError(`Patient record "${patientId}" was not found in database.`);
          setPatientDetail(null);
        } else {
          setError(`Server returned status ${res.status} when loading patient record.`);
          setPatientDetail(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching patient clinical record:', err);
        setError('Network error: Unable to connect to backend server.');
        setPatientDetail(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const confirmPatient = async (edits: Record<string, string> = {}): Promise<boolean> => {
    if (!patientDetail) return false;
    try {
      const res = await authorizedClinicianFetch(
        `/api/v1/doctor/patients/${patientDetail.intake_session_id}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intake_session_id: patientDetail.intake_session_id,
            notes: note,
            edits: Object.entries(edits).map(([key, val]) => ({
              field_name: key,
              old_value: '',
              new_value: val,
              reason: 'Physician review edit',
            })),
            generate_fhir: true,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setFhirId(data.fhir_bundle_id);
        setConfirmed(true);
        return true;
      }
      setError(`Unable to confirm patient record (status ${res.status}).`);
    } catch (e) {
      console.warn('Physician confirm notice:', e);
      setError('Network error: Unable to confirm patient record.');
    }
    return false;
  };

  return {
    patientDetail,
    loading,
    error,
    confirmed,
    fhirId,
    note,
    setNote,
    confirmPatient,
  };
}
