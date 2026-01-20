<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <h3 class="text-lg font-semibold">My Dive Computers</h3>
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
          class="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors"
          @click="showCleanupConfirmation = true"
          :disabled="cleaning"
        >
          {{ cleaning ? 'Cleaning...' : 'Cleanup' }}
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          @click="loadDiveComputers"
          :disabled="loading"
        >
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">Loading dive computers...</p>
    <p v-else-if="diveComputers.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
      No dive computers found. Create one to get started.
    </p>

    <ItemCardGrid v-else>
      <ItemCard
        v-for="computer in diveComputers"
        :key="computer.id"
        :title="computer.manufacturer.name"
        @view-dives="viewDivesForComputer(computer.id)"
        @edit="editDiveComputer(computer)"
      >
        <p class="text-xs text-gray-600 dark:text-gray-400">
          Serial: {{ computer.serialNumber || 'N/A' }}
        </p>
        <p v-if="computer.customIdentifier" class="text-xs text-gray-600 dark:text-gray-400">
          Name: {{ computer.customIdentifier }}
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
          {{ modalMode === 'create' ? 'Create Dive Computer' : 'Edit Dive Computer' }}
        </h4>

        <div class="grid gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-1">Manufacturer *</label>
            <select
              :class="[
                'w-full p-2 border rounded',
                modalMode === 'edit'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'dark:bg-gray-700 dark:text-white dark:border-gray-600',
              ]"
              v-model="manufacturerId"
              :disabled="modalMode === 'edit'"
            >
              <option :value="null" disabled>Select manufacturer</option>
              <option
                v-for="manufacturer in manufacturers"
                :value="manufacturer.id"
                :key="manufacturer.id"
              >
                {{ manufacturer.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Serial Number *</label>
            <input
              type="text"
              :class="[
                'w-full p-2 border rounded',
                modalMode === 'edit'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'dark:bg-gray-700 dark:text-white dark:border-gray-600',
              ]"
              v-model="serialNumber"
              placeholder="Enter serial number"
              :disabled="modalMode === 'edit'"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              {{ modalMode === 'edit' ? 'Name' : 'Custom Identifier' }}
            </label>
            <input
              type="text"
              class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              v-model="customIdentifier"
              placeholder="Optional custom name or ID"
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
            :disabled="saving || !isFormValid"
            :class="[
              'px-4 py-2 rounded text-white transition-colors',
              saving || !isFormValid
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700',
            ]"
            @click="saveDiveComputer"
          >
            {{ saving ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cleanup Confirmation Modal -->
    <DeletionConfirmation
      v-model="showCleanupConfirmation"
      title="Cleanup Unused Dive Computers"
      message="Are you sure you want to delete all dive computers that don't have any associated dives? This action cannot be undone."
      confirm-text="Cleanup"
      :loading="cleaning"
      @confirm="cleanupUnusedComputers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import ItemCard from '@/components/ItemCard.vue'
import ItemCardGrid from '@/components/ItemCardGrid.vue'
import DeletionConfirmation from '@/components/DeletionConfirmation.vue'
import type { DiveComputer, DiveComputerManufacturer, PagedResult } from '@/lib/types/dive'

interface Props {
  userId: number
}

defineProps<Props>()

const { getWithToken, postWithToken, putWithToken, deleteWithToken } = useApi()
const router = useRouter()

const diveComputers = ref<DiveComputer[]>([])
const manufacturers = ref<DiveComputerManufacturer[]>([])
const loading = ref(false)
const cleaning = ref(false)
const showCleanupConfirmation = ref(false)

const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const saving = ref(false)
const id = ref<number | null>(null)
const manufacturerId = ref<number | null>(null)
const serialNumber = ref<string>('')
const customIdentifier = ref<string>('')

const isFormValid = computed(() => {
  return manufacturerId.value !== null && serialNumber.value.trim() !== ''
})

const loadDiveComputers = async () => {
  loading.value = true
  try {
    const res = await getWithToken<PagedResult<DiveComputer>>('/v1/computers?page=0')
    diveComputers.value = res.data.result ?? []
  } catch (err) {
    console.error('Failed to load dive computers:', err)
  } finally {
    loading.value = false
  }
}

const loadManufacturers = async () => {
  try {
    const res = await getWithToken<PagedResult<DiveComputerManufacturer>>(
      '/v1/computers/manufacturers?page=0&size=100',
    )
    manufacturers.value = res.data.result ?? []
  } catch (err) {
    console.error('Failed to load manufacturers:', err)
  }
}

const resetValue = (computer?: DiveComputer) => {
  id.value = computer?.id ?? null
  manufacturerId.value = computer?.manufacturer.id ?? null
  serialNumber.value = computer?.serialNumber ?? ''
  customIdentifier.value = computer?.customIdentifier ?? ''
}

const openCreateModal = () => {
  modalMode.value = 'create'
  resetValue()
  showModal.value = true
}

const editDiveComputer = (computer: DiveComputer) => {
  modalMode.value = 'edit'
  resetValue(computer)
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const viewDivesForComputer = (computerId: number) => {
  router.push({ name: 'DiveList', query: { computerId: computerId.toString() } })
}
const cleanupUnusedComputers = async () => {
  cleaning.value = true
  try {
    const res = await deleteWithToken<{ deletedCount: number }>('/v1/computers/unused')
    const count = res.data.deletedCount ?? 0

    showCleanupConfirmation.value = false

    if (count > 0) {
      toast.success(`Deleted ${count} unused dive computer${count === 1 ? '' : 's'}`)
      await loadDiveComputers()
    } else {
      toast.info('No unused dive computers found')
    }
  } catch (err) {
    console.error('Failed to cleanup unused dive computers:', err)
    toast.error('Failed to cleanup unused dive computers')
  } finally {
    cleaning.value = false
  }
}

const saveDiveComputer = async () => {
  if (!isFormValid.value) return

  saving.value = true
  try {
    if (modalMode.value === 'create') {
      await postWithToken('/v1/computers', {
        manufacturerId: manufacturerId.value,
        serialNumber: serialNumber.value,
        customIdentifier: customIdentifier.value,
      })
    } else {
      if (!id.value) {
        toast.error(`Cannot update this computer, please reload the page.`)
      }
      await putWithToken(`/v1/computers/${id.value}`, {
        customIdentifier: customIdentifier.value,
      })
    }
    closeModal()
    await loadDiveComputers()
  } catch (err) {
    console.error('Failed to save dive computer:', err)
    toast.error(`Failed to save the computer`)
  } finally {
    saving.value = false
  }
}

// Load data on mount
onMounted(async () => {
  await loadManufacturers()
  await loadDiveComputers()
  window.addEventListener('keydown', handleKeyDown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
})

// Keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
  if (!showModal.value) return

  // Ctrl+Enter to save
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    e.stopPropagation()
    saveDiveComputer()
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
</script>
