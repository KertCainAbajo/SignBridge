import axios from 'axios'

// In development, Vite proxies /api to Laravel (see vite.config.ts).
// In production, set VITE_API_URL to the backend's public URL.
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
