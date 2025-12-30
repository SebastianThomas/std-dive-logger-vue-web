<template>
  <div class="relative w-full h-full">
    <div ref="mapContainer" class="w-full h-full rounded" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import L from 'leaflet'
import { usePersistentMapView } from '@/composables/mapViewState'
import '@/lib/map/leafletIcon'
import 'leaflet/dist/leaflet.css'

export interface MapCoords {
  lat: number
  lon: number
}

interface Props {
  initialCoords?: MapCoords
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [coords: MapCoords]
}>()

const mapContainer = ref<HTMLElement | null>(null)
const mapInstance = ref<L.Map | null>(null)
const markerInstance = ref<L.Marker | null>(null)

const [mapView, setMapView] = usePersistentMapView('map-picker-view', {
  lat: 46,
  lon: 8,
  zoom: 5,
})

const updateMarker = (lat: number, lon: number) => {
  if (!mapInstance.value) return

  // Remove existing marker
  if (markerInstance.value) {
    markerInstance.value.remove()
  }

  // Add new marker (uses default icon configured in leafletIcon.ts)
  markerInstance.value = L.marker([lat, lon]).addTo(mapInstance.value as L.Map)
}

const handleMapChange = () => {
  if (mapInstance.value) {
    const center = mapInstance.value.getCenter()
    setMapView({
      lat: center.lat,
      lon: center.lng,
      zoom: mapInstance.value.getZoom(),
    })
  }
}

onMounted(() => {
  if (!mapContainer.value) return

  // Determine initial center - use initialCoords if provided, otherwise use saved view
  const initialCenter: [number, number] = props.initialCoords
    ? [props.initialCoords.lat, props.initialCoords.lon]
    : [mapView.value.lat, mapView.value.lon]

  // Initialize map
  const map = L.map(mapContainer.value).setView(initialCenter, mapView.value.zoom) as L.Map
  mapInstance.value = map

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  // Add click handler
  map.on('click', (e: L.LeafletMouseEvent) => {
    const coords = { lat: e.latlng.lat, lon: e.latlng.lng }
    updateMarker(coords.lat, coords.lon)
    emit('select', coords)
  })

  // Listen to map changes for persistence
  map.on('moveend', handleMapChange)

  // Add initial marker if coords provided
  if (props.initialCoords) {
    updateMarker(props.initialCoords.lat, props.initialCoords.lon)
  }
})

// Watch for prop changes to update marker
watch(
  () => props.initialCoords,
  (newCoords) => {
    if (newCoords && mapInstance.value) {
      updateMarker(newCoords.lat, newCoords.lon)
      mapInstance.value.setView([newCoords.lat, newCoords.lon])
    }
  },
)
</script>

<style scoped>
:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}
</style>
