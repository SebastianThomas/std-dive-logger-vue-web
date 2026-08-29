<template>
  <div class="relative w-full h-full">
    <l-map ref="mapRef" :zoom="initialZoom" :center="initialCenter" :use-global-leaflet="false">
      <l-tile-layer :url="tiles.url" :attribution="tiles.attribution" />
      <l-marker
        v-for="site in sites"
        :key="site.id ?? site.name"
        :lat-lng="[site.latitude, site.longitude]"
        :icon="defaultIcon"
      >
        <l-popup>
          <div class="text-sm min-w-[140px]">
            <p class="font-semibold mb-2">{{ site.name }}</p>
            <button
              type="button"
              class="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              @click="$emit('select', site)"
            >
              Select this site
            </button>
          </div>
        </l-popup>
      </l-marker>
    </l-map>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import { latLngBounds } from 'leaflet'
import { useThemeStore } from '@/stores/theme'
import { defaultIcon } from '@/lib/map/leafletIcon'
import { mapTileLayer } from '@/lib/globals/mapTiles'
import type { DiveSite } from '@/lib/types/dive'
import 'leaflet/dist/leaflet.css'

interface Props {
  sites: DiveSite[]
}

const props = defineProps<Props>()

defineEmits<{
  select: [site: DiveSite]
}>()

const themeStore = useThemeStore()
const mapRef = ref<InstanceType<typeof LMap> | null>(null)

const initialCenter = computed<[number, number]>(() => {
  const first = props.sites[0]
  return first ? [first.latitude, first.longitude] : [46, 8]
})
const initialZoom = computed(() => (props.sites.length > 1 ? 5 : 12))

const tiles = computed(() => mapTileLayer(themeStore.theme))

const fitToSites = () => {
  if (props.sites.length < 2) return
  const bounds = latLngBounds(props.sites.map((s) => [s.latitude, s.longitude] as [number, number]))
  nextTick(() => {
    mapRef.value?.leafletObject?.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
  })
}

// props.sites is reassigned wholesale on every new search (never mutated in place, see
// DiveSiteSearch.vue's `results.value = ...` assignments) - a reference-only check is enough,
// same reasoning as DiveGraph.vue's props.profiles watch.
watch(() => props.sites, fitToSites, { immediate: true })
</script>

<style scoped>
:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}

:deep(.leaflet-popup-content-wrapper) {
  background-color: var(--card-bg);
  color: var(--foreground);
  border: 1px solid rgba(209, 213, 219, 0.25);
}

:deep(.leaflet-popup-tip) {
  background-color: var(--card-bg);
  border: 1px solid rgba(209, 213, 219, 0.25);
}
</style>
