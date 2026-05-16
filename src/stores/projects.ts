import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'
import type { Paginated, Project } from '@/types/api'

export const useProjectsStore = defineStore('projects', () => {
  const mine = ref<Project[]>([])
  const current = ref<Project | null>(null)
  const feed = ref<Paginated<Project> | null>(null)

  async function fetchMine(): Promise<void> {
    const res = await api.get<{ data: Project[] }>('/api/my/projects')
    mine.value = res.data.data
  }

  /** Опубликованные проекты (лента на главной странице каталога). */
  async function fetchPublishedFeed(params?: {
    page?: number
    per_page?: number
    q?: string
    course?: string
    group?: string
    genre?: string
  }): Promise<void> {
    const res = await api.get<Paginated<Project>>('/api/projects', {
      params: {
        page: params?.page ?? 1,
        per_page: params?.per_page ?? 12,
        ...(params?.q ? { q: params.q } : {}),
        ...(params?.course ? { course: params.course } : {}),
        ...(params?.group ? { group: params.group } : {}),
        ...(params?.genre ? { genre: params.genre } : {}),
      },
    })
    const raw = res.data as unknown as Record<string, unknown>
    const list = Array.isArray(raw?.data) ? (raw.data as Project[]) : []
    const meta =
      raw?.meta && typeof raw.meta === 'object' ? (raw.meta as Paginated<Project>['meta']) : null
    const links = Array.isArray(raw?.links) ? (raw.links as Paginated<Project>['links']) : []
    const perPage = params?.per_page ?? 12
    feed.value = {
      data: list,
      links,
      meta: meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: perPage,
        total: list.length,
      },
    }
  }

  function clearPublishedFeed(): void {
    feed.value = null
  }

  async function fetchOne(id: number): Promise<Project> {
    current.value = null
    const res = await api.get<{ data: Project }>(`/api/projects/${id}`)
    current.value = res.data.data
    return res.data.data
  }

  async function like(id: number): Promise<Project> {
    const res = await api.post<{ data: Project }>(`/api/projects/${id}/like`)
    const p = res.data.data
    if (current.value?.id === id) {
      current.value = p
    }
    return p
  }

  function triggerBlobDownload(blob: Blob, filename: string): void {
    const href = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(href)
  }

  async function downloadProjectPdf(projectId: number, filenameBase: string): Promise<void> {
    const res = await api.get(`/api/projects/${projectId}/pdf`, { responseType: 'blob' })
    const safe = filenameBase.replace(/[/\\?%*:|"<>]+/g, '_').slice(0, 80) || `project-${projectId}`
    triggerBlobDownload(new Blob([res.data]), `${safe}.pdf`)
  }

  async function downloadPortfolioPdf(studentId: number): Promise<void> {
    const res = await api.get(`/api/students/${studentId}/portfolio-pdf`, { responseType: 'blob' })
    triggerBlobDownload(new Blob([res.data]), `portfolio-${studentId}.pdf`)
  }

  return { mine, current, feed, fetchMine, fetchPublishedFeed, clearPublishedFeed, fetchOne, like, downloadProjectPdf, downloadPortfolioPdf }
})
