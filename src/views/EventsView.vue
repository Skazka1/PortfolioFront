<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api, getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useEventsStore } from '@/stores/events'
import type { CampusEvent } from '@/types/api'
import { EVENT_GENRES } from '@/constants/eventGenres'

const ev = useEventsStore()
const auth = useAuthStore()
const err = ref<string | null>(null)
const form = ref({
  title: '',
  date_time: '',
  location: '',
  description: '',
  genres: [] as string[],
})
const editId = ref<number | null>(null)

/** Вкладки списка: будущие или прошедшие события. */
const listScope = ref<'upcoming' | 'past'>('upcoming')

onMounted(() => {
  void load()
})

watch(listScope, () => {
  void load()
})

async function load() {
  err.value = null
  try {
    await ev.fetchList({ per_page: 100, when: listScope.value })
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}

const canCrud = () => auth.hasRole('teacher') || auth.hasRole('admin')

function startEdit(e: CampusEvent) {
  editId.value = e.id
  const d = new Date(e.date_time)
  form.value = {
    title: e.title,
    date_time: d.toISOString().slice(0, 16),
    location: e.location || '',
    description: e.description || '',
    genres: [...(e.genres ?? [])],
  }
}

function resetForm() {
  editId.value = null
  form.value = { title: '', date_time: '', location: '', description: '', genres: [] }
}

async function save() {
  if (!canCrud()) {
    return
  }
  if (!editId.value && form.value.genres.length === 0) {
    err.value = 'Выберите хотя бы один жанр мероприятия.'
    return
  }
  if (!editId.value && !form.value.description.trim()) {
    err.value = 'Укажите описание мероприятия.'
    return
  }
  err.value = null
  try {
    if (editId.value) {
      await api.patch(`/api/events/${editId.value}`, {
        title: form.value.title,
        date_time: new Date(form.value.date_time).toISOString(),
        location: form.value.location || null,
        description: form.value.description || null,
        genres: form.value.genres.length ? form.value.genres : [],
      })
    } else {
      await api.post('/api/events', {
        title: form.value.title,
        date_time: new Date(form.value.date_time).toISOString(),
        location: form.value.location || null,
        description: form.value.description.trim(),
        genres: form.value.genres,
      })
    }
    resetForm()
    await load()
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}

async function remove(e: CampusEvent) {
  if (!confirm('Удалить?')) {
    return
  }
  await api.delete(`/api/events/${e.id}`)
  await load()
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">События</h1>

    <div
      class="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-700"
      role="tablist"
      aria-label="Разделы событий"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="listScope === 'upcoming'"
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="
          listScope === 'upcoming'
            ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
        "
        @click="listScope = 'upcoming'"
      >
        Предстоящие
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="listScope === 'past'"
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="
          listScope === 'past'
            ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
        "
        @click="listScope = 'past'"
      >
        Прошедшие
      </button>
    </div>

    <div
      v-if="canCrud()"
      class="mb-6 rounded-2xl border border-indigo-100 bg-white p-4 shadow dark:border-indigo-900/50 dark:bg-slate-900 dark:shadow-black/20"
    >
      <h2 class="font-semibold text-slate-900 dark:text-slate-100"> {{ editId ? 'Редактирование' : 'Новое событие' }} </h2>
      <form
        class="mt-2 flex flex-col gap-2"
        @submit.prevent="save"
      >
        <input
          v-model="form.title"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Название"
          required
        />
        <input
          v-model="form.date_time"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          type="datetime-local"
          required
        />
        <input
          v-model="form.location"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Место"
        />
        <label class="text-sm text-slate-600 dark:text-slate-400">
          Описание <span v-if="!editId" class="text-rose-600 dark:text-rose-400">*</span>
        </label>
        <textarea
          v-model="form.description"
          class="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          rows="3"
          placeholder="Описание мероприятия"
          :required="!editId"
        />
        <label class="text-sm text-slate-600 dark:text-slate-400">Жанры мероприятия (можно несколько)</label>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            v-for="g in EVENT_GENRES"
            :key="g"
            class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600"
          >
            <input
              v-model="form.genres"
              type="checkbox"
              class="rounded border-slate-400 dark:border-slate-500"
              :value="g"
            >
            <span>{{ g }}</span>
          </label>
        </div>
        <div class="flex gap-2">
          <button
            type="submit"
            class="rounded bg-indigo-600 px-4 py-1 text-white"
            >{{ editId ? 'Сохранить' : 'Создать' }}</button>
          <button
            v-if="editId"
            type="button"
            class="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            @click="resetForm"
          >Отмена</button>
        </div>
      </form>
      <p
        v-if="err"
        class="mt-2 text-sm text-rose-600 dark:text-rose-400"
        >{{ err }}</p>
    </div>

    <div
      v-if="ev.list && Array.isArray(ev.list.data)"
      class="mt-2 space-y-4"
    >
      <article
        v-for="e in ev.list.data"
        :key="e.id"
        class="flex flex-col gap-3 rounded-2xl border border-amber-100/80 bg-gradient-to-br from-white to-amber-50/30 p-5 shadow sm:flex-row sm:items-start sm:gap-4 dark:border-amber-900/40 dark:from-slate-900 dark:to-amber-950/25 dark:shadow-black/20"
      >
        <div class="min-w-0 flex-1 space-y-2">
          <h2 class="break-words text-lg font-semibold leading-snug text-amber-950 dark:text-amber-100">
            {{ e.title }}
          </h2>
          <div
            v-if="e.genres?.length"
            class="flex flex-wrap gap-2"
          >
            <span
              v-for="g in e.genres"
              :key="g"
              class="inline-flex max-w-full break-words rounded-full border border-amber-300/80 bg-amber-100/90 px-2.5 py-1 text-left text-xs font-medium leading-snug text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/50 dark:text-amber-100"
            >{{ g }}</span>
          </div>
          <p class="break-words text-sm text-amber-900/70 dark:text-amber-200/80">
            {{ new Date(e.date_time).toLocaleString() }} · {{ e.location || 'место уточняется' }}
          </p>
          <p
            v-if="e.description"
            class="break-words text-slate-700 dark:text-slate-300"
          >{{ e.description }}</p>
          <RouterLink
            v-if="listScope === 'past'"
            :to="{ name: 'event-projects', params: { eventId: e.id } }"
            class="inline-flex w-fit text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
          >
            Проекты по этому событию
          </RouterLink>
        </div>
        <div
          v-if="canCrud()"
          class="flex shrink-0 flex-wrap gap-2 sm:pt-0.5"
        >
          <button
            type="button"
            class="text-sm text-indigo-600 dark:text-indigo-400"
            @click="startEdit(e)"
          >Правка</button>
          <button
            type="button"
            class="text-sm text-rose-600 dark:text-rose-400"
            @click="remove(e)"
          >Удалить</button>
        </div>
      </article>
      <p
        v-if="(ev.list.data?.length ?? 0) === 0"
        class="py-8 text-center text-slate-500 dark:text-slate-400"
      >
        {{ listScope === 'upcoming' ? 'Предстоящих событий пока нет.' : 'Прошедших событий пока нет.' }}
      </p>
    </div>
  </div>
</template>
