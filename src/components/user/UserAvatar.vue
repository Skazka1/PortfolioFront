<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    imageUrl?: string | null
    /** xs — шапка; sm — списки; md; lg — каталог; xl; banner — шапка карточки портфолио */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'banner'
  }>(),
  {
    imageUrl: null,
    size: 'md',
  }
)

const GRADIENTS = [
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-fuchsia-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-rose-600',
  'from-indigo-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-orange-500 to-red-500',
  'from-pink-500 to-violet-600',
]

function hashName(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const gradientClass = computed(
  () => `bg-gradient-to-br ${GRADIENTS[hashName(props.name || '?') % GRADIENTS.length]}`
)

const initial = computed(() => {
  const t = (props.name || '').trim()
  if (!t) {
    return '?'
  }
  const ch = [...t][0]
  return ch ? ch.toLocaleUpperCase('ru-RU') : '?'
})

const boxClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'h-9 w-9 min-h-9 min-w-9 text-xs rounded-full'
    case 'sm':
      return 'h-10 w-10 min-h-10 min-w-10 text-sm rounded-full'
    case 'md':
      return 'h-11 w-11 min-h-11 min-w-11 text-sm rounded-full'
    case 'lg':
      return 'h-16 w-16 min-h-16 min-w-16 text-xl font-bold rounded-full'
    case 'xl':
      return 'h-24 w-24 min-h-24 min-w-24 text-3xl font-bold rounded-full'
    case 'banner':
      return 'h-48 w-full min-h-48 text-5xl font-bold rounded-t-2xl md:text-6xl'
    default:
      return 'h-11 w-11 rounded-full'
  }
})
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center overflow-hidden bg-slate-200 bg-cover bg-center font-semibold text-white"
    :class="[boxClass, imageUrl ? '' : gradientClass]"
    :style="imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined"
    role="img"
    :aria-label="name || 'Аватар'"
  >
    <span
      v-if="!imageUrl"
      class="select-none"
    >{{ initial }}</span>
  </div>
</template>
