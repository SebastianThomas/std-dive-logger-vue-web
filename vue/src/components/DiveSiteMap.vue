<template>
  <div class="relative w-full h-full">
    <l-map
      ref="mapRef"
      :zoom="mapZoom"
      :center="mapCenter"
      :max-zoom="16"
      :min-zoom="3"
      :use-global-leaflet="true"
      @update:zoom="(z) => onMapUpdate(undefined, z)"
      @update:center="(c) => onMapUpdate(c, undefined)"
    >
      <l-tile-layer :url="tileUrl" :attribution="attribution" />
      <l-marker-cluster-group
        :max-cluster-radius="80"
        :zoom-to-bounds-on-click="true"
        :remove-outside-visible-bounds="false"
        :show-coverage-on-hover="true"
        :chunked-loading="true"
        :icon-create-function="iconCreateFunction"
        :spiderfy-on-max-zoom="true"
        v-if="props.sites.length > 0"
      >
        <l-marker
          v-for="item in props.sites"
          :key="item.site.id"
          :lat-lng="[item.site.latitude, item.site.longitude]"
          :icon="defaultIcon"
        >
          <l-popup>
            <DiveSiteMapPopup :site="item.site" :dive-info="item.diveInfo" />
          </l-popup>
        </l-marker>
      </l-marker-cluster-group>
    </l-map>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import { LMarkerClusterGroup } from 'vue-leaflet-markercluster'
import { divIcon } from 'leaflet'
import { usePersistentMapView } from '@/composables/mapViewState'
import { useThemeStore } from '@/stores/theme'
import type { SiteWithDives } from '@/lib/types/dive'
import { defaultIcon } from '@/lib/map/leafletIcon'
import DiveSiteMapPopup from './DiveSiteMapPopup.vue'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

interface Props {
  sites?: SiteWithDives[]
  center?: [number, number]
  zoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  sites: () => [],
})

const themeStore = useThemeStore()
const mapRef = ref<InstanceType<typeof LMap> | null>(null)
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

const iconCreateFunction = computed(() => (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount()
  // Gradient from dark blue (#0b58ab) to white for >50 sites
  const getClusterColor = (count: number) => {
    if (count >= 50) return '#ffffff'
    // Interpolate from dark blue to white
    const ratio = count / 50
    const r = Math.round(11 + (255 - 11) * ratio)
    const g = Math.round(88 + (255 - 88) * ratio)
    const b = Math.round(171 + (255 - 171) * ratio)
    return `rgb(${r}, ${g}, ${b})`
  }
  const textColor = count >= 50 ? '#000000' : '#ffffff'
  return divIcon({
    html: `<div class="cluster-circle" style="background: ${getClusterColor(count)}; color: ${textColor};">${count}</div>`,
    className: 'cluster-marker leaflet-div-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
})

const onMapUpdate = (center?: { lat: number; lng: number }, zoom?: number) => {
  setMapView({
    lat: center?.lat || mapView.value.lat,
    lon: center?.lng || mapView.value.lon,
    zoom: zoom || mapView.value.zoom,
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

:deep(.leaflet-div-icon.cluster-marker) {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
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

:deep(.cluster-marker) {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

:deep(.leaflet-div-icon.cluster-marker) {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
}

:deep(.cluster-circle) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
</style>
