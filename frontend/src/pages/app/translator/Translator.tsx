import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { SignSegmenter } from '../../../features/recognition/segmenter'
import { useCamera } from '../../../features/recognition/useCamera'
import { useSignTracking, type TrackedFrame } from '../../../features/recognition/useSignTracking'
import { frameFeatures } from '../../../features/recognition/wordFeatures'
import { getWordModel, type WordGuess, type WordModel, type WordResult } from '../../../features/recognition/wordModel'
import { PageHeader } from '../../../layouts/AppShell'
import { cn } from '../../../lib/cn'
import { CameraStage } from './CameraStage'
import { TranscriptPanel } from './TranscriptPanel'

type Phase = 'idle' | 'signing' | 'thinking'
type ModelState = { status: 'loading' } | { status: 'ready'; model: WordModel } | { status: 'error'; message: string }

/** "GOOD MORNING" → "good morning", sentence-cased when it starts the transcript. */
function appendWord(text: string, label: string): string {
  const word = label.toLowerCase()
  const trimmed = text.trimEnd()
  if (!trimmed) return word.charAt(0).toUpperCase() + word.slice(1)
  return `${trimmed} ${word}`
}

const pct = (p: number) => `${Math.round(p * 100)}%`

export default function Translator() {
  const qc = useQueryClient()
  const camera = useCamera()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [modelState, setModelState] = useState<ModelState>({ status: 'loading' })
  const [phase, setPhase] = useState<Phase>('idle')
  const [handVisible, setHandVisible] = useState(false)
  const [last, setLast] = useState<WordResult | null>(null)
  const [text, setText] = useState('')
  const [confidences, setConfidences] = useState<number[]>([])

  const modelRef = useRef<WordModel | null>(null)
  const segmenter = useRef(new SignSegmenter())
  const phaseRef = useRef<Phase>('idle')
  const handRef = useRef(false)

  // Load the model as soon as the page opens (in parallel with the camera prompt).
  useEffect(() => {
    let cancelled = false
    getWordModel()
      .then((model) => {
        if (cancelled) return
        modelRef.current = model
        setModelState({ status: 'ready', model })
      })
      .catch((e: Error) => !cancelled && setModelState({ status: 'error', message: e.message }))
    return () => {
      cancelled = true
    }
  }, [])

  const updatePhase = (next: Phase) => {
    if (phaseRef.current !== next) {
      phaseRef.current = next
      setPhase(next)
    }
  }

  const accept = useCallback((guess: WordGuess) => {
    setText((t) => appendWord(t, guess.label))
    setConfidences((c) => [...c, guess.probability])
  }, [])

  const onFrame = useCallback(
    (frame: TrackedFrame) => {
      const hand = !!(frame.hands[0] || frame.hands[1])
      if (hand !== handRef.current) {
        handRef.current = hand
        setHandVisible(hand)
      }
      const model = modelRef.current
      if (!model || phaseRef.current === 'thinking') return

      const segment = segmenter.current.push(frameFeatures(frame), hand, frame.time)
      if (!segment) {
        updatePhase(segmenter.current.current === 'signing' ? 'signing' : 'idle')
        return
      }
      updatePhase('thinking')
      model
        .classify(segment)
        .then((result) => {
          setLast(result)
          if (result.accepted) accept(result.accepted)
        })
        .catch(() => setLast(null))
        .finally(() => updatePhase('idle'))
    },
    [accept],
  )

  const cameraOn = camera.status === 'on'
  const tracker = useSignTracking(camera.videoRef, canvasRef, cameraOn, onFrame)
  const ready = cameraOn && tracker === 'ready' && modelState.status === 'ready'

  const stopCamera = () => {
    segmenter.current.reset()
    updatePhase('idle')
    camera.stop()
  }

  const clear = () => {
    setText('')
    setConfidences([])
    setLast(null)
  }

  const avgConfidence = confidences.length
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 1e4) / 1e4
    : null

  return (
    <>
      <PageHeader
        title="Sign translator"
        description="Sign Filipino Sign Language words in front of your camera. They appear as text you can speak, copy or save."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <CameraStage
            videoRef={camera.videoRef}
            canvasRef={canvasRef}
            camera={camera.status}
            cameraError={camera.error}
            tracker={tracker}
            handVisible={handVisible}
            onStart={camera.start}
            onStop={stopCamera}
            overlay={phase === 'signing' && <SigningBadge />}
          />
          <HowTo />
        </div>

        <div className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-5 sm:p-6">
          {modelState.status === 'loading' && (
            <p role="status" className="flex items-center gap-2 text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading the FSL recognition model…
            </p>
          )}
          {modelState.status === 'error' && (
            <Alert tone="error" title="Recognition model unavailable">
              {modelState.message} Hand tracking still works, but signs can’t be recognized right now.
            </Alert>
          )}

          <ResultCard phase={phase} ready={ready} last={last} onPick={accept} />

          <TranscriptPanel
            text={text}
            avgConfidence={avgConfidence}
            modelVersion={modelState.status === 'ready' ? modelState.model.meta.version : null}
            onSpace={() => setText((t) => (t && !t.endsWith(' ') ? `${t} ` : t))}
            onBackspace={() => setText((t) => t.trimEnd().split(' ').slice(0, -1).join(' '))}
            onClear={clear}
            onSaved={() => qc.invalidateQueries({ queryKey: ['translations'] })}
          />
        </div>
      </div>

      {modelState.status === 'ready' && <SupportedSigns model={modelState.model} />}
    </>
  )
}

function SigningBadge() {
  return (
    <div className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white">
      <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden />
      Watching your sign
    </div>
  )
}

function HowTo() {
  return (
    <ol className="grid gap-2 text-sm text-muted sm:grid-cols-3">
      {[
        'Sit so your head, shoulders and hands are in view.',
        'Raise your hands and sign one word.',
        'Lower your hands. The word appears in about a second.',
      ].map((step, i) => (
        <li key={step} className="flex gap-2 rounded-2xl bg-surface-2 px-3 py-2">
          <span className="font-bold text-primary">{i + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  )
}

function ResultCard({ phase, ready, last, onPick }: { phase: Phase; ready: boolean; last: WordResult | null; onPick: (g: WordGuess) => void }) {
  let body: React.ReactNode
  if (phase === 'thinking') {
    body = (
      <p className="flex items-center gap-2 text-lg font-semibold">
        <Loader2 className="size-5 animate-spin" aria-hidden /> Recognizing…
      </p>
    )
  } else if (phase === 'signing') {
    body = <p className="text-lg font-semibold">Signing… lower your hands when you finish.</p>
  } else if (last?.accepted) {
    body = (
      <div>
        <p className="text-4xl font-bold tracking-tight">{last.accepted.label}</p>
        <p className="mt-1 text-muted">
          {last.accepted.category} · {pct(last.accepted.probability)} confident
        </p>
      </div>
    )
  } else if (last) {
    body = (
      <div>
        <p className="text-2xl font-bold text-warning">Not recognized</p>
        <p className="mt-1 text-sm text-muted">The model wasn’t sure. If you meant one of these, tap it to add it:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {last.top.map((g) => (
            <Button key={g.label} variant="secondary" onClick={() => onPick(g)}>
              {g.label} <span className="font-normal text-muted">{pct(g.probability)}</span>
            </Button>
          ))}
        </div>
      </div>
    )
  } else {
    body = <p className="text-muted">{ready ? 'Ready. Sign a word.' : 'Start the camera to begin.'}</p>
  }

  return (
    <section aria-label="Last recognized sign" aria-live="polite" className="min-h-28">
      <p className="mb-2 text-sm font-semibold text-muted">Last sign</p>
      {body}
    </section>
  )
}

function SupportedSigns({ model }: { model: WordModel }) {
  const { meta } = model
  const byCategory = new Map<string, string[]>()
  for (const l of meta.labels) byCategory.set(l.category, [...(byCategory.get(l.category) ?? []), l.label])
  const e = meta.evaluation

  return (
    <details className="group mt-8 rounded-3xl border border-border bg-surface">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <span>
          <span className="font-bold">What can it recognize?</span>{' '}
          <span className="text-muted">
            {meta.labels.length} FSL words in {byCategory.size} categories
          </span>
        </span>
        <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-border px-5 py-5 sm:px-6">
        {e.unseen_signer_top1 !== null && (
          <p className="mb-5 max-w-3xl text-sm text-muted">
            Tested on signers it never saw during training, it named the correct word{' '}
            <strong className="text-text">{pct(e.unseen_signer_top1)}</strong> of the time
            {e.precision_at_threshold !== null && (
              <>
                . When it isn’t confident enough it shows “Not recognized”; the answers it does give are correct{' '}
                <strong className="text-text">{pct(e.precision_at_threshold)}</strong> of the time
              </>
            )}
            . It does not recognize fingerspelling, sentences, or signs outside this list yet.
          </p>
        )}
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...byCategory].map(([category, words]) => (
            <div key={category}>
              <dt className="text-sm font-bold text-primary">{category}</dt>
              <dd className="mt-1 text-sm text-muted">{words.map((w) => w.toLowerCase()).join(', ')}</dd>
            </div>
          ))}
        </dl>
        <p className={cn('mt-6 text-xs text-muted')}>
          Trained on{' '}
          <a href={meta.dataset.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {meta.dataset.name}
          </a>{' '}
          by {meta.dataset.author}, licensed {meta.dataset.license}. Model {meta.version}.
        </p>
      </div>
    </details>
  )
}
