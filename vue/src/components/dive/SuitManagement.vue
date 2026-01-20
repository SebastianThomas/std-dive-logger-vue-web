<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <h3 class="text-lg font-semibold">My Suits</h3>
      <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <button
          type="button"
          class="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
          @click="openCreateModal"
        >
          Create New
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          @click="loadSuits"
          :disabled="loading"
        >
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">Loading suits...</p>
    <p v-else-if="suits.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
      No suits found. Create one to get started.
    </p>

    <ItemCardGrid v-else>
      <ItemCard
        v-for="suit in suits"
        :key="suit.id"
        :title="SUIT_TYPE_LABELS[suit.type]"
        @view-dives="viewDivesForSuit(suit.id)"
        @edit="editSuit(suit)"
      >
        <template #header-details>
          <p v-if="suit.thickness" class="text-xs text-gray-600 dark:text-gray-400">
            {{ suit.thickness }}mm
          </p>
        </template>
        <p v-if="suit.notes" class="text-xs text-gray-600 dark:text-gray-400">
          Name: {{ formatNotesPreview(suit.notes) }}
        </p>
      </ItemCard>
    </ItemCardGrid>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="closeModal"
    >
      <div class="w-[90vw] max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h4 class="text-lg font-semibold mb-4">
          {{ modalMode === 'create' ? 'Create Suit' : 'Edit Suit' }}
        </h4>

        <div class="grid gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-1">Type</label>
            <select
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              v-model="form.type"
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
              v-model.number="form.thickness"
              placeholder="Optional"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Notes</label>
            <input
              type="text"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              v-model="form.notes"
              placeholder="Optional"
            />
          </div>
        </div>

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
            :disabled="saving"
            :class="[
              'px-4 py-2 rounded text-white transition-colors',
              saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700',
            ]"
            @click="saveSuit"
          >
            {{ saving ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import ItemCard from '@/components/ItemCard.vue'
import ItemCardGrid from '@/components/ItemCardGrid.vue'
import type { Suit, PagedResult } from '@/lib/types/dive'
import { SUIT_TYPE_LABELS } from '@/lib/types/dive'

interface Props {
  userId: number
}

const props = defineProps<Props>()

const { getWithToken, postWithToken, putWithToken } = useApi()
const router = useRouter()

const suits = ref<Suit[]>([])
const loading = ref(false)

const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const saving = ref(false)
const form = ref<{
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

const openCreateModal = () => {
  modalMode.value = 'create'
  form.value = {
    id: null,
    type: 'NONE',
    thickness: null,
    notes: '',
  }
  showModal.value = true
}

const editSuit = (suit: Suit) => {
  modalMode.value = 'edit'
  form.value = {
    id: suit.id ?? null,
    type: suit.type,
    thickness: suit.thickness ?? null,
    notes: suit.notes ?? '',
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const viewDivesForSuit = (suitId: number) => {
  router.push({ name: 'DiveList', query: { suitId: suitId.toString() } })
}

const saveSuit = async () => {
  saving.value = true
  try {
    if (modalMode.value === 'create') {
      await postWithToken('/v1/dives/configuration/suit', {
        type: form.value.type,
        thickness: form.value.thickness,
        notes: form.value.notes,
        userId: props.userId,
      })
    } else {
      await putWithToken(`/v1/dives/configuration/suit/${form.value.id}`, {
        ...form.value,
        userId: props.userId,
      })
    }
    closeModal()
    await loadSuits()
  } catch (err) {
    console.error('Failed to save suit:', err)
  } finally {
    saving.value = false
  }
}

// Load suits on mount
loadSuits()

// Keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
  if (!showModal.value) return

  // Ctrl+Enter to save
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    e.stopPropagation()
    saveSuit()
    return
  }

  // Esc to close
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    closeModal()
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
})

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
