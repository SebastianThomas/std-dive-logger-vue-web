import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * A session-only "don't let me accidentally change anything" switch - deliberately not persisted
 * (no localStorage), so it always starts off on a fresh load rather than risking being silently
 * left on (or off) from a previous session. Gates every mutating action app-wide while enabled;
 * per-dive read-only-when-not-yours is a separate, always-on concern handled locally where each
 * dive's ownership is already known (see DiveView.vue's `isMine`).
 */
export const useReadOnlyModeStore = defineStore('readOnlyMode', () => {
  const enabled = ref(false)

  const toggle = () => {
    enabled.value = !enabled.value
  }

  return { enabled, toggle }
})
