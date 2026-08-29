/**
 * Single source of truth for the Leaflet base-map tile layer.
 *
 * Two basemaps are used, chosen by the active theme:
 *  - dark  -> CARTO "dark_all" raster tiles
 *  - light -> standard OpenStreetMap raster tiles
 *
 * `CARTO_API_KEY` is OPTIONAL. When it is left empty (the default) the public,
 * unauthenticated CARTO basemap is used exactly as before. When it is set, the
 * key is appended as `?key=...` to the CARTO tile URL only - it has no effect on
 * the light/OpenStreetMap basemap.
 */

/** Optional CARTO API key. Empty string when unset - only affects the dark basemap. */
export const CARTO_API_KEY: string = (import.meta.env.VITE_CARTO_API_KEY as string | undefined) ?? ''

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
const LIGHT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const DARK_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
const LIGHT_ATTRIBUTION = '&copy; OpenStreetMap contributors'

export interface MapTileLayer {
  url: string
  attribution: string
}

/**
 * Build the tile URL for a theme. `apiKey` is only ever applied to the dark
 * (CARTO) URL, and only when it is a non-empty string.
 */
export function buildTileUrl(theme: string, apiKey: string): string {
  if (theme !== 'dark') return LIGHT_TILE_URL
  return apiKey ? `${DARK_TILE_URL}?key=${apiKey}` : DARK_TILE_URL
}

/**
 * Resolve the Leaflet tile layer (`url` + `attribution`) for the given theme,
 * using the module-scoped {@link CARTO_API_KEY} for the dark basemap.
 */
export function mapTileLayer(theme: string): MapTileLayer {
  return theme === 'dark'
    ? { url: buildTileUrl('dark', CARTO_API_KEY), attribution: DARK_ATTRIBUTION }
    : { url: buildTileUrl(theme, CARTO_API_KEY), attribution: LIGHT_ATTRIBUTION }
}
