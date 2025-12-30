<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="emit('close')"
  >
    <div class="dive-card bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
      <h2 class="text-xl font-bold mb-4">Bulk Actions</h2>
      <p class="text-sm text-gray-600 mb-6">{{ selectedCount }} dive(s) selected</p>

      <div class="space-y-3">
        <!-- Merge Dives -->
        <div class="border rounded-lg p-4">
          <h3 class="font-semibold mb-2">Merge Dives</h3>
          <p class="text-sm text-gray-600 mb-3">Select exactly 2 dives to merge them into one.</p>
          <div v-if="selectedCount === 2" class="space-y-2">
            <p class="text-sm font-medium">Choose primary dive:</p>
            <div class="space-y-1">
              <label
                v-for="dive in selectedDives"
                :key="dive.id"
                class="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="primaryDiveId"
                  type="radio"
                  :value="dive.id"
                  name="primary"
                  class="cursor-pointer"
                />
                <span class="text-sm"
                  >#{{ dive.number }} - {{ dive.customIdentifier || 'Unnamed' }}</span
                >
              </label>
            </div>
            <button
              :disabled="!primaryDiveId"
              @click="handleMerge"
              class="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Merge Dives
            </button>
          </div>
          <p v-else class="text-sm text-gray-500">
            {{ selectedCount < 2 ? 'Select 2 dives to merge' : 'Select only 2 dives to merge' }}
          </p>
        </div>

        <!-- Bulk Delete -->
        <div class="border border-red-300 rounded-lg p-4 bg-red-50">
          <h3 class="font-semibold text-red-800 mb-2">Delete Selected</h3>
          <p class="text-sm text-gray-700 mb-3">
            Permanently delete {{ selectedCount }} dive(s). This action cannot be undone.
          </p>
          <button
            @click="showDeleteConfirm = true"
            class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete {{ selectedCount }} Dive(s)
          </button>
        </div>
      </div>

      <div class="flex justify-end mt-6">
        <button @click="emit('close')" class="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
          Close
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/60"
      @click.self="showDeleteConfirm = false"
    >
      <div class="dive-card bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <h3 class="text-lg font-bold mb-3">Confirm Deletion</h3>
        <p class="text-sm text-gray-700 mb-6">
          Are you sure you want to delete {{ selectedCount }} dive(s)? This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            @click="showDeleteConfirm = false"
            class="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            @click="handleBulkDelete"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import type { DiveWithoutProfiles } from '@/lib/types/dive'

const props = defineProps<{
  open: boolean
  selectedDives: DiveWithoutProfiles[]
}>()

const emit = defineEmits<{
  close: []
  refresh: []
}>()

const { deleteWithToken, postWithToken } = useApi()

const primaryDiveId = ref<number | null>(null)
const showDeleteConfirm = ref(false)

const selectedCount = computed(() => props.selectedDives.length)

const handleMerge = async () => {
  if (!primaryDiveId.value || selectedCount.value !== 2) {
    toast.error('Please select exactly 2 dives and choose a primary dive')
    return
  }

  const secondaryId = props.selectedDives.find((d) => d.id !== primaryDiveId.value)?.id
  if (!secondaryId) return

  try {
    await postWithToken(`/v1/dives/${primaryDiveId.value}/merge?secondaryDiveId=${secondaryId}`, {})
    toast.success('Dives merged successfully')
    emit('refresh')
    emit('close')
  } catch (err) {
    console.error('Failed to merge dives', err)
    toast.error('Failed to merge dives')
  }
}

const handleBulkDelete = async () => {
  const ids = props.selectedDives.map((d) => d.id)

  try {
    await Promise.all(ids.map((id) => deleteWithToken(`/v1/dives/${id}`)))
    toast.success(`Successfully deleted ${ids.length} dive(s)`)
    showDeleteConfirm.value = false
    emit('refresh')
    emit('close')
  } catch (err) {
    console.error('Failed to delete dives', err)
    toast.error('Failed to delete some dives')
  }
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
