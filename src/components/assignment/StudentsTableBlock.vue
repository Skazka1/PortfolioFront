<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api, getErrorMessage } from '@/api/client'
import PaginatedDbTable, { type DbTableRow } from '@/components/assignment/PaginatedDbTable.vue'
import type { Paginated, StudentCard } from '@/types/api'

const page = ref(1)
const perPage = ref(5)
const loading = ref(false)
const error = ref<string | null>(null)
const payload = ref<Paginated<StudentCard> | null>(null)

const rows = computed<DbTableRow[]>(() =>
  (payload.value?.data ?? []).map((s) => ({ id: s.id, label: s.name })),
)

const meta = computed(() => payload.value?.meta ?? null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get<Paginated<StudentCard>>('/api/students', {
      params: { page: page.value, per_page: perPage.value },
    })
    payload.value = data
  } catch (e) {
    error.value = getErrorMessage(e)
    payload.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})

watch([page, perPage], () => {
  void load()
})

function onPage(next: number) {
  page.value = next
}

function onPerPage(next: number) {
  perPage.value = next
  page.value = 1
}
</script>

<template>
  <div>
    <p
      v-if="error"
      class="mb-2 text-sm text-rose-600 dark:text-rose-400"
    >
      {{ error }}
    </p>
    <PaginatedDbTable
      title="Студенты"
      name-column-label="ФИО студента"
      :rows="rows"
      :meta="meta"
      :loading="loading"
      :per-page="perPage"
      @update:page="onPage"
      @update:per-page="onPerPage"
    />
  </div>
</template>
