<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="emit('close')"
  >
    <div class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md">
      <h2 class="text-xl font-bold mb-4">Bulk Actions</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {{ selectedCount }} dive(s) selected
      </p>

      <div class="space-y-3">
        <!-- Merge Dives -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            @click="toggleSection('merge')"
            class="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between"
          >
            <h3 class="font-semibold">Merge Dives</h3>
            <span class="text-gray-500">{{ expandedSection === 'merge' ? '▼' : '▶' }}</span>
          </button>
          <div v-if="expandedSection === 'merge'" class="px-4 pb-4 space-y-3">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Select exactly 2 dives to merge them into one.
            </p>
            <div v-if="selectedCount === 2" class="space-y-2">
              <p class="text-sm font-medium">Choose primary dive:</p>
              <div class="space-y-1">
                <label
                  v-for="dive in selectedDives"
                  :key="dive.id"
                  class="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
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
        </div>

        <!-- Bulk Configuration Updates -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            @click="toggleSection('config')"
            class="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between"
          >
            <h3 class="font-semibold">Update Configuration</h3>
            <span class="text-gray-500">{{ expandedSection === 'config' ? '▼' : '▶' }}</span>
          </button>
          <div v-if="expandedSection === 'config'" class="px-4 pb-4 space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Apply quick changes to the selected dives.
            </p>

            <div class="space-y-3">
            <div class="space-y-2">
              <label for="bulk-base" class="text-sm font-medium">Base Configuration</label>
              <div class="flex gap-2">
                <select
                  id="bulk-base"
                  v-model="selectedBaseConfiguration"
                  class="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                  <option value="">Select configuration</option>
                  <option
                    v-for="(label, key) in BASE_CONFIGURATION_LABELS"
                    :key="key"
                    :value="key"
                  >
                    {{ label }}
                  </option>
                </select>
                <button
                  :disabled="!canUpdateBase"
                  @click="handleBaseConfigurationUpdate"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {{ updatingBaseConfiguration ? 'Updating...' : 'Update' }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label for="bulk-suit" class="text-sm font-medium">Suit</label>
              <div class="flex gap-2">
                <select
                  id="bulk-suit"
                  v-model.number="selectedSuitId"
                  class="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                  <option value="">Select suit</option>
                  <option v-for="suit in suits" :key="suit.id" :value="suit.id">
                    {{ formatSuitLabel(suit) }}
                  </option>
                </select>
                <button
                  :disabled="!canUpdateSuit"
                  @click="handleSuitUpdate"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {{ updatingSuit ? 'Updating...' : 'Update' }}
                </button>
              </div>
              <p v-if="suitsLoading" class="text-xs text-gray-500">Loading suits...</p>
              <p v-else-if="!suits.length" class="text-xs text-gray-500">
                No suits found. Create one in your profile first.
              </p>
            </div>

            <div class="space-y-2">
              <label for="bulk-weight" class="text-sm font-medium">Weight (kg)</label>
              <div class="flex gap-2">
                <input
                  id="bulk-weight"
                  v-model.number="weightInput"
                  type="number"
                  step="0.5"
                  class="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Enter weight"
                />
                <button
                  :disabled="!canUpdateWeight"
                  @click="handleWeightUpdate"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {{ updatingWeight ? 'Updating...' : 'Update' }}
                </button>
              </div>
            </div>
          </div>          </div>        </div>

        <!-- Bulk Delete -->
        <div class="border border-red-300 dark:border-red-700 rounded-lg overflow-hidden">
          <button
            @click="toggleSection('delete')"
            class="w-full p-4 text-left hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors flex items-center justify-between bg-red-50 dark:bg-red-950"
          >
            <h3 class="font-semibold text-red-800 dark:text-red-200">Delete Selected</h3>
            <span class="text-red-600 dark:text-red-400">{{
              expandedSection === 'delete' ? '▼' : '▶'
            }}</span>
          </button>
          <div v-if="expandedSection === 'delete'" class="px-4 pb-4 bg-red-50 dark:bg-red-950">
            <p class="text-sm text-gray-700 dark:text-gray-200 mb-3">
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
      </div>

      <div class="flex justify-end mt-6">
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeletionConfirmation
      v-model="showDeleteConfirm"
      title="Confirm Deletion"
      :message="`Are you sure you want to delete ${selectedCount} dive(s)? This action cannot be undone.`"
      @confirm="handleBulkDelete"
    />

    <!-- Second Delete Confirmation Modal -->
    <div
      v-if="showSecondDeleteConfirm"
      class="fixed inset-0 z-70 flex items-center justify-center bg-black/70"
      @click.self="showSecondDeleteConfirm = false"
    >
      <div
        class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-sm border-2 border-red-500"
      >
        <h3 class="text-lg font-bold text-red-700 mb-3">⚠️ Final Confirmation</h3>
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-4">
          This is your last chance to cancel. You are about to permanently delete
          {{ selectedCount }} dive(s).
        </p>
        <p class="text-sm font-semibold text-red-600 mb-6">This action is irreversible!</p>
        <div class="flex gap-3 justify-end">
          <button
            @click="showSecondDeleteConfirm = false"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            @click="confirmBulkDelete"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
          >
            Yes, Delete Permanently
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import DeletionConfirmation from '@/components/DeletionConfirmation.vue'
import type { DiveWithoutProfiles, PagedResult, Suit, BaseConfiguration, DiveConfiguration } from '@/lib/types/dive'
import { BASE_CONFIGURATION_LABELS, SUIT_TYPE_LABELS } from '@/lib/types/dive'

const props = defineProps<{
  open: boolean
  selectedDives: DiveWithoutProfiles[]
}>()

const emit = defineEmits<{
  close: []
  refresh: []
}>()

const { deleteWithToken, postWithToken, putWithToken, getWithToken } = useApi()

const primaryDiveId = ref<number | null>(null)
const showDeleteConfirm = ref(false)
const showSecondDeleteConfirm = ref(false)
const selectedBaseConfiguration = ref<BaseConfiguration | ''>('')
const selectedSuitId = ref<number | null>(null)
const weightInput = ref<number | null>(null)
const suits = ref<Suit[]>([])
const suitsLoading = ref(false)
const updatingBaseConfiguration = ref(false)
const updatingSuit = ref(false)
const updatingWeight = ref(false)
const expandedSection = ref<'merge' | 'config' | 'delete' | null>(null)

const selectedCount = computed(() => props.selectedDives.length)
const selectedIds = computed(() => props.selectedDives.map((d) => d.id))
const hasValidWeight = computed(
  () => weightInput.value !== null && !Number.isNaN(weightInput.value as number),
)
const canUpdateBase = computed(
  () => Boolean(selectedBaseConfiguration.value) && selectedIds.value.length > 0 && !updatingBaseConfiguration.value,
)
const canUpdateSuit = computed(
  () =>
    Boolean(selectedSuitId.value) &&
    selectedIds.value.length > 0 &&
    !updatingSuit.value &&
    !suitsLoading.value,
)
const canUpdateWeight = computed(
  () => hasValidWeight.value && selectedIds.value.length > 0 && !updatingWeight.value,
)

const resetForm = () => {
  selectedBaseConfiguration.value = ''
  selectedSuitId.value = null
  weightInput.value = null
  expandedSection.value = null
}

const toggleSection = (section: 'merge' | 'config' | 'delete') => {
  expandedSection.value = expandedSection.value === section ? null : section
}

const loadSuits = async () => {
  suitsLoading.value = true
  try {
    const res = await getWithToken<PagedResult<Suit>>('/v1/dives/configuration/suit?page=0&size=100')
    suits.value = res.data.result ?? []
  } catch (err) {
    console.error('Failed to load suits', err)
    toast.error('Failed to load suits')
  } finally {
    suitsLoading.value = false
  }
}

// Handle Escape key to close modal
const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (showSecondDeleteConfirm.value) {
      showSecondDeleteConfirm.value = false
    } else if (showDeleteConfirm.value) {
      showDeleteConfirm.value = false
    } else if (props.open) {
      emit('close')
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      resetForm()
      if (!suits.value.length) {
        loadSuits()
      }
      await prefillCommonValues()
    }
  },
)

const prefillCommonValues = async () => {
  if (selectedIds.value.length === 0) return

  const allSameOrNull = <T>(values: Array<T | undefined | null>): T | null => {
    if (!values.length) return null
    const first = values[0]
    if (first === undefined || first === null) return null
    return values.every((v) => v === first) ? first : null
  }

  try {
    // Fetch full dive data for all selected dives
    const divePromises = selectedIds.value.map((id) =>
      getWithToken<{ id: number; configuration: DiveConfiguration }>(`/v1/dives/${id}`),
    )
    const diveResponses = await Promise.all(divePromises)
    const dives = diveResponses.map((r) => r.data)

    const sameBase = allSameOrNull<BaseConfiguration>(dives.map((d) => d.configuration?.base))
    if (sameBase) {
      selectedBaseConfiguration.value = sameBase
    }

    const sameSuitId = allSameOrNull<number>(dives.map((d) => d.configuration?.suit?.id))
    if (sameSuitId !== null) {
      selectedSuitId.value = sameSuitId
    }

    const sameWeight = allSameOrNull<number>(dives.map((d) => d.configuration?.weight))
    if (sameWeight !== null) {
      weightInput.value = sameWeight
    }
  } catch (err) {
    // Silently fail - prefilling is optional
    console.error('Failed to prefill common values', err)
  }
}

const formatSuitLabel = (suit: Suit) => {
  const parts = [SUIT_TYPE_LABELS[suit.type]]
  if (suit.thickness) {
    parts.push(`${suit.thickness}mm`)
  }
  if (suit.notes) {
    parts.push(suit.notes)
  }
  return parts.join(' - ')
}

const handleBaseConfigurationUpdate = async () => {
  if (!selectedBaseConfiguration.value) {
    toast.error('Select a base configuration')
    return
  }
  if (!selectedIds.value.length) {
    toast.error('No dives selected')
    return
  }
  updatingBaseConfiguration.value = true
  try {
    await putWithToken('/v1/dives/base-configuration', {
      newValue: selectedBaseConfiguration.value,
      diveIds: selectedIds.value,
    })
    toast.success('Base configuration updated')
    emit('refresh')
  } catch (err) {
    console.error('Failed to update base configuration', err)
    toast.error('Failed to update base configuration')
  } finally {
    updatingBaseConfiguration.value = false
  }
}

const handleSuitUpdate = async () => {
  if (!selectedSuitId.value) {
    toast.error('Select a suit')
    return
  }
  if (!selectedIds.value.length) {
    toast.error('No dives selected')
    return
  }
  updatingSuit.value = true
  try {
    await putWithToken('/v1/dives/suit', {
      newValue: selectedSuitId.value,
      diveIds: selectedIds.value,
    })
    toast.success('Suit updated')
    emit('refresh')
  } catch (err) {
    console.error('Failed to update suit', err)
    toast.error('Failed to update suit')
  } finally {
    updatingSuit.value = false
  }
}

const handleWeightUpdate = async () => {
  if (!hasValidWeight.value || weightInput.value === null) {
    toast.error('Enter a valid weight')
    return
  }
  if (!selectedIds.value.length) {
    toast.error('No dives selected')
    return
  }
  updatingWeight.value = true
  try {
    await putWithToken('/v1/dives/weight', {
      newValue: weightInput.value,
      diveIds: selectedIds.value,
    })
    toast.success('Weight updated')
    emit('refresh')
  } catch (err) {
    console.error('Failed to update weight', err)
    toast.error('Failed to update weight')
  } finally {
    updatingWeight.value = false
  }
}

const handleMerge = async () => {
  if (!primaryDiveId.value || selectedCount.value !== 2) {
    toast.error('Please select exactly 2 dives and choose a primary dive')
    return
  }

  const secondaryId = props.selectedDives.find((d) => d.id !== primaryDiveId.value)?.id
  if (!secondaryId) return

  try {
    await postWithToken(
      `/v1/dives/${primaryDiveId.value}/profiles/merge?toAddDiveId=${secondaryId}&keepToAddDive=false`,
      {},
    )
    toast.success('Dives merged successfully')
    emit('refresh')
    emit('close')
  } catch (err) {
    console.error('Failed to merge dives', err)
    toast.error('Failed to merge dives')
  }
}

const handleBulkDelete = async () => {
  // Close first confirmation and show second confirmation
  showDeleteConfirm.value = false
  showSecondDeleteConfirm.value = true
}

const confirmBulkDelete = async () => {
  const ids = props.selectedDives.map((d) => d.id)

  try {
    await Promise.all(ids.map((id) => deleteWithToken(`/v1/dives/${id}`)))
    toast.success(`Successfully deleted ${ids.length} dive(s)`)
    showSecondDeleteConfirm.value = false
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
