<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import AssignmentTablesPanel from '@/components/assignment/AssignmentTablesPanel.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { SHOW_ASSIGNMENT_TABLES } from '@/config/assignment'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const showAssignmentTables = computed(
  () => SHOW_ASSIGNMENT_TABLES && auth.hasRole('admin'),
)

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
    <AssignmentTablesPanel v-if="showAssignmentTables" />
    <main :class="mainClass">
      <router-view />
    </main>
  </div>
</template>
