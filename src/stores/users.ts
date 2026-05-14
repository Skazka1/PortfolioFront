import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'
import type { Paginated, Project, StudentCard, User } from '@/types/api'

export const useUsersStore = defineStore('users', () => {
  const students = ref<Paginated<StudentCard> | null>(null)
  const studentDetail = ref<{ data: User; projects: Project[] } | null>(null)

  async function fetchStudents(params: Record<string, string | number | undefined>): Promise<void> {
    const { data } = await api.get<Paginated<StudentCard>>('/api/students', { params })
    students.value = data
  }

  async function fetchStudent(id: number): Promise<void> {
    const { data } = await api.get<{
      data: User
      projects: { data: Project[] } | Project[]
    }>(`/api/students/${id}`)
    const rawProjects = data.projects
    const projects = Array.isArray(rawProjects) ? rawProjects : (rawProjects?.data ?? [])
    studentDetail.value = {
      data: data.data,
      projects,
    }
  }

  return { students, studentDetail, fetchStudents, fetchStudent }
})
