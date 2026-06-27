import apiClient from './api-client';

export interface Farmer {
  _id: string;
  fullName: string;
  phone?: string;
  gender?: string;
  preferredLanguage?: string;
  region?: string;
  district?: string;
  community?: string;
  notes?: string;
  consentGiven: boolean;
  registeredBy?: string;
  status?: string;
  listingCount?: number;
  createdAt: string;
}

export interface CreateFarmerPayload {
  fullName: string;
  phone: string;
  gender?: string;
  preferredLanguage?: string;
  region?: string;
  district?: string;
  community?: string;
  notes?: string;
  consentConfirmed: boolean;
}

export type UpdateFarmerPayload = Partial<CreateFarmerPayload>;

export interface ListFarmersParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RawFarmer {
  uuid: string;
  fullName: string;
  phone?: string | null;
  gender?: string | null;
  preferredLanguage?: string | null;
  region?: string | null;
  district?: string | null;
  community?: string | null;
  notes?: string | null;
  consentConfirmedAt?: string | null;
  status?: string;
  listingCount?: number;
  createdAt: string;
  fieldAgent?: { uuid: string; name: string };
}

function mapFarmer(raw: RawFarmer): Farmer {
  return {
    _id: raw.uuid,
    fullName: raw.fullName,
    phone: raw.phone ?? undefined,
    gender: raw.gender ?? undefined,
    preferredLanguage: raw.preferredLanguage ?? undefined,
    region: raw.region ?? undefined,
    district: raw.district ?? undefined,
    community: raw.community ?? undefined,
    notes: raw.notes ?? undefined,
    consentGiven: Boolean(raw.consentConfirmedAt),
    registeredBy: raw.fieldAgent?.uuid,
    status: raw.status,
    listingCount: raw.listingCount,
    createdAt: raw.createdAt,
  };
}

export const farmersApi = {
  createFarmer: async (payload: CreateFarmerPayload): Promise<Farmer> => {
    const { data } = await apiClient.post<{ success: boolean; data: { farmer: RawFarmer } }>(
      '/farmers',
      payload
    );
    return mapFarmer(data.data.farmer);
  },

  listFarmers: async (
    params: ListFarmersParams = {}
  ): Promise<{ farmers: Farmer[]; pagination: PaginationMeta }> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: RawFarmer[];
      pagination: PaginationMeta;
    }>('/farmers', { params });
    return {
      farmers: data.data.map(mapFarmer),
      pagination: data.pagination,
    };
  },

  getFarmer: async (id: string): Promise<Farmer> => {
    const { data } = await apiClient.get<{ success: boolean; data: { farmer: RawFarmer } }>(
      `/farmers/${id}`
    );
    return mapFarmer(data.data.farmer);
  },

  updateFarmer: async (id: string, payload: UpdateFarmerPayload): Promise<Farmer> => {
    const { data } = await apiClient.patch<{ success: boolean; data: { farmer: RawFarmer } }>(
      `/farmers/${id}`,
      payload
    );
    return mapFarmer(data.data.farmer);
  },
};
