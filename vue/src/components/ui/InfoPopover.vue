<template>
  <div ref="root" class="relative inline-block">
    <button
      type="button"
      class="inline-flex items-center gap-1 text-xs underline decoration-dotted hover:no-underline text-gray-500 dark:text-gray-400"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <i class="fa-solid fa-circle-question" aria-hidden="true"></i>
      <span v-if="label">{{ label }}</span>
    </button>
    <div
      v-if="isOpen"
      class="absolute left-0 z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2.5 text-left text-gray-700 dark:text-gray-200 normal-case"
      role="dialog"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps<{
  /** Optional text shown next to the "?" icon. Icon-only when omitted. */
  label?: string
}>()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const handleOutsideClick = (event: MouseEvent) => {
  if (isOpen.value && root.value && !root.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleEscape)
})
</script>
