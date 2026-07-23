<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <h3 class="text-lg font-semibold">My CCR Units</h3>
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
          @click="loadCcrUnits"
          :disabled="loading"
        >
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">Loading CCR units...</p>
    <p v-else-if="ccrUnits.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
      No CCR units found. Create one to get started.
    </p>

    <ItemCardGrid v-else>
      <ItemCard
        v-for="unit in ccrUnits"
        :key="unit.id"
        :title="unit.name"
        @view-dives="viewDivesForCcrUnit(unit.id)"
        @edit="editCcrUnit(unit)"
      >
        <p v-if="unit.notes" class="text-xs text-gray-600 dark:text-gray-400">
          {{ formatNotesPreview(unit.notes) }}
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
          {{ modalMode === 'create' ? 'Create CCR Unit' : 'Edit CCR Unit' }}
        </h4>

        <div class="grid gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name</label>
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
          <StyledCheckbox
            v-model="form.isPublic"
            title="When public, other divers can find your username by searching for this unit's name. Only your user id and username are ever shown — never contact details."
          >
            <span class="text-sm">Make this unit public (visible to other divers via search)</span>
          </StyledCheckbox>
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
            :disabled="saving || !form.name.trim()"
            :class="[
              'px-4 py-2 rounded text-white transition-colors',
              saving || !form.name.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700',
            ]"
            @click="saveCcrUnit"
          >
            {{ saving ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Find divers by unit -->
    <div class="border-t pt-4 mt-2 space-y-2">
      <h3 class="text-lg font-semibold">Find Divers by Unit</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Search for other divers who have made a CCR unit public. Only their username is shown —
        never contact details.
      </p>
      <div class="flex gap-2">
        <input
          v-model="diverSearchQuery"
          type="text"
          class="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
          placeholder="Search by unit name, e.g. rEvo"
          @input="searchDiversDebounced"
        />
      </div>
      <p v-if="diverSearchLoading" class="text-sm text-gray-600 dark:text-gray-400">
        Searching...
      </p>
      <p
        v-else-if="diverSearchQuery.trim() && diverSearchResults.length === 0"
        class="text-sm text-gray-600 dark:text-gray-400"
      >
        No divers found with a public unit matching "{{ diverSearchQuery.trim() }}".
      </p>
      <ul v-else-if="diverSearchResults.length" class="flex flex-wrap gap-2">
        <li
          v-for="diver in diverSearchResults"
          :key="diver.id"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-sm"
        >
          <span
            class="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-semibold"
          >
            {{ diver.name.charAt(0).toUpperCase() }}
          </span>
          {{ diver.name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import ItemCard from '@/components/ItemCard.vue'
import ItemCardGrid from '@/components/ItemCardGrid.vue'
import CcrUnitNameInput from '@/components/dive/edit/CcrUnitNameInput.vue'
import StyledCheckbox from '@/components/ui/StyledCheckbox.vue'
import debounce from '@/lib/utils/debounce'
import type { CcrUnit, PagedResult } from '@/lib/types/dive'
import type { User } from '@/lib/types/user'

interface Props {
  userId: number
}

defineProps<Props>()

const { getWithToken, postWithToken, putWithToken } = useApi()
const router = useRouter()

const ccrUnits = ref<CcrUnit[]>([])
const loading = ref(false)

const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const saving = ref(false)
const form = ref<{ id: number | null; name: string; notes: string; isPublic: boolean }>({
  id: null,
  name: '',
  notes: '',
  isPublic: false,
})

const diverSearchQuery = ref('')
const diverSearchLoading = ref(false)
const diverSearchResults = ref<User[]>([])

const searchDivers = async () => {
  const query = diverSearchQuery.value.trim()
  if (!query) {
    diverSearchResults.value = []
    return
  }
  diverSearchLoading.value = true
  try {
    const res = await getWithToken<User[]>(
      `/v1/dives/configuration/ccrUnit/users?query=${encodeURIComponent(query)}`,
    )
    diverSearchResults.value = res.data ?? []
  } catch (err) {
    console.error('Failed to search divers by CCR unit:', err)
    diverSearchResults.value = []
  } finally {
    diverSearchLoading.value = false
  }
}

const searchDiversDebounced = debounce(searchDivers, 300)

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

const openCreateModal = () => {
  modalMode.value = 'create'
  form.value = { id: null, name: '', notes: '', isPublic: false }
  showModal.value = true
}

const editCcrUnit = (unit: CcrUnit) => {
  modalMode.value = 'edit'
  form.value = {
    id: unit.id ?? null,
    name: unit.name,
    notes: unit.notes ?? '',
    isPublic: unit.isPublic ?? false,
  }
  showModal.value = true
}

const viewDivesForCcrUnit = (ccrUnitId: number) => {
  router.push({ name: 'DiveList', query: { ccrUnitId: ccrUnitId.toString() } })
}

const closeModal = () => {
  showModal.value = false
}

const saveCcrUnit = async () => {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    if (modalMode.value === 'create') {
      await postWithToken('/v1/dives/configuration/ccrUnit', {
        name: form.value.name,
        notes: form.value.notes,
        isPublic: form.value.isPublic,
      })
    } else {
      await putWithToken(`/v1/dives/configuration/ccrUnit/${form.value.id}`, {
        ...form.value,
      })
    }
    closeModal()
    await loadCcrUnits()
  } catch (err) {
    console.error('Failed to save CCR unit:', err)
  } finally {
    saving.value = false
  }
}

// Load CCR units on mount
loadCcrUnits()

// Keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
  if (!showModal.value) return

  // Ctrl+Enter to save
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    e.stopPropagation()
    saveCcrUnit()
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
