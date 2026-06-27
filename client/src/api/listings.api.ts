import apiClient from './api-client';

export type VisionStatus =
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'NEEDS_HUMAN_REVIEW'
  | 'PENDING';

export interface VisionObservation {
  description?: string;
  status?: VisionStatus;
  flaggedIssues?: string[];
  reviewedByAgent?: boolean;
}

export interface Listing {
  _id: string;
  farmer: string;
  farmerName?: string;
  agent?: string;
  voiceSession?: string;
  crop?: string;
  quantity?: number;
  unit?: string;
  pricePerUnit?: number;
  availableDate?: string;
  expiryDate?: string;
  description?: string;
  region?: string;
  district?: string;
  community?: string;
  imageUrl?: string;
  visionObservation?: VisionObservation;
  status?: string;
  rejectionReason?: string;
  publishedAt?: string;
}

export interface ListingFormPayload {
  crop?: string;
  quantity?: number;
  unit?: string;
  pricePerUnit?: number;
  availableDate?: string;
  expiryDate?: string;
  description?: string;
  region?: string;
  district?: string;
  community?: string;
}

export interface PublishBlockedError {
  success: false;
  error: 'Cannot publish';
  data: { missingFields: string[] };
}

export interface GeneratedAudio {
  _id: string;
  audioUrl: string;
  textContent?: string;
}

interface RawListing {
  uuid?: string;
  _id?: string;
  farmer?: string | { uuid: string; fullName?: string; community?: string };
  fieldAgent?: string | { uuid: string };
  voiceSession?: string | { uuid: string };
  title?: string;
  crop?: string;
  quantity?: number | string;
  unit?: string;
  pricePerUnit?: number | string;
  availableDate?: string;
  expiresAt?: string;
  expiryDate?: string;
  description?: string;
  region?: string;
  district?: string;
  community?: string;
  imageUrl?: string;
  visionObservation?: VisionObservation;
  visualObservation?: string;
  visionDescription?: string;
  status?: string;
  rejectionReason?: string;
  publishedAt?: string;
}

function parseVisionObservation(raw: RawListing): VisionObservation | undefined {
  if (raw.visionObservation) return raw.visionObservation;
  if (raw.visionDescription || raw.visualObservation) {
    return {
      description: raw.visionDescription ?? raw.visualObservation,
      status: 'COMPLETED',
      flaggedIssues: [],
      reviewedByAgent: false,
    };
  }
  return undefined;
}

function mapListing(raw: RawListing): Listing {
  const farmerObj = typeof raw.farmer === 'object' ? raw.farmer : undefined;
  return {
    _id: raw.uuid ?? raw._id ?? '',
    farmer: farmerObj?.uuid ?? (typeof raw.farmer === 'string' ? raw.farmer : ''),
    farmerName: farmerObj?.fullName,
    agent: typeof raw.fieldAgent === 'object' ? raw.fieldAgent.uuid : raw.fieldAgent,
    voiceSession:
      typeof raw.voiceSession === 'object' ? raw.voiceSession.uuid : raw.voiceSession,
    crop: raw.crop ?? raw.title,
    quantity: raw.quantity != null ? Number(raw.quantity) : undefined,
    unit: raw.unit,
    pricePerUnit: raw.pricePerUnit != null ? Number(raw.pricePerUnit) : undefined,
    availableDate: raw.availableDate,
    expiryDate: raw.expiryDate ?? raw.expiresAt,
    description: raw.description,
    region: raw.region,
    district: raw.district,
    community: raw.community ?? farmerObj?.community,
    imageUrl: raw.imageUrl,
    visionObservation: parseVisionObservation(raw),
    status: raw.status,
    rejectionReason: raw.rejectionReason,
    publishedAt: raw.publishedAt,
  };
}

function mapAudio(raw: { uuid?: string; _id?: string; audioPath?: string; audioUrl?: string }): GeneratedAudio {
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const url = raw.audioUrl ?? (raw.audioPath ? `${base}${raw.audioPath}` : '');
  return { _id: raw.uuid ?? raw._id ?? '', audioUrl: url };
}

export const listingsApi = {
  extractListing: async (voiceSessionId: string): Promise<Listing> => {
    const { data } = await apiClient.post<{ success: boolean; data: { listing: RawListing } }>(
      `/voice-sessions/${voiceSessionId}/extract-listing`
    );
    return mapListing(data.data.listing);
  },

  updateListing: async (id: string, payload: ListingFormPayload): Promise<Listing> => {
    const { data } = await apiClient.patch<{ success: boolean; data: { listing: RawListing } }>(
      `/listings/${id}`,
      payload
    );
    return mapListing(data.data.listing);
  },

  getListing: async (id: string): Promise<Listing> => {
    const { data } = await apiClient.get<{ success: boolean; data: { listing: RawListing } }>(
      `/listings/${id}`
    );
    return mapListing(data.data.listing);
  },

  uploadListingImage: async (
    id: string,
    imageFile: File,
    onProgress?: (percent: number) => void
  ): Promise<Listing> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const { data } = await apiClient.post<{ success: boolean; data: { listing: RawListing } }>(
      `/listings/${id}/image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      }
    );
    return mapListing(data.data.listing);
  },

  submitVisionReview: async (
    id: string,
    payload: { approved: boolean; explanation?: string }
  ): Promise<Listing> => {
    const { data } = await apiClient.patch<{ success: boolean; data: { listing: RawListing } }>(
      `/listings/${id}/vision-review`,
      payload
    );
    return mapListing(data.data.listing);
  },

  publishListing: async (id: string): Promise<Listing> => {
    const { data } = await apiClient.post<{ success: boolean; data: { listing: RawListing } }>(
      `/listings/${id}/publish`
    );
    return mapListing(data.data.listing);
  },

  unpublishListing: async (id: string): Promise<Listing> => {
    const { data } = await apiClient.post<{ success: boolean; data: { listing: RawListing } }>(
      `/listings/${id}/unpublish`
    );
    return mapListing(data.data.listing);
  },

  rejectListing: async (id: string, reason: string): Promise<Listing> => {
    const { data } = await apiClient.patch<{ success: boolean; data: { listing: RawListing } }>(
      `/admin/listings/${id}/status`,
      { status: 'REJECTED', rejectionReason: reason }
    );
    return mapListing(data.data.listing);
  },

  generateConfirmationAudio: async (
    id: string,
    messageType: 'PUBLISHED'
  ): Promise<GeneratedAudio> => {
    const { data } = await apiClient.post<{
      success: boolean;
      data: { audio: { uuid?: string; audioPath?: string; audioUrl?: string } };
    }>(`/listings/${id}/generate-confirmation`, { messageType });
    return mapAudio(data.data.audio);
  },

  ackConfirmationAudio: async (
    audioId: string,
    payload: { farmerHeard: boolean; farmerConfirmed: boolean }
  ): Promise<void> => {
    await apiClient.patch(`/generated-audio/${audioId}/farmer-confirmed`, payload);
  },

  listListings: async (params?: { status?: string; page?: number }): Promise<{
    listings: Listing[];
    pagination: { page: number; totalPages: number; total: number };
  }> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: RawListing[];
      pagination: { page: number; totalPages: number; total: number };
    }>('/listings', { params });
    return {
      listings: data.data.map(mapListing),
      pagination: data.pagination,
    };
  },
};

export function isPublishBlockedError(err: unknown): err is { response: { data: PublishBlockedError } } {
  const axiosErr = err as { response?: { status?: number; data?: PublishBlockedError } };
  return (
    axiosErr.response?.status === 400 &&
    axiosErr.response?.data?.error === 'Cannot publish' &&
    Array.isArray(axiosErr.response?.data?.data?.missingFields)
  );
}

export function getListingImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${base}${imageUrl}`;
}
