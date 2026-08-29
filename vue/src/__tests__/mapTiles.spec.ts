import { describe, it, expect } from 'vitest'
import { buildTileUrl, mapTileLayer, CARTO_API_KEY } from '@/lib/globals/mapTiles'

const DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
const LIGHT_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors'

describe('buildTileUrl', () => {
  it('returns the CARTO dark URL for the dark theme when no key is set', () => {
    expect(buildTileUrl('dark', '')).toBe(DARK_URL)
  })

  it('appends ?key=... to the dark URL when a key is provided', () => {
    expect(buildTileUrl('dark', 'abc123')).toBe(`${DARK_URL}?key=abc123`)
  })

  it('returns the OpenStreetMap URL for the light theme', () => {
    expect(buildTileUrl('light', '')).toBe(LIGHT_URL)
  })

  it('never appends a key to the light URL, even when one is set', () => {
    expect(buildTileUrl('light', 'abc123')).toBe(LIGHT_URL)
  })

  it('treats any non-dark theme as light', () => {
    expect(buildTileUrl('anything-else', 'abc123')).toBe(LIGHT_URL)
  })
})

describe('mapTileLayer', () => {
  it('resolves the dark CARTO layer for the dark theme', () => {
    const tiles = mapTileLayer('dark')
    expect(tiles.url).toBe(CARTO_API_KEY ? `${DARK_URL}?key=${CARTO_API_KEY}` : DARK_URL)
    expect(tiles.attribution).toBe(CARTO_ATTRIBUTION)
  })

  it('resolves the light OpenStreetMap layer for the light theme', () => {
    const tiles = mapTileLayer('light')
    expect(tiles.url).toBe(LIGHT_URL)
    expect(tiles.attribution).toBe(OSM_ATTRIBUTION)
  })

  it('defaults CARTO_API_KEY to an empty string when the env var is unset', () => {
    // The test environment has no VITE_CARTO_API_KEY, so the public basemap is used.
    expect(CARTO_API_KEY).toBe('')
    expect(mapTileLayer('dark').url).toBe(DARK_URL)
  })
})
