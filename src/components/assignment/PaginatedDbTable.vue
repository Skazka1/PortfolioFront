<script setup lang="ts">
import type { Paginated } from '@/types/api'

export type DbTableRow = { id: number; label: string }

const props = defineProps<{
  title: string
  nameColumnLabel: string
  rows: DbTableRow[]
  meta: Paginated<unknown>['meta'] | null
  loading?: boolean
  perPage: number
}>()

const emit = defineEmits<{
  'update:page': [page: number]
  'update:perPage': [perPage: number]
}>()

const PER_PAGE_OPTIONS = [5, 10, 15] as const

function goPage(page: number) {
  if (!props.meta) return
  if (page < 1 || page > props.meta.last_page) return
  emit('update:page', page)
}

function onPerPageChange(e: Event) {
  const n = Number((e.target as HTMLSelectElement).value)
  if (Number.isFinite(n) && n > 0) {
    emit('update:perPage', n)
  }
}
</script>

<template>
  <section class="assignment-table-block">
    <h2 class="assignment-table-block__title">
      {{ title }}
    </h2>

    <div
      v-if="loading"
      class="assignment-table-block__loading"
    >
      Загрузка…
    </div>

    <table
      v-else
      class="assignment-table"
    >
      <thead>
        <tr>
          <th class="assignment-table__th assignment-table__th--num">
            №
          </th>
          <th class="assignment-table__th">
            {{ nameColumnLabel }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.id"
          class="assignment-table__row"
        >
          <td class="assignment-table__td assignment-table__td--num">
            {{ row.id }}
          </td>
          <td class="assignment-table__td">
            {{ row.label }}
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td
            colspan="2"
            class="assignment-table__empty"
          >
            Нет записей
          </td>
        </tr>
      </tbody>
    </table>

    <nav
      v-if="meta && meta.total > 0"
      class="assignment-pagination"
      aria-label="Пагинация"
    >
      <div class="assignment-pagination__pages">
        <button
          type="button"
          class="assignment-pagination__btn"
          :disabled="meta.current_page <= 1"
          aria-label="Первая страница"
          @click="goPage(1)"
        >
          «
        </button>
        <button
          type="button"
          class="assignment-pagination__btn"
          :disabled="meta.current_page <= 1"
          aria-label="Предыдущая страница"
          @click="goPage(meta.current_page - 1)"
        >
          ‹
        </button>
        <button
          v-for="p in meta.last_page"
          :key="p"
          type="button"
          class="assignment-pagination__page"
          :class="{ 'assignment-pagination__page--active': p === meta.current_page }"
          @click="goPage(p)"
        >
          {{ p }}
        </button>
        <button
          type="button"
          class="assignment-pagination__btn"
          :disabled="meta.current_page >= meta.last_page"
          aria-label="Следующая страница"
          @click="goPage(meta.current_page + 1)"
        >
          ›
        </button>
        <button
          type="button"
          class="assignment-pagination__btn"
          :disabled="meta.current_page >= meta.last_page"
          aria-label="Последняя страница"
          @click="goPage(meta.last_page)"
        >
          »
        </button>
      </div>

      <label class="assignment-pagination__size">
        <select
          class="assignment-pagination__select"
          :value="perPage"
          @change="onPerPageChange"
        >
          <option
            v-for="n in PER_PAGE_OPTIONS"
            :key="n"
            :value="n"
          >
            {{ n }}
          </option>
        </select>
      </label>
    </nav>
  </section>
</template>

<style scoped>
.assignment-table-block {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 0 0 12px;
}

.dark .assignment-table-block {
  background: #0f172a;
  border-color: #334155;
}

.assignment-table-block__title {
  margin: 0;
  padding: 12px 16px;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
}

.dark .assignment-table-block__title {
  color: #f1f5f9;
  border-bottom-color: #334155;
}

.assignment-table-block__loading {
  padding: 24px 16px;
  font-size: 0.875rem;
  color: #6b7280;
}

.assignment-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.assignment-table__th {
  padding: 10px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
}

.assignment-table__th--num {
  width: 72px;
}

.dark .assignment-table__th {
  color: #e2e8f0;
  border-bottom-color: #334155;
  background: #1e293b;
}

.assignment-table__row {
  border-bottom: 1px solid #f0f0f0;
}

.dark .assignment-table__row {
  border-bottom-color: #1e293b;
}

.assignment-table__td {
  padding: 10px 16px;
  color: #1f2937;
}

.assignment-table__td--num {
  color: #6b7280;
}

.dark .assignment-table__td {
  color: #e2e8f0;
}

.assignment-table__empty {
  padding: 20px 16px;
  text-align: center;
  color: #9ca3af;
}

.assignment-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
  padding: 0 16px;
}

.assignment-pagination__pages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.assignment-pagination__btn,
.assignment-pagination__page {
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: #4b5563;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.assignment-pagination__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.assignment-pagination__page:hover:not(.assignment-pagination__page--active),
.assignment-pagination__btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.assignment-pagination__page--active {
  border-color: #16a34a;
  color: #16a34a;
  font-weight: 600;
}

.assignment-pagination__select {
  min-width: 56px;
  padding: 6px 28px 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.dark .assignment-pagination__select {
  background: #1e293b;
  border-color: #475569;
  color: #e2e8f0;
}
</style>
