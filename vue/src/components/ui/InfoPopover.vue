<template>
  <div ref="root" class="inline-block">
    <button
      type="button"
      class="inline-flex items-center gap-1 text-xs underline decoration-dotted hover:no-underline text-gray-500 dark:text-gray-400"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <i class="fa-solid fa-circle-question" aria-hidden="true"></i>
      <span v-if="label">{{ label }}</span>
    </button>
    <div
      v-if="isOpen"
      ref="panel"
      class="fixed z-40 w-72 max-w-[calc(100vw-1rem)] max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2.5 text-left text-gray-700 dark:text-gray-200 normal-case"
      :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
      role="dialog"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

defineProps<{
  /** Optional text shown next to the "?" icon. Icon-only when omitted. */
  label?: string
}>()

const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const isOpen = ref(false)
// Viewport coords for the fixed-position panel - fixed positioning sidesteps ancestor overflow /
// transform / scroll-container clipping, which absolute positioning kept hitting on narrow views.
const pos = ref({ top: -9999, left: -9999 })

const position = () => {
  const p = panel.value
  const r = root.value
  if (!p || !r) return
  const margin = 8
  const vw = document.documentElement.clientWidth
  const vh = document.documentElement.clientHeight
  const anchor = r.getBoundingClientRect()
  const w = p.offsetWidth
  const h = p.offsetHeight
  const left = Math.max(margin, Math.min(anchor.left, vw - margin - w))
  // Below the trigger, unless that would run off the bottom and there's more room above.
  const below = anchor.bottom + 4
  const top =
    below + h > vh - margin && anchor.top - 4 - h > margin ? anchor.top - 4 - h : below
  pos.value = { top: Math.round(top), left: Math.round(left) }
}

const toggle = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    pos.value = { top: -9999, left: -9999 }
    await nextTick()
    position()
    // A second pass after the browser has laid the panel out - covers a font/reflow that changed
    // its measured size.
    requestAnimationFrame(position)
  }
}

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as Node
  if (
    isOpen.value &&
    root.value &&
    !root.value.contains(target) &&
    !panel.value?.contains(target)
  ) {
    isOpen.value = false
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

// Keep the fixed-position panel anchored to its trigger as the page (or any scroll container
// above it) scrolls.
const reposition = () => {
  if (isOpen.value) position()
}

onMounted(() => {
  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', reposition)
  window.addEventListener('scroll', reposition, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', reposition)
  window.removeEventListener('scroll', reposition, true)
})
</script>
