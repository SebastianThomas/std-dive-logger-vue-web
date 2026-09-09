<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
      <span>★ Top pick · Blue dot: your location</span>
      <button type="button" class="underline" @click="fit(!showingAll)">
        {{ showingAll ? 'Focus nearby' : 'Show all sites and location' }}
      </button>
    </div>
    <p v-if="omitted > 0" class="text-xs mb-2" role="status">
      {{ omitted }} distant site{{ omitted === 1 ? '' : 's' }} outside this view. Use “Show all” for
      the overview.
    </p>
    <div class="suggestions-map rounded-xl shadow-md overflow-hidden">
      <l-map
        ref="mapRef"
        :zoom="4"
        :center="initialCenter"
        :use-global-leaflet="false"
        @ready="onReady"
      >
        <l-tile-layer
          :url="tiles.url"
          :attribution="tiles.attribution"
          :options="{ crossOrigin: 'anonymous' }"
        />

        <l-marker v-if="userLatLng" :lat-lng="userLatLng" :icon="userIcon" :z-index-offset="1000">
          <l-popup>You are here</l-popup>
        </l-marker>

        <l-marker
          v-for="s in located"
          :key="s.site.id ?? s.site.name"
          :lat-lng="[s.site.latitude, s.site.longitude]"
          :icon="s.topPick ? topPickIcon : pickIcon"
          :title="`${s.topPick ? 'Top pick: ' : ''}${s.site.name}`"
          :z-index-offset="s.topPick ? 500 : 0"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import { DivIcon, point, type Icon, type IconOptions } from 'leaflet'
import { useThemeStore } from '@/stores/theme'
import { createDiveSiteIcon } from '@/lib/map/leafletIcon'
import { chooseSuggestionPoints, validCoordinate } from '@/lib/map/suggestionViewport'
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
  props.suggestions.filter((s) => validCoordinate([s.site.latitude, s.site.longitude])),
)

const userLatLng = computed<[number, number] | null>(() =>
  props.userLocation && validCoordinate([props.userLocation.lat, props.userLocation.lon])
    ? [props.userLocation.lat, props.userLocation.lon]
    : null,
)

const initialCenter = computed<[number, number]>(() => {
  if (userLatLng.value) return userLatLng.value
  const first = located.value[0]
  return first ? [first.site.latitude, first.site.longitude] : [46, 8]
})

const pickIcon = createDiveSiteIcon(5, null, false)
const topPickIcon = new DivIcon({
  html: '<span class="suggestions-map__star">★</span>',
  className: 'suggestions-map__top',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
}) as unknown as Icon<IconOptions>
const userIcon = new DivIcon({
  html: '<div class="suggestions-map__me"></div>',
  className: 'suggestions-map__me-wrap',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
}) as unknown as Icon<IconOptions>

const omitted = ref(0)
const showingAll = ref(false)
const fit = (all = false) => {
  const map = mapRef.value?.leafletObject
  if (!map) return
  const candidates = located.value.map((s) => ({
    point: [s.site.latitude, s.site.longitude] as [number, number],
    topPick: s.topPick,
  }))
  const points = chooseSuggestionPoints(
    candidates,
    userLatLng.value,
    (points) => map.getBoundsZoom(points, false, point(60, 60)),
    all,
  )
  if (!points.length) return
  showingAll.value = all
  omitted.value = candidates.filter(
    (s) => !points.some((p) => p[0] === s.point[0] && p[1] === s.point[1]),
  ).length
  if (points.length === 1) map.setView(points[0]!, 11)
  else map.fitBounds(points, { padding: [30, 30], maxZoom: 12 })
}
const onReady = () => {
  mapRef.value?.leafletObject?.invalidateSize()
  fit()
}
watch([located, userLatLng], async () => {
  await nextTick()
  fit()
})
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
:deep(.suggestions-map__star) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fbbf24;
  color: #78350f;
  border: 2px solid #fff;
  box-shadow: 0 1px 5px #0008;
  font-size: 23px;
}
</style>
