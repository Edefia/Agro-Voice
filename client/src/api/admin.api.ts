import apiClient from './api-client';

export interface DashboardStats {
  totalFarmers: number;
  totalAgents: number;
  publishedListings: number;
  pendingListings: number;
  totalOrders: number;
  completedOrders: number;
  failedAiRequests: number;
}

export interface AdminAgent {
  _id: string;
  name: string;
  phone?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  farmerCount?: number;
}

export interface AIRun {
  _id: string;
  apiType: string;
  status: string;
  attemptCount: number;
  errorMessage?: string;
  relatedFarmerName?: string;
  relatedListingTitle?: string;
  createdAt: string;
}

export interface Complaint {
  _id: string;
  orderRef?: string;
  buyerName?: string;
  message: string;
  status: string;
  order?: {
    _id: string;
    status?: string;
    total?: number;
  };
  resolution?: string;
  createdAt: string;
}

interface RawAgent {
  uuid: string;
  name: string;
  phone?: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  farmerCount?: number;
  _count?: { farmers?: number };
}

interface RawAIRun {
  uuid: string;
  apiType: string;
  processingStatus: string;
  status?: string;
  attempts: number;
  errorMessage?: string | null;
  farmer?: { fullName?: string };
  listing?: { title?: string };
  createdAt: string;
}

interface RawComplaint {
  uuid: string;
  description: string;
  status: string;
  resolution?: string | null;
  createdAt: string;
  order?: { uuid?: string; orderReference?: string; status?: string; total?: number };
  buyer?: { name?: string };
}

function mapStats(raw: Record<string, number>): DashboardStats {
  return {
    totalFarmers: raw.totalFarmers ?? raw.farmers ?? 0,
    totalAgents: raw.totalAgents ?? raw.agents ?? 0,
    publishedListings: raw.publishedListings ?? 0,
    pendingListings: raw.pendingListings ?? 0,
    totalOrders: raw.totalOrders ?? raw.orders ?? 0,
    completedOrders: raw.completedOrders ?? 0,
    failedAiRequests: raw.failedAiRequests ?? raw.failedAiRuns ?? 0,
  };
}

export const adminApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<{ success: boolean; data: Record<string, number> }>(
      '/admin/dashboard'
    );
    return mapStats(data.data);
  },

  listAgents: async (params?: { search?: string }): Promise<AdminAgent[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: RawAgent[] }>(
      '/admin/agents',
      { params }
    );
    return data.data.map((a) => ({
      _id: a.uuid,
      name: a.name,
      phone: a.phone ?? undefined,
      status: a.status,
      farmerCount: a.farmerCount ?? a._count?.farmers ?? 0,
    }));
  },

  updateAgentStatus: async (
    id: string,
    status: 'ACTIVE' | 'SUSPENDED'
  ): Promise<AdminAgent> => {
    const { data } = await apiClient.patch<{ success: boolean; data: { agent: RawAgent } }>(
      `/admin/agents/${id}/status`,
      { status }
    );
    const a = data.data.agent;
    return {
      _id: a.uuid,
      name: a.name,
      phone: a.phone ?? undefined,
      status: a.status,
      farmerCount: a.farmerCount ?? a._count?.farmers ?? 0,
    };
  },

  listAIRuns: async (params?: {
    status?: string;
    type?: string;
  }): Promise<AIRun[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: RawAIRun[] }>(
      '/admin/ai-runs',
      { params }
    );
    return data.data.map((r) => ({
      _id: r.uuid,
      apiType: r.apiType,
      status: r.status ?? r.processingStatus,
      attemptCount: r.attempts,
      errorMessage: r.errorMessage ?? undefined,
      relatedFarmerName: r.farmer?.fullName,
      relatedListingTitle: r.listing?.title,
      createdAt: r.createdAt,
    }));
  },

  retryAIRun: async (id: string): Promise<AIRun> => {
    const { data } = await apiClient.post<{ success: boolean; data: { run: RawAIRun } }>(
      `/admin/ai-runs/${id}/retry`
    );
    const r = data.data.run;
    return {
      _id: r.uuid,
      apiType: r.apiType,
      status: r.status ?? r.processingStatus,
      attemptCount: r.attempts,
      errorMessage: r.errorMessage ?? undefined,
      relatedFarmerName: r.farmer?.fullName,
      relatedListingTitle: r.listing?.title,
      createdAt: r.createdAt,
    };
  },

  listComplaints: async (): Promise<Complaint[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: RawComplaint[] }>(
      '/admin/complaints'
    );
    return data.data.map((c) => ({
      _id: c.uuid,
      orderRef: c.order?.orderReference ?? c.order?.uuid,
      buyerName: c.buyer?.name,
      message: c.description,
      status: c.status,
      resolution: c.resolution ?? undefined,
      order: c.order
        ? {
            _id: c.order.uuid ?? '',
            status: c.order.status,
            total: c.order.total,
          }
        : undefined,
      createdAt: c.createdAt,
    }));
  },

  resolveComplaint: async (id: string, resolution: string): Promise<Complaint> => {
    const { data } = await apiClient.patch<{ success: boolean; data: { complaint: RawComplaint } }>(
      `/admin/complaints/${id}`,
      { status: 'RESOLVED', resolution }
    );
    const c = data.data.complaint;
    return {
      _id: c.uuid,
      orderRef: c.order?.orderReference ?? c.order?.uuid,
      buyerName: c.buyer?.name,
      message: c.description,
      status: c.status,
      resolution: c.resolution ?? undefined,
      createdAt: c.createdAt,
    };
  },

  listAdminListings: async (params?: { status?: string }): Promise<import('./listings.api').Listing[]> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: Array<{ uuid?: string; _id?: string; title?: string; status?: string; [key: string]: unknown }>;
    }>('/admin/listings', { params });
    return data.data.map((raw) => ({
      _id: raw.uuid ?? raw._id ?? '',
      farmer: '',
      crop: raw.title as string | undefined,
      status: raw.status,
      ...(raw as object),
    })) as import('./listings.api').Listing[];
  },

  updateListingStatus: async (
    id: string,
    payload: { status: string; rejectionReason?: string }
  ): Promise<void> => {
    await apiClient.patch(`/admin/listings/${id}/status`, payload);
  },
};
