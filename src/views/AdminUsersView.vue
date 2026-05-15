<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { api, getErrorMessage } from '@/api/client'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import type { Paginated, User, UserRole } from '@/types/api'

function roleLabel(r: UserRole): string {
  switch (r) {
    case 'admin':
      return 'Администратор'
    case 'teacher':
      return 'Преподаватель'
    case 'student':
      return 'Студент'
    default:
      return r
  }
}

/** Совпадает с дефолтом UserAdminController::index */
const DEFAULT_PER_PAGE = 30
const PER_PAGE_OPTIONS = [5, 10, 15, 20] as const

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const PRIMARY_ADMIN_DELETE_MESSAGE = 'Нельзя удалить главного администратора.'

function showUserFeedback(message: string, type: 'error' | 'ok' = 'error'): void {
  if (type === 'error') {
    err.value = message
    ok.value = null
    window.alert(message)
  } else {
    ok.value = message
    err.value = null
  }
  void nextTick(() => {
    document.getElementById('admin-users-feedback')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function isPrimaryAdminUser(u: User): boolean {
  if (u.is_primary_admin === true) {
    return true
  }
  const primaryEmail = (import.meta.env.VITE_PRIMARY_ADMIN_EMAIL as string | undefined) ?? 'admin@example.com'
  return u.email?.toLowerCase() === primaryEmail.toLowerCase()
}

const list = ref<Paginated<User> | null>(null)
const busy = ref(false)
const name = ref('')
const email = ref('')
const role = ref<UserRole>('student')
const roleFilter = ref<'all' | UserRole>('all')
const q = ref('')
const courseFilter = ref('')
const groupFilter = ref('')
const course = ref('')
const group = ref('')
const password = ref('')
const err = ref<string | null>(null)
const ok = ref<string | null>(null)
const editingId = ref<number | null>(null)
const editName = ref('')
const editEmail = ref('')
const editRole = ref<UserRole>('student')
const editCourse = ref('')
const editGroup = ref('')
const editPassword = ref('')
const editIsActive = ref(true)

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

function parseRoleFilter(): 'all' | UserRole {
  const r = route.query.role
  if (r === 'admin' || r === 'teacher' || r === 'student') {
    return r
  }
  return 'all'
}

function syncFiltersFromRoute() {
  q.value = typeof route.query.q === 'string' ? route.query.q : ''
  courseFilter.value = typeof route.query.course === 'string' ? route.query.course : ''
  groupFilter.value = typeof route.query.group === 'string' ? route.query.group : ''
  roleFilter.value = parseRoleFilter()
}

function buildQuery(page: number, perPage: number): Record<string, string> {
  const out: Record<string, string> = {
    page: String(page),
    per_page: String(perPage),
  }
  if (q.value.trim()) {
    out.q = q.value.trim()
  }
  if (courseFilter.value.trim()) {
    out.course = courseFilter.value.trim()
  }
  if (groupFilter.value.trim()) {
    out.group = groupFilter.value.trim()
  }
  if (roleFilter.value !== 'all') {
    out.role = roleFilter.value
  }
  return out
}

function paginationQuery(page: number): Record<string, string> {
  return buildQuery(page, parsePerPage())
}

const meta = computed(() => list.value?.meta ?? null)

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
      route.name === 'admin-users'
      && Object.keys(route.query).length === 0
    ) {
      void router.replace({
        name: 'admin-users',
        query: buildQuery(1, DEFAULT_PER_PAGE),
      })
      return
    }
    void fetchList()
  },
  { immediate: true },
)

async function fetchList() {
  busy.value = true
  try {
    const { data } = await api.get<Paginated<User>>('/api/admin/users', {
      params: {
        q: q.value.trim() || undefined,
        role: roleFilter.value === 'all' ? undefined : roleFilter.value,
        course: courseFilter.value.trim() || undefined,
        group: groupFilter.value.trim() || undefined,
        page: parsePage(),
        per_page: parsePerPage(),
      },
    })
    list.value = data
  } finally {
    busy.value = false
  }
}

function onPerPageSelect(ev: Event) {
  const v = Number.parseInt((ev.target as HTMLSelectElement).value, 10)
  if (!Number.isFinite(v)) {
    return
  }
  void router.push({
    name: 'admin-users',
    query: buildQuery(1, v),
  })
}

function applyFiltersNav() {
  void router.push({
    name: 'admin-users',
    query: buildQuery(1, parsePerPage()),
  })
}

function onRoleFilterNav() {
  void router.push({
    name: 'admin-users',
    query: buildQuery(1, parsePerPage()),
  })
}

async function create() {
  err.value = null
  ok.value = null
  try {
    await api.post('/api/admin/users', {
      name: name.value,
      email: email.value,
      role: role.value,
      course: role.value === 'student' ? course.value : null,
      group: role.value === 'student' ? group.value : null,
      password: password.value || null,
    })
    name.value = ''
    email.value = ''
    course.value = ''
    group.value = ''
    password.value = ''
    roleFilter.value = role.value
    ok.value = 'Пользователь создан'
    void router.push({
      name: 'admin-users',
      query: buildQuery(1, parsePerPage()),
    })
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}

function startEdit(u: User) {
  editingId.value = u.id
  editName.value = u.name
  editEmail.value = u.email || ''
  editRole.value = u.role
  editCourse.value = u.course || ''
  editGroup.value = u.group || ''
  editPassword.value = ''
  editIsActive.value = u.is_active
}

function cancelEdit() {
  editingId.value = null
  editPassword.value = ''
}

async function saveEdit(u: User) {
  err.value = null
  ok.value = null
  try {
    await api.patch(`/api/admin/users/${u.id}`, {
      name: editName.value,
      email: editEmail.value,
      role: editRole.value,
      course: editRole.value === 'student' ? editCourse.value || null : null,
      group: editRole.value === 'student' ? editGroup.value || null : null,
      password: editPassword.value || null,
      is_active: editIsActive.value,
    })
    cancelEdit()
    await fetchList()
    ok.value = 'Пользователь обновлён'
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}

async function removeUser(u: User) {
  if (!confirm(`Удалить пользователя ${u.name}?`)) {
    return
  }
  if (isPrimaryAdminUser(u)) {
    showUserFeedback(PRIMARY_ADMIN_DELETE_MESSAGE)
    return
  }
  if (auth.user?.id === u.id) {
    showUserFeedback('Нельзя удалить свой аккаунт.')
    return
  }
  err.value = null
  ok.value = null
  try {
    await api.delete(`/api/admin/users/${u.id}`)
    await fetchList()
    showUserFeedback('Пользователь удалён', 'ok')
  } catch (e) {
    showUserFeedback(getErrorMessage(e))
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
      Пользователи
    </h1>

    <div class="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Фильтр роли</label>
        <select
          v-model="roleFilter"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          @change="onRoleFilterNav"
        >
          <option value="all">
            Все
          </option>
          <option value="admin">
            Администраторы
          </option>
          <option value="teacher">
            Преподаватели
          </option>
          <option value="student">
            Студенты
          </option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Имя или почта</label>
        <input
          v-model="q"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Имя или почта"
        >
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Курс</label>
        <input
          v-model="courseFilter"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Курс"
        >
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Группа</label>
        <input
          v-model="groupFilter"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Группа"
        >
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Записей на странице</label>
        <select
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
        @click="applyFiltersNav"
      >
        Применить
      </button>
    </div>
    <form
      class="mt-3 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      @submit.prevent="create"
    >
      <input
        v-model="name"
        class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        placeholder="ФИО"
        required
      >
      <input
        v-model="email"
        class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        type="email"
        placeholder="Адрес почты"
        required
      >
      <select
        v-model="role"
        class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        <option value="admin">
          Администратор
        </option>
        <option value="student">
          Студент
        </option>
        <option value="teacher">
          Преподаватель
        </option>
      </select>
      <template v-if="role === 'student'">
        <input
          v-model="course"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Курс"
        >
        <input
          v-model="group"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Группа"
        >
      </template>
      <input
        v-model="password"
        class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        type="password"
        placeholder="Пароль (опционально)"
      >
      <button
        type="submit"
        class="rounded bg-indigo-600 px-4 py-1 text-white"
      >
        Создать
      </button>
    </form>
    <div
      id="admin-users-feedback"
      class="mt-3 min-h-0"
    >
      <p
        v-if="err"
        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
        role="alert"
      >
        {{ err }}
      </p>
      <p
        v-if="ok"
        class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
      >
        {{ ok }}
      </p>
    </div>

    <div
      v-if="busy"
      class="mt-4 text-sm text-slate-500 dark:text-slate-400"
    >
      Загрузка...
    </div>

    <table
      v-if="list"
      class="mt-6 w-full table-auto border-collapse text-sm text-slate-800 dark:text-slate-200"
    >
      <thead>
        <tr class="border-b border-slate-200 dark:border-slate-700">
          <th class="w-14 p-2" />
          <th class="p-2 text-left">
            Имя
          </th>
          <th class="p-2 text-left">
            Почта
          </th>
          <th class="p-2 text-left">
            Роль
          </th>
          <th class="p-2 text-left">
            Курс
          </th>
          <th class="p-2 text-left">
            Группа
          </th>
          <th class="p-2 text-left">
            Активен
          </th>
          <th class="p-2 text-left">
            Действия
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="u in list.data"
          :key="u.id"
          class="border-b border-slate-200 dark:border-slate-700"
        >
          <td class="p-2 align-middle">
            <UserAvatar
              :name="u.name"
              :image-url="u.avatar_url"
              size="xs"
            />
          </td>
          <td class="p-2">
            <input
              v-if="editingId === u.id"
              v-model="editName"
              class="w-full rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
            <RouterLink
              v-else-if="u.role === 'student'"
              :to="{ name: 'student', params: { id: u.id } }"
              class="text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
            >
              {{ u.name }}
            </RouterLink>
            <span v-else>{{ u.name }}</span>
          </td>
          <td class="p-2">
            <input
              v-if="editingId === u.id"
              v-model="editEmail"
              type="email"
              class="w-full rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
            <span v-else>{{ u.email }}</span>
          </td>
          <td class="p-2">
            <select
              v-if="editingId === u.id"
              v-model="editRole"
              class="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="admin">
                Администратор
              </option>
              <option value="teacher">
                Преподаватель
              </option>
              <option value="student">
                Студент
              </option>
            </select>
            <span v-else>{{ roleLabel(u.role) }}</span>
          </td>
          <td class="p-2">
            <input
              v-if="editingId === u.id"
              v-model="editCourse"
              class="w-24 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              :disabled="editRole !== 'student'"
            >
            <span v-else>{{ u.course || '—' }}</span>
          </td>
          <td class="p-2">
            <input
              v-if="editingId === u.id"
              v-model="editGroup"
              class="w-28 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              :disabled="editRole !== 'student'"
            >
            <span v-else>{{ u.group || '—' }}</span>
          </td>
          <td class="p-2">
            <label
              v-if="editingId === u.id"
              class="inline-flex items-center gap-2"
            >
              <input
                v-model="editIsActive"
                type="checkbox"
              >
              <span>{{ editIsActive ? 'Да' : 'Нет' }}</span>
            </label>
            <span v-else>{{ u.is_active ? 'Да' : 'Нет' }}</span>
          </td>
          <td class="p-2">
            <div
              v-if="editingId === u.id"
              class="flex flex-wrap gap-2"
            >
              <input
                v-model="editPassword"
                type="password"
                class="w-44 rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Новый пароль (опц.)"
              >
              <button
                type="button"
                class="rounded bg-emerald-600 px-3 py-1 text-white"
                @click="saveEdit(u)"
              >
                Сохранить
              </button>
              <button
                type="button"
                class="rounded border border-slate-300 px-3 py-1 dark:border-slate-600"
                @click="cancelEdit"
              >
                Отмена
              </button>
            </div>
            <div
              v-else
              class="flex gap-2"
            >
              <button
                type="button"
                class="rounded border border-slate-300 px-3 py-1 dark:border-slate-600"
                @click="startEdit(u)"
              >
                Редактировать
              </button>
              <button
                type="button"
                class="rounded bg-rose-600 px-3 py-1 text-white"
                @click="removeUser(u)"
              >
                Удалить
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-if="meta && !busy"
      class="mt-4 text-sm text-slate-600 dark:text-slate-400"
    >
      Записей на странице: {{ meta.per_page }}. Страница {{ meta.current_page }} из {{ meta.last_page }}
      (всего пользователей: {{ meta.total }}).
    </p>

    <nav
      v-if="meta && meta.total > 0"
      class="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-700"
      aria-label="Пагинация"
    >
      <RouterLink
        v-if="meta.current_page > 1"
        :to="{ name: 'admin-users', query: paginationQuery(1) }"
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
        :to="{ name: 'admin-users', query: paginationQuery(meta.current_page - 1) }"
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
          :to="{ name: 'admin-users', query: paginationQuery(p) }"
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
        :to="{ name: 'admin-users', query: paginationQuery(meta.current_page + 1) }"
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
        :to="{ name: 'admin-users', query: paginationQuery(meta.last_page) }"
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
