import {
  BookOpen,
  ClipboardList,
  Hand,
  History,
  Info,
  LayoutDashboard,
  Library,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { ButtonLink } from '../components/ui/Button'
import { cn } from '../lib/cn'
import type { Permission } from '../lib/types'

interface NavItem {
  to: string
  label: string
  Icon: typeof Hand
  end?: boolean
  permission?: Permission
}

// Open to everyone, no account needed.
const publicNav: NavItem[] = [
  { to: '/', label: 'Sign translator', Icon: Hand, end: true },
  { to: '/speech', label: 'Speech & text', Icon: MessageSquareText },
]

// Need an account (progress, history and settings are saved per user).
const accountNav: NavItem[] = [
  { to: '/app', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/app/learn', label: 'Learn FSL', Icon: BookOpen },
  { to: '/app/practice', label: 'Practice', Icon: ListChecks },
  { to: '/app/history', label: 'History', Icon: History },
  { to: '/app/settings', label: 'Settings', Icon: Settings },
]

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Overview', Icon: ShieldCheck, end: true, permission: 'analytics.view' },
  { to: '/admin/users', label: 'Users', Icon: Users, permission: 'users.manage' },
  { to: '/admin/content', label: 'Vocabulary & lessons', Icon: Library, permission: 'content.manage' },
  { to: '/admin/quizzes', label: 'Quizzes', Icon: ClipboardList, permission: 'quizzes.manage' },
]

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ to, label, Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors',
                isActive ? 'bg-accent-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-text',
              )
            }
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function NavHeading({ children }: { children: string }) {
  return <p className="mb-2 px-3 text-xs font-bold tracking-wider text-muted uppercase">{children}</p>
}

/** App layout for guests and signed-in users alike. */
export function AppShell() {
  const { user, can, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const visibleAdmin = user ? adminNav.filter((i) => !i.permission || can(i.permission)) : []

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const onLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col gap-6 px-3 py-5">
      <Link to="/" onClick={close} className="self-start rounded-lg px-2" aria-label="SignBridge, sign translator">
        <Logo />
      </Link>

      <NavList items={publicNav} onNavigate={close} />

      {user ? (
        <div>
          <NavHeading>Your account</NavHeading>
          <NavList items={accountNav} onNavigate={close} />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <p className="font-semibold">Save your progress</p>
          <p className="mt-1 text-sm text-muted">
            The translator works without an account. Sign in to save history, follow lessons and keep your settings.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <ButtonLink to="/register" onClick={close}>
              Create free account
            </ButtonLink>
            <ButtonLink to="/login" variant="secondary" onClick={close} icon={<LogIn className="size-4" aria-hidden />}>
              Sign in
            </ButtonLink>
          </div>
        </div>
      )}

      {visibleAdmin.length > 0 && (
        <div>
          <NavHeading>Administration</NavHeading>
          <NavList items={visibleAdmin} onNavigate={close} />
        </div>
      )}

      <div className="mt-auto border-t border-border px-2 pt-4">
        {user && (
          <>
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <ThemeToggle />
          <NavLink
            to="/about"
            onClick={close}
            className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
            aria-label="About SignBridge"
            title="About SignBridge"
          >
            <Info className="size-5" aria-hidden />
          </NavLink>
          {user && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-medium text-muted hover:bg-surface-2 hover:text-text"
            >
              <LogOut className="size-5" aria-hidden />
              Sign out
            </button>
          )}
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-68 overflow-y-auto border-r border-border bg-surface lg:block">{sidebar}</aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Link to="/" aria-label="SignBridge, sign translator" className="rounded-lg">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          {!user && (
            <ButtonLink to="/login" variant="ghost">
              Sign in
            </ButtonLink>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-surface-2"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <Menu className="size-6" aria-hidden />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={close} />
          <aside id="mobile-nav" className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] overflow-y-auto bg-surface shadow-xl">
            <button
              type="button"
              onClick={close}
              className="absolute top-4 right-3 inline-flex size-11 items-center justify-center rounded-xl hover:bg-surface-2"
              aria-label="Close menu"
            >
              <X className="size-6" aria-hidden />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main id="main" tabIndex={-1} className="px-4 py-6 focus:outline-none sm:px-8 lg:ml-68 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
