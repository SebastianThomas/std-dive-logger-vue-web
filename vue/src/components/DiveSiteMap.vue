<template>
  <div class="relative w-full h-full">
    <div ref="mapContainer" class="w-full h-full" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import L from 'leaflet'
import { usePersistentMapView } from '@/composables/mapViewState'
import 'leaflet/dist/leaflet.css'

interface SiteWithDives {
  site: {
    id: number
    name: string
    latitude: number
    longitude: number
  }
  diveIds: number[]
}

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
  props.sites.forEach(({ site, diveIds }) => {
    const marker = L.marker([site.latitude, site.longitude]).addTo(map)

    const popupContent = `
      <div class="space-y-2">
        <h3 class="font-bold">${site.name}</h3>
        <p class="text-sm opacity-70">Site ID: ${site.id}</p>
        <div class="mt-2">
          <p class="font-semibold mb-1">Dive IDs:</p>
          <ul class="space-y-1">
            ${diveIds
              .map(
                (id) => `
              <li class="flex items-center justify-between">
                <span>${id}</span>
                <a href="#/dives/view/${id}" class="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 inline-block">View Dive</a>
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
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  // Add markers
  updateMarkers()

  // Listen to map changes
  map.on('moveend', handleMapChange)
})

watch(() => props.sites, updateMarkers, { deep: true })
</script>

<style scoped>
:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}

:deep(.leaflet-popup-content) {
  margin: 8px;
  font-size: 12px;
}
</style>
