<template>
  <div class="relative w-full h-full">
    <l-map
      ref="mapRef"
      :zoom="mapZoom"
      :center="mapCenter"
      :max-zoom="16"
      :min-zoom="3"
      :use-global-leaflet="true"
      :class="{ 'cursor-pointer': props.linkToAllSites }"
      @update:zoom="(z) => onMapUpdate(undefined, z)"
      @update:center="(c) => onMapUpdate(c, undefined)"
      @click="handleMapClick"
    >
      <l-tile-layer :url="tiles.url" :attribution="tiles.attribution" />
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
          :icon="siteIcons.get(item.site.id)"
        >
          <l-popup>
            <DiveSiteMapPopup
              :site="item.site"
              :dive-info="item.diveInfo"
              :compact="props.compact"
            />
          </l-popup>
        </l-marker>
      </l-marker-cluster-group>
    </l-map>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import { LMarkerClusterGroup } from 'vue-leaflet-markercluster'
import { divIcon } from 'leaflet'
import { usePersistentMapView } from '@/composables/mapViewState'
import { useThemeStore } from '@/stores/theme'
import { useApi } from '@/composables/useApi'
import type { SiteWithDives } from '@/lib/types/dive'
import type { User } from '@/lib/types/user'
import { createDiveSiteIcon } from '@/lib/map/leafletIcon'
import { mapTileLayer } from '@/lib/globals/mapTiles'
import DiveSiteMapPopup from './DiveSiteMapPopup.vue'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

interface Props {
  sites?: SiteWithDives[]
  center?: [number, number]
  zoom?: number
  /** Whether markers show a badge with their dive count. Off by default makes sense wherever
   * `sites` was built from just the one dive being viewed — its "count" is always 1 there and
   * isn't a real count of anything. */
  showDiveCountBadge?: boolean
  /** Clicking the map background (not a marker - Leaflet already stops marker clicks from
   * reaching the map's own click handler) navigates to the all-sites map. Used for a small,
   * single-site map standing in as a "view on the map" link, e.g. DiveView - not the default,
   * since it would make no sense on the all-sites map itself. */
  linkToAllSites?: boolean
  /** Renders popups compactly (see DiveSiteMapPopup) and lets them overflow the map's own bounds
   * instead of being clipped by it - for a map box too short to fit a full popup, e.g. DiveView's
   * small preview map. Leave off for a map with enough room that a popup always fits inside it. */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sites: () => [],
  showDiveCountBadge: true,
})

const router = useRouter()
const themeStore = useThemeStore()
const { getWithToken } = useApi()
const customIconUrl = ref<string | null>(null)
const mapRef = ref<InstanceType<typeof LMap> | null>(null)

const handleMapClick = () => {
  if (props.linkToAllSites) router.push({ name: 'MapView' })
}
const [mapView, setMapView] = usePersistentMapView('map-picker-view', {
  lat: 46,
  lon: 8,
  zoom: 5,
})

// Memoized per-site marker icons. `createDiveSiteIcon` builds a `DivIcon` by parsing an HTML
// template string, which is expensive to redo for every marker on every re-render (e.g. every
// map pan/zoom, since that writes into `mapView` and this component reads it via `mapCenter`/
// `mapZoom`). Icons only actually need to change when a site's dive count, the badge-visibility
// prop, or the user's custom icon URL changes — not when the map viewport changes — so this is
// keyed by site id and recomputed only when those inputs change.
const siteIcons = computed(() => {
  const icons = new Map<number | undefined, ReturnType<typeof createDiveSiteIcon>>()
  for (const item of props.sites) {
    icons.set(
      item.site.id,
      createDiveSiteIcon(item.diveCount, customIconUrl.value, props.showDiveCountBadge),
    )
  }
  return icons
})

const mapCenter = computed<[number, number]>(
  () => props.center ?? [mapView.value.lat, mapView.value.lon],
)
const mapZoom = computed(() => props.zoom ?? mapView.value.zoom)

const tiles = computed(() => mapTileLayer(themeStore.theme))

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

onMounted(async () => {
  try {
    const res = await getWithToken<User>('/v1/users/')
    customIconUrl.value = res.data.customIconUrl ?? null
  } catch {
    // Not logged in or request failed — fall back to the default diver icon.
    customIconUrl.value = null
  }
})
</script>

<style scoped>
:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}

/* Tried letting popups overflow this container instead of being clipped by it (for a short
   "compact" map, e.g. DiveView's small preview, where a popup can be taller than the box) - but
   CSS overflow:hidden clips *every* descendant of the element it's set on, tiles and zoom/
   attribution controls included, not just popups; there's no selector that exempts one child
   while clipping the rest. Overriding it here made the map tiles themselves bleed past the
   rounded corners at all times, which is worse than an occasional clipped popup. Reverted -
   DiveSiteMapPopup's own `compact` prop (short, fixed-height content) is what actually keeps
   popups legible in a small box now, not this. Revisit only via a genuinely separate mechanism
   (e.g. a popup rendered outside the map's own clipped DOM subtree), not another overflow
   override here. */

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

:deep(.leaflet-div-icon.site-marker) {
  background: transparent;
  border: none;
}

:deep(.site-marker-halo) {
  position: relative;
  width: 56px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.site-marker-diver) {
  width: 46px;
  height: 28px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}

:deep(.site-marker-badge) {
  position: absolute;
  left: 54%;
  top: 4%;
  transform: translate(-30%, -55%);
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  border: 2px solid #fff;
  font-size: 10.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}
</style>
