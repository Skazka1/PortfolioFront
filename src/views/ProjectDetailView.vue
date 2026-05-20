<script setup lang="ts">
import DOMPurify from 'dompurify'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { api, getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import LikeButton from '@/components/project/LikeButton.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { displayProjectCreator } from '@/utils/projectCreator'
import { formatPastEventShort } from '@/utils/formatProjectFeedDate'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projects = useProjectsStore()
const loading = ref(true)
const err = ref<string | null>(null)
const deleting = ref(false)

const canDeleteAsAdmin = computed(
  () => auth.hasRole('admin') && projects.current !== null
)

onMounted(() => {
  void run()
})
watch(
  () => route.params.id,
  () => {
    void run()
  }
)
async function run() {
  loading.value = true
  err.value = null
  try {
    await projects.fetchOne(Number(route.params.id))
  } catch (e) {
    err.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

const safeDescriptionHtml = computed(() => {
  const raw = projects.current?.description ?? ''
  if (!raw.trim()) {
    return ''
  }
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
})

const hasDescriptionContent = computed(() => {
  const raw = projects.current?.description ?? ''
  if (/<img\s/i.test(raw)) {
    return true
  }
  return raw.replace(/<[^>]*>/g, '').trim().length > 0
})

const creatorDisplay = computed(() =>
  projects.current ? displayProjectCreator(projects.current) : null
)

const pastEventLine = computed(() => {
  const pe = projects.current?.past_event
  return pe ? formatPastEventShort(pe) : null
})

async function removeProject() {
  const p = projects.current
  if (!p || !canDeleteAsAdmin.value) {
    return
  }
  if (!confirm(`Удалить проект «${p.title}»? Это действие нельзя отменить.`)) {
    return
  }
  deleting.value = true
  err.value = null
  try {
    await api.delete(`/api/projects/${p.id}`)
    const student = p.students?.[0]
    if (student) {
      await router.push({ name: 'student', params: { id: student.id } })
    } else {
      await router.push({ name: 'students' })
    }
  } catch (e) {
    err.value = getErrorMessage(e)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div
    v-if="loading"
    class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:shadow-black/20"
  >
    Загрузка…
  </div>
  <div
    v-else-if="err"
    class="rounded-2xl border border-rose-100 bg-white p-8 shadow dark:border-rose-900/50 dark:bg-slate-900 dark:shadow-black/20"
  >
    <p class="text-rose-700">{{ err }}</p>
    <RouterLink
      :to="{ name: 'students' }"
      class="mt-4 inline-block text-indigo-600 hover:underline"
    >К каталогу студентов</RouterLink>
  </div>
  <div
    v-else-if="projects.current"
  >
    <img
      v-if="projects.current.preview_image_url"
      :src="projects.current.preview_image_url"
      :alt="`Обложка: ${projects.current.title}`"
      class="mb-6 block w-full max-h-[min(52vh,480px)] object-contain object-center"
      loading="eager"
      decoding="async"
    >
    <div
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20"
    >
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ projects.current.title }}</h1>
    <div
      v-if="creatorDisplay"
      class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400"
    >
      <span class="shrink-0 font-medium text-slate-500 dark:text-slate-500">Создал(а):</span>
      <UserAvatar
        :name="creatorDisplay.name"
        :image-url="creatorDisplay.avatar_url"
        size="sm"
      />
      <RouterLink
        v-if="creatorDisplay.role === 'student'"
        :to="{ name: 'student', params: { id: creatorDisplay.id } }"
        class="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >{{ creatorDisplay.name }}</RouterLink>
      <span
        v-else
        class="font-medium text-slate-800 dark:text-slate-200"
      >{{ creatorDisplay.name }}</span>
    </div>
    <p
      v-if="projects.current.supervisor"
      class="mt-1 text-sm text-slate-600 dark:text-slate-400"
    >
      Научный руководитель:
      <span class="font-medium text-slate-800 dark:text-slate-200">{{ projects.current.supervisor.name }}</span>
    </p>
    <p
      v-if="pastEventLine"
      class="mt-2 text-sm text-slate-600 dark:text-slate-400"
    >
      <span class="font-medium text-slate-500 dark:text-slate-500">Прошедшее событие:</span>
      {{ pastEventLine }}
    </p>
    <div class="mt-2 flex flex-wrap items-center gap-3">
      <LikeButton :project="projects.current" />
      <Button
        v-if="canDeleteAsAdmin"
        type="button"
        label="Удалить проект"
        severity="danger"
        outlined
        size="small"
        :loading="deleting"
        :disabled="deleting"
        @click="removeProject"
      />
    </div>
    <div
      v-if="hasDescriptionContent"
      class="prose-desc mt-4 max-w-none text-slate-700 dark:text-slate-300 [&_img]:my-3 [&_img]:max-h-[min(70vh,520px)] [&_img]:w-auto [&_img]:max-w-full [&_img]:rounded-xl [&_img]:object-contain [&_p]:mb-3 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-lg [&_h3]:font-semibold"
      v-html="safeDescriptionHtml"
    />
    <p
      v-else
      class="mt-4 text-slate-400 dark:text-slate-500"
    >Описание пока пустое.</p>
    <div
      v-if="projects.current.gallery_urls?.length"
      class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      <a
        v-for="(u, gi) in projects.current.gallery_urls"
        :key="gi"
        :href="u"
        target="_blank"
        rel="noopener noreferrer"
        class="flex min-h-[10rem] items-center justify-center overflow-hidden rounded-xl bg-slate-100 p-2 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:ring-slate-600 dark:hover:bg-slate-800/80"
      >
        <img
          :src="u"
          alt=""
          class="max-h-[min(48vh,420px)] w-full object-contain object-center transition hover:opacity-95"
        >
      </a>
    </div>
    <div
      v-if="projects.current.technologies?.length"
      class="mt-4"
    >
      <p class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Жанры мероприятия
      </p>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="t in projects.current.technologies"
          :key="t"
          class="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800 dark:text-slate-200"
        >{{ t }}</span>
      </div>
    </div>
    <a
      v-if="projects.current.github_url"
      :href="projects.current.github_url"
      class="mt-2 inline-block text-indigo-600 hover:underline dark:text-indigo-400"
      target="_blank"
      >Репозиторий на GitHub</a>
    <h2 class="mt-6 font-semibold text-slate-900 dark:text-slate-100">Участники</h2>
    <ul class="mt-2 space-y-2">
      <li
        v-for="s in projects.current.students"
        :key="s.id"
        class="list-none"
      >
        <RouterLink
          :to="{ name: 'student', params: { id: s.id } }"
          class="inline-flex items-center gap-2 text-slate-700 hover:text-indigo-800 dark:text-slate-300 dark:hover:text-indigo-300"
        >
          <UserAvatar
            :name="s.name"
            :image-url="s.avatar_url"
            size="sm"
          />
          <span class="hover:underline">{{ s.name }}</span>
        </RouterLink>
      </li>
    </ul>
    </div>
  </div>
</template>
