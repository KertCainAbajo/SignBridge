import { useQuery } from '@tanstack/react-query'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/States'
import { PageHeader } from '../../layouts/AppShell'
import { api, errorMessage } from '../../lib/api'
import type { AdminOverview as Overview } from '../../lib/types'

const stats: { key: keyof Overview; label: string }[] = [
  { key: 'users_total', label: 'Registered users' },
  { key: 'users_active_7d', label: 'Active in last 7 days' },
  { key: 'signs_total', label: 'Vocabulary entries' },
  { key: 'signs_recognizable', label: 'Signs the model recognizes' },
  { key: 'translations_30d', label: 'Saved translations (30 days)' },
]

export default function AdminOverview() {
  const q = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => (await api.get<{ data: Overview }>('/admin/overview')).data.data,
  })

  return (
    <>
      <PageHeader title="Admin overview" description="Live figures from the SignBridge database." />
      {q.isLoading && <Spinner />}
      {q.isError && (
        <div className="flex flex-col items-start gap-3">
          <Alert tone="error">{errorMessage(q.error)}</Alert>
          <Button variant="secondary" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {q.data && (
        <dl className="grid divide-y divide-border rounded-3xl border border-border bg-surface sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
          {stats.map(({ key, label }) => (
            <div key={key} className="px-6 py-6">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-1 text-3xl font-bold tabular-nums">{q.data[key].toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  )
}
