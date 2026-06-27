import React, { useRef, useState } from 'react';
import { Button, Checkbox, Spinner } from '../shared';

interface GeneratedAudioPlayerProps {
  audioUrl: string;
  loading?: boolean;
  onRegenerate: () => void;
  onAck: (payload: { farmerHeard: boolean; farmerConfirmed: boolean }) => void;
  ackPending?: boolean;
  confirmedAt?: string | null;
}

export const GeneratedAudioPlayer: React.FC<GeneratedAudioPlayerProps> = ({
  audioUrl,
  loading = false,
  onRegenerate,
  onAck,
  ackPending = false,
  confirmedAt,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [farmerHeard, setFarmerHeard] = useState(false);
  const [farmerConfirmed, setFarmerConfirmed] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const replay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const bothChecked = farmerHeard && farmerConfirmed;

  if (loading) {
    return (
      <div className="card p-8 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-base text-surface-600">Generating confirmation message…</p>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold">Play confirmation to farmer</h2>
      <p className="text-sm text-surface-600">
        Play this message for the farmer and confirm they heard and understood it.
      </p>

      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" className="flex-1" onClick={togglePlay}>
          {isPlaying ? 'Pause' : 'Play message'}
        </Button>
        <Button size="lg" variant="secondary" className="flex-1" onClick={replay}>
          Replay
        </Button>
        <Button size="lg" variant="ghost" onClick={onRegenerate}>
          Regenerate
        </Button>
      </div>

      <div className="space-y-3 pt-2 border-t border-surface-100">
        <Checkbox
          label="Farmer heard message"
          checked={farmerHeard}
          onChange={(e) => setFarmerHeard(e.target.checked)}
        />
        <Checkbox
          label="Farmer confirmed"
          checked={farmerConfirmed}
          onChange={(e) => setFarmerConfirmed(e.target.checked)}
        />
      </div>

      {confirmedAt && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          Confirmed at {new Date(confirmedAt).toLocaleString('en-GH')}
        </p>
      )}

      {!confirmedAt && (
        <Button
          size="lg"
          className="w-full"
          disabled={!bothChecked}
          loading={ackPending}
          onClick={() => onAck({ farmerHeard, farmerConfirmed })}
        >
          Save farmer confirmation
        </Button>
      )}
    </div>
  );
};

export default GeneratedAudioPlayer;
