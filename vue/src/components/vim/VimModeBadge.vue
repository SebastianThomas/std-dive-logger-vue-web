<template>
  <span
    class="px-2 py-1 rounded text-xs font-mono select-none"
    :class="
      mode === 'insert'
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    "
  >
    {{ mode === 'insert' ? 'INSERT' : 'NORMAL' }}
  </span>
</template>

<script setup lang="ts">
// Dumb INSERT / NORMAL pill. Used by the Command Palette and by VimFieldIndicator; the parent
// positions it.
defineProps<{ mode: 'insert' | 'normal' }>()
</script>
