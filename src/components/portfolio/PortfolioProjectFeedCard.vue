<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api, getErrorMessage } from '@/api/client'
import { stripHtmlToPlain } from '@/utils/stripHtml'
import type { Project } from '@/types/api'

const props = defineProps<{
  project: Project
}>()

const descriptionPreview = computed(() => stripHtmlToPlain(props.project.description))

const publishBusy = ref(false)
const publishErr = ref<string | null>(null)

const emit = defineEmits<{
  edit: [Project]
  remove: [Project]
  pdf: [Project]
  'visibility-changed': []
}>()

async function onPublishToggle(e: Event) {
  const el = e.target as HTMLInputElement
  const next = el.checked
  publishErr.value = null
  publishBusy.value = true
  try {
    await api.patch(`/api/projects/${props.project.id}`, { is_published: next })
    emit('visibility-changed')
  } catch (err) {
    el.checked = props.project.is_published
    publishErr.value = getErrorMessage(err)
  } finally {
    publishBusy.value = false
  }
}
</script>

<template>
  <article class="relative">
    <img
      v-if="project.preview_image_url"
      :src="project.preview_image_url"
      :alt="`Обложка: ${project.title}`"
      class="block h-auto w-full max-h-[min(52vh,420px)] object-contain object-center"
      loading="lazy"
      decoding="async"
    >
    <span
      v-if="!project.is_published"
      class="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-700/90 px-2.5 py-0.5 text-xs font-medium text-white shadow dark:bg-slate-600/95"
    >не в каталоге</span>
    <div
      class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20 dark:hover:shadow-md"
      :class="project.preview_image_url ? 'mt-3' : ''"
    >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <h2 class="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {{ project.title }}
          </h2>
        </div>
        <label
          class="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition"
          :class="
            project.is_published
              ? 'border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/60 dark:bg-emerald-950/35'
              : 'border-slate-200 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/60'
          "
        >
          <input
            type="checkbox"
            class="mt-1 h-4 w-4 shrink-0 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50 dark:border-slate-500 dark:bg-slate-900"
            :checked="project.is_published"
            :disabled="publishBusy"
            @change="onPublishToggle"
          >
          <span class="min-w-0">
            <span class="block text-sm font-medium text-slate-800 dark:text-slate-100">
              Виден другим в ленте «Другие портфолио»
            </span>
            <span class="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">
              Включите, чтобы проект показывался в общем каталоге. Выключите, если карточка только для вас (доступна по прямой ссылке).
            </span>
          </span>
        </label>
        <p
          v-if="publishErr"
          class="mt-2 text-xs text-rose-600 dark:text-rose-400"
        >
          {{ publishErr }}
        </p>
        <p
          v-if="project.supervisor"
          class="mt-1 text-xs text-slate-500 dark:text-slate-400"
        >
          Руководитель: {{ project.supervisor.name }}
        </p>
        <p class="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {{ descriptionPreview }}
        </p>
        <p
          v-if="project.technologies?.length"
          class="mt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400"
        >
          Формат мероприятия
        </p>
        <div
          v-if="project.technologies?.length"
          class="mt-1 flex flex-wrap gap-1.5"
        >
          <span
            v-for="t in project.technologies ?? []"
            :key="t"
            class="rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
          >{{ t }}</span>
        </div>
        <div
          v-if="project.gallery_urls?.length"
          class="mt-3 flex flex-wrap gap-2"
        >
          <div
            v-for="(u, gi) in project.gallery_urls"
            :key="gi"
            class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
          >
            <img
              :src="u"
              alt=""
              class="max-h-full max-w-full object-contain object-center"
            >
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          <RouterLink
            :to="{ name: 'project', params: { id: project.id } }"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 no-underline hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Открыть страницу
          </RouterLink>
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            @click="emit('edit', project)"
          >
            В конструкторе
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            @click="emit('pdf', project)"
          >
            Скачать PDF
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            @click="emit('remove', project)"
          >
            Удалить
          </button>
        </div>
      </div>
  </article>
</template>
