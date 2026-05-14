<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getErrorMessage, api } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const err = ref<string | null>(null)
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

async function onSubmit() {
  err.value = null
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || ''
    if (redirect) {
      await router.push(redirect)
    } else if (auth.user?.role === 'student') {
      await router.push({ name: 'my-portfolio' })
    } else {
      await router.push({ name: 'home' })
    }
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}

async function requestReset() {
  err.value = null
  try {
    await api.post('/api/forgot-password', { email: email.value })
    err.value = 'Письмо со ссылкой отправлено (проверьте почту).'
  } catch (e) {
    err.value = getErrorMessage(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Вход</h1>
    <form
      class="mt-6 space-y-4"
      @submit.prevent="onSubmit"
    >
      <div>
        <label class="block text-sm text-slate-600 dark:text-slate-400">Электронная почта</label>
        <input
          v-model="email"
          type="email"
          class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          required
        />
      </div>
      <div>
        <label class="block text-sm text-slate-600 dark:text-slate-400">Пароль</label>
        <input
          v-model="password"
          type="password"
          class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          required
        />
      </div>
      <p
        v-if="err"
        class="text-sm text-rose-600 dark:text-rose-400"
        >{{ err }}</p>
      <button
        type="submit"
        class="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700"
        >Войти</button>
    </form>
    <p class="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
      <button
        type="button"
        class="text-indigo-600 hover:underline dark:text-indigo-400"
        @click="requestReset"
        >Забыли пароль?</button>
    </p>
  </div>
</template>
