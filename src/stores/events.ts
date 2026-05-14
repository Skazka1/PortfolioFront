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
    list.value = data
  }

  return { list, fetchList }
})
