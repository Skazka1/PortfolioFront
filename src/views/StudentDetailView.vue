<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import StudentPortfolioPreview from '@/components/portfolio/StudentPortfolioPreview.vue'

const route = useRoute()
const auth = useAuthStore()
const store = useUsersStore()

onMounted(() => {
  void run()
})
watch(
  () => route.params.id,
  () => {
    void run()
  }
)
async function run() {
  await store.fetchStudent(Number(route.params.id))
}
</script>

<template>
  <div v-if="store.studentDetail">
    <p class="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
      портфолио студента
    </p>
    <StudentPortfolioPreview
      :name="store.studentDetail.data.name"
      :course="store.studentDetail.data.course"
      :group="store.studentDetail.data.group"
      :avatar-url="store.studentDetail.data.avatar_url"
      :bio="store.studentDetail.data.bio ?? null"
      :projects="store.studentDetail.projects"
      :can-delete-projects="auth.hasRole('admin')"
      @project-removed="run"
    />
  </div>
</template>
