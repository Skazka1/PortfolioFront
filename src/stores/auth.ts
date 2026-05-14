import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, getErrorMessage, setAuthToken } from '@/api/client'
import type { User, UserRole } from '@/types/api'

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
      const { data } = await api.get<{ data: User }>('/api/user')
      user.value = data.data
    } catch {
      user.value = null
    }
  }

  async function login(email: string, password: string, remember = false): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post<{ data: User; token: string }>('/api/login', {
        email,
        password,
        remember,
      })
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
      await api.post('/api/logout')
    } catch {
      // сеть/401 — всё равно сбрасываем локальное состояние
    } finally {
      setAuthToken(null)
      user.value = null
    }
  }

  return { user, loading, error, isAuthenticated, role, hasRole, fetchUser, login, logout }
})
