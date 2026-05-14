<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import UserAvatar from '@/components/user/UserAvatar.vue'
import surguLogo from '@/assets/SurSU-1_1x.png'

const auth = useAuthStore()
const theme = useThemeStore()
const { isDark } = storeToRefs(theme)
const router = useRouter()
const route = useRoute()
const searchQ = ref('')

watch(
  () => [route.name, route.query.q] as const,
  () => {
    if (route.name === 'students') {
      searchQ.value = typeof route.query.q === 'string' ? route.query.q : ''
    }
  },
  { immediate: true }
)

async function onLogout() {
  await auth.logout()
  await router.push({ name: 'students' })
}

function runSearch() {
  const q = searchQ.value.trim()
  const next: Record<string, string> = {}
  if (q) {
    next.q = q
  }
  if (route.name === 'students') {
    for (const key of ['course', 'group', 'genre'] as const) {
      const v = route.query[key]
      if (typeof v === 'string' && v.trim()) {
        next[key] = v.trim()
      }
    }
  }
  router.push({ name: 'students', query: next })
}
</script>

<template>
  <header
    class="border-b border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
  >
    <div
      class="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-2 md:gap-5"
    >
      <RouterLink
        :to="{ name: 'students' }"
        class="flex shrink-0 items-center gap-2 no-underline"
      >
        <img
          :src="surguLogo"
          alt="СурГУ"
          class="h-16 w-auto rounded-md opacity-95"
        >
      </RouterLink>

      <nav class="flex flex-wrap items-center gap-1.5 text-[15px] font-medium">
        <RouterLink
          v-if="auth.isAuthenticated && auth.hasRole('student')"
          v-slot="{ href, navigate, isActive }"
          :to="{ name: 'my-portfolio' }"
          custom
        >
          <a
            :href
            :class="[
              'inline-flex h-10 items-center rounded-lg px-3 no-underline transition',
              isActive
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
            ]"
            @click="(e) => navigate(e)"
          >Моё портфолио</a>
        </RouterLink>
        <RouterLink
          v-slot="{ href, navigate, isActive }"
          :to="{ name: 'students' }"
          custom
        >
          <a
            :href
            :class="[
              'inline-flex h-10 items-center rounded-lg px-3 no-underline transition',
              isActive
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
            ]"
            @click="(e) => navigate(e)"
          >Другие портфолио</a>
        </RouterLink>
        <RouterLink
          v-slot="{ href, navigate, isActive }"
          :to="{ name: 'events' }"
          custom
        >
          <a
            :href
            :class="[
              'inline-flex h-10 items-center rounded-lg px-3 no-underline transition',
              isActive
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
            ]"
            @click="(e) => navigate(e)"
          >События</a>
        </RouterLink>
        <RouterLink
          v-if="auth.isAuthenticated && auth.hasRole('admin')"
          v-slot="{ href, navigate, isActive }"
          :to="{ name: 'admin-users' }"
          custom
        >
          <a
            :href
            :class="[
              'inline-flex h-10 items-center rounded-lg px-3 no-underline transition',
              isActive
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
            ]"
            @click="(e) => navigate(e)"
          >Пользователи</a>
        </RouterLink>
        <RouterLink
          v-if="auth.isAuthenticated && auth.hasRole('teacher')"
          v-slot="{ href, navigate, isActive }"
          :to="{ name: 'teacher-students' }"
          custom
        >
          <a
            :href
            :class="[
              'inline-flex h-10 items-center rounded-lg px-3 no-underline transition',
              isActive
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
            ]"
            @click="(e) => navigate(e)"
          >Мои студенты</a>
        </RouterLink>
      </nav>

      <!-- Поиск + тема + профиль: одна зона, без order-last — иначе при переносе «уезжает» профиль -->
      <div
        class="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:ml-auto md:w-auto md:max-w-none md:flex-1 md:justify-end md:gap-3"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md md:max-w-xl">
          <form
            class="flex min-w-0 flex-1 items-center"
            @submit.prevent="runSearch"
          >
            <span class="pointer-events-none relative z-10 -mr-8 text-slate-400 dark:text-slate-500">⌕</span>
            <input
              v-model="searchQ"
              type="search"
              class="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-800 dark:focus:ring-indigo-600"
              placeholder="поиск по названию проекта"
              autocomplete="off"
            >
          </form>
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-amber-200 dark:hover:bg-slate-700"
            :title="isDark ? 'Светлая тема' : 'Тёмная тема'"
            :aria-label="isDark ? 'Включить светлую тему' : 'Включить тёмную тему'"
            @click="theme.toggle()"
          >
            <svg
              v-if="isDark"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <svg
              v-else
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </button>
        </div>

        <div class="flex shrink-0 items-center justify-end gap-2.5 sm:justify-start">
          <template v-if="!auth.isAuthenticated">
            <RouterLink
              :to="{ name: 'login' }"
              class="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white no-underline hover:bg-slate-800 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >вход</RouterLink>
          </template>
          <template v-else>
            <RouterLink
              :to="{ name: 'account' }"
              class="flex min-w-0 items-center gap-2 no-underline"
            >
              <span class="max-w-[min(140px,28vw)] truncate text-sm text-slate-700 dark:text-slate-200">{{ auth.user?.name || 'имя пользователя' }}</span>
              <UserAvatar
                :name="auth.user?.name || '?'"
                :image-url="auth.user?.avatar_url"
                size="xs"
              />
            </RouterLink>
            <button
              type="button"
              class="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              @click="onLogout"
            >выход</button>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>
