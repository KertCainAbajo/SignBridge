import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { api, csrf } from '../lib/api'
import { applyPreferences, getStoredTheme } from '../lib/preferences'
import type { Permission, Preferences, User } from '../lib/types'

export interface LoginInput {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  password_confirmation: string
}

interface AuthValue {
  user: User | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>
  can: (permission: Permission) => boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthValue | null>(null)
const ME = ['me'] as const

async function fetchMe(): Promise<User | null> {
  try {
    const res = await api.get<{ data: User }>('/user')
    return res.data.data
  } catch (error) {
    // 401 = not logged in, 403 = deactivated; both mean "no session".
    if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) return null
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const me = useQuery({ queryKey: ME, queryFn: fetchMe, retry: false, staleTime: 5 * 60_000 })
  const user = me.data ?? null

  // Keep <html> in sync with the user's display preferences (or the guest's stored theme).
  useEffect(() => {
    const prefs = user?.preferences ?? { theme: getStoredTheme() }
    applyPreferences(prefs)
    if (prefs.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyPreferences(prefs)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [user?.preferences])

  const login = useCallback(
    async (input: LoginInput) => {
      await csrf()
      const res = await api.post<{ data: User }>('/login', input)
      qc.setQueryData(ME, res.data.data)
      return res.data.data
    },
    [qc],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      await csrf()
      const res = await api.post<{ data: User }>('/register', input)
      qc.setQueryData(ME, res.data.data)
      return res.data.data
    },
    [qc],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } finally {
      qc.clear()
      qc.setQueryData(ME, null)
    }
  }, [qc])

  const updatePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      const previous = qc.getQueryData<User | null>(ME)
      if (!previous) return
      // Optimistic: apply immediately, roll back if the server rejects it.
      qc.setQueryData<User>(ME, { ...previous, preferences: { ...previous.preferences, ...patch } })
      try {
        const res = await api.patch<{ data: Preferences }>('/preferences', patch)
        qc.setQueryData<User>(ME, (u) => (u ? { ...u, preferences: res.data.data } : u))
      } catch (error) {
        qc.setQueryData(ME, previous)
        throw error
      }
    },
    [qc],
  )

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isLoading: me.isLoading,
      isError: me.isError,
      refetch: () => void me.refetch(),
      login,
      register,
      logout,
      updatePreferences,
      can: (permission) => user?.permissions.includes(permission) ?? false,
      isAdmin: !!user?.roles.some((r) => r === 'admin' || r === 'super_admin'),
    }),
    [user, me, login, register, logout, updatePreferences],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
