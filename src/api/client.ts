import axios, { type AxiosError } from 'axios'

const baseURL = import.meta.env.VITE_API_URL || ''

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
  baseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
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
      if (!url.includes('/api/login')) {
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
