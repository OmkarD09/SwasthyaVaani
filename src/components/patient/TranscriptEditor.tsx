interface TranscriptEditorProps {
  transcript: string;
  onSave?: (newTranscript: string) => void;
  readOnly?: boolean;
}

/**
 * TranscriptEditor component preserved for future speech-to-text review phases.
 */
export function TranscriptEditor({ transcript, onSave, readOnly = false }: TranscriptEditorProps) {
  return (
    <div className="transcript-editor-container">
      <textarea
        value={transcript}
        onChange={(e) => onSave?.(e.target.value)}
        readOnly={readOnly}
        className="w-full p-3 rounded-lg border border-stone-200"
      />
    </div>
  );
}
