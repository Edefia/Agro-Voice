import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { farmersApi } from '../../api/farmers.api';
import {
  Badge,
  Button,
  EmptyState,
  ErrorAlert,
  Pagination,
  SearchInput,
  Skeleton,
} from '../../components/shared';

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  tw: 'Twi',
  ga: 'Ga',
  ee: 'Ewe',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const FarmerList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['farmers', search, page],
    queryFn: () => farmersApi.listFarmers({ search: search || undefined, page }),
  });

  const farmers = data?.farmers ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Farmers</h1>
        <Button size="lg" onClick={() => navigate('/agent/farmers/new')}>
          Register farmer
        </Button>
      </div>

      <div className="mb-6">
        <SearchInput
          onSearch={(q) => {
            setSearch(q);
            setPage(1);
          }}
          placeholder="Search by name, phone, or community…"
        />
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <ErrorAlert>
          <p className="mb-3">Could not load farmers. Please try again.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </ErrorAlert>
      )}

      {!isLoading && !isError && farmers.length === 0 && (
        <EmptyState
          title="No farmers yet — register your first farmer"
          actionLabel="Register farmer"
          onAction={() => navigate('/agent/farmers/new')}
        />
      )}

      {!isLoading && !isError && farmers.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-surface-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-600">Community</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-600">Language</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-600">Listings</th>
                  <th className="text-left px-4 py-3 font-medium text-surface-600">Registered</th>
                  <th className="text-right px-4 py-3 font-medium text-surface-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {farmers.map((farmer) => (
                  <tr key={farmer._id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium">{farmer.fullName}</td>
                    <td className="px-4 py-3">{farmer.community ?? '—'}</td>
                    <td className="px-4 py-3">
                      {LANGUAGE_LABELS[farmer.preferredLanguage ?? ''] ??
                        farmer.preferredLanguage ??
                        '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={farmer.listingCount && farmer.listingCount > 0 ? 'green' : 'gray'}>
                        {farmer.listingCount && farmer.listingCount > 0
                          ? 'Has listings'
                          : farmer.status ?? 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{farmer.listingCount ?? 0}</td>
                    <td className="px-4 py-3">{formatDate(farmer.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/agent/farmers/${farmer._id}`)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/agent/farmers/${farmer._id}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(`/agent/farmers/${farmer._id}/create-listing`)
                          }
                        >
                          Create Listing
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {farmers.map((farmer) => (
              <div key={farmer._id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-surface-900">{farmer.fullName}</p>
                    <p className="text-sm text-surface-500">{farmer.community ?? 'No community'}</p>
                  </div>
                  <Badge color={farmer.listingCount && farmer.listingCount > 0 ? 'green' : 'gray'}>
                    {farmer.listingCount && farmer.listingCount > 0 ? 'Has listings' : 'Active'}
                  </Badge>
                </div>
                <div className="text-sm text-surface-600 space-y-1">
                  <p>
                    Language:{' '}
                    {LANGUAGE_LABELS[farmer.preferredLanguage ?? ''] ??
                      farmer.preferredLanguage ??
                      '—'}
                  </p>
                  <p>Listings: {farmer.listingCount ?? 0}</p>
                  <p>Registered: {formatDate(farmer.createdAt)}</p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button size="lg" onClick={() => navigate(`/agent/farmers/${farmer._id}`)}>
                    View profile
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={() => navigate(`/agent/farmers/${farmer._id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => navigate(`/agent/farmers/${farmer._id}/create-listing`)}
                    >
                      Create Listing
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              className="mt-6"
            />
          )}

          {isFetching && !isLoading && (
            <p className="text-center text-sm text-surface-500 mt-4">Updating…</p>
          )}
        </>
      )}
    </div>
  );
};

export default FarmerList;
