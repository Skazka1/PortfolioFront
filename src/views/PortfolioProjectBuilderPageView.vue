<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PortfolioProjectBuilderModal from '@/components/portfolio/PortfolioProjectBuilderModal.vue'
import { useProjectsStore } from '@/stores/projects'
import type { Project } from '@/types/api'

const route = useRoute()
const router = useRouter()
const projects = useProjectsStore()
const loading = ref(false)

const isEdit = computed(() => route.name === 'project-builder-edit')
const editId = computed(() => {
  const raw = Number(route.params.id)
  return Number.isFinite(raw) ? raw : null
})

const editingProject = computed<Project | null>(() => {
  if (!isEdit.value || editId.value == null) {
    return null
  }
  return projects.mine.find((p) => p.id === editId.value) ?? null
})

onMounted(async () => {
  loading.value = true
  try {
    await projects.fetchMine()
    if (isEdit.value && !editingProject.value) {
      await router.replace({ name: 'my-portfolio' })
    }
  } finally {
    loading.value = false
  }
})

async function onSaved() {
  await projects.fetchMine()
  await router.push({ name: 'my-portfolio' })
}

async function onClose() {
  await router.push({ name: 'my-portfolio' })
}
</script>

<template>
  <div>
    <p
      v-if="loading"
      class="text-sm text-slate-500 dark:text-slate-400"
    >
      Загружаем конструктор...
    </p>
    <PortfolioProjectBuilderModal
      v-else
      :open="true"
      :inline="true"
      :project="editingProject"
      @saved="onSaved"
      @update:open="onClose"
    />
  </div>
</template>
