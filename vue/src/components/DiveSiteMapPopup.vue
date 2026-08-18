<template>
  <div class="popup-container" :class="{ compact }">
    <h3 class="font-bold">{{ site.name }}</h3>
    <a
      :href="mapsUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="maps-link"
      title="Open in Google Maps"
    >
      <i class="fa-solid fa-map-location-dot"></i>
      Google Maps
    </a>

    <!-- Compact: a single fixed-height link to the filtered dive list, not an inline (and
         potentially long) per-dive list - keeps the popup's total height predictable regardless
         of how many dives this site has, since a compact popup is only used where the surrounding
         map box is too short for an open-ended list to reliably fit (see DiveView). -->
    <router-link
      v-if="compact"
      :to="{ name: 'DiveList', query: { diveSiteId: String(site.id) } }"
      class="compact-dives-link"
    >
      View dives at this site →
    </router-link>

    <div v-else class="dives-scroll-container">
      <p v-if="loading" class="text-sm text-gray-500">Loading dives...</p>
      <p v-else-if="loadError" class="text-sm text-red-600">Failed to load dives.</p>
      <ul v-else class="space-y-1">
        <li v-for="info in sortedDiveInfo" :key="info.id" class="flex items-center justify-between">
          <span class="dive-name-truncate">#{{ info.number }}: {{ info.customIdentifier }}</span>
          <router-link
            :to="{ name: 'DiveView', params: { diveId: info.id } }"
            class="ml-2 px-2 py-1 bg-blue-600 text-white! rounded text-xs hover:bg-blue-700 inline-block"
          >
            View Dive
          </router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiveSite } from '@/lib/types/dive'
import { useApi } from '@/composables/useApi'
import { googleMapsUrl } from '@/lib/map/googleMapsUrl'
import { computed, onMounted, ref } from 'vue'

interface DiveInfo {
  id: number
  number: number
  customIdentifier: string
}

interface Props {
  site: DiveSite
  // Absent when the site list omitted it (see SiteWithDives) - fetched on demand below in that
  // case, so this popup still works whether the parent inlined it or not.
  diveInfo?: DiveInfo[]
  /** Renders a fixed-height summary instead of the full per-dive list - see the template's own
   * comment on the compact-dives-link for why. */
  compact?: boolean
}

const props = defineProps<Props>()
const { getWithToken } = useApi()

const mapsUrl = computed(() => googleMapsUrl(props.site.latitude, props.site.longitude))

const fetchedDiveInfo = ref<DiveInfo[] | null>(null)
const loading = ref(false)
const loadError = ref(false)

onMounted(async () => {
  if (props.diveInfo || props.compact) return
  loading.value = true
  try {
    const res = await getWithToken<DiveInfo[]>(`/v1/dives/sites/${props.site.id}/dives`)
    fetchedDiveInfo.value = res.data
  } catch (err) {
    console.error('Failed to fetch dives at site', err)
    loadError.value = true
  } finally {
    loading.value = false
  }
})

const sortedDiveInfo = computed(() => {
  const info = props.diveInfo ?? fetchedDiveInfo.value ?? []
  return [...info].sort((a, b) => a.number - b.number)
})
</script>

<style scoped>
.popup-container {
  display: flex;
  flex-direction: column;
  max-height: 150px;
  min-width: 200px;
}

.popup-container.compact {
  max-height: none;
  min-width: 160px;
}

.maps-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 4px;
  font-size: 0.75rem;
  color: #2563eb;
}

.maps-link:hover {
  text-decoration: underline;
}

.compact-dives-link {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #2563eb;
}

.compact-dives-link:hover {
  text-decoration: underline;
}

.dives-scroll-container {
  overflow-y: auto;
  margin-top: 8px;
}

.dive-name-truncate {
  display: inline-block;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.space-y-1 > * + * {
  margin-top: 0.25rem;
}
</style>
