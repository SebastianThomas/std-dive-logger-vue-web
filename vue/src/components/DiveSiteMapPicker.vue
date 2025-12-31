<template>
  <div class="relative w-full h-full">
    <l-map
      :zoom="mapZoom"
      :center="mapCenter"
      :use-global-leaflet="false"
      @click="handleMapClick"
      @update:zoom="onZoomUpdate"
      @update:center="onCenterUpdate"
    >
      <l-tile-layer :url="tileUrl" :attribution="attribution" />
      <l-marker v-if="markerCoords" :lat-lng="markerCoords" :icon="defaultIcon" />
    </l-map>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet'
import { usePersistentMapView } from '@/composables/mapViewState'
import { useThemeStore } from '@/stores/theme'
import { defaultIcon } from '@/lib/map/leafletIcon'
import 'leaflet/dist/leaflet.css'
import type { LeafletMouseEvent } from 'leaflet'

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

const themeStore = useThemeStore()
const [mapView, setMapView] = usePersistentMapView('map-picker-view', {
  lat: 46,
  lon: 8,
  zoom: 5,
})

const markerCoords = ref<[number, number] | null>(
  props.initialCoords ? [props.initialCoords.lat, props.initialCoords.lon] : null,
)

const mapCenter = computed<[number, number]>(() =>
  props.initialCoords
    ? [props.initialCoords.lat, props.initialCoords.lon]
    : [mapView.value.lat, mapView.value.lon],
)

const mapZoom = computed(() => mapView.value.zoom)

const tileUrl = computed(() => {
  return themeStore.theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
})

const attribution = computed(() => {
  return themeStore.theme === 'dark'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; OpenStreetMap contributors'
})

const handleMapClick = (event: LeafletMouseEvent) => {
  const { lat, lng } = event.latlng
  const coords = { lat, lon: lng }
  markerCoords.value = [lat, lng]
  emit('select', coords)
}

const onZoomUpdate = (zoom: number) => {
  setMapView({
    lat: mapView.value.lat,
    lon: mapView.value.lon,
    zoom,
  })
}

const onCenterUpdate = (center: { lat: number; lng: number }) => {
  setMapView({
    lat: center.lat,
    lon: center.lng,
    zoom: mapView.value.zoom,
  })
}

// Watch for prop changes to update marker
watch(
  () => props.initialCoords,
  (newCoords) => {
    if (newCoords) {
      markerCoords.value = [newCoords.lat, newCoords.lon]
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
