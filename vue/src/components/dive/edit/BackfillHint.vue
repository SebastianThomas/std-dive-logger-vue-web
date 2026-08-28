<template>
  <span
    v-if="prominent"
    class="inline-flex items-center gap-1.5 align-middle ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
  >
    <i class="fa fa-flag text-[10px]" />
    <span>Flagged for backfill — add if known</span>
    <button
      type="button"
      class="ml-0.5 underline decoration-dotted hover:no-underline"
      @click="$emit('dismiss')"
    >
      No info
    </button>
  </span>
  <span
    v-else
    class="inline-flex items-center gap-1 align-middle ml-2 text-xs text-gray-400 dark:text-gray-500"
  >
    <i class="fa fa-circle-info text-[10px]" />
    <span>add if known</span>
    <button
      type="button"
      class="underline decoration-dotted hover:no-underline"
      @click="$emit('dismiss')"
    >
      · no info
    </button>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  /** Prominent (amber pill) when the user arrived from the Backfill guide, subtle otherwise. */
  prominent?: boolean
}>()

defineEmits<{ dismiss: [] }>()
</script>
