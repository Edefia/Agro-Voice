import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AIRun } from '../../api/admin.api';
import {
  Badge,
  Button,
  EmptyState,
  ErrorAlert,
  Select,
  Skeleton,
} from '../../components/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'RETRYING', label: 'Retrying' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'SPEECH_TO_TEXT', label: 'Speech to text' },
  { value: 'AGENT_CHAT', label: 'Agent chat' },
  { value: 'VISION', label: 'Vision' },
  { value: 'TEXT_TO_SPEECH', label: 'Text to speech' },
];

function statusColor(status: string): 'green' | 'yellow' | 'red' | 'gray' | 'blue' {
  if (status === 'COMPLETED') return 'green';
  if (status === 'FAILED') return 'red';
  if (status === 'RETRYING' || status === 'PROCESSING') return 'blue';
  return 'gray';
}

const AIRunRow: React.FC<{
  run: AIRun;
  onRetry: (id: string) => void;
  retryPending: boolean;
}> = ({ run, onRetry, retryPending }) => {
  const [expanded, setExpanded] = useState(false);
  const isFailed = run.status === 'FAILED';
  const errorMsg = run.errorMessage ?? '';
  const truncated = errorMsg.length > 80;

  return (
    <>
      <tr className="hover:bg-surface-50">
        <td className="px-4 py-3 text-sm">{run.apiType}</td>
        <td className="px-4 py-3 text-sm">
          {run.relatedFarmerName ?? run.relatedListingTitle ?? '—'}
        </td>
        <td className="px-4 py-3">
          <Badge color={statusColor(run.status)}>{run.status}</Badge>
        </td>
        <td className="px-4 py-3 text-sm">{run.attemptCount}</td>
        <td className="px-4 py-3 text-sm text-red-700 max-w-xs">
          {isFailed && errorMsg ? (
            <>
              {expanded || !truncated ? errorMsg : `${errorMsg.slice(0, 80)}…`}
              {truncated && (
                <button
                  type="button"
                  className="ml-1 text-primary-600 underline text-xs"
                  onClick={() => setExpanded((e) => !e)}
                >
                  {expanded ? 'Show less' : 'View full'}
                </button>
              )}
            </>
          ) : (
            '—'
          )}
        </td>
        <td className="px-4 py-3 text-sm text-surface-500">
          {new Date(run.createdAt).toLocaleDateString('en-GH')}
        </td>
        <td className="px-4 py-3 text-right">
          {isFailed && (
            <Button size="sm" loading={retryPending} onClick={() => onRetry(run._id)}>
              Retry
            </Button>
          )}
        </td>
      </tr>
    </>
  );
};

const AIMonitoring: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data: runs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'ai-runs', statusFilter, typeFilter],
    queryFn: () =>
      adminApi.listAIRuns({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      }),
  });

  const retryMutation = useMutation({
    mutationFn: adminApi.retryAIRun,
    onMutate: (id) => {
      setRetryingId(id);
      queryClient.setQueryData<AIRun[]>(
        ['admin', 'ai-runs', statusFilter, typeFilter],
        (old) =>
          old?.map((r) => (r._id === id ? { ...r, status: 'RETRYING' } : r)) ?? []
      );
    },
    onSettled: () => {
      setRetryingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai-runs'] });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-surface-900 mb-6">AI Monitoring</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-xl">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          label="API type"
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="card p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorAlert>
          <p className="mb-3">Could not load AI runs.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </ErrorAlert>
      )}

      {!isLoading && !isError && runs.length === 0 && (
        <EmptyState title="No AI runs found" />
      )}

      {!isLoading && !isError && runs.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-surface-600">API type</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">Related</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">Attempts</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">Error</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-surface-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {runs.map((run) => (
                <AIRunRow
                  key={run._id}
                  run={run}
                  onRetry={(id) => retryMutation.mutate(id)}
                  retryPending={retryingId === run._id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AIMonitoring;
