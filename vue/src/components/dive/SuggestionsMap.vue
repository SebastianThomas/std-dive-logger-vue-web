<template>
  <div class="suggestions-map rounded-xl shadow-md overflow-hidden">
    <l-map ref="mapRef" :zoom="4" :center="initialCenter" :use-global-leaflet="false">
      <l-tile-layer :url="tiles.url" :attribution="tiles.attribution" />

      <l-marker
        v-if="userLatLng"
        :lat-lng="userLatLng"
        :icon="userIcon"
        :z-index-offset="1000"
      >
        <l-popup>You are here</l-popup>
      </l-marker>

      <l-marker
        v-for="s in located"
        :key="s.site.id ?? s.site.name"
        :lat-lng="[s.site.latitude, s.site.longitude]"
        :icon="s.topPick ? topPickIcon : pickIcon"
      >
        <l-popup>
          <div class="text-sm min-w-[150px]">
            <p class="font-semibold">{{ s.site.name }}</p>
            <p class="text-xs opacity-70 mt-0.5">
              Score {{ s.score.toFixed(1) }}
              <span v-if="s.distanceKm != null"> · ~{{ s.distanceKm.toFixed(0) }} km</span>
            </p>
            <router-link
              :to="{ name: 'DiveSiteDetail', params: { siteId: String(s.site.id) } }"
              class="text-xs text-blue-600 hover:underline"
            >
              View site →
            </router-link>
          </div>
        </l-popup>
      </l-marker>
    </l-map>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import { DivIcon, latLngBounds, type Icon, type IconOptions } from 'leaflet'
import { useThemeStore } from '@/stores/theme'
import { createDiveSiteIcon } from '@/lib/map/leafletIcon'
import { mapTileLayer } from '@/lib/globals/mapTiles'
import type { DiveSiteSuggestion } from '@/lib/types/dive'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  suggestions: DiveSiteSuggestion[]
  userLocation?: { lat: number; lon: number } | null
}>()

const themeStore = useThemeStore()
const mapRef = ref<InstanceType<typeof LMap> | null>(null)

const tiles = computed(() => mapTileLayer(themeStore.theme))

// Sites always carry real coordinates; guard anyway so a bad row can't break the map.
const located = computed(() =>
  props.suggestions.filter(
    (s) => Number.isFinite(s.site.latitude) && Number.isFinite(s.site.longitude),
  ),
)

const userLatLng = computed<[number, number] | null>(() =>
  props.userLocation ? [props.userLocation.lat, props.userLocation.lon] : null,
)

const initialCenter = computed<[number, number]>(() => {
  if (userLatLng.value) return userLatLng.value
  const first = located.value[0]
  return first ? [first.site.latitude, first.site.longitude] : [46, 8]
})

const pickIcon = createDiveSiteIcon(5, null, false)
const topPickIcon = createDiveSiteIcon(20, null, false)
const userIcon = new DivIcon({
  html: '<div class="suggestions-map__me"></div>',
  className: 'suggestions-map__me-wrap',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
}) as unknown as Icon<IconOptions>

const fit = (attempt = 0) => {
  const points: [number, number][] = located.value.map((s) => [
    s.site.latitude,
    s.site.longitude,
  ])
  if (userLatLng.value) points.push(userLatLng.value)
  if (points.length < 1) return
  nextTick(() => {
    const map = mapRef.value?.leafletObject
    // The Leaflet object isn't ready on the first (immediate) run - retry a few times.
    if (!map) {
      if (attempt < 10) setTimeout(() => fit(attempt + 1), 150)
      return
    }
    if (points.length === 1) {
      map.setView(points[0]!, 11)
    } else {
      map.fitBounds(latLngBounds(points), { padding: [30, 30], maxZoom: 12 })
    }
  })
}

watch([located, userLatLng], () => fit(), { immediate: true })
</script>

<style scoped>
.suggestions-map {
  height: 15rem;
  background-color: var(--card-bg);
}
@media (min-width: 768px) {
  .suggestions-map {
    height: 20rem;
  }
}
:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}
:deep(.leaflet-popup-content-wrapper),
:deep(.leaflet-popup-tip) {
  background-color: var(--card-bg);
  color: var(--foreground);
  border: 1px solid rgba(209, 213, 219, 0.25);
}
:deep(.suggestions-map__me) {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #2563eb;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.4);
}
</style>
