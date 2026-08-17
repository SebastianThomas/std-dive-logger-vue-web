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

      <!-- Heavy-guard mode: the confirm button below stays disabled until this is typed exactly -
           for an action too destructive to trust to a single click, however deliberate. -->
      <div v-if="confirmationPhrase != null" class="mb-6">
        <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Type <span class="font-mono font-semibold">{{ confirmationPhrase }}</span> to confirm
        </label>
        <input
          v-model="typedConfirmation"
          type="text"
          autocomplete="off"
          class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          :placeholder="confirmationPhrase"
        />
      </div>

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
          :disabled="loading || !confirmEnabled"
          :class="[
            'px-4 py-2 rounded text-white transition-colors',
            loading || !confirmEnabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700',
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
import { computed, ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  loading?: boolean
  /** When set, the confirm button stays disabled until the user types this exact phrase - for an
   * action too destructive to trust to a single click, however deliberate (e.g. deleting every
   * dive tied to a CCR unit). Leave unset for a normal single-confirm delete. */
  confirmationPhrase?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Delete',
  loading: false,
  confirmationPhrase: null,
})

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const typedConfirmation = ref('')

// Reset the typed value every time the modal opens, so a previous confirmation can't linger and
// silently satisfy a *different* heavy-guard delete opened right after.
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) typedConfirmation.value = ''
  },
)

// A strict null check, not a falsy check - an *empty-string* confirmationPhrase must not silently
// disable the guard entirely (`!''` is `true` in JS). It also can't be satisfied by "typing
// nothing" (typedConfirmation starts as `''` too, which would otherwise trivially equal an empty
// phrase) - requiring a non-empty typed value means a blank-name entity's guard stays permanently
// (safely) locked rather than being trivially satisfied by doing nothing at all.
const confirmEnabled = computed(
  () =>
    props.confirmationPhrase == null ||
    (typedConfirmation.value.length > 0 && typedConfirmation.value === props.confirmationPhrase),
)
</script>
