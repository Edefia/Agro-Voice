import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { farmersApi } from '../../api/farmers.api';
import { listingsApi, type Listing } from '../../api/listings.api';
import { ordersApi } from '../../api/orders.api';
import { AgentDashboardCharts } from '../../components/dashboard/AgentDashboardCharts';
import { Button, Badge, EmptyState, ErrorAlert } from '../../components/shared';
import { getListingStatusMeta, formatListingPrice } from '../../utils/listingDisplay';

type DateRange = '7' | '30' | 'all';

function filterByDateRange(listings: Listing[], range: DateRange): Listing[] {
  if (range === 'all') return listings;
  const days = range === '7' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return listings.filter((l) => {
    const d = l.createdAt ?? l.publishedAt;
    return d ? new Date(d).getTime() >= cutoff : true;
  });
}

function formatRangeLabel(range: DateRange): string {
  const end = new Date();
  if (range === 'all') return 'All time';
  const days = range === '7' ? 7 : 30;
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>('7');
  const [listingFilter, setListingFilter] = useState('');

  const { data: farmersData, isLoading: farmersLoading } = useQuery({
    queryKey: ['farmers', 'count'],
    queryFn: () => farmersApi.listFarmers({ limit: 1 }),
  });

  const { data: listingsData, isLoading: listingsLoading, isError, refetch } = useQuery({
    queryKey: ['agent', 'listings', 'recent'],
    queryFn: () => listingsApi.listListings({ page: 1, limit: 50 }),
  });

  const { data: liveData } = useQuery({
    queryKey: ['agent', 'listings', 'live-count'],
    queryFn: () => listingsApi.listListings({ status: 'PUBLISHED', limit: 1 }),
  });

  const { data: draftData } = useQuery({
    queryKey: ['agent', 'listings', 'draft-count'],
    queryFn: () => listingsApi.listListings({ status: 'DRAFT', limit: 1 }),
  });

  const { data: pendingOrdersData } = useQuery({
    queryKey: ['agent', 'orders', 'pending-count'],
    queryFn: () => ordersApi.getManagedOrders({ status: 'PENDING', limit: 1 }),
  });

  const allRecent = listingsData?.listings ?? [];
  const filteredRecent = useMemo(() => {
    let list = filterByDateRange(allRecent, dateRange);
    if (listingFilter) list = list.filter((l) => l.status === listingFilter);
    return list.slice(0, 8);
  }, [allRecent, dateRange, listingFilter]);

  const totalListings = listingsData?.pagination.total ?? 0;
  const liveCount = liveData?.pagination.total ?? 0;
  const draftCount = draftData?.pagination.total ?? 0;
  const farmerCount = farmersData?.pagination.total ?? 0;
  const pendingOrders = pendingOrdersData?.pagination.total ?? 0;
  const loading = listingsLoading || farmersLoading;

  const kpis = [
    { label: 'Farmers', value: farmerCount },
    { label: 'Listings', value: totalListings },
    { label: 'Live', value: liveCount },
    { label: 'Drafts', value: draftCount },
    { label: 'Pending orders', value: pendingOrders },
  ];

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-surface-900 tracking-tight">Overview</h1>
        <p className="text-sm text-surface-500 mt-2 max-w-2xl leading-relaxed">
          Key totals for your farmers, listings, and orders. Use the filters below to narrow the
          recent activity table (defaults to the last 7 days).
        </p>
      </div>

      <div className="card p-5 lg:p-6">
        <h2 className="text-sm font-semibold text-surface-900">Filters</h2>
        <p className="text-xs text-surface-500 mt-1 mb-5">
          Date range and status apply to the recent listings table. Summary charts use all-time totals.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date-range" className="block text-xs font-medium text-surface-600 mb-1.5">
              Date range
            </label>
            <select
              id="date-range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="input-base w-full"
            >
              <option value="7">Last 7 days — {formatRangeLabel('7')}</option>
              <option value="30">Last 30 days — {formatRangeLabel('30')}</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div>
            <label htmlFor="listing-status" className="block text-xs font-medium text-surface-600 mb-1.5">
              Listing status
            </label>
            <select
              id="listing-status"
              value={listingFilter}
              onChange={(e) => setListingFilter(e.target.value)}
              className="input-base w-full"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="SOLD_OUT">Sold out</option>
            </select>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="card px-4 py-4">
              <p className="text-xs text-surface-500">{k.label}</p>
              <p className="text-2xl font-semibold text-surface-900 mt-1 tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card h-56 animate-pulse bg-cream-200" />
          <div className="card h-56 animate-pulse bg-cream-200" />
        </div>
      ) : (
        <AgentDashboardCharts
          farmerCount={farmerCount}
          totalListings={totalListings}
          liveCount={liveCount}
          draftCount={draftCount}
          pendingOrders={pendingOrders}
        />
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-surface-900">Recent listings</h2>
          <Link to="/agent/listings" className="text-xs text-surface-500 hover:text-surface-900 transition-colors">
            View all →
          </Link>
        </div>

        {isError && (
          <ErrorAlert>
            <p className="mb-3">Could not load listings.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </ErrorAlert>
        )}

        {!loading && !isError && filteredRecent.length === 0 && (
          <div className="card p-8">
            <EmptyState
              title="No listings in this range"
              message="Register a farmer and start a voice listing to see activity here."
              actionLabel="Register farmer"
              onAction={() => navigate('/agent/farmers/new')}
            />
          </div>
        )}

        {!loading && !isError && filteredRecent.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs text-surface-500">
                  <th className="px-4 py-3 font-medium">Crop</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Farmer</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {filteredRecent.map((listing) => {
                  const status = getListingStatusMeta(listing.status);
                  return (
                    <tr key={listing._id} className="hover:bg-cream-150 transition-colors">
                      <td className="px-4 py-3 text-surface-900 capitalize">{listing.crop ?? '—'}</td>
                      <td className="px-4 py-3 text-surface-600 hidden sm:table-cell truncate max-w-[140px]">
                        {listing.farmerName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-surface-700 tabular-nums">
                        {formatListingPrice(listing.pricePerUnit)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={status.color}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button size="sm" onClick={() => navigate('/agent/farmers/new')}>
          Register farmer
        </Button>
        <Button size="sm" variant="secondary" onClick={() => navigate('/agent/farmers')}>
          Start listing
        </Button>
      </div>
    </div>
  );
};

export default AgentDashboard;
