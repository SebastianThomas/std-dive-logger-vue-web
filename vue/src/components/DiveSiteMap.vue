<template>
  <div class="relative w-full h-full">
    <l-map
      ref="map"
      :zoom="mapZoom"
      :center="mapCenter"
      :use-global-leaflet="false"
      @update:zoom="onZoomUpdate"
      @update:center="onCenterUpdate"
    >
      <l-tile-layer :url="tileUrl" :attribution="attribution" />
      <l-marker
        v-for="{ site, diveInfo } in sites"
        :key="site.id"
        :lat-lng="[site.latitude, site.longitude]"
        :icon="defaultIcon"
      >
        <l-popup>
          <DiveSiteMapPopup :site="site" :dive-info="diveInfo" />
        </l-popup>
      </l-marker>
    </l-map>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import { usePersistentMapView } from '@/composables/mapViewState'
import { useThemeStore } from '@/stores/theme'
import type { SiteWithDives } from '@/lib/types/dive'
import { defaultIcon } from '@/lib/map/leafletIcon'
import DiveSiteMapPopup from './DiveSiteMapPopup.vue'
import 'leaflet/dist/leaflet.css'

interface Props {
  sites?: SiteWithDives[]
  center?: [number, number]
  zoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  sites: () => [],
})

const themeStore = useThemeStore()
const [mapView, setMapView] = usePersistentMapView('map-picker-view', {
  lat: 46,
  lon: 8,
  zoom: 5,
})

const mapCenter = computed<[number, number]>(
  () => props.center ?? [mapView.value.lat, mapView.value.lon],
)
const mapZoom = computed(() => props.zoom ?? mapView.value.zoom)

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
