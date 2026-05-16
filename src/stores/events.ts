import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'
import type { CampusEvent, Paginated } from '@/types/api'

export const useEventsStore = defineStore('events', () => {
  const list = ref<Paginated<CampusEvent> | null>(null)

  async function fetchList(params?: {
    per_page?: number
    /** upcoming — только будущие; past — только прошедшие; all — все (напр. выбор события в проекте). */
    when?: 'upcoming' | 'past' | 'all'
  }): Promise<void> {
    const { data } = await api.get<Paginated<CampusEvent>>('/api/events', { params })
    const raw = data as unknown as Record<string, unknown>
    const rows = Array.isArray(raw?.data) ? (raw.data as CampusEvent[]) : []
    const meta =
      raw?.meta && typeof raw.meta === 'object' ? (raw.meta as Paginated<CampusEvent>['meta']) : null
    const links = Array.isArray(raw?.links) ? (raw.links as Paginated<CampusEvent>['links']) : []
    const perPage = params?.per_page ?? 100
    list.value = {
      data: rows,
      links,
      meta: meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: perPage,
        total: rows.length,
      },
    }
  }

  return { list, fetchList }
})
