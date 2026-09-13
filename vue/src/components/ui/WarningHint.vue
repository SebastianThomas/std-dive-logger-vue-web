<template>
  <span ref="root" class="relative inline-flex" @mouseleave="open = false">
    <button
      type="button"
      class="inline-flex items-center rounded text-amber-500 hover:text-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      :aria-label="`Warning: ${text}`"
      :aria-expanded="open"
      :aria-describedby="open ? id : undefined"
      @click.stop="open = !open"
      @mouseenter="open = true"
      @focus="open = true"
      @blur="open = false"
    >
      <i class="fa fa-triangle-exclamation" :class="iconClass" />
    </button>
    <span
      v-if="open"
      :id="id"
      role="tooltip"
      class="absolute left-1/2 top-full z-30 mt-1 w-56 max-w-[70vw] -translate-x-1/2 whitespace-normal rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-left text-xs leading-snug text-amber-900 shadow-lg dark:border-amber-700 dark:bg-gray-900 dark:text-amber-100"
    >
      {{ text }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { generateId } from '@/lib/utils/cryptoUtils'

/**
 * An amber ⚠ that explains itself: the text shows on hover, on keyboard focus and on tap (touch
 * screens have no hover, so a title attribute alone never reaches them). A tap anywhere else closes
 * it again.
 */
defineProps<{ text: string; iconClass?: string }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const id = `warning-hint-${generateId()}`

const closeOnOutsideClick = (event: MouseEvent) => {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', closeOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', closeOnOutsideClick))
</script>
