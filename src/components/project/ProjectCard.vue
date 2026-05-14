<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { stripHtmlToPlain } from '@/utils/stripHtml'
import type { Project, ProjectPreview } from '@/types/api'

defineProps<{
  project: Project | ProjectPreview
  showLike?: boolean
}>()
</script>

<template>
  <RouterLink
    :to="{ name: 'project', params: { id: project.id } }"
    class="group block text-inherit no-underline"
  >
    <article>
      <img
        v-if="project.preview_image_url"
        :src="project.preview_image_url"
        :alt="`Превью: ${project.title}`"
        class="block h-auto w-full max-h-[min(52vh,420px)] object-contain object-center transition group-hover:opacity-[0.98]"
        loading="lazy"
        decoding="async"
      >
      <div
        class="rounded-2xl border border-indigo-100/80 bg-white p-4 shadow-sm transition group-hover:border-indigo-200 group-hover:shadow-md dark:border-slate-600 dark:bg-slate-900 dark:shadow-black/30 dark:group-hover:border-slate-500 dark:group-hover:shadow-md"
        :class="project.preview_image_url ? 'mt-3' : ''"
      >
        <h3 class="font-semibold text-indigo-900 dark:text-indigo-200">
          {{ project.title }}
        </h3>
        <p
          v-if="'description' in project && project.description"
          class="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400"
        >
          {{ stripHtmlToPlain((project as Project).description) }}
        </p>
        <p
          v-else
          class="mt-1 text-xs text-slate-400 dark:text-slate-500"
        >
          Открыть описание проекта
        </p>
        <div
          v-if="project.technologies.length"
          class="mt-2"
        >
          <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Жанры мероприятия
          </p>
          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="t in project.technologies"
              :key="t"
              class="rounded-full border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
            >{{ t }}</span>
          </div>
        </div>
      </div>
    </article>
  </RouterLink>
</template>
