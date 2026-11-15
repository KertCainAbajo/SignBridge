import { Camera, CameraOff, Hand, Loader2, Lock } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import type { CameraStatus } from '../../../features/recognition/useCamera'
import type { TrackerStatus } from '../../../features/recognition/useSignTracking'
import { cn } from '../../../lib/cn'

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  camera: CameraStatus
  cameraError: string | null
  tracker: TrackerStatus
  handVisible: boolean
  onStart: () => void
  onStop: () => void
  overlay?: ReactNode
}

export function CameraStage({ videoRef, canvasRef, camera, cameraError, tracker, handVisible, onStart, onStop, overlay }: Props) {
  const on = camera === 'on'

  let chip: { text: string; tone: string } = { text: 'Camera off', tone: 'bg-surface-2 text-muted' }
  if (camera === 'starting') chip = { text: 'Starting camera…', tone: 'bg-surface-2 text-muted' }
  else if (on && tracker === 'loading') chip = { text: 'Loading hand tracking…', tone: 'bg-warning-soft text-warning' }
  else if (on && tracker === 'error') chip = { text: 'Hand tracking failed', tone: 'bg-error-soft text-error' }
  else if (on && handVisible) chip = { text: 'Hands detected', tone: 'bg-success-soft text-success' }
  else if (on) chip = { text: 'Ready', tone: 'bg-surface-2 text-muted' }

  return (
    <section aria-label="Camera" className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-[#0b0f19]">
        {/* Mirrored like a mirror, so signing feels natural. */}
        <video ref={videoRef} playsInline muted className={cn('absolute inset-0 size-full -scale-x-100 object-contain', !on && 'invisible')} />
        <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full -scale-x-100 object-contain" />

        <div className="absolute top-3 left-3">
          <span role="status" className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', chip.tone)}>
            {(camera === 'starting' || (on && tracker === 'loading')) && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            {on && handVisible && <Hand className="size-3.5" aria-hidden />}
            {chip.text}
          </span>
        </div>

        {!on && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
            <Camera className="size-10 opacity-80" aria-hidden />
            <p className="max-w-xs text-white/80">Start the camera. Keep your head, shoulders and hands in view.</p>
            <Button size="lg" onClick={onStart} loading={camera === 'starting'} className="bg-white text-[#243B6B] hover:bg-white/90">
              Start camera
            </Button>
          </div>
        )}
        {overlay}
      </div>

      {cameraError && <Alert tone="error">{cameraError}</Alert>}
      {on && tracker === 'error' && (
        <Alert tone="error" title="Hand tracking could not start">
          Your browser may not support WebAssembly or WebGL. Try the latest Chrome, Edge or Firefox.
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Lock className="size-4 shrink-0" aria-hidden />
          Video is processed on this device. Nothing is recorded or uploaded.
        </p>
        {on && (
          <Button variant="secondary" onClick={onStop} icon={<CameraOff className="size-4" aria-hidden />}>
            Stop camera
          </Button>
        )}
      </div>
    </section>
  )
}
