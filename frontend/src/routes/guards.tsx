import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/States'
import type { Permission } from '../lib/types'

function SessionCheck({ children }: { children: React.ReactNode }) {
  const { isLoading, isError, refetch } = useAuth()
  if (isLoading) return <Spinner label="Checking your session…" className="min-h-dvh" />
  if (isError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <Alert tone="error" title="Cannot reach SignBridge">
          The server is not responding. If you’re developing locally, start both servers with{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-text">npm run dev</code> in the project folder, then try
          again.
        </Alert>
        <Button onClick={refetch}>Try again</Button>
      </div>
    )
  }
  return <>{children}</>
}

/** Logged-in users only. Remembers where they were going. */
export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  return (
    <SessionCheck>
      {user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />}
    </SessionCheck>
  )
}

/** Users holding a specific permission (admin area). */
export function RequirePermission({ permission }: { permission: Permission }) {
  const { user, can } = useAuth()
  const location = useLocation()
  return (
    <SessionCheck>
      {!user ? (
        <Navigate to="/login" replace state={{ from: location.pathname }} />
      ) : can(permission) ? (
        <Outlet />
      ) : (
        <Navigate to="/app" replace />
      )}
    </SessionCheck>
  )
}

/** Login / register pages: bounce logged-in users to the dashboard. */
export function GuestOnly() {
  const { user } = useAuth()
  return <SessionCheck>{user ? <Navigate to="/app" replace /> : <Outlet />}</SessionCheck>
}
