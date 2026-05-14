<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="mx-auto max-w-4xl rounded-2xl border border-slate-200/80 bg-white/85 p-8 text-center shadow dark:border-slate-700 dark:bg-slate-900/90">
    <h1 class="text-3xl font-bold text-slate-900 md:text-4xl dark:text-slate-100">Портфолио студентов кафедры</h1>
    <p class="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
      Смотрите проекты, участвуйте в мероприятиях и делитесь достижениями.
    </p>
    <div class="mt-8 flex flex-wrap justify-center gap-4">
      <RouterLink
        :to="{ name: 'students' }"
        class="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white shadow hover:bg-indigo-700"
        >Лента проектов</RouterLink>
      <RouterLink
        :to="{ name: 'events' }"
        class="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >События</RouterLink>
    </div>
  </section>
</template>
