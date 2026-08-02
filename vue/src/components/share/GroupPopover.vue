<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="emit('close')"
  >
    <div class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm">
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <div v-if="type === 'new'" class="flex flex-col gap-2">
          <label for="group-name" class="text-sm font-medium">{{ label }}</label>
          <input
            id="group-name"
            v-model="groupName"
            type="text"
            class="border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-800 dark:text-white"
            autofocus
            required
          />
        </div>

        <div v-else-if="type === 'join'" class="flex flex-col gap-2">
          <label class="text-sm font-medium">{{ label }}</label>
          <input
            v-model="groupName"
            type="text"
            placeholder="Enter group name..."
            class="border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-800 dark:text-white"
            autofocus
            required
          />
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            :disabled="submitting"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="submitting"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ type === 'new' ? (submitting ? 'Creating...' : 'Create') : submitting ? 'Joining...' : 'Join' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  label: string
  type: 'new' | 'join'
  /** Set by the parent while its own addGroup/joinGroup request is in flight. */
  submitting?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [groupName: string]
}>()

const groupName = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      groupName.value = ''
    }
  },
)

const handleSubmit = async () => {
  if (!groupName.value.trim() || props.submitting) return
  emit('submit', groupName.value)
}
</script>

<style scoped>
.dive-card {
  background-color: var(--card-bg);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

[data-theme='dark'] .dive-card {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}
</style>
