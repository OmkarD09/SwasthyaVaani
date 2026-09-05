export interface StoredDocumentUpload {
  document_id: string;
  file_name: string;
  status: string;
  intake_session_id: string | null;
}

const DOCUMENT_UPLOAD_STORAGE_KEY = 'swasthya_uploaded_document';

export function getStoredDocumentUpload(
  activeIntakeId?: string | null,
): StoredDocumentUpload | null {
  try {
    const serialized = localStorage.getItem(DOCUMENT_UPLOAD_STORAGE_KEY);
    if (!serialized) return null;

    const parsed = JSON.parse(serialized) as Partial<StoredDocumentUpload>;
    if (
      typeof parsed.document_id !== 'string' ||
      typeof parsed.file_name !== 'string' ||
      typeof parsed.status !== 'string'
    ) {
      return null;
    }

    const intakeSessionId =
      typeof parsed.intake_session_id === 'string' ? parsed.intake_session_id : null;
    if (activeIntakeId && intakeSessionId && intakeSessionId !== activeIntakeId) {
      return null;
    }

    return {
      document_id: parsed.document_id,
      file_name: parsed.file_name,
      status: parsed.status,
      intake_session_id: intakeSessionId,
    };
  } catch {
    return null;
  }
}

export function storeDocumentUpload(upload: StoredDocumentUpload): void {
  try {
    localStorage.setItem(DOCUMENT_UPLOAD_STORAGE_KEY, JSON.stringify(upload));
  } catch {
    // The successful backend upload remains valid when browser storage is unavailable.
  }
}

export function clearStoredDocumentUpload(): void {
  try {
    localStorage.removeItem(DOCUMENT_UPLOAD_STORAGE_KEY);
  } catch {
    // Ignore browser storage restrictions.
  }
}
