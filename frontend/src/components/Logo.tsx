import { cn } from '../lib/cn'

/** SignBridge mark: an arc (bridge) connecting two hands/points. */
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-[#243B6B]" />
        <path d="M8 20c3-7 6-9 8-9s5 2 8 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="8" cy="20" r="2.4" fill="#6C8EF5" />
        <circle cx="24" cy="20" r="2.4" fill="#6C8EF5" />
      </svg>
      {withText && <span className="text-lg font-bold tracking-tight">SignBridge</span>}
    </span>
  )
}
