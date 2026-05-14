<script setup lang="ts">
import { ref } from 'vue'
import { getErrorMessage, api } from '@/api/client'

const email = ref('')
const msg = ref<string | null>(null)

async function submit() {
  try {
    await api.post('/api/forgot-password', { email: email.value })
    msg.value = 'Если такой адрес есть в системе, письмо будет отправлено.'
  } catch (e) {
    msg.value = getErrorMessage(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
    <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">Восстановление пароля</h1>
    <form
      class="mt-4"
      @submit.prevent="submit"
    >
      <input
        v-model="email"
        type="email"
        class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        required
        placeholder="Электронная почта"
      />
      <button
        type="submit"
        class="mt-2 w-full rounded bg-indigo-600 py-2 text-white"
        >Отправить ссылку</button>
    </form>
    <p
      v-if="msg"
      class="mt-2 text-sm text-slate-600 dark:text-slate-400"
      >{{ msg }}</p>
  </div>
</template>
