<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import AssignmentTablesPanel from '@/components/assignment/AssignmentTablesPanel.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { SHOW_ASSIGNMENT_TABLES } from '@/config/assignment'

const route = useRoute()
const mainClass = computed(() =>
  route.meta.fullWidth
    ? 'mx-auto w-full max-w-[1400px] px-4 py-8'
    : 'mx-auto max-w-6xl px-4 py-8'
)
</script>

<template>
  <div class="gradient-surface min-h-screen">
    <Toast position="bottom-right" />
    <AppHeader />
    <AssignmentTablesPanel v-if="SHOW_ASSIGNMENT_TABLES" />
    <main :class="mainClass">
      <router-view />
    </main>
  </div>
</template>
