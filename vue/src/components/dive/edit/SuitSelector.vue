<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="close">
    <div class="w-[90vw] max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Manage Suit</h3>
      </div>

      <!-- Mode selector -->
      <div class="flex gap-2 mb-4">
        <button
          ref="firstButtonRef"
          type="button"
          :class="[
            'px-3 py-1.5 text-sm rounded border transition-colors',
            mode === 'select'
              ? 'bg-blue-500 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600',
          ]"
          @click="mode = 'select'"
        >
          Select existing
        </button>
        <button
          type="button"
          :class="[
            'px-3 py-1.5 text-sm rounded border transition-colors',
            mode === 'create'
              ? 'bg-blue-500 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600',
          ]"
          @click="startCreateSuit"
        >
          Create new
        </button>
        <button
          type="button"
          :disabled="!selectedSuitId"
          :class="[
            'px-3 py-1.5 text-sm rounded border transition-colors',
            selectedSuitId
              ? mode === 'edit'
                ? 'bg-blue-500 text-white border-blue-600'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
              : 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
          ]"
          @click="startEditSuit"
        >
          Edit selected
        </button>
      </div>
      <div v-if="mode === 'edit'" class="text-red-400 mb-4">
        WARNING: Editing this suit also changes its value for all other associated dives.
      </div>

      <!-- Select mode -->
      <div v-if="mode === 'select'" class="space-y-3 mb-4">
        <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">Loading suits...</p>
        <template v-else>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium shrink-0">Suit:</label>
            <select
              class="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              :value="selectedSuitId || ''"
              @change="onSelectSuit"
            >
              <option value="" disabled>Select a suit</option>
              <option v-for="s in suits" :key="s.id" :value="s.id">
                {{ SUIT_TYPE_LABELS[s.type]
                }}<span v-if="s.thickness !== undefined && s.thickness !== null">
                  - {{ s.thickness }}mm</span
                >
                <span v-if="s.notes" class="text-gray-600 dark:text-gray-400">
                  — {{ formatNotesPreview(s.notes) }}</span
                >
              </option>
            </select>
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="loadSuits"
            >
              Refresh
            </button>
          </div>
          <p v-if="currentSuitNotes" class="text-xs text-gray-600 dark:text-gray-400">
            Name: {{ formatNotesPreview(currentSuitNotes) }}
          </p>
        </template>
      </div>

      <!-- Create/Edit mode -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium mb-1">Type *</label>
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
        <div class="md:col-span-2">
          <label class="block text-sm font-medium mb-1">Notes</label>
          <input
            type="text"
            class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
            v-model="form.notes"
            placeholder="Optional"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="close"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="saving || (mode === 'select' && !selectedSuitId)"
          :class="[
            'px-4 py-2 rounded text-white transition-colors',
            saving || (mode === 'select' && !selectedSuitId)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700',
          ]"
          @click="saveSuit"
        >
          {{
            mode === 'select' ? 'Apply' : mode === 'create' ? 'Create & Apply' : 'Update & Apply'
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useApi } from '@/composables/useApi'
import type { Suit, PagedResult } from '@/lib/types/dive'
import { SUIT_TYPE_LABELS } from '@/lib/types/dive'

interface Props {
  currentSuit?: Suit | null
  userId: number
}

interface Emits {
  (e: 'suit-selected', suit: Suit): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getWithToken, postWithToken, putWithToken } = useApi()

const firstButtonRef = ref<HTMLButtonElement | null>(null)

const mode = ref<'select' | 'create' | 'edit'>('select')
const suits = ref<Suit[]>([])
const loading = ref(false)
const saving = ref(false)
const selectedSuitId = ref<number | null>(props.currentSuit?.id ?? null)

const form = ref<{
  id: Suit['id'] | null
  type: Suit['type']
  thickness: Suit['thickness']
  notes: Suit['notes']
  userId: Suit['userId']
}>({
  id: null,
  type: 'NONE',
  thickness: null,
  notes: '',
  userId: props.userId,
})

const currentSuitNotes = computed(() => {
  const suit = suits.value.find((s) => s.id === selectedSuitId.value)
  return suit?.notes ?? ''
})

// Preview: show first 3 words or minimum 20 characters
const formatNotesPreview = (notes?: string) => {
  const text = (notes ?? '').trim()
  if (!text) return ''
  const words = text.split(/\s+/)
  const firstThree = words.slice(0, 3).join(' ')
  if (firstThree.length >= 20 || words.length <= 3) {
    return firstThree
  }
  // Ensure at least 20 chars by extending beyond 3 words
  let acc = firstThree
  let idx = 3
  while (acc.length < 20 && idx < words.length) {
    acc += ' ' + words[idx]
    idx++
  }
  return acc.length > text.length ? text : acc
}

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

const startCreateSuit = () => {
  mode.value = 'create'
  form.value = { id: null, type: 'NONE', thickness: null, notes: '', userId: props.userId }
}

const startEditSuit = () => {
  if (!selectedSuitId.value) return
  const existing = suits.value.find((s) => s.id === selectedSuitId.value)
  if (!existing) return
  mode.value = 'edit'
  form.value = {
    id: existing.id ?? null,
    type: existing.type,
    thickness: existing.thickness ?? null,
    notes: existing.notes ?? '',
    userId: props.userId,
  }
}

const onSelectSuit = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  const id = Number(val)
  selectedSuitId.value = Number.isNaN(id) ? null : id
}

const saveSuit = async () => {
  if (mode.value === 'select') {
    if (!selectedSuitId.value) return
    const suit = suits.value.find((s) => s.id === selectedSuitId.value)
    if (suit) {
      emit('suit-selected', suit)
    }
    return
  }

  saving.value = true
  try {
    if (mode.value === 'create') {
      const res = await postWithToken<Suit>('/v1/dives/configuration/suit', form.value)
      // Reload suits to update the dropdown
      await loadSuits()
      emit('suit-selected', res.data)
    } else if (mode.value === 'edit') {
      const res = await putWithToken<Suit>(
        `/v1/dives/configuration/suit/${form.value.id}`,
        form.value,
      )
      // Reload suits to update the dropdown
      await loadSuits()
      emit('suit-selected', res.data)
    }
  } catch (err) {
    console.error('Failed to save suit:', err)
  } finally {
    saving.value = false
  }
}

const close = () => {
  emit('close')
}

// Load suits when modal opens
loadSuits()

const handleKeyDown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    saveSuit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, true)
  // Focus the first button
  firstButtonRef.value?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
})
</script>
