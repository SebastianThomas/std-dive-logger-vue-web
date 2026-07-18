<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <h3 class="text-lg font-semibold">My Dive Buddies</h3>
      <button
        type="button"
        class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        @click="loadBuddies"
        :disabled="loading"
      >
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">Loading buddies...</p>
    <p v-else-if="buddies.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
      No named dive buddies yet.
    </p>

    <ul
      v-else
      class="divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-600 rounded-lg"
    >
      <li v-for="name in buddies" :key="name" class="flex items-center justify-between px-4 py-2">
        <span>{{ name }}</span>
        <button
          type="button"
          class="px-2 py-1 text-xs rounded border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          @click="openRenameModal(name)"
        >
          Rename
        </button>
      </li>
    </ul>

    <!-- Rename Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="closeModal"
    >
      <div class="w-[90vw] max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h4 class="text-lg font-semibold mb-2">Rename Buddy</h4>
        <p class="text-xs text-gray-600 dark:text-gray-400 mb-4">
          Renames "{{ renamingFrom }}" on every one of your dives. If a dive already lists the new
          name too, the duplicate entry on that dive is dropped instead of duplicated.
        </p>
        <input
          type="text"
          class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 mb-4"
          v-model="newName"
          placeholder="New name"
          @keydown.enter="saveRename"
        />
        <div v-if="error" class="text-sm text-red-600 mb-4">{{ error }}</div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="saving || !canSave"
            :class="[
              'px-4 py-2 rounded text-white transition-colors',
              saving || !canSave ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700',
            ]"
            @click="saveRename"
          >
            {{ saving ? 'Saving...' : 'Save' }}
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

const { getWithToken, putWithToken } = useApi()

const buddies = ref<string[]>([])
const loading = ref(false)

const showModal = ref(false)
const renamingFrom = ref('')
const newName = ref('')
const saving = ref(false)
const error = ref('')

const canSave = computed(() => newName.value.trim().length > 0)

const loadBuddies = async () => {
  loading.value = true
  try {
    const res = await getWithToken<string[]>('/v1/dives/buddies')
    buddies.value = res.data ?? []
  } catch (err) {
    console.error('Failed to load buddies:', err)
  } finally {
    loading.value = false
  }
}

const openRenameModal = (name: string) => {
  renamingFrom.value = name
  newName.value = name
  error.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveRename = async () => {
  if (!canSave.value) return
  const trimmed = newName.value.trim()
  if (trimmed === renamingFrom.value) {
    closeModal()
    return
  }
  saving.value = true
  error.value = ''
  try {
    const res = await putWithToken<string[], { oldName: string; newName: string }>(
      '/v1/dives/buddies/rename',
      { oldName: renamingFrom.value, newName: trimmed },
    )
    buddies.value = res.data ?? []
    toast.success(`Renamed "${renamingFrom.value}" to "${trimmed}" across your dives`)
    closeModal()
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to rename buddy'
    console.error('Rename error:', err)
  } finally {
    saving.value = false
  }
}

loadBuddies()
</script>
