import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'info' | 'success' | 'warning' | 'error'

const tones: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: 'bg-accent-soft text-text border-accent/40', Icon: Info },
  success: { box: 'bg-success-soft text-text border-success/40', Icon: CheckCircle2 },
  warning: { box: 'bg-warning-soft text-text border-warning/40', Icon: AlertTriangle },
  error: { box: 'bg-error-soft text-text border-error/40', Icon: XCircle },
}

const iconColor: Record<Tone, string> = {
  info: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
}

export function Alert({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const { box, Icon } = tones[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border px-4 py-3', box, className)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', iconColor[tone])} aria-hidden />
      <div className="text-[0.95rem]">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 text-muted' : undefined}>{children}</div>}
      </div>
    </div>
  )
}
