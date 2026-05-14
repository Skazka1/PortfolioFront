<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import type { Project } from '@/types/api'

const props = defineProps<{
  project: Project
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projects = useProjectsStore()
const count = ref(props.project.likes_count)
const liked = ref(props.project.liked_by_me)
const loading = ref(false)

const heartTitle = computed(() => {
  if (!auth.isAuthenticated) {
    return 'Войти, чтобы поставить лайк'
  }
  return liked.value ? 'Убрать лайк' : 'Нравится'
})

watch(
  () => props.project,
  (p) => {
    count.value = p.likes_count
    liked.value = p.liked_by_me
  },
  { deep: true }
)

async function onLikePress() {
  if (!auth.isAuthenticated) {
    void router.push({
      name: 'login',
      query: { redirect: route.fullPath },
    })
    return
  }
  loading.value = true
  try {
    const updated = await projects.like(props.project.id)
    count.value = updated.likes_count
    liked.value = updated.liked_by_me
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="inline-flex items-center gap-2">
    <button
      type="button"
      :disabled="loading"
      :class="[
        'flex h-10 w-10 items-center justify-center rounded-full text-xl transition',
        auth.isAuthenticated && liked
          ? 'bg-rose-100 text-rose-600'
          : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500',
      ]"
      :aria-pressed="auth.isAuthenticated ? liked : undefined"
      :title="heartTitle"
      @click="onLikePress"
    >
      {{ auth.isAuthenticated && liked ? '♥' : '♡' }}
    </button>
    <span class="text-sm text-slate-600">{{ count }}</span>
  </div>
</template>
