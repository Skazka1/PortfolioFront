import axios, { type AxiosError } from 'axios'

/** База API: VITE_BACKEND_URL, затем VITE_API_URL, иначе /api (прокси Vite). */
export const apiBaseUrl =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  '/api'

/** Убирает лишний /api в пути, если база уже заканчивается на /api. */
function normalizeApiPath(url: string, baseURL: string): string {
  const base = baseURL.replace(/\/$/, '')
  if ((base === '/api' || base.endsWith('/api')) && url.startsWith('/api')) {
    return url.slice(4) || '/'
  }
  return url
}

/** Ключ localStorage для Bearer-токена Sanctum. */
export const AUTH_TOKEN_STORAGE_KEY = 'portfolio_api_token'

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  }
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const base = String(config.baseURL ?? api.defaults.baseURL ?? '')
  if (config.url) {
    config.url = normalizeApiPath(config.url, base)
  }
  const token = getStoredAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    const status = err.response?.status
    if (status === 401) {
      const url = String(err.config?.url ?? '')
      if (!url.includes('/login')) {
        setAuthToken(null)
      }
    }
    return Promise.reject(err)
  },
)

export function getErrorMessage(err: unknown): string {
  const e = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>
  if (e.response?.data?.message) {
    return e.response.data.message
  }
  const errors = e.response?.data?.errors
  if (errors) {
    return Object.values(errors).flat().join(' ')
  }
  return e.message || 'Ошибка запроса'
}
