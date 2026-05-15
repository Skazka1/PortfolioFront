import axios from 'axios'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getErrorMessage, getStoredAuthToken, setAuthToken } from '@/api/client'
import type { User, UserRole } from '@/types/api'

/** База API: из .env или /api (прокси Vite → backend). */
const backendUrl = import.meta.env.VITE_BACKEND_URL ?? '/api'

function authRequestConfig() {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const token = getStoredAuthToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return { headers }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const role = computed(() => user.value?.role ?? null)

  function hasRole(r: UserRole | UserRole[]): boolean {
    if (!user.value) return false
    const list = Array.isArray(r) ? r : [r]
    return list.includes(user.value.role)
  }

  async function fetchUser(): Promise<void> {
    try {
      const { data } = await axios.get<{ data: User }>(`${backendUrl}/user`, authRequestConfig())
      user.value = data.data
    } catch {
      user.value = null
    }
  }

  async function login(email: string, password: string, remember = false): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const credentials = { email, password, remember }
      const { data } = await axios.post<{ data: User; token: string }>(
        `${backendUrl}/login`,
        credentials,
        authRequestConfig(),
      )
      setAuthToken(data.token)
      user.value = data.data
    } catch (e) {
      error.value = getErrorMessage(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await axios.post(`${backendUrl}/logout`, {}, authRequestConfig())
    } catch {
      // сеть/401 — всё равно сбрасываем локальное состояние
    } finally {
      setAuthToken(null)
      user.value = null
    }
  }

  return { user, loading, error, isAuthenticated, role, hasRole, fetchUser, login, logout }
})
