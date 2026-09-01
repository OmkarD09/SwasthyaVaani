import { useState } from 'react';
import { useParams } from 'wouter';
import {
  RefreshCw,
  X,
  FileCheck2,
  CloudUpload,
  CheckCircle2,
} from 'lucide-react';
import { ClinicianButton as Button } from '../components/clinician/ClinicianShared';
import { usePatientRecord } from '../hooks/usePatientRecord';
import { PatientRecordShell } from '../components/doctor/PatientRecordShell';
import { PatientContextHeader } from '../components/doctor/PatientContextHeader';
import { ClinicalAlerts } from '../components/doctor/ClinicalAlerts';
import { MainConcern } from '../components/doctor/MainConcern';
import { ClinicalSummary, type ClinicalFieldItem } from '../components/doctor/ClinicalSummary';
import { DoctorNotes } from '../components/doctor/DoctorNotes';
import { PatientAttachments } from '../components/doctor/PatientAttachments';
import { ReviewActions } from '../components/doctor/ReviewActions';

export function DoctorPatientSummary() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id || 'pat_001';

  const {
    patientDetail,
    loading,
    confirmed,
    fhirId,
    note,
    setNote,
    confirmPatient,
    uploadedDocName,
  } = usePatientRecord(patientId);

  const [editing, setEditing] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading || !patientDetail) {
    return (
      <PatientRecordShell patientId={patientId}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-sm text-[#5f786d]">
            <RefreshCw className="animate-spin" size={20} /> Loading clinical record…
          </div>
        </div>
      </PatientRecordShell>
    );
  }

  const cs = patientDetail?.clinical_state || {};

  const summaryFields: ClinicalFieldItem[] = [
    { key: 'chief_complaint', label: 'Chief Concern', value: editedFields.chief_complaint || cs.chief_complaint },
    { key: 'symptoms', label: 'Symptoms', value: editedFields.symptoms || cs.symptoms },
    { key: 'onset', label: 'Onset', value: editedFields.onset || cs.onset },
    { key: 'duration', label: 'Duration / Timing', value: editedFields.duration || cs.duration || cs.timing },
    { key: 'severity', label: 'Severity Scale', value: editedFields.severity || (cs.severity !== undefined && cs.severity !== null ? `${cs.severity}/10` : null) },
    { key: 'location', label: 'Location / Site', value: editedFields.location || cs.location },
    { key: 'character', label: 'Character', value: editedFields.character || cs.character },
    { key: 'radiation', label: 'Radiation / Spread', value: editedFields.radiation || cs.radiation },
    { key: 'associated_symptoms', label: 'Associated Symptoms', value: editedFields.associated_symptoms || cs.associated_symptoms },
    { key: 'aggravating_factors', label: 'Aggravating Factors', value: editedFields.aggravating_factors || cs.aggravating_factors },
    { key: 'relieving_factors', label: 'Relieving Factors', value: editedFields.relieving_factors || cs.relieving_factors },
    { key: 'medications', label: 'Current Medications', value: editedFields.medications || cs.medications },
  ];

  const handleFieldChange = (key: string, newValue: string) => {
    setEditedFields((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleConfirmAndSync = async () => {
    setIsSubmitting(true);
    await confirmPatient(editedFields);
    setIsSubmitting(false);
    setSyncOpen(false);
  };

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

        {/* FHIR Sync Notice */}
        {fhirId && (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#9fc1ac] bg-[#eef7ee] p-3 text-xs text-[#22573d]">
            <CheckCircle2 size={16} className="text-[#2b7f5b]" />
            <span>
              FHIR R4 Clinical Document Generated & Synced:{' '}
              <strong className="font-mono">{fhirId}</strong>
            </span>
          </div>
        )}

        {/* Clinical Alerts */}
        <ClinicalAlerts
          alerts={cs.red_flags || []}
          severityScore={cs.severity}
        />

        {/* Main Concern (Clean banner without raw dialogue) */}
        <MainConcern
          primaryConcern={cs.chief_complaint || 'General medical consultation'}
          inputModes={['voice']}
          originalLanguage={patientDetail.language_code === 'hi' ? 'Hindi' : 'English'}
          translatedLanguage="English"
        />

        {/* AI-Structured Clinical Summary */}
        <ClinicalSummary
          fields={summaryFields}
          isEditing={editing}
          onFieldChange={handleFieldChange}
          confidence={cs.confidence}
        />

        {/* Doctor Notes */}
        <DoctorNotes
          initialNotes={note}
          onSaveNotes={(savedNote) => setNote(savedNote)}
        />

        {/* Records & Attachments */}
        <PatientAttachments
          uploadedDocName={uploadedDocName}
          documents={[]}
        />

        {/* Review Actions */}
        <ReviewActions
          isConfirmed={confirmed}
          isEditing={editing}
          onToggleEdit={() => setEditing(!editing)}
          onConfirm={() => setSyncOpen(true)}
          onRequestMoreInfo={() => {
            alert('Request for additional intake information dispatched to triage.');
          }}
        />
      </div>

      {/* Confirmation Modal */}
      {syncOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#173e35]/55 p-5 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#a06f42]">
                  Physician Confirmation
                </p>
                <h2 className="mt-2 font-serif text-3xl text-[#173e35]">Confirm & Sync Record?</h2>
              </div>
              <button
                onClick={() => setSyncOpen(false)}
                data-testid="button-close-sync"
                className="text-[#7b9086] hover:text-[#173e35] cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#60796e]">
              This will record physician verification for <b>{patientDetail.patient_name}</b> (Token #{patientDetail.token}) and generate an ABDM-compliant FHIR R4 Bundle.
            </p>
            <div className="mt-5 rounded-xl bg-[#e8eee3] p-4 border border-[#dae3d6]">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#315b4d]">
                <FileCheck2 size={17} /> Token #{patientDetail.token} · Ready for confirmation
              </div>
              <p className="mt-2 text-xs text-[#71877c]">
                Clinical history, doctor notes, and diagnostic observations will be committed to hospital records.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="quiet"
                onClick={() => setSyncOpen(false)}
                testId="button-cancel-sync"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAndSync}
                disabled={isSubmitting}
                testId="button-confirm-sync"
              >
                <CloudUpload size={16} /> Confirm & Sync FHIR
              </Button>
            </div>
          </div>
        </div>
      )}
    </PatientRecordShell>
  );
}

export default DoctorPatientSummary;
