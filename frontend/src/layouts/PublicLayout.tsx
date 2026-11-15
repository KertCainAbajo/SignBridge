import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { ButtonLink } from '../components/ui/Button'

const YEAR = new Date().getFullYear()

export function PublicLayout() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Link to="/" aria-label="SignBridge home" className="rounded-lg">
            <Logo />
          </Link>
          <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {!user && (
              <ButtonLink to="/login" variant="ghost">
                Sign in
              </ButtonLink>
            )}
            <ButtonLink to="/">Open translator</ButtonLink>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-sm text-muted sm:px-8">
          <p>© {YEAR} SignBridge</p>
          <p>Camera video is processed on your device and never uploaded.</p>
        </div>
      </footer>
    </div>
  )
}
