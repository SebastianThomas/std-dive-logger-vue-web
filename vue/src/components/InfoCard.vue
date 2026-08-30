<template>
  <div
    class="dive-card bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 rounded-xl shadow-md px-3 py-2 flex flex-col items-center min-w-30"
  >
    <p
      class="text-xs flex items-center gap-1"
      :style="{ color: 'var(--foreground)', opacity: 0.8 }"
    >
      {{ title }}
      <i
        v-if="warning"
        class="fa fa-triangle-exclamation text-amber-500 text-[0.6rem]"
        :title="warning"
      />
    </p>
    <div
      v-if="value !== undefined"
      class="font-semibold text-sm"
      :style="{ color: 'var(--foreground)' }"
    >
      {{ value }}
    </div>
    <div v-else class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  value?: string | number
  /** When set, a small amber ⚠ with this text as its tooltip appears next to the title. */
  warning?: string | null
}

defineProps<Props>()
</script>
