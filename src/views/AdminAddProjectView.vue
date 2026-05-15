<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { api, getErrorMessage } from '@/api/client'
import type { Project } from '@/types/api'

const toast = useToast()

const title = ref('')
const previewFile = ref<File | null>(null)
const previewFileName = ref('')
const busy = ref(false)
const err = ref<string | null>(null)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  previewFile.value = file
  previewFileName.value = file?.name ?? ''
}

async function onSubmit() {
  err.value = null
  const name = title.value.trim()
  if (!name) {
    err.value = 'Укажите название проекта.'
    return
  }

  busy.value = true
  try {
    const form = new FormData()
    form.append('title', name)
    form.append('description', `<p>${name}</p>`)
    form.append('is_published', '1')
    if (previewFile.value) {
      form.append('preview_image', previewFile.value)
    }

    await api.post<{ data: Project }>('/api/projects', form)

    toast.add({
      severity: 'success',
      summary: 'Данные успешно добавлены',
      detail: 'Проект успешно добавлен',
      life: 5000,
    })

    title.value = ''
    previewFile.value = null
    previewFileName.value = ''
  } catch (e) {
    err.value = getErrorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="admin-add-project mx-auto max-w-lg py-8">
    <h1 class="mb-8 text-center text-2xl font-semibold text-slate-800 dark:text-slate-100">
      Добавление проекта
    </h1>

    <form
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <InputText
        v-model="title"
        type="text"
        placeholder="Название проекта"
        class="w-full"
        :disabled="busy"
      />

      <label
        class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        <svg
          class="h-5 w-5 shrink-0 text-slate-400"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.5 14.25v-2.625a2.25 2.25 0 00-2.25-2.25h-5.25M9 16.5v-7.5m0 0L5.25 12.75M9 9l3.75 3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
          />
        </svg>
        <span class="truncate">{{ previewFileName || 'Выберите файл превью' }}</span>
        <input
          type="file"
          accept="image/*"
          class="sr-only"
          :disabled="busy"
          @change="onFileChange"
        >
      </label>

      <p
        v-if="err"
        class="text-center text-sm text-rose-600 dark:text-rose-400"
      >
        {{ err }}
      </p>

      <Button
        type="submit"
        label="Создать"
        class="admin-add-project__submit w-full"
        :loading="busy"
        :disabled="busy"
      />
    </form>
  </div>
</template>

<style scoped>
.admin-add-project :deep(.admin-add-project__submit) {
  background: #16a34a;
  border-color: #16a34a;
}

.admin-add-project :deep(.admin-add-project__submit:hover) {
  background: #15803d;
  border-color: #15803d;
}
</style>
