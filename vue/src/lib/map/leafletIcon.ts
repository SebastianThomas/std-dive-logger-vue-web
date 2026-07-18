import { Icon, DivIcon, type IconOptions } from 'leaflet'

const DIVER_ICON_URL = '/leaflet/diver-trim.svg'
const PLAIN_ICON_SIZE: [number, number] = [40, 25]

// Plain marker with no dive-count context (e.g. picking a new site's location).
export const defaultIcon = new Icon({
  iconUrl: DIVER_ICON_URL,
  iconRetinaUrl: DIVER_ICON_URL,
  iconSize: PLAIN_ICON_SIZE,
  iconAnchor: [PLAIN_ICON_SIZE[0] / 2, PLAIN_ICON_SIZE[1] / 2],
  popupAnchor: [0, -PLAIN_ICON_SIZE[1] / 2],
})

// Configure default icon globally for compatibility
if (typeof window !== 'undefined') {
  // @ts-expect-error to render own icons
  delete Icon.Default.prototype._getIconUrl

  Icon.Default.mergeOptions({
    iconUrl: DIVER_ICON_URL,
    iconRetinaUrl: DIVER_ICON_URL,
    iconSize: PLAIN_ICON_SIZE,
    iconAnchor: [PLAIN_ICON_SIZE[0] / 2, PLAIN_ICON_SIZE[1] / 2],
    popupAnchor: [0, -PLAIN_ICON_SIZE[1] / 2],
  })
}

const SITE_ICON_SIZE: [number, number] = [56, 44]

/** Halo color (as an "r,g,b" triplet) that scales with how often a site has been dived. */
function haloColorRgb(diveCount: number): string {
  if (diveCount <= 1) return '148,163,184' // slate grey
  if (diveCount < 10) return '59,130,246' // blue
  return '249,115,22' // orange
}

/**
 * Marker icon for a dive site: the diver-in-trim icon on a count-colored halo, with a small
 * notification-style badge near the head showing how many dives happened there. Sized larger
 * than {@link defaultIcon} to leave room for the badge and halo.
 *
 * Typed as `Icon<IconOptions>` (DivIcon's actual base class) rather than `DivIcon` because
 * `<l-marker :icon>` from `@vue-leaflet/vue-leaflet` is declared against that narrower type —
 * Leaflet itself accepts a DivIcon anywhere an Icon is expected at runtime.
 */
export function createDiveSiteIcon(
  diveCount: number,
  customIconUrl?: string | null,
): Icon<IconOptions> {
  const rgb = haloColorRgb(diveCount)
  const badge = diveCount > 0 ? `<div class="site-marker-badge">${diveCount}</div>` : ''
  const iconUrl = customIconUrl || DIVER_ICON_URL
  return new DivIcon({
    html: `
      <div class="site-marker-halo" style="background: radial-gradient(circle, rgba(${rgb},0.55) 0%, rgba(${rgb},0) 70%);">
        <div class="site-marker-diver" style="background-image: url('${iconUrl}');"></div>
        ${badge}
      </div>
    `,
    className: 'site-marker',
    iconSize: SITE_ICON_SIZE,
    iconAnchor: [SITE_ICON_SIZE[0] / 2, SITE_ICON_SIZE[1] / 2],
    popupAnchor: [0, -SITE_ICON_SIZE[1] / 2],
  }) as unknown as Icon<IconOptions>
}
