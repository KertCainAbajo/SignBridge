import { Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { applyPreferences, getStoredTheme } from '../lib/preferences'
import type { Theme } from '../lib/types'

const order: Theme[] = ['system', 'light', 'dark']
const meta: Record<Theme, { label: string; Icon: typeof Sun }> = {
  system: { label: 'System theme', Icon: Monitor },
  light: { label: 'Light theme', Icon: Sun },
  dark: { label: 'Dark theme', Icon: Moon },
}

/** Cycles system → light → dark. Saves to the account when logged in, else to this browser. */
export function ThemeToggle() {
  const { user, updatePreferences } = useAuth()
  const [guestTheme, setGuestTheme] = useState<Theme>(getStoredTheme)
  const current = user?.preferences.theme ?? guestTheme
  const next = order[(order.indexOf(current) + 1) % order.length]
  const { label, Icon } = meta[current]

  const onClick = () => {
    if (user) {
      void updatePreferences({ theme: next }).catch(() => undefined)
    } else {
      setGuestTheme(next)
      applyPreferences({ theme: next })
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
      aria-label={`${label}. Switch to ${meta[next].label.toLowerCase()}`}
      title={label}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  )
}
