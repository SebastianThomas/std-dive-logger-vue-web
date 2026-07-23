<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="close">
    <div class="w-[90vw] max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Manage CCR Unit</h3>
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
          @click="startCreateCcrUnit"
        >
          Create new
        </button>
        <button
          type="button"
          :disabled="!selectedCcrUnitId"
          :class="[
            'px-3 py-1.5 text-sm rounded border transition-colors',
            selectedCcrUnitId
              ? mode === 'edit'
                ? 'bg-blue-500 text-white border-blue-600'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
              : 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
          ]"
          @click="startEditCcrUnit"
        >
          Edit selected
        </button>
      </div>
      <div v-if="mode === 'edit'" class="text-red-400 mb-4">
        WARNING: Editing this CCR unit also changes its value for all other associated dives.
      </div>

      <!-- Select mode -->
      <div v-if="mode === 'select'" class="space-y-3 mb-4">
        <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">
          Loading CCR units...
        </p>
        <template v-else>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium shrink-0">CCR Unit:</label>
            <select
              class="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              :value="selectedCcrUnitId || ''"
              @change="onSelectCcrUnit"
            >
              <option value="" disabled>Select a CCR unit</option>
              <option v-for="u in ccrUnits" :key="u.id" :value="u.id">
                {{ u.name
                }}<span v-if="u.notes" class="text-gray-600 dark:text-gray-400">
                  — {{ formatNotesPreview(u.notes) }}</span
                >
              </option>
            </select>
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="loadCcrUnits"
            >
              Refresh
            </button>
          </div>
        </template>
      </div>

      <!-- Create/Edit mode -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium mb-1">Name *</label>
          <CcrUnitNameInput v-model="form.name" />
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
        <div class="md:col-span-2">
          <StyledCheckbox
            v-model="form.isPublic"
            title="When public, other divers can find your username by searching for this unit's name. Only your user id and username are ever shown — never contact details."
          >
            <span class="text-sm">Make this unit public (visible to other divers via search)</span>
          </StyledCheckbox>
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
          :disabled="
            saving ||
            (mode === 'select' && !selectedCcrUnitId) ||
            (mode !== 'select' && !form.name.trim())
          "
          :class="[
            'px-4 py-2 rounded text-white transition-colors',
            saving ||
            (mode === 'select' && !selectedCcrUnitId) ||
            (mode !== 'select' && !form.name.trim())
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700',
          ]"
          @click="saveCcrUnit"
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useApi } from '@/composables/useApi'
import CcrUnitNameInput from '@/components/dive/edit/CcrUnitNameInput.vue'
import StyledCheckbox from '@/components/ui/StyledCheckbox.vue'
import type { CcrUnit, PagedResult } from '@/lib/types/dive'

interface Props {
  currentCcrUnit?: CcrUnit | null
}

interface Emits {
  (e: 'ccr-unit-selected', ccrUnit: CcrUnit): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getWithToken, postWithToken, putWithToken } = useApi()

const firstButtonRef = ref<HTMLButtonElement | null>(null)

const mode = ref<'select' | 'create' | 'edit'>('select')
const ccrUnits = ref<CcrUnit[]>([])
const loading = ref(false)
const saving = ref(false)
const selectedCcrUnitId = ref<number | null>(props.currentCcrUnit?.id ?? null)

const form = ref<{ id: number | null; name: string; notes: string; isPublic: boolean }>({
  id: null,
  name: '',
  notes: '',
  isPublic: false,
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
  let acc = firstThree
  let idx = 3
  while (acc.length < 20 && idx < words.length) {
    acc += ' ' + words[idx]
    idx++
  }
  return acc.length > text.length ? text : acc
}

const loadCcrUnits = async () => {
  loading.value = true
  try {
    const res = await getWithToken<PagedResult<CcrUnit>>(
      '/v1/dives/configuration/ccrUnit?page=0&size=100',
    )
    ccrUnits.value = res.data.result ?? []
  } catch (err) {
    console.error('Failed to load CCR units:', err)
  } finally {
    loading.value = false
  }
}

const startCreateCcrUnit = () => {
  mode.value = 'create'
  form.value = { id: null, name: '', notes: '', isPublic: false }
}

const startEditCcrUnit = () => {
  if (!selectedCcrUnitId.value) return
  const existing = ccrUnits.value.find((u) => u.id === selectedCcrUnitId.value)
  if (!existing) return
  mode.value = 'edit'
  form.value = {
    id: existing.id ?? null,
    name: existing.name,
    notes: existing.notes ?? '',
    isPublic: existing.isPublic ?? false,
  }
}

const onSelectCcrUnit = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  const id = Number(val)
  selectedCcrUnitId.value = Number.isNaN(id) ? null : id
}

const saveCcrUnit = async () => {
  if (mode.value === 'select') {
    if (!selectedCcrUnitId.value) return
    const unit = ccrUnits.value.find((u) => u.id === selectedCcrUnitId.value)
    if (unit) {
      emit('ccr-unit-selected', unit)
    }
    return
  }

  if (!form.value.name.trim()) return

  saving.value = true
  try {
    if (mode.value === 'create') {
      const res = await postWithToken<CcrUnit>('/v1/dives/configuration/ccrUnit', {
        name: form.value.name,
        notes: form.value.notes,
        isPublic: form.value.isPublic,
      })
      await loadCcrUnits()
      emit('ccr-unit-selected', res.data)
    } else if (mode.value === 'edit') {
      const res = await putWithToken<CcrUnit>(
        `/v1/dives/configuration/ccrUnit/${form.value.id}`,
        form.value,
      )
      await loadCcrUnits()
      emit('ccr-unit-selected', res.data)
    }
  } catch (err) {
    console.error('Failed to save CCR unit:', err)
  } finally {
    saving.value = false
  }
}

const close = () => {
  emit('close')
}

// Load CCR units when modal opens
loadCcrUnits()

const handleKeyDown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    saveCcrUnit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, true)
  firstButtonRef.value?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
})
</script>
