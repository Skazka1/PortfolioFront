<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api, getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import ProjectDescriptionEditor from '@/components/editor/ProjectDescriptionEditor.vue'
import type { CampusEvent, Paginated, Project, StudentCard, TeacherBrief } from '@/types/api'
import { EVENT_GENRES } from '@/constants/eventGenres'

type PendingImg = { file: File; url: string }
type Coauthor = { id: number; name: string }

const props = defineProps<{
  open: boolean
  project: Project | null
  inline?: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  saved: []
  'draft-created': [Project]
}>()

const auth = useAuthStore()
const title = ref('')
const description = ref('<p></p>')
const githubUrl = ref('')
const isPublished = ref(true)
const genreTags = ref<string[]>([])
const pendingPreview = ref<File | null>(null)
const previewObjectUrl = ref<string | null>(null)
const galleryUrls = ref<string[]>([])
const pendingGallery = ref<PendingImg[]>([])
const err = ref<string | null>(null)
const saving = ref(false)
const pdfBusy = ref(false)
/** Черновик, созданный при первой вставке картинки в текст (до кнопки «сохранить»). */
const localProjectId = ref<number | null>(null)

const coauthors = ref<Coauthor[]>([])
const authorQuery = ref('')
const authorHits = ref<StudentCard[]>([])
let authorSearchTimer: ReturnType<typeof setTimeout> | null = null

const events = ref<CampusEvent[]>([])
const selectedEventId = ref<number | ''>('')

const supervisor = ref<TeacherBrief | null>(null)
const supervisorQuery = ref('')
const supervisorHits = ref<TeacherBrief[]>([])
let supervisorSearchTimer: ReturnType<typeof setTimeout> | null = null

const coverInput = ref<HTMLInputElement | null>(null)
const galleryInput = ref<HTMLInputElement | null>(null)
const pdfInput = ref<HTMLInputElement | null>(null)

function clearPendingGallery() {
  pendingGallery.value.forEach((p) => URL.revokeObjectURL(p.url))
  pendingGallery.value = []
}

function revokePreviewObjectUrl() {
  if (previewObjectUrl.value) {
    URL.revokeObjectURL(previewObjectUrl.value)
    previewObjectUrl.value = null
  }
}

function syncForm() {
  err.value = null
  localProjectId.value = null
  pendingPreview.value = null
  revokePreviewObjectUrl()
  clearPendingGallery()
  authorQuery.value = ''
  authorHits.value = []
  supervisorQuery.value = ''
  supervisorHits.value = []
  selectedEventId.value =
    props.project?.past_event != null ? props.project.past_event.id : ''
  if (props.project) {
    title.value = props.project.title
    const desc = props.project.description ?? ''
    description.value = desc.trim() === '' ? '<p></p>' : desc
    githubUrl.value = props.project.github_url || ''
    isPublished.value = props.project.is_published
    genreTags.value = props.project.technologies.filter((t) =>
      (EVENT_GENRES as readonly string[]).includes(t)
    )
    galleryUrls.value = [...(props.project.gallery_urls ?? [])]
    const me = auth.user?.id
    coauthors.value = (props.project.students ?? [])
      .filter((u) => u.id !== me)
      .map((u) => ({ id: u.id, name: u.name }))
    supervisor.value = props.project.supervisor ?? null
  } else {
    title.value = ''
    description.value = '<p></p>'
    githubUrl.value = ''
    isPublished.value = true
    genreTags.value = []
    galleryUrls.value = []
    coauthors.value = []
    supervisor.value = null
  }
}

function supervisorPayload(): number | null {
  return supervisor.value?.id ?? null
}

function campusEventPayload(): number | null {
  if (selectedEventId.value === '') {
    return null
  }
  return Number(selectedEventId.value)
}

async function loadEvents() {
  try {
    const { data } = await api.get<Paginated<CampusEvent>>('/api/events', {
      params: { per_page: 150, when: 'past' },
    })
    events.value = data.data
  } catch {
    events.value = []
  }
}

watch(
  () => [props.open, props.project?.id ?? 0] as const,
  ([isOpen]) => {
    if (isOpen) {
      syncForm()
      void loadEvents()
    }
  },
  { immediate: true }
)

watch(
  () => props.project?.id,
  (id) => {
    if (id != null && localProjectId.value === id) {
      localProjectId.value = null
    }
  }
)

function descriptionHasText(): boolean {
  const raw = description.value || ''
  if (/<img\s/i.test(raw)) {
    return true
  }
  const plain = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > 0
}

const effectiveProjectId = computed(() => props.project?.id ?? localProjectId.value ?? null)

async function ensureProjectForEditor(): Promise<number> {
  const existing = effectiveProjectId.value
  if (existing != null) {
    return existing
  }
  if (!title.value.trim()) {
    err.value = 'Укажите название проекта, чтобы добавить изображение в карточку.'
    throw new Error('VALIDATION')
  }
  if (!descriptionHasText()) {
    err.value = 'Укажите описание проекта, чтобы добавить изображение в карточку.'
    throw new Error('VALIDATION')
  }
  err.value = null
  const payload = {
    title: title.value.trim(),
    description: description.value,
    github_url: githubUrl.value.trim() || null,
    technologies: genreTags.value,
    is_published: isPublished.value,
    collaborator_ids: collaboratorIdsForSave.value,
    supervisor_user_id: supervisorPayload(),
    campus_event_id: campusEventPayload(),
  }
  const { data } = await api.post<{ data: Project }>('/api/projects', payload)
  localProjectId.value = data.data.id
  galleryUrls.value = [...(data.data.gallery_urls ?? [])]
  emit('draft-created', data.data)
  return data.data.id
}

watch(pendingPreview, (f) => {
  revokePreviewObjectUrl()
  if (f) {
    previewObjectUrl.value = URL.createObjectURL(f)
  }
})

function onPreviewPick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  pendingPreview.value = f || null
  ;(e.target as HTMLInputElement).value = ''
}

function onGalleryPick(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const used = galleryUrls.value.length + pendingGallery.value.length
  const room = Math.max(0, 24 - used)
  for (const f of files.slice(0, room)) {
    if (!f.type.startsWith('image/')) {
      continue
    }
    pendingGallery.value.push({ file: f, url: URL.createObjectURL(f) })
  }
  input.value = ''
}

function removePendingGallery(i: number) {
  const [p] = pendingGallery.value.splice(i, 1)
  if (p) {
    URL.revokeObjectURL(p.url)
  }
}

async function removeServerGallery(index: number) {
  const id = effectiveProjectId.value
  if (id == null) {
    return
  }
  err.value = null
  try {
    await api.delete(`/api/projects/${id}/gallery/${index}`)
    galleryUrls.value.splice(index, 1)
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}

function onAuthorQueryInput() {
  if (authorSearchTimer !== null) {
    clearTimeout(authorSearchTimer)
    authorSearchTimer = null
  }
  authorSearchTimer = setTimeout(async () => {
    authorSearchTimer = null
    const q = authorQuery.value.trim()
    if (q.length < 2) {
      authorHits.value = []
      return
    }
    try {
      const { data } = await api.get<Paginated<StudentCard>>('/api/students', {
        params: { q, per_page: 8 },
      })
      const taken = new Set(coauthors.value.map((c) => c.id))
      taken.add(auth.user!.id)
      authorHits.value = data.data.filter((s) => !taken.has(s.id))
    } catch {
      authorHits.value = []
    }
  }, 280)
}

function addCoauthor(s: StudentCard) {
  if (coauthors.value.some((c) => c.id === s.id)) {
    return
  }
  coauthors.value.push({ id: s.id, name: s.name })
  authorQuery.value = ''
  authorHits.value = []
}

function removeCoauthor(i: number) {
  coauthors.value.splice(i, 1)
}

function onSupervisorQueryInput() {
  if (supervisorSearchTimer !== null) {
    clearTimeout(supervisorSearchTimer)
    supervisorSearchTimer = null
  }
  supervisorSearchTimer = setTimeout(async () => {
    supervisorSearchTimer = null
    const q = supervisorQuery.value.trim()
    if (q.length < 2 || supervisor.value) {
      supervisorHits.value = []
      return
    }
    try {
      const { data } = await api.get<Paginated<TeacherBrief>>('/api/teachers', {
        params: { q, per_page: 8 },
      })
      supervisorHits.value = data.data
    } catch {
      supervisorHits.value = []
    }
  }, 280)
}

function setSupervisor(t: TeacherBrief) {
  supervisor.value = t
  supervisorQuery.value = ''
  supervisorHits.value = []
}

function clearSupervisor() {
  supervisor.value = null
}

async function onPdfPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  err.value = null
  pdfBusy.value = true
  try {
    const form = new FormData()
    form.append('pdf', file)
    await api.post('/api/projects/import-from-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    emit('saved')
    emit('update:open', false)
  } catch (e) {
    err.value = getErrorMessage(e)
  } finally {
    pdfBusy.value = false
  }
}

const selectedCampusEvent = computed((): Pick<CampusEvent, 'id' | 'title' | 'genres'> | null => {
  if (selectedEventId.value === '') {
    return null
  }
  const id = Number(selectedEventId.value)
  const fromList = events.value.find((e) => e.id === id)
  if (fromList) {
    return { id: fromList.id, title: fromList.title, genres: fromList.genres ?? [] }
  }
  const pe = props.project?.past_event
  if (pe && pe.id === id) {
    return { id: pe.id, title: pe.title, genres: pe.genres ?? [] }
  }
  return null
})

/** Обложка в карточке превью (не подменяем галереей). */
const sidebarCoverUrl = computed(() => {
  if (previewObjectUrl.value) {
    return previewObjectUrl.value
  }
  if (props.project?.preview_image_url) {
    return props.project.preview_image_url
  }
  return null
})

const collaboratorIdsForSave = computed(() => {
  const ids = [auth.user!.id, ...coauthors.value.map((c) => c.id)]
  return [...new Set(ids)]
})

function close() {
  emit('update:open', false)
}

async function save() {
  err.value = null
  if (!title.value.trim()) {
    err.value = 'Укажите название проекта.'
    return
  }
  if (!descriptionHasText()) {
    err.value = 'Укажите описание проекта.'
    return
  }
  saving.value = true
  try {
    const payload = {
      title: title.value,
      description: description.value,
      github_url: githubUrl.value.trim() || null,
      technologies: genreTags.value,
      is_published: isPublished.value,
      collaborator_ids: collaboratorIdsForSave.value,
      supervisor_user_id: supervisorPayload(),
      campus_event_id: campusEventPayload(),
    }
    const existingId = props.project?.id ?? localProjectId.value ?? null
    let id: number
    if (existingId != null) {
      await api.patch(`/api/projects/${existingId}`, payload)
      id = existingId
    } else {
      const { data } = await api.post<{ data: Project }>('/api/projects', payload)
      id = data.data.id
    }
    localProjectId.value = null
    if (pendingPreview.value) {
      const form = new FormData()
      form.append('image', pendingPreview.value)
      await api.post(`/api/projects/${id}/preview`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    if (pendingGallery.value.length) {
      const form = new FormData()
      for (const { file } of pendingGallery.value) {
        form.append('images[]', file)
      }
      await api.post(`/api/projects/${id}/gallery`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      clearPendingGallery()
    }
    emit('saved')
    emit('update:open', false)
  } catch (e) {
    err.value = getErrorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport
    to="body"
    :disabled="Boolean(props.inline)"
  >
    <div
      v-if="open"
      :class="
        props.inline
          ? 'relative mx-auto w-full max-w-[1400px] py-2'
          : 'fixed inset-0 z-[60] flex items-stretch justify-center bg-neutral-400/50 p-0 dark:bg-black/60 sm:items-center sm:p-4 sm:py-8'
      "
      @click.self="close"
    >
      <div
        :class="
          props.inline
            ? 'flex min-h-[calc(100dvh-7.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#ececec] shadow-xl dark:border-slate-700 dark:bg-slate-900'
            : 'flex max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-[#ececec] shadow-2xl dark:bg-slate-900 sm:max-h-[min(92vh,880px)] sm:rounded-2xl'
        "
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'builder-title'"
      >
        <div class="flex shrink-0 items-center justify-between border-b border-black/10 bg-[#ececec] px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
          <h2
            id="builder-title"
            class="text-base font-semibold tracking-tight text-neutral-900 dark:text-slate-100"
          >
            {{ project ? 'Конструктор проекта' : 'Новый проект' }}
          </h2>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-2xl leading-none text-neutral-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label="Закрыть"
            @click="close"
          >
            ×
          </button>
        </div>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <!-- Левая колонка: доп. настройки -->
          <aside
            class="order-2 flex min-h-0 w-full shrink-0 flex-col gap-3 overflow-y-auto overflow-x-hidden border-black/10 bg-[#ececec] p-4 dark:border-slate-700 dark:bg-slate-950 sm:gap-4 sm:p-5 lg:order-none lg:max-h-full lg:w-[min(30%,280px)] lg:border-r"
          >
            <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-slate-400">
              Панель настроек
            </p>

            <div class="overflow-hidden rounded-xl bg-white dark:bg-slate-800">
              <input
                ref="coverInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="sr-only"
                @change="onPreviewPick"
              >
              <button
                type="button"
                class="relative w-full text-left transition hover:bg-neutral-50 dark:hover:bg-slate-700/50"
                @click="coverInput?.click()"
              >
                <div class="flex max-h-52 w-full items-center justify-center bg-neutral-100 dark:bg-slate-950">
                  <img
                    v-if="sidebarCoverUrl"
                    :src="sidebarCoverUrl"
                    alt=""
                    class="max-h-52 w-full object-contain dark:bg-slate-950"
                  >
                  <div
                    v-else
                    class="flex min-h-[6.5rem] w-full flex-col items-center justify-center gap-1.5 bg-neutral-100 px-2 py-3 text-center text-neutral-600 dark:bg-slate-950 dark:text-slate-500"
                  >
                    <svg
                      class="h-8 w-8 shrink-0 text-neutral-700 dark:text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.25"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M24 8v20m0 0l-6-6m6 6l6-6M14 36h20"
                      />
                    </svg>
                    <span class="text-[11px] font-medium leading-tight">Обложка — нажмите</span>
                  </div>
                </div>
                <span
                  class="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white"
                >Обложка</span>
              </button>
            </div>

            <div class="relative">
              <label class="sr-only">Авторы</label>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                /></svg>
              </span>
              <input
                v-model="authorQuery"
                type="text"
                autocomplete="off"
                placeholder="Добавьте авторов"
                class="w-full rounded-2xl border-2 border-neutral-900 bg-white py-3 pl-4 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                @input="onAuthorQueryInput"
              >
              <ul
                v-if="authorHits.length"
                class="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-xl border-2 border-neutral-900 bg-white py-1 shadow-lg dark:border-slate-500 dark:bg-slate-800 dark:shadow-black/40"
              >
                <li
                  v-for="s in authorHits"
                  :key="s.id"
                >
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-slate-700"
                    @click="addCoauthor(s)"
                  >
                    {{ s.name }}
                    <span
                      v-if="s.course"
                      class="text-xs text-neutral-500"
                    > · курс {{ s.course }}</span>
                  </button>
                </li>
              </ul>
            </div>
            <div
              v-if="coauthors.length"
              class="flex flex-wrap gap-2"
            >
              <span
                v-for="(c, i) in coauthors"
                :key="c.id"
                class="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                {{ c.name }}
                <button
                  type="button"
                  class="text-neutral-400 hover:text-rose-600"
                  aria-label="Убрать"
                  @click="removeCoauthor(i)"
                >
                  ×
                </button>
              </span>
            </div>

            <div class="relative">
              <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-slate-400">
                Научный руководитель
              </label>
              <span class="pointer-events-none absolute right-3 top-[2.25rem] text-neutral-500">
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                /></svg>
              </span>
              <input
                v-model="supervisorQuery"
                type="text"
                autocomplete="off"
                :disabled="Boolean(supervisor)"
                placeholder="Введите ФИО преподавателя"
                class="w-full rounded-2xl border-2 border-neutral-900 bg-white py-3 pl-4 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                @input="onSupervisorQueryInput"
              >
              <ul
                v-if="supervisorHits.length"
                class="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-xl border-2 border-neutral-900 bg-white py-1 shadow-lg dark:border-slate-500 dark:bg-slate-800 dark:shadow-black/40"
              >
                <li
                  v-for="t in supervisorHits"
                  :key="t.id"
                >
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-slate-700"
                    @click="setSupervisor(t)"
                  >
                    {{ t.name }}
                  </button>
                </li>
              </ul>
              <div
                v-if="supervisor"
                class="mt-2 flex flex-wrap gap-2"
              >
                <span
                  class="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  {{ supervisor.name }}
                  <button
                    type="button"
                    class="text-neutral-400 hover:text-rose-600"
                    aria-label="Убрать руководителя"
                    @click="clearSupervisor"
                  >
                    ×
                  </button>
                </span>
              </div>
              <p class="mt-1 text-[11px] leading-snug text-neutral-500 dark:text-slate-400">
                Как в авторах: начните вводить имя и выберите одного преподавателя из списка.
              </p>
            </div>

            <div>
              <input
                ref="pdfInput"
                type="file"
                accept="application/pdf"
                class="sr-only"
                :disabled="pdfBusy"
                @change="onPdfPick"
              >
              <button
                type="button"
                class="w-full rounded-2xl border-2 border-neutral-900 bg-white py-3 text-center text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                :disabled="pdfBusy"
                @click="pdfInput?.click()"
              >
                {{ pdfBusy ? 'Импорт PDF…' : 'Выберите PDF файл' }}
              </button>
              <p class="mt-1 text-[11px] leading-snug text-neutral-500 dark:text-slate-400">
                Создаётся отдельный черновик проекта из PDF; текущая форма не сохраняется автоматически.
              </p>
            </div>

            <div>
              <label
                for="project-past-event"
                class="mb-1 block text-left text-xs font-medium text-neutral-600 dark:text-slate-400"
              >Прошедшее событие (по желанию)</label>
              <select
                id="project-past-event"
                v-model="selectedEventId"
                class="w-full appearance-none rounded-2xl border-2 border-neutral-900 bg-white py-3 pl-4 pr-10 text-sm text-neutral-900 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">
                  Не указывать
                </option>
                <option
                  v-for="ev in events"
                  :key="ev.id"
                  :value="ev.id"
                >
                  {{ ev.title }}<template v-if="ev.genres?.length"> — {{ ev.genres.join(', ') }}</template>
                </option>
              </select>
            </div>

            <details class="rounded-2xl border border-neutral-300 bg-white/60 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800/80">
              <summary class="cursor-pointer select-none font-medium text-neutral-700 dark:text-slate-200">
                Ещё: жанр мероприятия, GitHub, публикация
              </summary>
              <div class="mt-3 space-y-3 border-t border-neutral-200 pt-3 dark:border-slate-600">
                <div>
                  <p class="text-xs text-neutral-500 dark:text-slate-400">
                    Жанр мероприятия (можно выбрать несколько)
                  </p>
                  <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label
                      v-for="g in EVENT_GENRES"
                      :key="g"
                      class="flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition dark:border-slate-600"
                      :class="
                        genreTags.includes(g)
                          ? 'border-emerald-600 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/50'
                          : 'border-neutral-200 bg-white dark:bg-slate-900'
                      "
                    >
                      <input
                        v-model="genreTags"
                        type="checkbox"
                        class="rounded border-neutral-400 dark:border-slate-500"
                        :value="g"
                      >
                      <span class="leading-snug">{{ g }}</span>
                    </label>
                  </div>
                </div>
                <label class="block text-xs text-neutral-600 dark:text-slate-400">GitHub</label>
                <input
                  v-model="githubUrl"
                  type="text"
                  class="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="https://…"
                >
                <label class="flex cursor-pointer items-center gap-2 text-xs text-neutral-800 dark:text-slate-300">
                  <input
                    v-model="isPublished"
                    type="checkbox"
                    class="rounded border-neutral-400 dark:border-slate-500"
                  >
                  Публиковать в каталоге
                </label>
              </div>
            </details>

            <p
              v-if="err"
              class="text-sm text-rose-600"
            >{{ err }}</p>

            <button
              type="button"
              class="mt-auto w-full rounded-full bg-[#00a63f] py-4 text-center text-base font-bold lowercase tracking-wide text-white shadow-sm transition hover:bg-[#009038] disabled:opacity-50"
              :disabled="saving"
              @click="save"
            >
              сохранить
            </button>
            <button
              type="button"
              class="pb-2 text-center text-sm text-neutral-600 underline-offset-2 hover:underline dark:text-slate-400"
              :disabled="saving"
              @click="close"
            >
              Отмена
            </button>
          </aside>

          <!-- Правая колонка: редактирование в превью -->
          <div
            class="order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#ececec] p-4 dark:bg-slate-950 sm:order-none sm:p-6"
          >
            <p class="mb-2 shrink-0 text-center text-xs font-medium uppercase tracking-[0.2em] text-neutral-400 dark:text-slate-500">
              редактирование превью
            </p>
            <div
              class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 border-neutral-900 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:shadow-black/30"
            >
              <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-5 md:px-8 md:pb-8 md:pt-6">
                <label class="sr-only">Название проекта</label>
                <input
                  v-model="title"
                  type="text"
                  maxlength="255"
                  placeholder="Название проекта"
                  class="w-full border-0 border-b-2 border-transparent bg-transparent text-2xl font-bold tracking-tight text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-200 focus:outline-none focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-600 md:text-3xl"
                >
                <div
                  v-if="genreTags.length"
                  class="mt-3 flex flex-wrap gap-1.5"
                >
                  <span
                    v-for="t in genreTags"
                    :key="t"
                    class="rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                  >{{ t }}</span>
                </div>
                <p
                  v-else
                  class="mt-2 text-xs text-neutral-400 dark:text-slate-500"
                >
                  Жанры мероприятия — в панели слева, блок «Ещё».
                </p>

                <h3 class="mt-6 border-b border-neutral-200 pb-2 text-lg font-semibold text-neutral-900 dark:border-slate-600 dark:text-slate-100">
                  Описание
                </h3>

                <ProjectDescriptionEditor
                  v-model="description"
                  embedded
                  toolbar-placement="right"
                  :project-id="effectiveProjectId"
                  :ensure-project="ensureProjectForEditor"
                  :disabled="saving"
                  placeholder="Пишите здесь. Картинки в текст — кнопка «Фото в текст» справа."
                />

                <p
                  v-if="selectedCampusEvent"
                  class="mt-6 text-sm font-medium text-indigo-800 dark:text-indigo-300"
                >
                  Событие: {{ selectedCampusEvent.title }}
                  <span
                    v-if="selectedCampusEvent.genres?.length"
                    class="mt-1 block text-xs font-normal text-indigo-700/90 dark:text-indigo-400/90"
                  >
                    Жанры мероприятия: {{ selectedCampusEvent.genres.join(', ') }}
                  </span>
                </p>

                <div class="mt-8 border-t border-neutral-100 pt-6 dark:border-slate-700">
                  <h4 class="text-sm font-semibold text-neutral-800 dark:text-slate-200">
                    Галерея
                  </h4>
                  <p class="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                    Отдельные фото карточки (не в тексте). Наведите на миниатюру — удалить.
                  </p>
                  <input
                    ref="galleryInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    class="sr-only"
                    @change="onGalleryPick"
                  >
                  <button
                    type="button"
                    class="mt-2 text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-400"
                    @click="galleryInput?.click()"
                  >
                    + Добавить в галерею
                  </button>
                  <div
                    v-if="galleryUrls.length || pendingGallery.length"
                    class="mt-3 flex flex-wrap gap-2"
                  >
                    <div
                      v-for="(url, gi) in galleryUrls"
                      :key="'g-'+gi"
                      class="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-slate-600 dark:bg-slate-800"
                    >
                      <img
                        :src="url"
                        alt=""
                        class="max-h-full max-w-full object-contain object-center"
                      >
                      <button
                        type="button"
                        class="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white opacity-0 transition group-hover:opacity-100"
                        title="Удалить"
                        @click="removeServerGallery(gi)"
                      >
                        ×
                      </button>
                    </div>
                    <div
                      v-for="(pg, pi) in pendingGallery"
                      :key="'p-'+pi"
                      class="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-2 ring-emerald-500"
                    >
                      <img
                        :src="pg.url"
                        alt=""
                        class="max-h-full max-w-full object-contain object-center"
                      >
                      <span class="absolute bottom-1 left-1 rounded bg-emerald-600/90 px-1 text-[9px] text-white">новое</span>
                      <button
                        type="button"
                        class="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white opacity-0 transition group-hover:opacity-100"
                        title="Убрать"
                        @click="removePendingGallery(pi)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
