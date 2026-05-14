<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import UserAvatar from '@/components/user/UserAvatar.vue'

const store = useUsersStore()
const route = useRoute()
const router = useRouter()

/** Дефолт при отсутствии per_page в URL (совпадает с StudentController) */
const DEFAULT_PER_PAGE = 12
const PER_PAGE_OPTIONS = [5, 10, 15, 20] as const

const q = ref('')
const course = ref('')
const group = ref('')
const busy = ref(false)

function parsePage(): number {
  const raw = route.query.page
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(n) && n >= 1 ? n : 1
}

function parsePerPage(): number {
  const raw = route.query.per_page
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN
  if (!Number.isFinite(n)) {
    return DEFAULT_PER_PAGE
  }
  return Math.min(50, Math.max(1, n))
}

function syncFiltersFromRoute() {
  q.value = typeof route.query.q === 'string' ? route.query.q : ''
  course.value = typeof route.query.course === 'string' ? route.query.course : ''
  group.value = typeof route.query.group === 'string' ? route.query.group : ''
}

function buildQuery(page: number, perPage: number): Record<string, string> {
  const out: Record<string, string> = {
    page: String(page),
    per_page: String(perPage),
  }
  if (q.value.trim()) {
    out.q = q.value.trim()
  }
  if (course.value.trim()) {
    out.course = course.value.trim()
  }
  if (group.value.trim()) {
    out.group = group.value.trim()
  }
  return out
}

async function fetchList() {
  busy.value = true
  try {
    await store.fetchStudents({
      page: parsePage(),
      per_page: parsePerPage(),
      q: q.value.trim() || undefined,
      course: course.value.trim() || undefined,
      group: group.value.trim() || undefined,
    })
  } finally {
    busy.value = false
  }
}

function applyFilters() {
  void router.push({
    name: 'teacher-students',
    query: buildQuery(1, parsePerPage()),
  })
}

function onPerPageSelect(ev: Event) {
  const v = Number.parseInt((ev.target as HTMLSelectElement).value, 10)
  if (!Number.isFinite(v)) {
    return
  }
  void router.push({
    name: 'teacher-students',
    query: buildQuery(1, v),
  })
}

/** Полный query для RouterLink (GET-параметры page и per_page в адресной строке) */
function paginationQuery(page: number): Record<string, string> {
  return buildQuery(page, parsePerPage())
}

const meta = computed(() => store.students?.meta ?? null)

/** Номера страниц для ссылок (Vue 3 не итерирует число в v-for) */
const pageNumbers = computed(() => {
  const m = meta.value
  if (!m || m.last_page <= 1) {
    return []
  }
  return Array.from({ length: m.last_page }, (_, i) => i + 1)
})

watch(
  () => route.fullPath,
  () => {
    syncFiltersFromRoute()
    if (
      route.name === 'teacher-students'
      && Object.keys(route.query).length === 0
    ) {
      void router.replace({
        name: 'teacher-students',
        query: buildQuery(1, DEFAULT_PER_PAGE),
      })
      return
    }
    void fetchList()
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
      Студенты
    </h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Список студентов с переходом в их портфолио. Параметры
      <code class="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">page</code>
      и
      <code class="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">per_page</code>
      отражаются в URL.
    </p>

    <div class="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Поиск по ФИО</label>
        <input
          v-model="q"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Поиск по ФИО"
        >
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Курс</label>
        <input
          v-model="course"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Курс"
        >
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Группа</label>
        <input
          v-model="group"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Группа"
        >
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Записей на странице</label>
        <select
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          :value="parsePerPage()"
          @change="onPerPageSelect"
        >
          <option
            v-for="n in PER_PAGE_OPTIONS"
            :key="n"
            :value="n"
          >
            {{ n }}
          </option>
          <option :value="DEFAULT_PER_PAGE">
            {{ DEFAULT_PER_PAGE }} (по умолчанию)
          </option>
        </select>
      </div>
      <button
        type="button"
        class="rounded bg-indigo-600 px-4 py-2 text-sm text-white"
        @click="applyFilters"
      >
        Фильтр
      </button>
    </div>

    <div
      v-if="busy"
      class="mt-4 text-sm text-slate-500 dark:text-slate-400"
    >
      Загрузка...
    </div>

    <table
      v-if="store.students"
      class="mt-6 w-full table-auto border-collapse text-sm text-slate-800 dark:text-slate-200"
    >
      <thead>
        <tr class="border-b border-slate-200 dark:border-slate-700">
          <th class="w-14 p-2" />
          <th class="p-2 text-left">
            Студент
          </th>
          <th class="p-2 text-left">
            Курс
          </th>
          <th class="p-2 text-left">
            Группа
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="s in store.students.data"
          :key="s.id"
          class="border-b border-slate-200 dark:border-slate-700"
        >
          <td class="p-2">
            <UserAvatar
              :name="s.name"
              :image-url="s.avatar_url"
              size="xs"
            />
          </td>
          <td class="p-2">
            <RouterLink
              :to="{ name: 'student', params: { id: s.id } }"
              class="text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
            >
              {{ s.name }}
            </RouterLink>
          </td>
          <td class="p-2">
            {{ s.course || '—' }}
          </td>
          <td class="p-2">
            {{ s.group || '—' }}
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-if="meta && !busy"
      class="mt-4 text-sm text-slate-600 dark:text-slate-400"
    >
      Записей на странице: {{ meta.per_page }}. Страница {{ meta.current_page }} из {{ meta.last_page }}
      (всего студентов: {{ meta.total }}).
    </p>

    <nav
      v-if="meta && meta.total > 0"
      class="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-700"
      aria-label="Пагинация"
    >
      <RouterLink
        v-if="meta.current_page > 1"
        :to="{ name: 'teacher-students', query: paginationQuery(1) }"
        class="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        Первая
      </RouterLink>
      <span
        v-else
        class="rounded px-3 py-1 text-sm text-slate-400"
      >Первая</span>

      <RouterLink
        v-if="meta.current_page > 1"
        :to="{ name: 'teacher-students', query: paginationQuery(meta.current_page - 1) }"
        class="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        Назад
      </RouterLink>
      <span
        v-else
        class="rounded px-3 py-1 text-sm text-slate-400"
      >Назад</span>

      <template v-if="meta.last_page > 1">
        <RouterLink
          v-for="p in pageNumbers"
          :key="p"
          :to="{ name: 'teacher-students', query: paginationQuery(p) }"
          class="rounded px-3 py-1 text-sm"
          :class="
            p === meta.current_page
              ? 'bg-indigo-600 text-white'
              : 'border border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800'
          "
        >
          {{ p }}
        </RouterLink>
      </template>

      <RouterLink
        v-if="meta.current_page < meta.last_page"
        :to="{ name: 'teacher-students', query: paginationQuery(meta.current_page + 1) }"
        class="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        Вперёд
      </RouterLink>
      <span
        v-else
        class="rounded px-3 py-1 text-sm text-slate-400"
      >Вперёд</span>

      <RouterLink
        v-if="meta.last_page > 1 && meta.current_page < meta.last_page"
        :to="{ name: 'teacher-students', query: paginationQuery(meta.last_page) }"
        class="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        Последняя
      </RouterLink>
      <span
        v-else
        class="rounded px-3 py-1 text-sm text-slate-400"
      >Последняя</span>
    </nav>
  </div>
</template>
