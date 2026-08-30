import type { VoiceState } from '../../services/voiceApi';

interface MicStatusProps {
  status: VoiceState;
  errorMessage?: string | null;
}

/**
 * MicStatus component interface preserved for future development phases.
 */
export function MicStatus({ status }: MicStatusProps) {
  return <div data-status={status} className="mic-status-container hidden" aria-hidden="true" />;
}
