<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">My Dive Computers</h3>
      <div class="flex gap-2">
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
          @click="loadDiveComputers"
          :disabled="loading"
        >
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-sm text-gray-600 dark:text-gray-400">
      Loading dive computers...
    </p>
    <p v-else-if="diveComputers.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
      No dive computers found. Create one to get started.
    </p>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="computer in diveComputers"
        :key="computer.id"
        class="border dark:border-gray-600 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-700/50 transition-shadow"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <h4 class="font-semibold">{{ computer.manufacturer.name }}</h4>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              Serial: {{ computer.serialNumber || 'N/A' }}
            </p>
            <p
              v-if="computer.customIdentifier"
              class="text-xs text-gray-600 dark:text-gray-400 mt-1"
            >
              Name: {{ computer.customIdentifier }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
              @click="viewDivesForComputer(computer.id)"
            >
              View Dives
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              @click="editDiveComputer(computer)"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>

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
                  : 'dark:bg-gray-700 dark:text-white dark:border-gray-600'
              ]"
              v-model="form.manufacturerId"
              :disabled="modalMode === 'edit'"
            >
              <option :value="null" disabled>Select manufacturer</option>
              <option v-for="manufacturer in manufacturers" :value="manufacturer.id" :key="manufacturer.id">
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
                  : 'dark:bg-gray-700 dark:text-white dark:border-gray-600'
              ]"
              v-model="form.serialNumber"
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
              v-model="form.customIdentifier"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import type { DiveComputer, DiveComputerManufacturer, PagedResult } from '@/lib/types/dive'

interface Props {
  userId: number
}

defineProps<Props>()

const { getWithToken, postWithToken, putWithToken } = useApi()
const router = useRouter()

const diveComputers = ref<DiveComputer[]>([])
const manufacturers = ref<DiveComputerManufacturer[]>([])
const loading = ref(false)

const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const saving = ref(false)
const form = ref<{
  id: number | null
  manufacturerId: number | null
  serialNumber: string
  customIdentifier: string
}>({
  id: null,
  manufacturerId: null,
  serialNumber: '',
  customIdentifier: '',
})

const isFormValid = computed(() => {
  return form.value.manufacturerId !== null && form.value.serialNumber.trim() !== ''
})

const loadDiveComputers = async () => {
  loading.value = true
  try {
    const res = await getWithToken<PagedResult<DiveComputer>>(
      '/v1/computers?page=0',
    )
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

const openCreateModal = () => {
  modalMode.value = 'create'
  form.value = {
    id: null,
    manufacturerId: null,
    serialNumber: '',
    customIdentifier: '',
  }
  showModal.value = true
}

const editDiveComputer = (computer: DiveComputer) => {
  modalMode.value = 'edit'
  form.value = {
    id: computer.id ?? null,
    manufacturerId: computer.manufacturer.id ?? null,
    serialNumber: computer.serialNumber ?? '',
    customIdentifier: computer.customIdentifier ?? '',
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const viewDivesForComputer = (computerId: number) => {
  router.push({ name: 'DiveList', query: { computerId: computerId.toString() } })
}

const saveDiveComputer = async () => {
  if (!isFormValid.value) return

  saving.value = true
  try {
    if (modalMode.value === 'create') {
      await postWithToken('/v1/computers', {
        manufacturerId: form.value.manufacturerId,
        serialNumber: form.value.serialNumber,
        customIdentifier: form.value.customIdentifier,
      })
    } else {
      await putWithToken(`/v1/computers/${form.value.id}`, {
        manufacturerId: form.value.manufacturerId,
        serialNumber: form.value.serialNumber,
        customIdentifier: form.value.customIdentifier,
      })
    }
    closeModal()
    await loadDiveComputers()
  } catch (err) {
    console.error('Failed to save dive computer:', err)
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
