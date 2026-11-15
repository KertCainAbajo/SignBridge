import type { ReactNode } from 'react'

export function AuthCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-muted">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-center text-muted">{footer}</p>
    </div>
  )
}
