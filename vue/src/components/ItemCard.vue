<template>
  <div
    class="border dark:border-gray-600 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-700/50 transition-shadow"
  >
    <!-- Header section -->
    <div class="mb-2">
      <h4 class="font-semibold">{{ title }}</h4>
      <slot name="header-details" />
    </div>

    <!-- Buttons section - always below header -->
    <div class="flex flex-wrap gap-2 mb-2">
      <button
        type="button"
        class="px-2 py-1 text-xs rounded border border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors whitespace-nowrap"
        @click="$emit('view-dives')"
      >
        View Dives
      </button>
      <button
        v-if="!readOnly"
        type="button"
        class="px-2 py-1 text-xs rounded border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap"
        @click="$emit('edit')"
      >
        Edit
      </button>
      <button
        v-if="!readOnly && showDelete"
        type="button"
        class="px-2 py-1 text-xs rounded border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
        @click="$emit('delete')"
      >
        Delete
      </button>
    </div>

    <!-- Content section -->
    <div v-if="$slots.default">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'

interface Props {
  title: string
  /** Opt-in per-card delete button - off by default so existing callers (e.g.
   * DiveComputerManagement, which has its own separate bulk "delete unused" flow) are unaffected. */
  showDelete?: boolean
}

withDefaults(defineProps<Props>(), {
  showDelete: false,
})

defineEmits<{
  'view-dives': []
  edit: []
  delete: []
}>()

const { readOnly } = useReadOnlyMode()
</script>
