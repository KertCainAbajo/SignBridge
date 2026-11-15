export type Theme = 'system' | 'light' | 'dark'

export interface Preferences {
  theme: Theme
  font_scale: 100 | 112 | 125 | 150
  high_contrast: boolean
  reduced_motion: boolean
  tts_voice: string | null
  tts_rate: number
  stt_language: 'fil-PH' | 'en-PH' | 'en-US'
  save_history: boolean
}

export type Role = 'user' | 'admin' | 'super_admin'

export type Permission =
  | 'users.manage'
  | 'content.manage'
  | 'quizzes.manage'
  | 'analytics.view'
  | 'admins.manage'
  | 'settings.manage'

export interface User {
  id: number
  name: string
  email: string
  roles: Role[]
  permissions: Permission[]
  preferences: Preferences
  created_at: string
}

export type TranslationSource = 'sign' | 'speech' | 'text'

export interface Translation {
  id: number
  source: TranslationSource
  text: string
  avg_confidence: number | null
  model_version: string | null
  created_at: string
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}

export interface AdminOverview {
  users_total: number
  users_active_7d: number
  signs_total: number
  signs_recognizable: number
  translations_30d: number
}
