<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
    @click.self="onClose"
  >
    <div class="bg-white rounded-lg shadow-lg p-4 w-full max-w-sm">
      <form @submit.prevent="handleSubmit">
        <div v-if="type === 'new'" class="mb-4">
          <label for="groupName" class="block text-sm font-medium mb-2">
            {{ label }}
          </label>
          <input
            id="groupName"
            v-model="groupName"
            type="text"
            name="groupName"
            class="w-full border rounded px-3 py-2"
            autofocus
            required
          />
        </div>

        <div v-if="type === 'join'" class="mb-4">
          <label for="groupName" class="block text-sm font-medium mb-2">
            {{ label }}
          </label>
          <input
            id="groupName"
            v-model="groupName"
            type="text"
            name="groupName"
            class="w-full border rounded px-3 py-2"
            autofocus
            required
          />
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            @click="onClose"
          >
            Cancel
          </button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {{ type === 'new' ? 'Create' : 'Join' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  anchorEl: HTMLElement | null
  onClose: () => void
  onSubmit: (groupName: string) => Promise<boolean>
  label: string
  type: 'new' | 'join'
}

const props = defineProps<Props>()

const groupName = ref('')
const open = computed(() => !!props.anchorEl)

const handleSubmit = async () => {
  try {
    const res = await props.onSubmit(groupName.value)
    if (res) {
      groupName.value = ''
      props.onClose()
    }
  } catch (err: unknown) {
    console.error(err)
  }
}
</script>
