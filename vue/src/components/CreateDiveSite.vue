<template>
  <div>
    <button
      v-if="!hideTrigger"
      class="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700"
      @click="open = true"
    >
      Add Dive Site
    </button>

    <!-- Map Picker Modal -->
    <div v-if="open" class="fixed inset-0 flex items-center justify-center bg-black/40 p-4 z-50">
      <div
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl modal-height flex flex-col"
      >
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
        >
          <h2 v-if="siteName" class="text-lg font-semibold">
            Select location for "{{ siteName }}"
          </h2>
          <h2 v-else class="text-lg font-semibold">Create New Dive Site</h2>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            @click="closeModal"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Name Input (only shown if name is empty/null) -->
        <div
          v-if="!siteName"
          class="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700"
        >
          <div class="flex items-start gap-3">
            <div class="text-amber-600 dark:text-amber-400 text-xl leading-none mt-1">
              <i class="fas fa-info-circle"></i>
            </div>
            <div class="flex-1">
              <p class="text-sm text-amber-900 dark:text-amber-100 mb-3">
                Please provide a <strong>name</strong> for the dive site and select its
                <strong>location</strong> on the map below.
              </p>
              <div>
                <label
                  for="site-name-input"
                  class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                >
                  Site Name
                </label>
                <input
                  id="site-name-input"
                  v-model="siteNameInput"
                  type="text"
                  class="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Enter dive site name..."
                  @keydown.enter="confirmSelection"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-hidden">
          <DiveSiteMapPicker @select="onMapCoordSelect" />
        </div>
        <div
          class="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700"
        >
          <p v-if="status" class="text-red-600 text-sm">{{ status }}</p>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
              @click="clearSelection"
            >
              Clear
            </button>
            <button
              type="button"
              :disabled="!selectedCoords"
              class="px-4 py-2 rounded-lg"
              :class="
                selectedCoords
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              "
              @click="confirmSelection"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import DiveSiteMapPicker from '@/components/DiveSiteMapPicker.vue'
import { type DiveSite } from '@/lib/types/dive'
import type { MapCoords } from '@/components/DiveSiteMapPicker.vue'

interface Props {
  onCreated?: (data: DiveSite) => void
  autoOpen?: boolean
  initialName?: string
  hideTrigger?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoOpen: false,
  initialName: '',
  hideTrigger: false,
})

const emit = defineEmits<{
  created: [data: DiveSite]
  close: []
}>()

const { postWithToken } = useApi()
const open = ref(false)
const siteName = ref(props.initialName ?? '')
const siteNameInput = ref('')
const status = ref('')
const selectedCoords = ref<MapCoords | null>(null)

watch(
  () => props.initialName,
  (val) => {
    if (val) siteName.value = val
  },
  { immediate: true },
)

watch(
  () => props.autoOpen,
  (val) => {
    if (val) open.value = true
  },
  { immediate: true },
)

const closeModal = () => {
  open.value = false
  selectedCoords.value = null
  siteNameInput.value = ''
  emit('close')
}

const onMapCoordSelect = (coords: MapCoords) => {
  selectedCoords.value = coords
  status.value = ''
}

const clearSelection = () => {
  selectedCoords.value = null
  status.value = ''
}

const confirmSelection = async () => {
  console.log('Confirm Selection')
  status.value = ''

  // Use siteNameInput if siteName is empty
  const finalName = siteName.value || siteNameInput.value.trim()

  if (!finalName) {
    status.value = 'Site name is required.'
    return
  }

  if (!selectedCoords.value) {
    status.value = 'Location is required. Please select a location on the map.'
    return
  }

  try {
    const body = {
      name: finalName,
      lat: selectedCoords.value.lat,
      lon: selectedCoords.value.lon,
    }

    const res = await postWithToken<DiveSite>('/v1/dives/sites', body)
    const data = res.data

    toast.success(`Dive site "${finalName}" created successfully`)

    if (props.onCreated) {
      props.onCreated(data)
    }
    emit('created', data)

    closeModal()
  } catch (err) {
    console.error(err)
    status.value = 'Error: ' + (err as Error).message
  }
}
</script>

<style scoped>
.modal-height {
  height: 600px;
}
</style>
