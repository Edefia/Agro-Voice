import React from 'react';
import { Badge } from '../shared/Badge';
import type { Listing } from '../../api/listings.api';
import { getListingImageUrl } from '../../api/listings.api';

interface ListingPreviewProps {
  listing: Listing;
  farmerDisplayName?: string;
}

const cropGradients: Record<string, string> = {
  maize: 'from-yellow-400 to-amber-500',
  cassava: 'from-amber-300 to-orange-400',
  tomatoes: 'from-red-400 to-rose-500',
  tomato: 'from-red-400 to-rose-500',
  plantain: 'from-green-400 to-emerald-500',
  yam: 'from-orange-400 to-amber-600',
  rice: 'from-lime-300 to-green-400',
  default: 'from-primary-400 to-primary-600',
};

function getCropGradient(crop?: string): string {
  const key = crop?.toLowerCase() ?? '';
  return cropGradients[key] ?? cropGradients.default;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(price?: number): string {
  if (price == null) return '—';
  return `GH₵ ${price.toFixed(2)}`;
}

function statusLabel(status?: string): string {
  if (status === 'PUBLISHED') return 'Live on marketplace';
  if (status === 'DRAFT') return 'Draft';
  if (status === 'PENDING_REVIEW') return 'Pending review';
  if (status === 'REJECTED') return 'Rejected';
  return status ?? 'Draft';
}

export const ListingPreview: React.FC<ListingPreviewProps> = ({
  listing,
  farmerDisplayName,
}) => {
  const imageUrl = getListingImageUrl(listing.imageUrl);
  const gradient = getCropGradient(listing.crop);
  const community = listing.community ?? '—';
  const name = farmerDisplayName ?? listing.farmerName ?? 'Farmer';

  return (
    <div className="card overflow-hidden max-w-md mx-auto">
      <div className="relative h-48 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={listing.crop ?? 'Crop'} className="w-full h-full object-cover" />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
          >
            <span className="text-5xl">🌾</span>
          </div>
        )}
        {listing.visionObservation?.status === 'COMPLETED' && (
          <div className="absolute top-2 right-2">
            <Badge color="green">Vision reviewed</Badge>
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        <div>
          <h3 className="text-xl font-bold text-surface-900 capitalize">{listing.crop ?? 'Untitled'}</h3>
          <p className="text-sm text-surface-500 mt-0.5">
            {name} · {community}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary-700">
            {formatPrice(listing.pricePerUnit)}
          </span>
          {listing.unit && <span className="text-sm text-surface-500">/ {listing.unit}</span>}
        </div>

        <p className="text-sm text-surface-600">
          {listing.quantity ?? '—'} {listing.unit ?? ''} available
        </p>

        <div className="text-sm text-surface-600 space-y-1">
          <p>
            <span className="font-medium text-surface-700">Available from:</span>{' '}
            {formatDate(listing.availableDate)}
          </p>
          {listing.expiryDate && (
            <p>
              <span className="font-medium text-surface-700">Expires:</span>{' '}
              {formatDate(listing.expiryDate)}
            </p>
          )}
        </div>

        {listing.description && (
          <p className="text-sm text-surface-600 border-t border-surface-100 pt-3">
            {listing.description}
          </p>
        )}

        {listing.visionObservation?.description && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <p className="text-sm font-bold text-amber-900">
              AI visual observation. Human confirmation is required.
            </p>
            <p className="text-sm text-surface-700">{listing.visionObservation.description}</p>
          </div>
        )}

        <Badge color="gray">{statusLabel(listing.status)}</Badge>
      </div>
    </div>
  );
};

export default ListingPreview;
