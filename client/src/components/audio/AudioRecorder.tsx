import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../shared/Button';

type RecorderState = 'idle' | 'requesting' | 'denied' | 'recording' | 'recorded';

interface AudioRecorderProps {
  label: string;
  onRecordingComplete: (blob: Blob) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/wav', 'audio/mp4'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ label, onRecordingComplete }) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const cleanupAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      cleanupStream();
      cleanupAudioUrl();
    };
  }, [cleanupStream, cleanupAudioUrl]);

  const requestMicrophone = async () => {
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setState('idle');
    } catch {
      setState('denied');
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) {
      await requestMicrophone();
      if (!streamRef.current) return;
    }

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(streamRef.current!, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || 'audio/webm',
      });
      blobRef.current = blob;
      cleanupAudioUrl();
      audioUrlRef.current = URL.createObjectURL(blob);
      setState('recorded');
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recorder.start();
    setDuration(0);
    setState('recording');
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const resetRecording = () => {
    cleanupAudioUrl();
    blobRef.current = null;
    setDuration(0);
    setPlaybackProgress(0);
    setIsPlaying(false);
    if (progressRef.current) clearInterval(progressRef.current);
    setState(streamRef.current ? 'idle' : 'idle');
  };

  const togglePlayback = () => {
    if (!audioUrlRef.current) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrlRef.current);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(100);
        if (progressRef.current) clearInterval(progressRef.current);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      if (progressRef.current) clearInterval(progressRef.current);
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      const startTime = Date.now();
      const totalDuration = duration || 1;
      progressRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setPlaybackProgress(Math.min(100, (elapsed / totalDuration) * 100));
      }, 100);
    }
  };

  const handleUseRecording = () => {
    if (blobRef.current) {
      onRecordingComplete(blobRef.current);
    }
  };

  if (state === 'denied') {
    return (
      <div className="card p-6 space-y-4">
        <p className="text-lg font-medium text-surface-900">{label}</p>
        <p className="text-base text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
          Microphone access is needed to record the farmer&apos;s voice. Please allow microphone
          access in your browser settings.
        </p>
        <Button size="lg" variant="secondary" onClick={requestMicrophone}>
          Try again
        </Button>
      </div>
    );
  }

  if (!streamRef.current && (state === 'idle' || state === 'requesting')) {
    return (
      <div className="card p-6 space-y-4 text-center">
        <p className="text-lg font-medium text-surface-900">{label}</p>
        <Button size="lg" onClick={requestMicrophone} loading={state === 'requesting'}>
          Enable microphone
        </Button>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-6">
      <p className="text-lg font-medium text-surface-900 text-center">{label}</p>

      {state === 'idle' && (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={startRecording}
            className="h-28 w-28 rounded-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-lg font-semibold shadow-lg transition-colors"
            aria-label="Start recording"
          >
            Record
          </button>
          <p className="text-sm text-surface-500">Tap to start recording</p>
        </div>
      )}

      {state === 'recording' && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-28 w-28 rounded-full bg-red-600 animate-pulse flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{formatDuration(duration)}</span>
            </div>
          </div>
          <Button size="lg" variant="danger" onClick={stopRecording}>
            Stop recording
          </Button>
        </div>
      )}

      {state === 'recorded' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-base text-surface-600">Recording: {formatDuration(duration)}</p>

          <div className="w-full max-w-md h-3 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-100"
              style={{ width: `${playbackProgress}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <Button size="lg" variant="secondary" className="flex-1" onClick={togglePlayback}>
              {isPlaying ? 'Pause playback' : 'Play recording'}
            </Button>
            <Button size="lg" variant="ghost" className="flex-1" onClick={resetRecording}>
              Record again
            </Button>
          </div>

          <Button size="lg" className="w-full max-w-md" onClick={handleUseRecording}>
            Use this recording
          </Button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
