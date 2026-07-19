<template>
  <div ref="root" class="relative inline-block">
    <button
      type="button"
      class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:border-blue-400"
      @click="isOpen = !isOpen"
    >
      <span class="flex items-center gap-1.5">
        {{ label }}
        <span v-if="active" class="w-2 h-2 rounded-full bg-blue-500" title="A filter is active" />
      </span>
      <i :class="isOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="text-xs"></i>
    </button>
    <div
      v-if="isOpen"
      class="absolute z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-3"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps<{
  label: string
  active?: boolean
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
