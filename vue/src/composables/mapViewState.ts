import type { MapViewState } from '@/lib/types/mapTypes'
import { ref, watch } from 'vue'

function safeParseMapView(saved: string | null, initial: MapViewState): MapViewState {
  if (!saved) return initial

  try {
    const parsed = JSON.parse(saved)

    // Runtime validation
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.lat === 'number' &&
      typeof parsed.lon === 'number' &&
      typeof parsed.zoom === 'number'
    ) {
      return parsed as MapViewState
    }

    console.error('usePersistentMapView: Stored data has invalid shape:', parsed)
    return initial
  } catch (err) {
    console.error('usePersistentMapView: Failed to parse map view:', err)
    return initial
  }
}

export function usePersistentMapView(storageKey: string, initial: MapViewState) {
  const mapView = ref<MapViewState>(
    (() => {
      if (typeof window === 'undefined') return initial

      const saved = localStorage.getItem(storageKey)
      return safeParseMapView(saved, initial)
    })(),
  )

  let debounceTimeout: ReturnType<typeof setTimeout> | null = null

  const setMapView = (newView: MapViewState) => {
    mapView.value = newView
  }

  watch(
    () => mapView.value,
    (newView) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
      debounceTimeout = setTimeout(() => {
        localStorage.setItem(storageKey, JSON.stringify(newView))
      }, 200)
    },
    { deep: true },
  )

  return [mapView, setMapView] as const
}
