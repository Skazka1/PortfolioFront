<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api, getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import AvatarCropModal from '@/components/user/AvatarCropModal.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import type { User } from '@/types/api'

const auth = useAuthStore()
const name = ref('')
const course = ref('')
const group = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const newPassword2 = ref('')
const msg = ref<string | null>(null)
const cropOpen = ref(false)
const cropFile = ref<File | null>(null)

onMounted(() => {
  if (auth.user) {
    fill(auth.user)
  }
})

watch(cropOpen, (v) => {
  if (!v) {
    cropFile.value = null
  }
})
function fill(u: User) {
  name.value = u.name
  course.value = u.course || ''
  group.value = u.group || ''
}

async function saveProfile() {
  msg.value = null
  const { data } = await api.patch<{ data: User }>('/api/profile', {
    name: name.value,
    course: course.value || null,
    group: group.value || null,
  })
  auth.user = data.data
  msg.value = 'Сохранено'
}

async function savePassword() {
  msg.value = null
  if (newPassword.value !== newPassword2.value) {
    msg.value = 'Пароли не совпадают'
    return
  }
  await api.put('/api/profile/password', {
    current_password: currentPassword.value,
    password: newPassword.value,
    password_confirmation: newPassword2.value,
  })
  currentPassword.value = ''
  newPassword.value = ''
  newPassword2.value = ''
  msg.value = 'Пароль обновлён'
}

function onAvatarFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !file.type.startsWith('image/')) {
    return
  }
  cropFile.value = file
  cropOpen.value = true
}

async function uploadCroppedAvatar(file: File) {
  cropOpen.value = false
  cropFile.value = null
  msg.value = null
  try {
    const form = new FormData()
    form.append('avatar', file)
    const { data } = await api.post<{ data: User }>('/api/profile/avatar', form)
    auth.user = data.data
    msg.value = 'Аватар обновлён'
  } catch (e) {
    msg.value = getErrorMessage(e)
  }
}

const downloading = ref(false)
async function downloadPdf() {
  if (!auth.user) {
    return
  }
  downloading.value = true
  try {
    if (!auth.hasRole('student') || !auth.user) {
      return
    }
    const r = await api.get(`/api/students/${auth.user.id}/portfolio-pdf`, {
      responseType: 'blob',
    })
    const href = window.URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = href
    a.download = 'portfolio.pdf'
    a.click()
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div
    v-if="auth.hasRole('admin')"
    class="text-slate-600 dark:text-slate-300"
  >
    Администратор: редактирование данных через
    <router-link
      to="/admin/users"
      class="text-indigo-600 dark:text-indigo-400"
    >пользователей</router-link>.
  </div>
  <div
    v-else
    class="mx-auto max-w-lg space-y-8"
  >
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Профиль</h2>
      <div class="mt-4 flex items-center gap-4">
        <UserAvatar
          :name="name || auth.user?.name || '?'"
          :image-url="auth.user?.avatar_url"
          size="xl"
        />
        <div>
          <p class="text-xs text-slate-500 dark:text-slate-400">Фото профиля</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="mt-1 max-w-[200px] text-sm"
            @change="onAvatarFile"
          >
        </div>
      </div>
      <div class="mt-4 space-y-2">
        <label class="text-sm text-slate-700 dark:text-slate-300">ФИО</label>
        <input
          v-model="name"
          class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <label class="text-sm text-slate-700 dark:text-slate-300">Курс</label>
        <input
          v-model="course"
          class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <label class="text-sm text-slate-700 dark:text-slate-300">Группа</label>
        <input
          v-model="group"
          class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          class="mt-2 rounded bg-indigo-600 px-4 py-2 text-white"
          @click="saveProfile"
        >Сохранить</button>
      </div>
    </section>
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Смена пароля</h2>
      <div class="mt-4 space-y-2">
        <input
          v-model="currentPassword"
          class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          type="password"
          placeholder="Текущий пароль"
        />
        <input
          v-model="newPassword"
          class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          type="password"
          placeholder="Новый"
        />
        <input
          v-model="newPassword2"
          class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          type="password"
          placeholder="Повтор"
        />
        <button
          type="button"
          class="rounded bg-slate-800 px-4 py-2 text-white"
          @click="savePassword"
        >Обновить пароль</button>
      </div>
    </section>
    <section
      v-if="auth.hasRole('student')"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20"
    >
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Экспорт PDF</h2>
      <p class="text-sm text-slate-600 dark:text-slate-400">Скачайте портфолио в PDF.</p>
      <button
        type="button"
        :disabled="downloading"
        class="mt-2 rounded border border-indigo-200 px-4 py-2 text-indigo-900 dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-200"
        @click="downloadPdf"
      >{{ downloading ? '…' : 'Скачать' }}</button>
    </section>
    <p
      v-if="msg"
      class="text-sm text-indigo-700 dark:text-indigo-400"
      >{{ msg }}</p>

    <AvatarCropModal
      v-model:open="cropOpen"
      :file="cropFile"
      @crop="uploadCroppedAvatar"
    />
  </div>
</template>
