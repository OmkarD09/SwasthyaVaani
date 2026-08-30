interface VoiceRecorderProps {
  language?: string;
  onRecordingComplete?: (audioBlob: Blob) => void;
  disabled?: boolean;
}

/**
 * VoiceRecorder component interface preserved for future phases.
 * Kept inactive during the Text-Only Patient Intake phase.
 */
export function VoiceRecorder({ disabled = true }: VoiceRecorderProps) {
  if (disabled) {
    return null;
  }
  return <div className="voice-recorder-placeholder hidden" aria-hidden="true" />;
}
