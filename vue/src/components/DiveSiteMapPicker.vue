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
      <l-tile-layer :url="tiles.url" :attribution="tiles.attribution" />
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
import { mapTileLayer } from '@/lib/globals/mapTiles'
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

const tiles = computed(() => mapTileLayer(themeStore.theme))

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
