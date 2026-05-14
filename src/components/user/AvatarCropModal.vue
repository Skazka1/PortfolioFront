<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  file: File | null
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  crop: [File]
}>()

const PREVIEW = 300
const OUT = 512

const canvasRef = ref<HTMLCanvasElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
const objectUrl = ref<string | null>(null)
/** Центр квадрата обрезки, 0–1 по ширине/высоте исходника */
const focusX = ref(0.5)
const focusY = ref(0.5)
/** 1 = в круг помещается вся меньшая сторона; больше — крупнее (меньше области) */
const zoom = ref(1)

const dragging = ref(false)
const lastPtr = ref({ x: 0, y: 0 })
const busy = ref(false)

function cleanupObjectUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = null
  }
  imgEl.value = null
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function cropSide(nw: number, nh: number): number {
  return Math.min(nw, nh) / zoom.value
}

function zoomBounds(nw: number, nh: number): { min: number; max: number } {
  const m = Math.min(nw, nh)
  const min = 1
  const max = clamp(m / 48, min, 6)
  return { min, max: Math.max(min, max) }
}

function clampFocus(nw: number, nh: number): void {
  const s = cropSide(nw, nh)
  const half = s / 2
  const cx = focusX.value * nw
  const cy = focusY.value * nh
  focusX.value = clamp(cx, half, nw - half) / nw
  focusY.value = clamp(cy, half, nh - half) / nh
}

function drawPreview(): void {
  if (!props.open) {
    return
  }
  const canvas = canvasRef.value
  const img = imgEl.value
  if (!canvas || !img || !img.complete || img.naturalWidth === 0) {
    return
  }
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  const zb = zoomBounds(nw, nh)
  zoom.value = clamp(zoom.value, zb.min, zb.max)
  clampFocus(nw, nh)

  const s = cropSide(nw, nh)
  const half = s / 2
  const cx = focusX.value * nw
  const cy = focusY.value * nh

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  canvas.width = PREVIEW
  canvas.height = PREVIEW
  ctx.clearRect(0, 0, PREVIEW, PREVIEW)
  ctx.save()
  ctx.beginPath()
  ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2 - 1.5, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, cx - half, cy - half, s, s, 0, 0, PREVIEW, PREVIEW)
  ctx.restore()
  ctx.strokeStyle = 'rgba(15,23,42,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2 - 1, 0, Math.PI * 2)
  ctx.stroke()
}

watch(
  () => [props.open, props.file] as const,
  async ([isOpen, file]) => {
    cleanupObjectUrl()
    if (!isOpen || !file) {
      return
    }
    busy.value = true
    try {
      objectUrl.value = URL.createObjectURL(file)
      await new Promise<void>((resolve, reject) => {
        const el = new Image()
        el.onload = () => {
          imgEl.value = el
          focusX.value = 0.5
          focusY.value = 0.5
          zoom.value = 1
          resolve()
        }
        el.onerror = () => reject(new Error('Не удалось открыть изображение'))
        el.src = objectUrl.value!
      })
      await nextTick()
      drawPreview()
    } catch {
      emit('update:open', false)
    } finally {
      busy.value = false
    }
  }
)

const zoomSlider = computed(() => {
  const img = imgEl.value
  if (!img?.naturalWidth) {
    return { min: 1, max: 3 }
  }
  return zoomBounds(img.naturalWidth, img.naturalHeight)
})

watch([focusX, focusY, zoom], () => {
  if (props.open && imgEl.value) {
    drawPreview()
  }
})

function onWheel(e: WheelEvent): void {
  if (!props.open || !imgEl.value) {
    return
  }
  e.preventDefault()
  const nw = imgEl.value.naturalWidth
  const nh = imgEl.value.naturalHeight
  const zb = zoomBounds(nw, nh)
  const dir = e.deltaY > 0 ? -1 : 1
  zoom.value = clamp(zoom.value * (1 + dir * 0.12), zb.min, zb.max)
  clampFocus(nw, nh)
  drawPreview()
}

function ptrToCanvas(e: PointerEvent): { x: number; y: number } {
  const canvas = canvasRef.value
  if (!canvas) {
    return { x: 0, y: 0 }
  }
  const r = canvas.getBoundingClientRect()
  const scaleX = canvas.width / r.width
  const scaleY = canvas.height / r.height
  return {
    x: (e.clientX - r.left) * scaleX,
    y: (e.clientY - r.top) * scaleY,
  }
}

function onPointerDown(e: PointerEvent): void {
  if (!imgEl.value || busy.value) {
    return
  }
  dragging.value = true
  lastPtr.value = ptrToCanvas(e)
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!dragging.value || !imgEl.value) {
    return
  }
  const img = imgEl.value
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  const cur = ptrToCanvas(e)
  const dx = cur.x - lastPtr.value.x
  const dy = cur.y - lastPtr.value.y
  lastPtr.value = cur
  const s = cropSide(nw, nh)
  focusX.value += (-dx / PREVIEW) * (s / nw)
  focusY.value += (-dy / PREVIEW) * (s / nh)
  clampFocus(nw, nh)
  drawPreview()
}

function onPointerUp(e: PointerEvent): void {
  dragging.value = false
  ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
}

function close(): void {
  emit('update:open', false)
}

async function apply(): Promise<void> {
  const img = imgEl.value
  if (!img || !img.complete) {
    return
  }
  busy.value = true
  try {
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    const zb = zoomBounds(nw, nh)
    zoom.value = clamp(zoom.value, zb.min, zb.max)
    clampFocus(nw, nh)
    const s = cropSide(nw, nh)
    const half = s / 2
    const cx = focusX.value * nw
    const cy = focusY.value * nh

    const out = document.createElement('canvas')
    out.width = OUT
    out.height = OUT
    const ctx = out.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.drawImage(img, cx - half, cy - half, s, s, 0, 0, OUT, OUT)

    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    )
    if (!blob) {
      return
    }
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    emit('crop', file)
    emit('update:open', false)
  } finally {
    busy.value = false
  }
}

onBeforeUnmount(() => {
  cleanupObjectUrl()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
      @click.self="close"
    >
      <div
        class="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-600 dark:bg-slate-900 dark:shadow-black/40"
      >
        <h2
          id="avatar-crop-title"
          class="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Область для аватарки
        </h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Перетащите фото под кругом, колесо мыши — масштаб. В миниатюре будет виден круг.
        </p>

        <div
          v-if="busy && !imgEl"
          class="mt-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400"
        >
          Загрузка…
        </div>
        <div
          v-else
          class="mt-5 flex flex-col items-center"
        >
          <canvas
            ref="canvasRef"
            class="touch-none cursor-grab rounded-full bg-slate-100 active:cursor-grabbing dark:bg-slate-800"
            :width="PREVIEW"
            :height="PREVIEW"
            style="width: 280px; height: 280px; max-width: 100%"
            @wheel.prevent="onWheel"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          />
          <label class="mt-4 flex w-full max-w-xs items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <span class="shrink-0">Масштаб</span>
            <input
              v-model.number="zoom"
              type="range"
              class="min-w-0 flex-1"
              :min="zoomSlider.min"
              :max="zoomSlider.max"
              step="0.02"
            >
          </label>
        </div>

        <div class="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            :disabled="busy"
            @click="close"
          >
            Отмена
          </button>
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="busy || !imgEl"
            @click="apply"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
