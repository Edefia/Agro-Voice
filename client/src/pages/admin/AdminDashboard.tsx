import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';
import { Button, ErrorAlert, Skeleton } from '../../components/shared';

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

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-surface-900 tracking-tight">Overview</h1>
        <p className="text-sm text-surface-500 mt-2 max-w-2xl leading-relaxed">
          Platform-wide totals for farmers, agents, listings, orders, and AI health.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="card px-4 py-4">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <ErrorAlert>
          <p className="mb-3">Could not load dashboard statistics.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </ErrorAlert>
      )}

      {!isLoading && !isError && data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="card px-4 py-4">
              <p className="text-xs text-surface-500">{card.label}</p>
              <p className="text-2xl font-semibold text-surface-900 mt-1 tabular-nums">
                {data[card.key]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
