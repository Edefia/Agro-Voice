import React, { useEffect, useState } from 'react';
import { Button } from '../shared/Button';
import { Spinner } from '../shared/Spinner';
import { TextArea } from '../shared/TextArea';

export type TranscriptStatus = 'idle' | 'uploading' | 'transcribing' | 'done' | 'failed';

interface TranscriptEditorProps {
  transcript: string;
  status: TranscriptStatus;
  onAccept: (editedTranscript: string) => void;
  onRecordAgain: () => void;
}

const statusMessages: Record<TranscriptStatus, string> = {
  idle: '',
  uploading: 'Uploading recording…',
  transcribing: 'Transcribing farmer response…',
  done: '',
  failed: 'Transcription failed — you can type what the farmer said instead.',
};

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  transcript,
  status,
  onAccept,
  onRecordAgain,
}) => {
  const [edited, setEdited] = useState(transcript);
  const isProcessing = status === 'uploading' || status === 'transcribing';

  useEffect(() => {
    setEdited(transcript);
  }, [transcript]);

  if (isProcessing) {
    return (
      <div className="card p-6 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-base font-medium text-surface-700">{statusMessages[status]}</p>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4">
      {status === 'failed' && (
        <p className="text-base text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
          {statusMessages.failed}
        </p>
      )}

      <TextArea
        label="Transcript"
        value={edited}
        onChange={(e) => setEdited(e.target.value)}
        rows={4}
        className="text-base"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          size="lg"
          className="flex-1"
          onClick={() => onAccept(edited.trim())}
          disabled={!edited.trim()}
        >
          Accept transcript
        </Button>
        <Button size="lg" variant="secondary" className="flex-1" onClick={onRecordAgain}>
          Record again
        </Button>
      </div>
    </div>
  );
};

export default TranscriptEditor;
