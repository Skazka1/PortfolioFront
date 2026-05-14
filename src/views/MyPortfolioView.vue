<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { api, getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import PortfolioProjectFeedCard from '@/components/portfolio/PortfolioProjectFeedCard.vue'
import AvatarCropModal from '@/components/user/AvatarCropModal.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import type { Project } from '@/types/api'

const auth = useAuthStore()
const projects = useProjectsStore()
const router = useRouter()

const bio = ref('')
const err = ref<string | null>(null)
const ok = ref<string | null>(null)
const saving = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)
const cropOpen = ref(false)
const cropFile = ref<File | null>(null)
const pdfInput = ref<HTMLInputElement | null>(null)

const previewAvatar = computed(() => auth.user?.avatar_url ?? null)

onMounted(async () => {
  await auth.fetchUser()
  await projects.fetchMine()
  syncFromUser()
})

watch(
  () => auth.user,
  () => syncFromUser(),
  { deep: true }
)

watch(cropOpen, (v) => {
  if (!v) {
    cropFile.value = null
  }
})

function syncFromUser() {
  bio.value = auth.user?.bio ?? ''
}

function openNewProject() {
  void router.push({ name: 'project-builder-new' })
}

function openEditProject(p: Project) {
  void router.push({ name: 'project-builder-edit', params: { id: p.id } })
}

async function saveBio() {
  if (!auth.user) {
    return
  }
  err.value = null
  ok.value = null
  saving.value = true
  try {
    const { data } = await api.patch<{ data: typeof auth.user }>('/api/profile', {
      bio: bio.value || null,
    })
    auth.user = data.data
    ok.value = 'Описание сохранено'
    setTimeout(() => {
      ok.value = null
    }, 2500)
  } catch (e) {
    err.value = getErrorMessage(e)
  } finally {
    saving.value = false
  }
}

function onCoverPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !file.type.startsWith('image/')) {
    return
  }
  cropFile.value = file
  cropOpen.value = true
}

async function onCroppedAvatar(file: File) {
  cropOpen.value = false
  cropFile.value = null
  err.value = null
  try {
    const form = new FormData()
    form.append('avatar', file)
    const { data } = await api.post<{ data: typeof auth.user }>('/api/profile/avatar', form)
    auth.user = data.data
    ok.value = 'Фото профиля обновлено'
    setTimeout(() => {
      ok.value = null
    }, 2500)
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}

async function importPdf(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  err.value = null
  try {
    const form = new FormData()
    form.append('pdf', file)
    await api.post('/api/projects/import-from-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    await projects.fetchMine()
    ok.value = 'Проект из PDF добавлен (черновик). Откройте в конструкторе и дополните.'
    setTimeout(() => {
      ok.value = null
    }, 4000)
  } catch (e) {
    err.value = getErrorMessage(e)
  }
  input.value = ''
}

async function remove(p: Project) {
  if (!confirm(`Удалить проект «${p.title}»?`)) {
    return
  }
  err.value = null
  try {
    await api.delete(`/api/projects/${p.id}`)
    await projects.fetchMine()
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}

async function downloadProjectPdf(p: Project) {
  err.value = null
  try {
    await projects.downloadProjectPdf(p.id, p.title)
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}

async function downloadPortfolioPdf() {
  if (!auth.user) {
    return
  }
  err.value = null
  try {
    await projects.downloadPortfolioPdf(auth.user.id)
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl pb-16">
    <header class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div
          class="flex shrink-0 cursor-pointer flex-col items-center gap-2"
          role="button"
          tabindex="0"
          @click="coverInput?.click()"
          @keydown.enter="coverInput?.click()"
        >
          <UserAvatar
            v-if="auth.user"
            :name="auth.user.name"
            :image-url="previewAvatar"
            size="xl"
          />
          <span class="text-center text-xs text-slate-500 dark:text-slate-400">Нажмите, чтобы сменить фото</span>
          <input
            ref="coverInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="hidden"
            @change="onCoverPick"
          >
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {{ auth.user?.name }}
          </h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            <span v-if="auth.user?.course">Курс {{ auth.user.course }}</span>
            <span v-if="auth.user?.group"> · Гр. {{ auth.user.group }}</span>
          </p>
          <label class="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Описание</label>
          <textarea
            v-model="bio"
            rows="4"
            class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            placeholder="Краткое описание — отображается в портфолио для гостей."
          />
          <button
            type="button"
            :disabled="saving"
            class="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
            @click="saveBio"
          >
            Сохранить описание
          </button>
        </div>
      </div>
    </header>

    <div class="mt-6 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/40 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700"
        @click="openNewProject"
      >
        Новый проект
      </button>
      <label
        class="inline-flex cursor-pointer items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-900 shadow-sm hover:bg-indigo-50 dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-200 dark:hover:bg-slate-700"
      >
        Импорт из PDF
        <input
          ref="pdfInput"
          type="file"
          accept="application/pdf"
          class="hidden"
          @change="importPdf"
        />
      </label>
      <button
        type="button"
        class="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-900 hover:bg-white dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-200 dark:hover:bg-slate-700"
        @click="downloadPortfolioPdf"
      >
        Скачать портфолио PDF
      </button>
      <RouterLink
        v-if="auth.user"
        :to="{ name: 'student', params: { id: auth.user.id } }"
        class="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-indigo-800 underline-offset-2 hover:underline dark:text-indigo-300"
      >
        Как видят гости
      </RouterLink>
    </div>

    <p
      v-if="err"
      class="mt-4 text-sm text-rose-600 dark:text-rose-400"
    >{{ err }}</p>
    <p
      v-if="ok"
      class="mt-2 text-sm text-emerald-700 dark:text-emerald-400"
    >{{ ok }}</p>

    <section class="mt-10">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Лента проектов
      </h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Здесь вы редактируете карточки: конструктор, импорт PDF и выгрузка в PDF по каждому проекту.
      </p>

      <div
        v-if="!projects.mine.length"
        class="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-16 text-center text-slate-500 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
      >
        Пока нет проектов. Создайте первый в конструкторе или импортируйте из PDF.
      </div>

      <div
        v-else
        class="mt-6 space-y-5"
      >
        <PortfolioProjectFeedCard
          v-for="p in projects.mine"
          :key="p.id"
          :project="p"
          @edit="openEditProject"
          @remove="remove"
          @pdf="downloadProjectPdf"
          @visibility-changed="projects.fetchMine()"
        />
      </div>
    </section>

    <AvatarCropModal
      v-model:open="cropOpen"
      :file="cropFile"
      @crop="onCroppedAvatar"
    />
  </div>
</template>
