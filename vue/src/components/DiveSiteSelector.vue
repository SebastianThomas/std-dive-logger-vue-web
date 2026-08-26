<template>
  <div
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
      >
        <h2 class="text-lg font-semibold">
          {{ selectedSite ? 'Confirm Dive Site' : 'Select or Create Dive Site' }}
        </h2>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          @click="$emit('close')"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-4 space-y-4">
        <!-- Selection Mode -->
        <div v-if="!selectedSite" class="space-y-4">
          <div
            v-if="initialName"
            class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-900 dark:text-amber-100"
          >
            The dive site "<strong>{{ initialName }}</strong
            >" from your import couldn't be matched automatically. Search for it below, or create
            it as a new site.
          </div>

          <!-- Search existing sites -->
          <div>
            <label class="block text-sm font-medium mb-2">Search Existing Dive Sites</label>
            <DiveSiteSearch
              placeholder="Search by name..."
              :initial-value="initialName ?? ''"
              @selected="onSiteSelected"
            />
          </div>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-gray-800 text-gray-500">Or</span>
            </div>
          </div>

          <!-- Create new site -->
          <div>
            <label class="block text-sm font-medium mb-2">Create New Dive Site</label>
            <input
              ref="newSiteNameInput"
              v-model="newSiteName"
              type="text"
              placeholder="Enter dive site name..."
              class="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 mb-3"
              @keydown.enter="proceedToMap"
            />
            <button
              type="button"
              @click="proceedToMap"
              :disabled="!newSiteName.trim()"
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Create on Map
            </button>
          </div>
        </div>

        <!-- Confirmation Mode - Map and details -->
        <div v-else class="space-y-4">
          <div
            class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3"
          >
            <p class="text-sm text-blue-900 dark:text-blue-100">
              <strong>Selected:</strong> {{ selectedSite.name }}
            </p>
            <p class="text-xs text-blue-800 dark:text-blue-200 mt-1">
              Latitude: {{ selectedSite.latitude.toFixed(4) }}, Longitude:
              {{ selectedSite.longitude.toFixed(4) }}
            </p>
          </div>

          <!-- Map display for existing site -->
          <div
            v-if="!isCreatingNew"
            class="bg-gray-100 dark:bg-gray-700 rounded-lg h-64 overflow-hidden"
          >
            <DiveSiteMap
              :sites="[
                {
                  site: selectedSite,
                  diveCount: 0,
                  diveInfo: [],
                },
              ]"
              :center="[selectedSite.latitude, selectedSite.longitude]"
              :zoom="13"
            />
          </div>

          <!-- Map picker for new site -->
          <div v-else class="space-y-2">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Click on the map below to set this site's location.
            </p>
            <div class="h-64">
              <DiveSiteMapPicker @select="onMapCoordSelect" />
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700"
      >
        <button
          v-if="selectedSite"
          type="button"
          class="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
          @click="selectedSite = null"
        >
          Back
        </button>
        <div v-else></div>
        <div class="flex gap-2">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            v-if="selectedSite && (!isCreatingNew || (mapLat !== null && mapLon !== null))"
            type="button"
            :disabled="loading"
            @click="confirmSelection"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {{ loading ? 'Creating...' : 'Confirm' }}
          </button>
          <button
            v-if="selectedSite && isCreatingNew && (mapLat === null || mapLon === null)"
            type="button"
            disabled
            class="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
          >
            Select Location
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import DiveSiteSearch from '@/components/DiveSiteSearch.vue'
import DiveSiteMap from '@/components/DiveSiteMap.vue'
import DiveSiteMapPicker from '@/components/DiveSiteMapPicker.vue'
import { toast } from 'vue-sonner'
import type { DiveSite } from '@/lib/types/dive'
import type { MapCoords } from '@/components/DiveSiteMapPicker.vue'

interface Props {
  /** Pre-fills the search box and "create new" name when the caller already knows which
   * dive site name couldn't be resolved (e.g. an import that referenced a missing site, or a
   * search the diver already typed that came up empty). */
  initialName?: string
}

const props = defineProps<Props>()

const newSiteName = ref(props.initialName ?? '')
const newSiteNameInput = ref<HTMLInputElement | null>(null)

// Focused on open so a diver who already typed a name (search came up empty) can go straight to
// "Create on Map" without an extra click - most useful precisely when initialName is prefilled,
// but harmless to always do since this is the modal's own natural starting field either way.
onMounted(() => {
  nextTick(() => newSiteNameInput.value?.focus())
})
const selectedSite = ref<DiveSite | null>(null)
const isCreatingNew = ref(false)
const mapLat = ref<number | null>(null)
const mapLon = ref<number | null>(null)
const loading = ref(false)

const { postWithToken } = useApi()

const emit = defineEmits<{
  'site-selected': [site: DiveSite]
  'site-created': [site: DiveSite]
  close: []
}>()

const onSiteSelected = (site: DiveSite) => {
  selectedSite.value = site
  isCreatingNew.value = false
  mapLat.value = null
  mapLon.value = null
}

const proceedToMap = () => {
  if (!newSiteName.value.trim()) return
  selectedSite.value = {
    id: 0, // temporary id for new site
    name: newSiteName.value,
    latitude: 0,
    longitude: 0,
  }
  isCreatingNew.value = true
  mapLat.value = null
  mapLon.value = null
}

const onMapCoordSelect = (coords: MapCoords) => {
  if (selectedSite.value) {
    selectedSite.value.latitude = coords.lat
    selectedSite.value.longitude = coords.lon
  }
  mapLat.value = coords.lat
  mapLon.value = coords.lon
}

const confirmSelection = async () => {
  if (!selectedSite.value) return

  if (isCreatingNew.value && (mapLat.value == null || mapLon.value == null)) {
    toast.error(`To create the dive site, please select a location on the map.`)
    return
  }

  if (isCreatingNew.value) {
    const body = {
      name: selectedSite.value.name,
      lat: mapLat.value,
      lon: mapLon.value,
    }

    loading.value = true
    try {
      const res = await postWithToken<DiveSite>('/v1/dives/sites', body)
      const data = res.data
      toast.success(`Dive site "${data.name}" created successfully`)
      emit('site-created', data)
    } catch (err) {
      console.error('Failed to create dive site:', err)
      toast.error(`Failed to create dive site: ${extractErrorDetail(err)}`)
    } finally {
      loading.value = false
    }
  } else {
    emit('site-selected', selectedSite.value)
  }
}
</script>
