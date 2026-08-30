export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export interface VoiceApiState {
  isSupported: boolean;
  state: VoiceState;
}

export const voiceApi = {
  // Voice interface kept inactive for future development phases
  isSupported: (): boolean => false,
  startListening: async (): Promise<void> => {},
  stopListening: (): void => {},
};
