import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';
import { listingsApi, type Listing } from '../../api/listings.api';
import { ListingPreview } from '../../components/listings/ListingPreview';
import { VisionResultCard } from '../../components/listings/VisionResultCard';
import {
  Badge,
  Button,
  EmptyState,
  ErrorAlert,
  Modal,
  Select,
  Skeleton,
  TextArea,
} from '../../components/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PUBLISHED', label: 'Live' },
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REJECTED', label: 'Rejected' },
];

const ListingModeration: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [visionListing, setVisionListing] = useState<Listing | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'listings', statusFilter],
    queryFn: () => adminApi.listAdminListings({ status: statusFilter || undefined }),
  });

  const listings = data ?? [];

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setActionPending(rejectId);
    try {
      await listingsApi.rejectListing(rejectId, rejectReason.trim());
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
      setRejectId(null);
      setRejectReason('');
    } finally {
      setActionPending(null);
    }
  };

  const handleUnpublish = async (id: string) => {
    setActionPending(id);
    try {
      await listingsApi.unpublishListing(id);
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
    } finally {
      setActionPending(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Listing Moderation</h1>

      <div className="mb-6 max-w-xs">
        <Select
          label="Filter by status"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4">
              <Skeleton className="h-40 w-full mb-3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <ErrorAlert>
          <p className="mb-3">Could not load listings.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </ErrorAlert>
      )}

      {!isLoading && !isError && listings.length === 0 && (
        <EmptyState title="No listings match this filter" />
      )}

      {!isLoading && !isError && listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing._id} className="space-y-3">
              <ListingPreview listing={listing} />
              <div className="flex flex-wrap gap-2">
                <Badge color="gray">{listing.status ?? 'DRAFT'}</Badge>
                {listing.visionObservation && (
                  <Button size="sm" variant="ghost" onClick={() => setVisionListing(listing)}>
                    View vision
                  </Button>
                )}
                {listing.status === 'PUBLISHED' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={actionPending === listing._id}
                    onClick={() => handleUnpublish(listing._id)}
                  >
                    Unpublish
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setRejectId(listing._id)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(rejectId)}
        onClose={() => {
          setRejectId(null);
          setRejectReason('');
        }}
        title="Reject listing"
      >
        <TextArea
          label="Rejection reason *"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
        />
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="ghost" onClick={() => setRejectId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={Boolean(actionPending)}
            disabled={!rejectReason.trim()}
            onClick={handleReject}
          >
            Reject listing
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(visionListing)}
        onClose={() => setVisionListing(null)}
        title="Vision observation"
        size="lg"
      >
        {visionListing && (
          <VisionResultCard
            imageUrl={visionListing.imageUrl}
            observation={visionListing.visionObservation}
            mode="preview"
            onApprove={() => setVisionListing(null)}
            onReject={() => setVisionListing(null)}
            onUploadAnother={() => setVisionListing(null)}
            onContinueManual={() => setVisionListing(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default ListingModeration;
