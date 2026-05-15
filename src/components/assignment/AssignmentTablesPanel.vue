<script setup lang="ts">
import ProjectsTableBlock from '@/components/assignment/ProjectsTableBlock.vue'
import StudentsTableBlock from '@/components/assignment/StudentsTableBlock.vue'
</script>

<template>
  <aside
    class="assignment-panel mx-auto w-full max-w-[1400px] border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900"
  >
    <div class="grid gap-6 lg:grid-cols-2">
      <ProjectsTableBlock />
      <StudentsTableBlock />
    </div>
  </aside>
</template>
