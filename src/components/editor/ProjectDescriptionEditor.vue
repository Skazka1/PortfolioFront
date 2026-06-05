<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { api, getErrorMessage } from '@/api/client'

const props = withDefaults(
  defineProps<{
    modelValue: string
    projectId: number | null
    placeholder?: string
    disabled?: boolean
    /** Встроен в карточку превью — без толстой рамки. */
    embedded?: boolean
    /** Где панель кнопок: сверху или справа от поля ввода. */
    toolbarPlacement?: 'top' | 'right'
    /** Создать черновик проекта (POST), вернуть id — для загрузки картинки до ручного «сохранить». */
    ensureProject: () => Promise<number>
  }>(),
  {
    placeholder: 'Текст проекта… Картинки — кнопкой «Фото в текст».',
    embedded: false,
    toolbarPlacement: 'top',
  }
)

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

const uploadErr = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { class: 'text-indigo-600 underline dark:text-indigo-400' },
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        class: 'max-w-full rounded-lg h-auto my-2',
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
  ],
  content: props.modelValue || '<p></p>',
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: props.embedded
        ? 'min-h-[12rem] px-1 py-2 text-base leading-relaxed text-neutral-900 focus:outline-none bg-transparent dark:bg-transparent dark:text-slate-100 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold'
        : 'min-h-[12rem] px-3 py-2 text-sm leading-relaxed text-neutral-900 focus:outline-none dark:bg-slate-950 dark:text-slate-100 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold',
    },
  },
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
  },
})

watch(
  () => props.modelValue,
  (html) => {
    const ed = editor.value
    if (!ed || ed.isDestroyed) {
      return
    }
    const next = html || '<p></p>'
    if (next !== ed.getHTML()) {
      ed.commands.setContent(next, false)
    }
  }
)

watch(
  () => props.disabled,
  (d) => {
    editor.value?.setEditable(!d)
  }
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const toolbarOnRight = computed(() => props.toolbarPlacement === 'right')

function pickImage() {
  uploadErr.value = null
  fileInput.value?.click()
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !file.type.startsWith('image/')) {
    return
  }
  uploadErr.value = null
  try {
    let pid = props.projectId
    if (pid == null) {
      pid = await props.ensureProject()
    }
    const fd = new FormData()
    fd.append('image', file)
    const { data } = await api.post<{ data: { url: string } }>(
      `/api/projects/${pid}/inline-image`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    const url = data.data.url
    editor.value?.chain().focus().setImage({ src: url }).run()
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'VALIDATION') {
      return
    }
    uploadErr.value = getErrorMessage(err)
  }
}
</script>

<template>
  <!-- Панель справа вынесена за рамку поля; при прокрутке модалки — sticky внутри скролла -->
  <div
    :class="
      toolbarOnRight
        ? 'flex flex-row items-start gap-2'
        : [
            embedded
              ? 'rounded-lg border border-neutral-200 bg-white/80 dark:border-slate-600 dark:bg-slate-800/90'
              : 'rounded-2xl border-2 border-neutral-900 bg-white dark:border-slate-500 dark:bg-slate-900',
            'flex flex-col',
          ]
    "
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="sr-only"
      @change="onFile"
    >
    <div
      v-if="editor && !toolbarOnRight"
      :class="[
        'flex flex-wrap gap-1 border-b border-neutral-200 px-2 py-1.5 dark:border-slate-600',
        embedded ? 'sticky top-0 z-10 bg-white/95 backdrop-blur-sm dark:bg-slate-800/95' : 'bg-neutral-50 dark:bg-slate-800',
      ]"
    >
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        Ж
      </button>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        К
      </button>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('underline') }"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        Ч
      </button>
      <span class="mx-1 text-neutral-300 dark:text-slate-600">|</span>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('heading', { level: 3 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <span class="mx-1 text-neutral-300 dark:text-slate-600">|</span>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        • Список
      </button>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        1. Список
      </button>
      <span class="mx-1 text-neutral-300 dark:text-slate-600">|</span>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        @click="editor.chain().focus().undo().run()"
      >
        Отмена
      </button>
      <button
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        @click="editor.chain().focus().redo().run()"
      >
        Вернуть
      </button>
    </div>

    <div
      :class="
        toolbarOnRight
          ? [
              'min-w-0 flex-1',
              embedded
                ? ''
                : 'rounded-2xl border-2 border-neutral-900 bg-white dark:border-slate-500 dark:bg-slate-900',
            ]
          : ''
      "
    >
      <div :class="toolbarOnRight ? 'min-h-0 flex-1' : ''">
        <editor-content
          v-if="editor"
          :editor="editor"
        />
      </div>
      <div
        v-if="!toolbarOnRight"
        class="border-t border-neutral-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-900/50"
      >
        <button
          type="button"
          class="text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-400"
          :disabled="disabled"
          @click="pickImage"
        >
          Фото в текст
        </button>
        <p class="mt-0.5 text-[11px] text-neutral-500 dark:text-slate-400">
          Вставка в позицию курсора. Удаление — как обычный текст (Backspace / Delete).
        </p>
        <p
          v-if="uploadErr"
          class="mt-1 text-xs text-rose-600"
        >{{ uploadErr }}</p>
      </div>
    </div>

    <div
      v-if="editor && toolbarOnRight"
      :class="[
        'sticky top-3 z-20 flex h-fit max-h-[min(100%,calc(100dvh-10rem))] w-[min(9.5rem,30vw)] shrink-0 flex-col gap-0.5 overflow-y-auto rounded-lg border border-neutral-200 py-2 pl-1.5 pr-1 shadow-sm dark:border-slate-600',
        embedded ? 'bg-white dark:bg-slate-800' : 'bg-neutral-50 dark:bg-slate-800',
      ]"
    >
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        Ж
      </button>
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        К
      </button>
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('underline') }"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        Ч
      </button>
      <div
        class="my-0.5 h-px bg-neutral-200 dark:bg-slate-600"
        aria-hidden="true"
      />
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('heading', { level: 3 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <div
        class="my-0.5 h-px bg-neutral-200 dark:bg-slate-600"
        aria-hidden="true"
      />
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        • Список
      </button>
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        :class="{ 'bg-white shadow dark:bg-slate-700 dark:shadow-none': editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        1. Список
      </button>
      <div
        class="my-0.5 h-px bg-neutral-200 dark:bg-slate-600"
        aria-hidden="true"
      />
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        @click="editor.chain().focus().undo().run()"
      >
        Отмена
      </button>
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"
        @click="editor.chain().focus().redo().run()"
      >
        Вернуть
      </button>
      <div
        class="my-1 h-px shrink-0 bg-neutral-200 dark:bg-slate-600"
        aria-hidden="true"
      />
      <button
        type="button"
        class="w-full rounded px-1.5 py-1.5 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-700"
        :disabled="disabled"
        @click="pickImage"
      >
        Фото в текст
      </button>
      <p class="px-0.5 text-[10px] leading-snug text-neutral-500 dark:text-slate-400">
        В курсор. Удаление — Backspace / Delete.
      </p>
      <p
        v-if="uploadErr"
        class="px-0.5 text-[10px] leading-snug text-rose-600"
      >{{ uploadErr }}</p>
    </div>
  </div>
</template>

<style scoped>
:deep(.ProseMirror) {
  outline: none;
}

:deep(.tiptap) {
  background: transparent;
}
</style>
