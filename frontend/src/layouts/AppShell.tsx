import {
  BookOpen,
  ClipboardList,
  Hand,
  History,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { cn } from '../lib/cn'
import type { Permission } from '../lib/types'

interface NavItem {
  to: string
  label: string
  Icon: typeof Hand
  end?: boolean
  permission?: Permission
}

const userNav: NavItem[] = [
  { to: '/app', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/app/translate', label: 'Sign translator', Icon: Hand },
  { to: '/app/speech', label: 'Speech & text', Icon: MessageSquareText },
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

export function AppShell() {
  const { user, can, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const visibleAdmin = adminNav.filter((i) => !i.permission || can(i.permission))

  // Nav links close the mobile menu themselves (onNavigate); Escape closes it too.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col gap-6 px-3 py-5">
      <div className="px-2">
        <Logo />
      </div>
      <NavList items={userNav} onNavigate={() => setOpen(false)} />
      {visibleAdmin.length > 0 && (
        <div>
          <p className="mb-2 px-3 text-xs font-bold tracking-wider text-muted uppercase">Administration</p>
          <NavList items={visibleAdmin} onNavigate={() => setOpen(false)} />
        </div>
      )}
      <div className="mt-auto border-t border-border px-2 pt-4">
        <p className="truncate font-semibold">{user?.name}</p>
        <p className="truncate text-sm text-muted">{user?.email}</p>
        <div className="mt-3 flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-medium text-muted hover:bg-surface-2 hover:text-text"
          >
            <LogOut className="size-5" aria-hidden />
            Sign out
          </button>
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
      <aside className="fixed inset-y-0 left-0 hidden w-68 border-r border-border bg-surface lg:block">{sidebar}</aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Logo />
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
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside id="mobile-nav" className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] overflow-y-auto bg-surface shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
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
