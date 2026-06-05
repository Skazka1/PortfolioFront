<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import { api, getErrorMessage } from '@/api/client'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { stripHtmlToPlain } from '@/utils/stripHtml'
import type { Project } from '@/types/api'

const props = withDefaults(
  defineProps<{
    name: string
    course: string | null
    group: string | null
    avatarUrl: string | null
    bio: string | null
    coauthorsLine?: string | null
    eventTitle?: string | null
    projects?: Project[]
    showProjectGrid?: boolean
    /** true: подсказка про боковую панель; false: текст для чужого портфолио */
    editorLayout?: boolean
    /** Администратор может удалять чужие проекты */
    canDeleteProjects?: boolean
  }>(),
  {
    coauthorsLine: null,
    eventTitle: null,
    projects: () => [],
    showProjectGrid: true,
    editorLayout: false,
    canDeleteProjects: false,
  }
)

const emit = defineEmits<{
  'project-removed': []
}>()

const deleteErr = ref<string | null>(null)
const deletingId = ref<number | null>(null)

const subtitle = computed(() => {
  const parts = [
    props.course ? `курс ${props.course}` : '',
    props.group ? `группа ${props.group}` : '',
  ].filter(Boolean)
  return parts.join(' · ')
})

async function removeProject(p: Project) {
  if (!props.canDeleteProjects) {
    return
  }
  if (!confirm(`Удалить проект «${p.title}»?`)) {
    return
  }
  deleteErr.value = null
  deletingId.value = p.id
  try {
    await api.delete(`/api/projects/${p.id}`)
    emit('project-removed')
  } catch (e) {
    deleteErr.value = getErrorMessage(e)
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
    <div class="p-6 md:p-8">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
        <UserAvatar
          :name="name"
          :image-url="avatarUrl"
          size="xl"
          class="mx-auto sm:mx-0"
        />
        <div class="min-w-0 flex-1 text-center sm:text-left">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-slate-100">{{ name }}</h1>
          <p
            v-if="subtitle"
            class="mt-1 text-sm text-slate-500 dark:text-slate-400"
          >{{ subtitle }}</p>
          <p
            v-if="coauthorsLine"
            class="mt-2 text-sm text-slate-600 dark:text-slate-300"
          >{{ coauthorsLine }}</p>
          <p
            v-if="eventTitle"
            class="mt-1 text-sm font-medium text-indigo-800 dark:text-indigo-300"
          >Событие: {{ eventTitle }}</p>
        </div>
      </div>

      <h2 class="mt-8 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">Описание</h2>
      <div
        v-if="bio"
        class="mt-4 max-w-none whitespace-pre-wrap text-base leading-relaxed text-slate-700 dark:text-slate-200"
        >{{ bio }}</div>
      <p
        v-else
        class="mt-4 text-slate-400 dark:text-slate-500"
      >
        {{
          editorLayout
            ? 'Текст описания появится здесь после заполнения поля слева.'
            : 'Описание пока не заполнено.'
        }}
      </p>

      <template v-if="showProjectGrid && projects.length">
        <h2 class="mt-10 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">Проекты</h2>
        <p
          v-if="deleteErr"
          class="mt-2 text-sm text-rose-600 dark:text-rose-400"
        >
          {{ deleteErr }}
        </p>
        <ul class="mt-4 grid gap-4 sm:grid-cols-2">
          <li
            v-for="p in projects"
            :key="p.id"
            class="rounded-xl border border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/80"
          >
            <RouterLink
              :to="{ name: 'project', params: { id: p.id } }"
              class="block p-4 transition hover:border-indigo-200 hover:bg-white dark:hover:border-indigo-500 dark:hover:bg-slate-800"
            >
              <span class="font-medium text-indigo-900 dark:text-indigo-300">{{ p.title }}</span>
              <p class="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{{ stripHtmlToPlain(p.description) }}</p>
            </RouterLink>
            <div
              v-if="canDeleteProjects"
              class="border-t border-slate-100 px-4 py-2 dark:border-slate-700"
            >
              <Button
                type="button"
                label="Удалить"
                severity="danger"
                text
                size="small"
                :loading="deletingId === p.id"
                :disabled="deletingId !== null"
                @click="removeProject(p)"
              />
            </div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>
