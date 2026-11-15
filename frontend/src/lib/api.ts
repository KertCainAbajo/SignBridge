import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Dev: empty → Vite proxies /api and /sanctum to Laravel (same origin).
// Prod: the backend URL, which must share a parent domain with the frontend
// (e.g. app.example.com + api.example.com) for cookie auth.
const BASE = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
})

/** Fetches the XSRF-TOKEN cookie Laravel needs before state-changing requests. */
export function csrf() {
  return axios.get(`${BASE}/sanctum/csrf-cookie`, { withCredentials: true })
}

// If the CSRF token expired (419), refresh it once and retry the request.
api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
  if (error.response?.status === 419 && config && !config._retried) {
    config._retried = true
    await csrf()
    return api(config)
  }
  return Promise.reject(error)
})

export type FieldErrors = Record<string, string>

/** Converts a Laravel 422 response into { field: firstMessage }. */
export function fieldErrors(error: unknown): FieldErrors {
  if (axios.isAxiosError(error) && error.response?.status === 422) {
    const errors = (error.response.data as { errors?: Record<string, string[]> }).errors ?? {}
    return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v[0]]))
  }
  return {}
}

/** A human-readable message for any request error. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Cannot reach the SignBridge server. Check your connection and try again.'
    if (error.response.status === 429) return 'Too many attempts. Please wait a minute and try again.'
    const message = (error.response.data as { message?: string })?.message
    if (message && error.response.status < 500) return message
    return 'Something went wrong on our side. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}
