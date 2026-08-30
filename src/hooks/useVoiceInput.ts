import { useState, useRef, useCallback } from 'react';
import type { LanguageCode } from '../i18n';
import { type VoiceState } from '../services/voiceApi';

interface UseVoiceInputProps {
  language: LanguageCode;
  questionIndex?: number;
  onTranscriptComplete?: (transcript: string) => void;
}

/**
 * useVoiceInput hook preserved for future phases.
 * Currently keeps voice inactive as per requirements (Text-only phase).
 */
export function useVoiceInput({ onTranscriptComplete }: UseVoiceInputProps) {
  const [voiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript] = useState('');
  const [errorMessage] = useState<string | null>(null);

  const isListeningRef = useRef(false);

  const startListening = useCallback(() => {
    // Inactive for text-only phase
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    voiceState,
    transcript,
    interimTranscript,
    errorMessage,
    isListening: false,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
