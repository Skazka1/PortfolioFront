import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'portfolio-theme'

function readStored(): 'light' | 'dark' {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light') {
      return v
    }
  } catch {
    /* ignore */
  }
  return 'light'
}

function applyDom(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark)
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<'light' | 'dark'>(readStored())

  const isDark = computed(() => mode.value === 'dark')

  function setMode(next: 'light' | 'dark'): void {
    mode.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    applyDom(next === 'dark')
  }

  function toggle(): void {
    setMode(mode.value === 'dark' ? 'light' : 'dark')
  }

  /** Вызвать до mount приложения (согласовано с inline-скриптом в index.html). */
  function syncFromStorage(): void {
    mode.value = readStored()
    applyDom(mode.value === 'dark')
  }

  return { mode, isDark, setMode, toggle, syncFromStorage }
})
