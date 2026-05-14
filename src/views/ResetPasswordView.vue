<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getErrorMessage, api } from '@/api/client'

const route = useRoute()
const router = useRouter()
const password = ref('')
const password2 = ref('')
const msg = ref<string | null>(null)

onMounted(() => {
  if (!route.query.token || !route.query.email) {
    msg.value = 'Некорректная ссылка. Откройте письмо с сайта снова.'
  }
})

async function submit() {
  msg.value = null
  if (password.value !== password2.value) {
    msg.value = 'Пароли не совпадают'
    return
  }
  try {
    await api.post('/api/reset-password', {
      email: String(route.query.email),
      token: String(route.query.token),
      password: password.value,
      password_confirmation: password2.value,
    })
    await router.push({ name: 'login' })
  } catch (e) {
    msg.value = getErrorMessage(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
    <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">Новый пароль</h1>
    <form
      class="mt-4 space-y-2"
      @submit.prevent="submit"
    >
      <input
        v-model="password"
        type="password"
        class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          required
          placeholder="Пароль"
      />
      <input
        v-model="password2"
        type="password"
        class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          required
          placeholder="Повтор"
      />
      <button
        type="submit"
        class="w-full rounded bg-indigo-600 py-2 text-white"
        >Сохранить</button>
    </form>
    <p
      v-if="msg"
      class="mt-2 text-sm text-rose-600 dark:text-rose-400"
      >{{ msg }}</p>
  </div>
</template>
