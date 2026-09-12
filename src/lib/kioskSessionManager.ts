/**
 * Kiosk Session Manager - Enforces Digital Personal Data Protection (DPDP) Act 2023 compliance.
 * Guarantees session ephemerality, complete data purges, and media stream teardowns
 * between patients on shared public kiosks.
 */

export const KIOSK_STORAGE_KEYS = [
  'sv_patient_profile',
  'swasthya_active_intake_id',
  'swasthya_intake_token',
  'swasthya_active_token',
  'swasthya_active_patient_id',
  'sv_selected_department_code',
  'swasthya_consent_state',
  'swasthya_voice_mode',
  'conversation_transcript_cache',
  'swasthya_last_submission',
  'swasthya_chat_history',
  'swasthya_uploaded_doc_name',
  'sv_audio_consent_record',
  'sv_selected_mode',
  'sv_selected_workflow',
  'sv_intake_summary',
  'swasthya_conversation_turns',
  'swasthya_cached_documents',
  'sv_active_audio_recording',
] as const;

// Track active audio/media resources for teardown
const activeMediaStreams: Set<MediaStream> = new Set();
const activeAudioContexts: Set<AudioContext> = new Set();

/**
 * Register a MediaStream for automatic teardown during session purge.
 */
export function registerMediaStream(stream: MediaStream): void {
  activeMediaStreams.add(stream);
}

/**
 * Unregister a MediaStream that closed normally.
 */
export function unregisterMediaStream(stream: MediaStream): void {
  activeMediaStreams.delete(stream);
}

/**
 * Register an AudioContext for automatic closure during session purge.
 */
export function registerAudioContext(ctx: AudioContext): void {
  activeAudioContexts.add(ctx);
}

/**
 * Halts all active microphone inputs and closes AudioContext instances.
 */
export function terminateActiveMedia(): void {
  // Stop all media tracks (microphone, camera)
  activeMediaStreams.forEach((stream) => {
    try {
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      // ignore
    }
  });
  activeMediaStreams.clear();

  // Close all AudioContexts
  activeAudioContexts.forEach((ctx) => {
    try {
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    } catch {
      // ignore
    }
  });
  activeAudioContexts.clear();

  // Cancel any active browser speech synthesis (TTS)
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Completely purges all patient PHI (Protected Health Information) and session tokens from the kiosk.
 * Notifies the backend to mark any in-progress intake session as ABANDONED for DPDP audit compliance.
 */
export function purgeKioskSession(reason: 'IDLE_TIMEOUT' | 'USER_CANCELLED' | 'INTAKE_COMPLETED' | 'MANUAL_RESET' | string = 'MANUAL_RESET'): void {
  if (typeof window === 'undefined') return;

  const activeIntakeId = localStorage.getItem('swasthya_active_intake_id') || sessionStorage.getItem('swasthya_active_intake_id');

  // Notify backend asynchronously if an active session existed (non-blocking)
  if (activeIntakeId && activeIntakeId.trim() && reason !== 'INTAKE_COMPLETED') {
    try {
      fetch(`/api/v1/intakes/${encodeURIComponent(activeIntakeId)}/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
        keepalive: true,
      }).catch(() => {
        // network fallback or offline - continue local purge
      });
    } catch {
      // continue local purge
    }
  }

  // 1. Remove all patient-identifiable keys from localStorage and sessionStorage
  KIOSK_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // ignore storage access errors
    }
  });

  // 2. Terminate all active microphone streams, audio contexts, and pending TTS
  terminateActiveMedia();

  // 3. Dispatch global event for reactive UI components (forms, audio meters, chat components)
  try {
    window.dispatchEvent(new CustomEvent('kiosk-session-purged', { detail: { reason } }));
  } catch {
    // ignore event error
  }
}

/**
 * Checks if a patient intake session is currently active or unfinalized in local storage.
 */
export function isSessionActive(): boolean {
  if (typeof window === 'undefined') return false;

  const intakeId = localStorage.getItem('swasthya_active_intake_id');
  if (intakeId && intakeId.trim()) return true;

  const profileRaw = localStorage.getItem('sv_patient_profile');
  if (profileRaw) {
    try {
      const p = JSON.parse(profileRaw);
      if (p && p.name && p.name.trim()) return true;
    } catch {
      return false;
    }
  }

  return false;
}
