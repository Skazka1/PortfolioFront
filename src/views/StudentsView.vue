<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { api, getErrorMessage } from '@/api/client'
import { useProjectsStore } from '@/stores/projects'
import ProjectCard from '@/components/project/ProjectCard.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import type { Project } from '@/types/api'
import { formatPastEventShort, formatProjectFeedCreatedAt } from '@/utils/formatProjectFeedDate'
import { displayProjectCreator } from '@/utils/projectCreator'

const projects = useProjectsStore()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const err = ref<string | null>(null)

const filterOptions = ref<{ courses: string[]; groups: string[]; genres: string[] }>({
  courses: [],
  groups: [],
  genres: [],
})

function queryParam(key: string): string | undefined {
  const v = route.query[key]
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

const feedRows = computed(() => {
  const data = projects.feed?.data
  if (!data?.length) {
    return []
  }
  return data.map((project: Project) => ({
    project,
    creator: displayProjectCreator(project),
    createdLabel: formatProjectFeedCreatedAt(project.created_at),
    pastEventLabel: project.past_event
      ? formatPastEventShort(project.past_event)
      : null,
  }))
})

async function load() {
  loading.value = true
  err.value = null
  try {
    const page = Number(route.query.page) || 1
    await projects.fetchPublishedFeed({
      page: Number.isFinite(page) && page > 0 ? page : 1,
      q: queryParam('q'),
      course: queryParam('course'),
      group: queryParam('group'),
      genre: queryParam('genre'),
    })
  } catch (e) {
    err.value = getErrorMessage(e)
    projects.clearPublishedFeed()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void api
    .get<{ courses: string[]; groups: string[]; genres: string[] }>('/api/projects/filters')
    .then((res) => {
      filterOptions.value = res.data
    })
    .catch(() => {
      /* селекты останутся пустыми */
    })
  void load()
})

watch(
  () => route.query,
  () => {
    void load()
  },
  { deep: true }
)

function currentListQuery(): Record<string, string> {
  const next: Record<string, string> = {}
  const q = queryParam('q')
  if (q) {
    next.q = q
  }
  for (const key of ['course', 'group', 'genre'] as const) {
    const v = queryParam(key)
    if (v) {
      next[key] = v
    }
  }
  return next
}

function goPage(p: number) {
  const next = currentListQuery()
  if (p > 1) {
    next.page = String(p)
  }
  void router.push({ name: 'students', query: next })
}

function setFilter(key: 'course' | 'group' | 'genre', value: string) {
  const next = currentListQuery()
  const v = value.trim()
  if (v) {
    next[key] = v
  } else {
    delete next[key]
  }
  void router.push({ name: 'students', query: next })
}

function clearFilters() {
  const next: Record<string, string> = {}
  const q = queryParam('q')
  if (q) {
    next.q = q
  }
  void router.push({ name: 'students', query: next })
}

function onFilterSelect(key: 'course' | 'group' | 'genre', e: Event) {
  const el = e.target as HTMLSelectElement
  setFilter(key, el.value)
}

const hasActiveFilters = computed(() =>
  Boolean(queryParam('course') || queryParam('group') || queryParam('genre'))
)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Лента проектов</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Здесь только опубликованные проекты (в конструкторе включите «Публиковать в каталоге»). Поиск по названию — в шапке сайта.
    </p>

    <div
      class="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/80"
    >
      <label class="flex min-w-[140px] flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600 dark:text-slate-400">Курс</span>
        <select
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          :value="queryParam('course') ?? ''"
          @change="onFilterSelect('course', $event)"
        >
          <option value="">Все</option>
          <option
            v-for="c in filterOptions.courses"
            :key="c"
            :value="c"
          >
            {{ c }}
          </option>
        </select>
      </label>
      <label class="flex min-w-[140px] flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600 dark:text-slate-400">Группа</span>
        <select
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          :value="queryParam('group') ?? ''"
          @change="onFilterSelect('group', $event)"
        >
          <option value="">Все</option>
          <option
            v-for="g in filterOptions.groups"
            :key="g"
            :value="g"
          >
            {{ g }}
          </option>
        </select>
      </label>
      <label class="flex min-w-[180px] flex-col gap-1 text-sm">
        <span class="font-medium text-slate-600 dark:text-slate-400">Жанр проекта</span>
        <select
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          :value="queryParam('genre') ?? ''"
          @change="onFilterSelect('genre', $event)"
        >
          <option value="">Все</option>
          <option
            v-for="x in filterOptions.genres"
            :key="x"
            :value="x"
          >
            {{ x }}
          </option>
        </select>
      </label>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        @click="clearFilters()"
      >
        Сбросить фильтры
      </button>
    </div>

    <div
      v-if="loading"
      class="mt-8 text-center text-slate-500 dark:text-slate-400"
    >
      Загрузка…
    </div>

    <p
      v-else-if="err"
      class="mt-8 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
    >
      Не удалось загрузить ленту: {{ err }}. Проверьте, что API запущен (например <code class="rounded bg-rose-100 px-1 dark:bg-rose-900/80">php artisan serve</code> на порту из <code class="rounded bg-rose-100 px-1 dark:bg-rose-900/80">vite.config.ts</code> proxy) и что в <code class="rounded bg-rose-100 px-1 dark:bg-rose-900/80">.env</code> фронта не указан неверный <code class="rounded bg-rose-100 px-1 dark:bg-rose-900/80">VITE_API_URL</code>.
    </p>

    <div
      v-else-if="projects.feed"
      class="mt-8 space-y-10"
    >
      <p
        v-if="projects.feed.data.length === 0"
        class="rounded-2xl border border-dashed border-slate-200 bg-white/80 py-12 text-center text-slate-600 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-300"
      >
        <span class="block font-medium text-slate-700 dark:text-slate-200">Пока нет опубликованных проектов.</span>
        <span class="mt-2 block text-sm">Черновики и выключенная публикация сюда не попадают — откройте проект в конструкторе и включите «Публиковать в каталоге».</span>
      </p>

      <article
        v-for="{ project: p, creator: c, createdLabel, pastEventLabel } in feedRows"
        :key="p.id"
        class="border-b border-slate-200 pb-10 last:border-0 dark:border-slate-700"
      >
        <div
          v-if="c"
          class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400"
        >
          <span class="shrink-0 font-medium text-slate-500 dark:text-slate-500">Создал(а):</span>
          <UserAvatar
            :name="c.name"
            :image-url="c.avatar_url"
            size="sm"
          />
          <RouterLink
            v-if="c.role === 'student'"
            :to="{ name: 'student', params: { id: c.id } }"
            class="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >{{ c.name }}</RouterLink>
          <span
            v-else
            class="font-medium text-slate-800 dark:text-slate-200"
          >{{ c.name }}</span>
        </div>
        <p
          v-if="createdLabel"
          class="mb-3 text-xs text-slate-500 dark:text-slate-500"
        >
          Создано: {{ createdLabel }}
        </p>
        <p
          v-if="pastEventLabel"
          class="mb-3 text-xs text-slate-600 dark:text-slate-400"
        >
          <span class="font-medium text-slate-500 dark:text-slate-500">По событию:</span>
          {{ pastEventLabel }}
        </p>
        <div
          v-if="p.students?.length"
          class="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-400"
        >
          <span class="font-medium text-slate-500 dark:text-slate-500">Участники:</span>
          <template
            v-for="(s, i) in p.students"
            :key="s.id"
          >
            <RouterLink
              :to="{ name: 'student', params: { id: s.id } }"
              class="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >{{ s.name }}</RouterLink><span
              v-if="i < (p.students?.length ?? 0) - 1"
              class="text-slate-400"
            >,</span>
          </template>
        </div>
        <ProjectCard :project="p" />
      </article>

      <div
        v-if="projects.feed.meta.last_page > 1"
        class="flex flex-wrap justify-center gap-2 pt-2"
      >
        <button
          v-for="l in projects.feed.meta.last_page"
          :key="l"
          type="button"
          class="rounded px-3 py-1 text-sm"
          :class="
            l === projects.feed.meta.current_page
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-200'
          "
          @click="goPage(l)"
        >
          {{ l }}
        </button>
      </div>
    </div>
  </div>
</template>
