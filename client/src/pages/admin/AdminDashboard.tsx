import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';
import { ErrorAlert, Skeleton } from '../../components/shared';

const STAT_CARDS = [
  { key: 'totalFarmers' as const, label: 'Total farmers' },
  { key: 'totalAgents' as const, label: 'Total agents' },
  { key: 'publishedListings' as const, label: 'Live listings' },
  { key: 'pendingListings' as const, label: 'Pending listings' },
  { key: 'totalOrders' as const, label: 'Total orders' },
  { key: 'completedOrders' as const, label: 'Completed orders' },
  { key: 'failedAiRequests' as const, label: 'Failed AI requests' },
];

const AdminDashboard: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboardStats,
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-surface-900 mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="card p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-10 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-surface-900 mb-6">Admin Dashboard</h1>
        <ErrorAlert>
          <p className="mb-3">Could not load dashboard statistics.</p>
          <button type="button" className="text-sm font-medium underline" onClick={() => refetch()}>
            Retry
          </button>
        </ErrorAlert>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="card p-6">
            <p className="text-sm text-surface-500 mb-2">{card.label}</p>
            <p className="text-4xl font-bold text-surface-900">{data[card.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
