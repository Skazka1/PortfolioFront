<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <p class="text-lg font-semibold text-slate-900 dark:text-slate-100">
      Страница не найдена
    </p>
    <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
      Проверьте адрес или вернитесь на главную.
    </p>
    <RouterLink
      :to="{ name: 'home' }"
      class="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
    >
      На главную
    </RouterLink>
  </div>
</template>
