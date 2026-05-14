<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'

const route = useRoute()
const mainClass = computed(() =>
  route.meta.fullWidth
    ? 'mx-auto w-full max-w-[1400px] px-4 py-8'
    : 'mx-auto max-w-6xl px-4 py-8'
)
</script>

<template>
  <div class="gradient-surface min-h-screen">
    <AppHeader />
    <main :class="mainClass">
      <router-view />
    </main>
  </div>
</template>
