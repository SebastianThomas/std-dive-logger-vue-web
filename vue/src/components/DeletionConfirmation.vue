<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    @click.self="$emit('update:modelValue', false)"
  >
    <div class="w-[90vw] max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h4 class="text-lg font-semibold mb-3">{{ title }}</h4>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {{ message }}
      </p>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          @click="$emit('update:modelValue', false)"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="loading"
          :class="[
            'px-4 py-2 rounded text-white transition-colors',
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700',
          ]"
          @click="$emit('confirm')"
        >
          {{ loading ? 'Deleting...' : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  confirmText: 'Delete',
  loading: false,
})

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
</script>
