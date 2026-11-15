import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Hand, History as HistoryIcon, Keyboard, Mic, Trash2, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/Alert'
import { Button, ButtonLink } from '../../components/ui/Button'
import { EmptyState, Spinner } from '../../components/ui/States'
import { PageHeader } from '../../layouts/AppShell'
import { api, errorMessage } from '../../lib/api'
import { cn } from '../../lib/cn'
import { speak, ttsSupported } from '../../lib/speech'
import type { Paginated, Translation, TranslationSource } from '../../lib/types'

const sources: { value: TranslationSource | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sign', label: 'Sign' },
  { value: 'speech', label: 'Speech' },
  { value: 'text', label: 'Text' },
]
const sourceIcon = { sign: Hand, speech: Mic, text: Keyboard }

const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export default function History() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [source, setSource] = useState<TranslationSource | 'all'>('all')

  const q = useInfiniteQuery({
    queryKey: ['translations', source],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<Paginated<Translation>>('/translations', {
          params: { page: pageParam, per_page: 20, source: source === 'all' ? undefined : source },
        })
      ).data,
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/translations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['translations'] }),
  })
  const clearAll = useMutation({
    mutationFn: () => api.delete('/translations'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['translations'] }),
  })

  const items = q.data?.pages.flatMap((p) => p.data) ?? []
  const total = q.data?.pages[0]?.meta.total ?? 0

  return (
    <>
      <PageHeader
        title="History"
        description="Text you saved from the translator and speech tools. Camera video is never stored."
        actions={
          total > 0 && (
            <Button
              variant="ghost"
              className="text-error"
              loading={clearAll.isPending}
              icon={<Trash2 className="size-4" aria-hidden />}
              onClick={() => window.confirm('Delete your entire translation history?') && clearAll.mutate()}
            >
              Clear history
            </Button>
          )
        }
      />

      {!user!.preferences.save_history && (
        <Alert tone="info" className="mb-6">
          Saving new history is turned off in Settings → Privacy. Existing entries are shown below.
        </Alert>
      )}

      <div role="group" aria-label="Filter by source" className="mb-6 inline-flex flex-wrap gap-1 rounded-2xl border border-border bg-surface-2 p-1">
        {sources.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-pressed={source === s.value}
            onClick={() => setSource(s.value)}
            className={cn(
              'min-h-11 rounded-xl px-4 font-semibold',
              source === s.value ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-text',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {(remove.isError || clearAll.isError) && (
        <Alert tone="error" className="mb-4">
          {errorMessage(remove.error ?? clearAll.error)}
        </Alert>
      )}

      {q.isLoading && <Spinner />}
      {q.isError && (
        <div className="flex flex-col items-start gap-3">
          <Alert tone="error">{errorMessage(q.error)}</Alert>
          <Button variant="secondary" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {q.isSuccess && items.length === 0 && (
        <EmptyState
          icon={<HistoryIcon className="size-7" />}
          title="Nothing saved yet"
          action={<ButtonLink to="/">Open translator</ButtonLink>}
        >
          Use “Save to history” in the translator to keep a translation here.
        </EmptyState>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-border rounded-3xl border border-border bg-surface">
          {items.map((t) => {
            const Icon = sourceIcon[t.source]
            return (
              <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold break-words whitespace-pre-wrap">{t.text}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="size-4" aria-hidden />
                      <span className="capitalize">{t.source}</span>
                    </span>
                    <time dateTime={t.created_at}>{fmt.format(new Date(t.created_at))}</time>
                    {t.avg_confidence !== null && <span>{Math.round(t.avg_confidence * 100)}% avg. agreement</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  {ttsSupported && (
                    <Button variant="ghost" onClick={() => speak(t.text, user!.preferences)} aria-label={`Speak “${t.text}”`}>
                      <Volume2 className="size-5" aria-hidden />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => remove.mutate(t.id)}
                    disabled={remove.isPending && remove.variables === t.id}
                    aria-label={`Delete “${t.text}”`}
                    className="hover:text-error"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {q.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}
    </>
  )
}
