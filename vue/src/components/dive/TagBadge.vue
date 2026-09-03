<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full font-medium select-none',
      compact ? 'px-1.5 py-0 text-[10px] leading-tight' : 'px-2 py-0.5 text-xs',
      autoDetected
        ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ]"
    :title="autoDetected ? 'Auto-detected tag' : 'Manually assigned tag'"
  >
    <span v-if="autoDetected" class="opacity-60" :class="compact ? 'text-[9px]' : 'text-[10px]'"
      >⚙</span
    >
    {{ name }}
    <button
      v-if="removable"
      type="button"
      class="ml-0.5 hover:opacity-70 font-bold leading-none"
      @click.stop="$emit('remove')"
    >
      ×
    </button>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  autoDetected?: boolean
  removable?: boolean
  /** Tighter padding + smaller text - for dense contexts like the dive list. */
  compact?: boolean
}>()

defineEmits<{
  remove: []
}>()
</script>
