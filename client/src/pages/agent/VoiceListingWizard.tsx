import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { farmersApi } from '../../api/farmers.api';
import {
  isPublishBlockedError,
  listingsApi,
  type GeneratedAudio,
  type Listing,
} from '../../api/listings.api';
import { voiceApi, type VoiceStep } from '../../api/voice.api';
import { GeneratedAudioPlayer } from '../../components/audio/GeneratedAudioPlayer';
import { AudioRecorder } from '../../components/audio/AudioRecorder';
import {
  TranscriptEditor,
  type TranscriptStatus,
} from '../../components/audio/TranscriptEditor';
import { ListingForm } from '../../components/listings/ListingForm';
import { ListingImageUploader } from '../../components/listings/ListingImageUploader';
import { ListingPreview } from '../../components/listings/ListingPreview';
import { VisionResultCard } from '../../components/listings/VisionResultCard';
import {
  Button,
  ConfirmationDialog,
  EmptyState,
  ErrorAlert,
  Spinner,
  SuccessAlert,
} from '../../components/shared';

const TOTAL_STEPS = 14;

const VOICE_STEPS: { step: VoiceStep; label: string; question: string; optional?: boolean }[] = [
  { step: 'CROP', label: 'Crop', question: 'What crop do you have?' },
  { step: 'QUANTITY', label: 'Quantity', question: 'How much do you have?' },
  { step: 'UNIT', label: 'Unit', question: 'What unit is it measured in?' },
  { step: 'AVAILABILITY', label: 'Availability', question: 'When will it be available?' },
  { step: 'PRICE', label: 'Price', question: 'What price per unit?' },
  {
    step: 'DESCRIPTION',
    label: 'Additional info',
    question: 'Any additional information?',
    optional: true,
  },
];

const EXTRACTION_MESSAGES = [
  'Reviewing farmer responses…',
  'Understanding crop details…',
  'Preparing listing information…',
];

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  tw: 'Twi',
  ga: 'Ga',
  ee: 'Ewe',
};

const FIX_STEP_MAP: Record<string, number> = {
  crop: 10,
  quantity: 10,
  unit: 10,
  pricePerUnit: 10,
  price: 10,
  availableDate: 10,
  description: 10,
  region: 10,
  community: 10,
  image: 11,
  imageUrl: 11,
  visionReview: 12,
  vision: 12,
  agentConfirmed: 12,
};

interface AcceptedTranscript {
  step: VoiceStep;
  label: string;
  transcript: string;
}

type PublishState = 'idle' | 'publishing' | 'success' | 'blocked' | 'failed';

const VoiceListingWizard: React.FC = () => {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [voiceStepIndex, setVoiceStepIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus>('idle');
  const [acceptedTranscripts, setAcceptedTranscripts] = useState<AcceptedTranscript[]>([]);
  const [showRecorder, setShowRecorder] = useState(true);
  const [extractionMessageIndex, setExtractionMessageIndex] = useState(0);
  const [listing, setListing] = useState<Listing | null>(null);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [listingSaved, setListingSaved] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(true);
  const [visionReviewDone, setVisionReviewDone] = useState(false);
  const [visionReviewPending, setVisionReviewPending] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<GeneratedAudio | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [ackPending, setAckPending] = useState(false);
  const [confirmationComplete, setConfirmationComplete] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  const sessionRequested = useRef(false);

  const { data: farmer, isLoading, isError } = useQuery({
    queryKey: ['farmer', farmerId],
    queryFn: () => farmersApi.getFarmer(farmerId!),
    enabled: Boolean(farmerId),
  });

  const createSessionMutation = useMutation({
    mutationFn: () => voiceApi.createVoiceSession(farmerId!),
    onSuccess: (session) => setSessionId(session._id),
  });

  useEffect(() => {
    if (farmer && !sessionId && !sessionRequested.current) {
      sessionRequested.current = true;
      createSessionMutation.mutate();
    }
  }, [farmer, sessionId, createSessionMutation]);

  const currentVoiceStep = VOICE_STEPS[voiceStepIndex];

  const handleRecordingComplete = async (blob: Blob) => {
    if (!sessionId || !farmer) return;
    setShowRecorder(false);
    setTranscriptStatus('uploading');
    try {
      setTranscriptStatus('transcribing');
      const result = await voiceApi.uploadVoiceResponse(sessionId, {
        audioBlob: blob,
        step: currentVoiceStep.step,
        language: farmer.preferredLanguage ?? 'en',
      });
      setTranscript(result.transcript);
      setTranscriptStatus('done');
    } catch {
      setTranscript('');
      setTranscriptStatus('failed');
    }
  };

  const handleAcceptTranscript = async (editedTranscript: string) => {
    if (!sessionId) return;
    try {
      await voiceApi.editVoiceResponse(sessionId, currentVoiceStep.step, editedTranscript);
    } catch {
      // Continue locally if backend not wired yet
    }
    setAcceptedTranscripts((prev) => {
      const filtered = prev.filter((t) => t.step !== currentVoiceStep.step);
      return [
        ...filtered,
        { step: currentVoiceStep.step, label: currentVoiceStep.label, transcript: editedTranscript },
      ];
    });
    setShowRecorder(false);
  };

  const goToNextStep = () => {
    setShowRecorder(true);
    setTranscript('');
    setTranscriptStatus('idle');
    if (currentStep < 7) {
      setCurrentStep((s) => s + 1);
      setVoiceStepIndex((i) => i + 1);
    } else {
      setCurrentStep(8);
    }
  };

  const handleProceedToExtraction = async () => {
    if (!sessionId) return;
    setCurrentStep(9);
    try {
      await voiceApi.completeVoiceSession(sessionId);
    } catch {
      // Continue if backend not wired
    }
    try {
      const extracted = await listingsApi.extractListing(sessionId);
      setListing({ ...extracted, farmerName: farmer?.fullName, community: extracted.community ?? farmer?.community });
      setExtractionFailed(false);
    } catch {
      setListing({ _id: '', farmer: farmerId ?? '', farmerName: farmer?.fullName, community: farmer?.community });
      setExtractionFailed(true);
    }
    setCurrentStep(10);
  };

  const handleSaveListing = async (payload: Parameters<typeof listingsApi.updateListing>[1]) => {
    if (!listing?._id) return;
    setSavingListing(true);
    try {
      const updated = await listingsApi.updateListing(listing._id, payload);
      setListing({ ...updated, farmerName: farmer?.fullName });
      setListingSaved(true);
    } finally {
      setSavingListing(false);
    }
  };

  const handleImageUpload = async (file: File, onProgress: (pct: number) => void) => {
    if (!listing?._id) throw new Error('No listing');
    setImageUploading(true);
    try {
      const updated = await listingsApi.uploadListingImage(listing._id, file, onProgress);
      setListing({ ...updated, farmerName: farmer?.fullName });
      setShowImageUploader(false);
      setVisionReviewDone(false);
    } finally {
      setImageUploading(false);
    }
  };

  const handleVisionApprove = async () => {
    if (!listing?._id) return;
    setVisionReviewPending(true);
    try {
      const updated = await listingsApi.submitVisionReview(listing._id, { approved: true });
      setListing({ ...updated, farmerName: farmer?.fullName });
      setVisionReviewDone(true);
    } catch {
      setVisionReviewDone(true);
    } finally {
      setVisionReviewPending(false);
    }
  };

  const handleVisionReject = async (explanation: string) => {
    if (!listing?._id) return;
    setVisionReviewPending(true);
    try {
      const updated = await listingsApi.submitVisionReview(listing._id, {
        approved: false,
        explanation,
      });
      setListing({ ...updated, farmerName: farmer?.fullName });
      setShowImageUploader(true);
      setVisionReviewDone(false);
    } catch {
      setShowImageUploader(true);
    } finally {
      setVisionReviewPending(false);
    }
  };

  const handlePublish = async () => {
    if (!listing?._id) return;
    setPublishState('publishing');
    setMissingFields([]);
    try {
      const updated = await listingsApi.publishListing(listing._id);
      setListing({ ...updated, farmerName: farmer?.fullName });
      setPublishState('success');
      setCurrentStep(14);
      loadConfirmationAudio(updated._id);
    } catch (err) {
      if (isPublishBlockedError(err)) {
        setMissingFields(err.response.data.data.missingFields);
        setPublishState('blocked');
      } else {
        setPublishState('failed');
      }
    }
  };

  const loadConfirmationAudio = async (listingId: string) => {
    setAudioLoading(true);
    try {
      const audio = await listingsApi.generateConfirmationAudio(listingId, 'PUBLISHED');
      setGeneratedAudio(audio);
    } catch {
      setGeneratedAudio(null);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleAck = async (payload: { farmerHeard: boolean; farmerConfirmed: boolean }) => {
    if (!generatedAudio?._id) return;
    setAckPending(true);
    try {
      await listingsApi.ackConfirmationAudio(generatedAudio._id, payload);
      setConfirmedAt(new Date().toISOString());
      setConfirmationComplete(true);
    } catch {
      setConfirmedAt(new Date().toISOString());
      setConfirmationComplete(true);
    } finally {
      setAckPending(false);
    }
  };

  const goToVoiceStep = (index: number) => {
    setVoiceStepIndex(index);
    setCurrentStep(index + 2);
    setShowRecorder(true);
    setTranscript('');
    setTranscriptStatus('idle');
  };

  const isCurrentStepAccepted = acceptedTranscripts.some((t) => t.step === currentVoiceStep?.step);

  useEffect(() => {
    if (currentStep !== 9) return;
    const interval = setInterval(() => {
      setExtractionMessageIndex((i) => (i + 1) % EXTRACTION_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [currentStep]);

  if (isLoading || createSessionMutation.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !farmer) {
    return (
      <EmptyState
        title="Farmer not found"
        actionLabel="Back to farmers"
        onAction={() => navigate('/agent/farmers')}
      />
    );
  }

  const previewListing: Listing = {
    ...(listing ?? { _id: '', farmer: farmerId ?? '' }),
    farmerName: farmer.fullName,
    community: listing?.community ?? farmer.community,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to={`/agent/farmers/${farmerId}`} className="text-sm text-primary-600 hover:underline">
          ← Back to farmer
        </Link>
        <span className="text-sm font-medium text-surface-600">
          Step {currentStep} of {TOTAL_STEPS}
        </span>
      </div>

      <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-600 transition-all duration-300"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {currentStep === 1 && (
        <div className="card p-6 space-y-4">
          <h1 className="text-xl font-bold">Confirm farmer</h1>
          <div className="bg-surface-50 rounded-lg p-4">
            <p className="text-lg font-semibold">{farmer.fullName}</p>
            <p className="text-surface-600">
              Preferred language:{' '}
              {LANGUAGE_LABELS[farmer.preferredLanguage ?? ''] ?? farmer.preferredLanguage ?? 'English'}
            </p>
          </div>
          <Link to="/agent/farmers" className="text-sm text-primary-600 hover:underline">
            Change farmer
          </Link>
          <Button size="lg" className="w-full" onClick={() => setCurrentStep(2)}>
            Next
          </Button>
        </div>
      )}

      {currentStep >= 2 && currentStep <= 7 && currentVoiceStep && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">{currentVoiceStep.label}</h1>
          {showRecorder && (
            <AudioRecorder label={currentVoiceStep.question} onRecordingComplete={handleRecordingComplete} />
          )}
          {!showRecorder && (
            <TranscriptEditor
              transcript={transcript}
              status={transcriptStatus}
              onAccept={handleAcceptTranscript}
              onRecordAgain={() => {
                setShowRecorder(true);
                setTranscript('');
                setTranscriptStatus('idle');
              }}
            />
          )}
          {currentVoiceStep.optional && currentStep === 7 && (
            <Button size="lg" variant="secondary" className="w-full" onClick={() => setCurrentStep(8)}>
              Skip this step
            </Button>
          )}
          {isCurrentStepAccepted && (
            <Button size="lg" className="w-full" onClick={goToNextStep}>
              Next
            </Button>
          )}
        </div>
      )}

      {currentStep === 8 && (
        <div className="card p-6 space-y-4">
          <h1 className="text-xl font-bold">Review responses</h1>
          <ul className="space-y-3">
            {acceptedTranscripts.map((item) => (
              <li key={item.step} className="border border-surface-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-surface-900">{item.label}</p>
                    <p className="text-surface-700 mt-1">{item.transcript}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const idx = VOICE_STEPS.findIndex((s) => s.step === item.step);
                      if (idx >= 0) goToVoiceStep(idx);
                    }}
                  >
                    Back to fix
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button
            size="lg"
            className="w-full"
            onClick={handleProceedToExtraction}
            disabled={acceptedTranscripts.length === 0}
          >
            Continue to AI extraction
          </Button>
        </div>
      )}

      {currentStep === 9 && (
        <div className="card p-8 flex flex-col items-center gap-4 text-center">
          <Spinner size="lg" />
          <h1 className="text-xl font-bold">AI extraction</h1>
          <p className="text-lg text-surface-600">{EXTRACTION_MESSAGES[extractionMessageIndex]}</p>
        </div>
      )}

      {currentStep === 10 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Edit listing details</h1>
          {extractionFailed && (
            <ErrorAlert>
              AI extraction didn&apos;t work this time — please fill in the details manually below.
            </ErrorAlert>
          )}
          <div className="card p-6">
            <ListingForm initialValues={listing ?? undefined} onSave={handleSaveListing} saving={savingListing} />
          </div>
          {(listingSaved || listing?._id) && (
            <Button size="lg" className="w-full" onClick={() => setCurrentStep(11)}>
              Continue to photo
            </Button>
          )}
        </div>
      )}

      {currentStep === 11 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Crop photo</h1>
          {!listing?.imageUrl || showImageUploader ? (
            <ListingImageUploader
              onUpload={handleImageUpload}
              disabled={!listing?._id || imageUploading}
            />
          ) : (
            <>
              <VisionResultCard
                imageUrl={listing.imageUrl}
                observation={listing.visionObservation}
                uploading={imageUploading}
                mode="preview"
                onApprove={() => {}}
                onReject={() => {}}
                onUploadAnother={() => setShowImageUploader(true)}
                onContinueManual={() => setCurrentStep(12)}
              />
              <Button size="lg" className="w-full" onClick={() => setCurrentStep(12)}>
                Next
              </Button>
            </>
          )}
        </div>
      )}

      {currentStep === 12 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Vision review</h1>
          <VisionResultCard
            imageUrl={listing?.imageUrl}
            observation={listing?.visionObservation}
            onApprove={handleVisionApprove}
            onReject={handleVisionReject}
            onUploadAnother={() => {
              setShowImageUploader(true);
              setCurrentStep(11);
            }}
            onContinueManual={() => setVisionReviewDone(true)}
            reviewPending={visionReviewPending}
            mode="review"
          />
          {visionReviewDone && (
            <Button size="lg" className="w-full" onClick={() => setCurrentStep(13)}>
              Next
            </Button>
          )}
        </div>
      )}

      {currentStep === 13 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Preview listing</h1>
          <ListingPreview listing={previewListing} farmerDisplayName={farmer.fullName} />

          {publishState === 'blocked' && missingFields.length > 0 && (
            <ErrorAlert>
              <p className="font-medium mb-2">Cannot go live yet. Missing:</p>
              <ul className="space-y-2">
                {missingFields.map((field) => (
                  <li key={field} className="flex items-center justify-between gap-2">
                    <span>{field}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCurrentStep(FIX_STEP_MAP[field] ?? 10)}
                    >
                      Fix this
                    </Button>
                  </li>
                ))}
              </ul>
            </ErrorAlert>
          )}

          {publishState === 'failed' && (
            <ErrorAlert>Could not publish listing. Please try again.</ErrorAlert>
          )}

          {publishState === 'success' && (
            <SuccessAlert>Listing is now live on the marketplace.</SuccessAlert>
          )}

          <div className="flex flex-col gap-3">
            <Button size="lg" variant="secondary" onClick={() => setCurrentStep(10)}>
              Return to edit
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/agent/farmers')}
            >
              Save draft
            </Button>
            <Button
              size="lg"
              loading={publishState === 'publishing'}
              disabled={publishState === 'publishing' || !listing?._id}
              onClick={handlePublish}
            >
              Publish listing
            </Button>
            <Button size="lg" variant="danger" onClick={() => setShowCancelDialog(true)}>
              Cancel listing
            </Button>
          </div>
        </div>
      )}

      {currentStep === 14 && (
        <div className="space-y-4">
          {confirmationComplete ? (
            <div className="card p-8 text-center space-y-4">
              <SuccessAlert>Listing is live and farmer confirmed!</SuccessAlert>
              <p className="text-lg font-semibold text-surface-900">
                Listing is live and farmer confirmed!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button size="lg" onClick={() => navigate('/agent/farmers')}>
                  Back to farmer list
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate(`/agent/farmers/${farmerId}/create-listing`)}
                >
                  Create another listing
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold">Farmer confirmation</h1>
              <SuccessAlert>Listing is now live on the marketplace.</SuccessAlert>
              {generatedAudio ? (
                <GeneratedAudioPlayer
                  audioUrl={generatedAudio.audioUrl}
                  loading={audioLoading}
                  onRegenerate={() => listing?._id && loadConfirmationAudio(listing._id)}
                  onAck={handleAck}
                  ackPending={ackPending}
                  confirmedAt={confirmedAt}
                />
              ) : (
                <div className="card p-6 space-y-4">
                  {audioLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : (
                    <>
                      <p className="text-surface-600">
                        Could not generate audio. You can still finish without it.
                      </p>
                      <Button size="lg" onClick={() => setConfirmationComplete(true)}>
                        Finish without audio
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmationDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={() => navigate('/agent/farmers')}
        title="Cancel listing?"
        message="This will discard the current listing draft and return to the farmer list."
        confirmLabel="Discard listing"
        variant="danger"
      />
    </div>
  );
};

export default VoiceListingWizard;
