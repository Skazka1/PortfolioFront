<script setup lang="ts">
import { storeToRefs } from 'pinia'
import Menubar from 'primevue/menubar'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import type { MenuItem } from 'primevue/menuitem'
import { computed, ref, watch } from 'vue'
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

const navItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []
  if (auth.isAuthenticated && auth.hasRole('student')) {
    items.push({ label: 'Моё портфолио', route: { name: 'my-portfolio' } })
  }
  items.push({ label: 'Другие портфолио', route: { name: 'students' } })
  items.push({ label: 'События', route: { name: 'events' } })
  if (auth.isAuthenticated && auth.hasRole('admin')) {
    items.push({ label: 'Добавить проект', route: { name: 'admin-add-project' } })
    items.push({ label: 'Пользователи', route: { name: 'admin-users' } })
  }
  if (auth.isAuthenticated && auth.hasRole('teacher')) {
    items.push({ label: 'Мои студенты', route: { name: 'teacher-students' } })
  }
  return items
})

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
    <Menubar
      :model="navItems"
      class="app-header-menubar mx-auto max-w-[1400px] border-0 bg-transparent px-4 py-2 shadow-none"
    >
      <template #start>
        <RouterLink
          :to="{ name: 'students' }"
          class="mr-2 flex shrink-0 items-center no-underline"
        >
          <img
            :src="surguLogo"
            alt="СурГУ"
            class="h-16 w-auto rounded-md opacity-95"
          >
        </RouterLink>
      </template>

      <template #item="{ item, props }">
        <RouterLink
          v-if="item.route"
          v-slot="{ href, navigate, isActive }"
          :to="item.route"
          custom
        >
          <a
            v-bind="props.action"
            :href="href"
            :class="{ 'p-menuitem-link-active': isActive }"
            @click="navigate"
          >
            <span class="p-menuitem-text">{{ item.label }}</span>
          </a>
        </RouterLink>
      </template>

      <template #end>
        <div
          class="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:w-auto md:min-w-0 md:flex-1 md:justify-end md:gap-3"
        >
          <div class="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md md:max-w-xl">
            <form
              class="flex min-w-0 flex-1 items-center"
              @submit.prevent="runSearch"
            >
              <InputText
                v-model="searchQ"
                type="search"
                placeholder="поиск по названию проекта"
                autocomplete="off"
                class="w-full rounded-full"
              />
            </form>
            <Button
              type="button"
              severity="secondary"
              rounded
              :title="isDark ? 'Светлая тема' : 'Тёмная тема'"
              :aria-label="isDark ? 'Включить светлую тему' : 'Включить тёмную тему'"
              class="shrink-0"
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
            </Button>
          </div>

          <div class="flex shrink-0 items-center justify-end gap-2.5 sm:justify-start">
            <template v-if="!auth.isAuthenticated">
              <RouterLink
                :to="{ name: 'login' }"
                class="no-underline"
              >
                <Button
                  label="вход"
                  rounded
                />
              </RouterLink>
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
              <Button
                type="button"
                label="выход"
                severity="secondary"
                size="small"
                rounded
                @click="onLogout"
              />
            </template>
          </div>
        </div>
      </template>
    </Menubar>
  </header>
</template>

<style scoped>
.app-header-menubar :deep(.p-menubar-end) {
  flex: 1 1 auto;
  min-width: 0;
  margin-left: 0;
}

@media (min-width: 768px) {
  .app-header-menubar :deep(.p-menubar-end) {
    margin-left: auto;
  }
}
</style>
