<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">My Suits</h3>
      <button
        type="button"
        class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        @click="loadSuits"
        :disabled="loading"
      >
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">Loading suits...</p>
    <p v-else-if="suits.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
      No suits found. Create one to get started.
    </p>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="suit in suits"
        :key="suit.id"
        class="border dark:border-gray-600 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-700/50 transition-shadow"
      >
        <div class="flex items-start justify-between mb-2">
          <div>
            <h4 class="font-semibold">{{ SUIT_TYPE_LABELS[suit.type] }}</h4>
            <p v-if="suit.thickness" class="text-xs text-gray-600 dark:text-gray-400">
              {{ suit.thickness }}mm
            </p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              @click="editSuit(suit)"
            >
              Edit
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              @click="showDeleteConfirmation(suit.id)"
              :disabled="deleting === suit.id"
            >
              {{ deleting === suit.id ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
        <p v-if="suit.notes" class="text-xs text-gray-600 dark:text-gray-400">
          Name: {{ formatNotesPreview(suit.notes) }}
        </p>
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="showEditModal && editingSuit"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="closeEditModal"
    >
      <div class="w-[90vw] max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h4 class="text-lg font-semibold mb-4">Edit Suit</h4>

        <div class="grid gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-1">Type</label>
            <select
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              v-model="editForm.type"
            >
              <option v-for="(label, type) in SUIT_TYPE_LABELS" :value="type" :key="type">
                {{ label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Thickness (mm)</label>
            <input
              type="number"
              step="0.5"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              v-model.number="editForm.thickness"
              placeholder="Optional"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Notes</label>
            <input
              type="text"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              v-model="editForm.notes"
              placeholder="Optional"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="closeEditModal"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="savingEdit"
            :class="[
              'px-4 py-2 rounded text-white transition-colors',
              savingEdit ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700',
            ]"
            @click="saveEdit"
          >
            {{ savingEdit ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeletionConfirmation
      v-model="showDeleteModal"
      title="Delete Suit"
      message="Are you sure you want to delete this suit?"
      :loading="deleting !== null"
      @confirm="confirmDeleteSuit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import DeletionConfirmation from '@/components/DeletionConfirmation.vue'
import type { Suit, PagedResult } from '@/lib/types/dive'
import { SUIT_TYPE_LABELS } from '@/lib/types/dive'

interface Props {
  userId: number
}

const props = defineProps<Props>()

const { getWithToken, putWithToken, deleteWithToken } = useApi()

const suits = ref<Suit[]>([])
const loading = ref(false)
const deleting = ref<number | null>(null)
const suitToDelete = ref<number | null>(null)
const showDeleteModal = ref(false)

const showEditModal = ref(false)
const editingSuit = ref<Suit | null>(null)
const savingEdit = ref(false)
const editForm = ref<{
  id: number | null
  type: Suit['type']
  thickness: number | null
  notes: string
}>({
  id: null,
  type: 'NONE',
  thickness: null,
  notes: '',
})

const loadSuits = async () => {
  loading.value = true
  try {
    const res = await getWithToken<PagedResult<Suit>>(
      '/v1/dives/configuration/suit?page=0&size=100',
    )
    suits.value = res.data.result ?? []
  } catch (err) {
    console.error('Failed to load suits:', err)
  } finally {
    loading.value = false
  }
}

const editSuit = (suit: Suit) => {
  editingSuit.value = suit
  editForm.value = {
    id: suit.id ?? null,
    type: suit.type,
    thickness: suit.thickness ?? null,
    notes: suit.notes ?? '',
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingSuit.value = null
}

const saveEdit = async () => {
  savingEdit.value = true
  try {
    await putWithToken(`/v1/dives/configuration/suit/${editForm.value.id}`, {
      ...editForm.value,
      userId: props.userId,
    })
    closeEditModal()
    await loadSuits()
  } catch (err) {
    console.error('Failed to save suit:', err)
  } finally {
    savingEdit.value = false
  }
}

const showDeleteConfirmation = (id: number) => {
  suitToDelete.value = id
  showDeleteModal.value = true
}

const confirmDeleteSuit = async () => {
  if (!suitToDelete.value) return

  deleting.value = suitToDelete.value
  try {
    await deleteWithToken(`/v1/dives/configuration/suit/${suitToDelete.value}`)
    showDeleteModal.value = false
    await loadSuits()
  } catch (err) {
    console.error('Failed to delete suit:', err)
  } finally {
    deleting.value = null
    suitToDelete.value = null
  }
}

// Load suits on mount
loadSuits()

// Notes preview helper (first three words, ensure >= 20 chars)
const formatNotesPreview = (notes?: string) => {
  const text = (notes ?? '').trim()
  if (!text) return ''
  const words = text.split(/\s+/)
  const firstThree = words.slice(0, 3).join(' ')
  if (firstThree.length >= 20 || words.length <= 3) {
    return firstThree
  }
  let acc = firstThree
  let idx = 3
  while (acc.length < 20 && idx < words.length) {
    acc += ' ' + words[idx]
    idx++
  }
  return acc.length > text.length ? text : acc
}
</script>
