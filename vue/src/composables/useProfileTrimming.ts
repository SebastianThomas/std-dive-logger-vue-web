import { ref } from 'vue'

/**
 * The bit of trim-mode state every caller of DiveGraph.vue's trim UI needs regardless of what
 * "confirm" actually does (call a saved-dive's trim endpoint immediately vs. stash the range
 * locally for a staged import's eventual commit) - which profile (if any) is currently being
 * trimmed, and how to start/cancel that.
 */
export function useProfileTrimming() {
  const trimProfileId = ref<number | null>(null)

  const startTrimming = (profileId: number) => {
    trimProfileId.value = profileId
  }

  const cancelTrimming = () => {
    trimProfileId.value = null
  }

  return { trimProfileId, startTrimming, cancelTrimming }
}
