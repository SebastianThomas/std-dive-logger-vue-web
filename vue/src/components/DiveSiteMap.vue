<template>
  <div class="relative w-full h-full">
    <div ref="mapContainer" class="w-full h-full" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import L from 'leaflet'
import { usePersistentMapView } from '@/composables/mapViewState'
import { useThemeStore } from '@/stores/theme'
import type { SiteWithDives } from '@/lib/types/dive'
import 'leaflet/dist/leaflet.css'

interface Props {
  sites?: SiteWithDives[]
  center?: [number, number]
  zoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  sites: () => [],
})

const mapContainer = ref<HTMLElement | null>(null)
const mapInstance = ref<L.Map | null>(null)
const tileLayer = ref<L.TileLayer | null>(null)
const themeStore = useThemeStore()
const [mapView, setMapView] = usePersistentMapView('map-picker-view', {
  lat: 46,
  lon: 8,
  zoom: 5,
})

const lastUpdate = ref(0)
const markers = ref<L.Marker[]>([])

const mapCenter = computed(() => props.center ?? [mapView.value.lat, mapView.value.lon])
const mapZoom = computed(() => props.zoom ?? mapView.value.zoom)

const handleMapChange = () => {
  const now = Date.now()
  if (now - lastUpdate.value < 150) {
    return
  }

  lastUpdate.value = now
  if (mapInstance.value) {
    const center = mapInstance.value.getCenter()
    setMapView({
      lat: center.lat,
      lon: center.lng,
      zoom: mapInstance.value.getZoom(),
    })
  }
}

const updateMarkers = () => {
  // Remove old markers
  markers.value.forEach((marker) => {
    marker.remove()
  })
  markers.value = []

  const map = mapInstance.value as L.Map | null
  if (!map) return

  // Add new markers
  props.sites.forEach(({ site, diveInfo }) => {
    const marker = L.marker([site.latitude, site.longitude]).addTo(map)

    const popupContent = `
      <div class="popup-container">
        <h3 class="font-bold">${site.name}</h3>
        <div class="dives-scroll-container">
          <ul class="space-y-1">
            ${diveInfo
              .sort((a, b) => a.number - b.number)
              .map(
                (info) => `
              <li class="flex items-center justify-between">
                <span class="dive-name-truncate">#${info.number}: ${info.customIdentifier}</span>
                <a href="#/dives/view/${info.id}" class="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 inline-block">View Dive</a>
              </li>
            `,
              )
              .join('')}
          </ul>
        </div>
      </div>
    `

    marker.bindPopup(popupContent)
    markers.value.push(marker)
  })
}

onMounted(() => {
  if (!mapContainer.value) return

  // Initialize map
  const map = L.map(mapContainer.value).setView(
    mapCenter.value as L.LatLngExpression,
    mapZoom.value,
  ) as L.Map
  mapInstance.value = map

  // Add tile layer
  updateTileLayer()

  // Add markers
  updateMarkers()

  // Listen to map changes
  map.on('moveend', handleMapChange)
})

const updateTileLayer = () => {
  if (!mapInstance.value) return

  // Remove old tile layer if it exists
  if (tileLayer.value) {
    tileLayer.value.remove()
  }

  // Add new tile layer based on current theme
  const isDark = themeStore.theme === 'dark'
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const attribution = isDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; OpenStreetMap contributors'

  tileLayer.value = L.tileLayer(tileUrl, {
    attribution,
    maxZoom: 19,
  }).addTo(mapInstance.value as L.Map)
}

watch(() => props.sites, updateMarkers, { deep: true })
watch(() => themeStore.theme, updateTileLayer)
</script>

<style scoped>
:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}

:deep(.leaflet-popup-content) {
  margin: 8px;
  font-size: 12px;
  max-height: 150px;
}

:deep(.popup-container) {
  display: flex;
  flex-direction: column;
  max-height: 150px;
}

:deep(.dives-scroll-container) {
  overflow-y: auto;
  margin-top: 8px;
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

:deep(.dive-name-truncate) {
  display: inline-block;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
