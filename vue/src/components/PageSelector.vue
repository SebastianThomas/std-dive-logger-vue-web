<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="text-sm text-gray-600 dark:text-gray-400">
      Page {{ currentPage }} of {{ totalPages }}
      <span v-if="pageSize && totalPages"> (~{{ totalPages * pageSize }} total dives)</span>
    </div>

    <div class="flex items-center gap-2">
      <button
        :disabled="currentPage <= 1"
        @click="goTo(1)"
        class="hidden sm:inline-flex px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        First
      </button>
      <button
        :disabled="currentPage <= 1"
        @click="goTo(currentPage - 1)"
        class="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Prev
      </button>
      <button
        class="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
      >
        Page {{ currentPage }} / {{ totalPages }}
      </button>
      <button
        :disabled="currentPage >= totalPages"
        @click="goTo(currentPage + 1)"
        class="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'

interface Props {
  currentPage: number
  totalPages: number
  pageSize?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:page': [value: number] }>()

// Keep watcher in case parent updates currentPage externally
watch(
  () => props.currentPage,
  () => {},
)

const goTo = (page: number) => {
  if (!page || page < 1 || page > props.totalPages) return
  emit('update:page', page)
}
</script>
