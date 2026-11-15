import type { Preferences, Theme } from './types'

const THEME_KEY = 'sb-theme'

/** Used for guests (no account) and as the server's defaults. */
export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  font_scale: 100,
  high_contrast: false,
  reduced_motion: false,
  tts_voice: null,
  tts_rate: 1,
  stt_language: 'fil-PH',
  save_history: true,
}

export function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark' || t === 'system') return t
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* storage unavailable */
  }
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Applies display preferences to <html>. Safe to call repeatedly. */
export function applyPreferences(p: Pick<Preferences, 'theme'> & Partial<Preferences>) {
  const root = document.documentElement
  root.dataset.theme = resolveTheme(p.theme)
  root.dataset.contrast = p.high_contrast ? 'high' : 'normal'
  root.dataset.motion = p.reduced_motion ? 'reduced' : 'full'
  root.style.fontSize = `${p.font_scale ?? 100}%`
  storeTheme(p.theme)
}
