<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { api, getErrorMessage } from '@/api/client'
import ProjectCard from '@/components/project/ProjectCard.vue'
import type { CampusEvent, Paginated, Project } from '@/types/api'

const route = useRoute()
const router = useRouter()
const eventMeta = ref<CampusEvent | null>(null)
const projectPage = ref<Paginated<Project> | null>(null)
const loading = ref(true)
const err = ref<string | null>(null)

async function load() {
  loading.value = true
  err.value = null
  const id = Number(route.params.eventId)
  if (!Number.isFinite(id)) {
    err.value = 'Некорректный идентификатор'
    eventMeta.value = null
    projectPage.value = null
    loading.value = false
    return
  }
  const p = Number(route.query.page) || 1
  const page = Number.isFinite(p) && p > 0 ? p : 1
  try {
    const [evRes, prRes] = await Promise.all([
      api.get<{ data: CampusEvent }>(`/api/events/${id}`),
      api.get<Paginated<Project>>(`/api/events/${id}/projects`, {
        params: { page, per_page: 12 },
      }),
    ])
    eventMeta.value = evRes.data.data
    projectPage.value = prRes.data
  } catch (e) {
    err.value = getErrorMessage(e)
    eventMeta.value = null
    projectPage.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})

watch(
  () => [route.params.eventId, route.query.page] as const,
  () => {
    void load()
  }
)

function goPage(nextPage: number) {
  void router.push({
    name: 'event-projects',
    params: { eventId: route.params.eventId },
    query: nextPage > 1 ? { page: String(nextPage) } : {},
  })
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <RouterLink
      :to="{ name: 'events' }"
      class="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
    >← К событиям</RouterLink>

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
      {{ err }}
    </p>

    <template v-else-if="eventMeta && projectPage">
      <h1 class="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
        {{ eventMeta.title }}
      </h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {{ new Date(eventMeta.date_time).toLocaleString() }}
        <span v-if="eventMeta.location"> · {{ eventMeta.location }}</span>
        <span v-if="eventMeta.genres?.length"> · {{ eventMeta.genres.join(', ') }}</span>
      </p>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Проекты портфолио, оформленные по этому событию (только опубликованные в каталоге).
      </p>

      <p
        v-if="projectPage.data.length === 0"
        class="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/80 py-10 text-center text-slate-600 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-300"
      >
        Пока нет привязанных проектов. Укажите событие в конструкторе портфолио и включите публикацию.
      </p>

      <div
        v-else
        class="mt-8 space-y-8"
      >
        <ProjectCard
          v-for="p in projectPage.data"
          :key="p.id"
          :project="p"
        />
      </div>

      <div
        v-if="projectPage.meta.last_page > 1"
        class="mt-8 flex flex-wrap justify-center gap-2"
      >
        <button
          v-for="l in projectPage.meta.last_page"
          :key="l"
          type="button"
          class="rounded px-3 py-1 text-sm"
          :class="
            l === projectPage.meta.current_page
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-200'
          "
          @click="goPage(l)"
        >
          {{ l }}
        </button>
      </div>
    </template>
  </div>
</template>
