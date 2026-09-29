import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useReadOnlyModeStore } from '@/stores/readOnlyMode'

/** `readOnly` is true while the session-wide manual toggle is on - combine with a component's own
 * ownership check (e.g. `isMine`) where one exists, since either should be enough to lock a
 * control: `v-if="!readOnly && isMine"`. Offline counts as read-only too (nothing could be saved);
 * `manualReadOnly` is just the toggle itself, for the header button. */
export function useReadOnlyMode() {
  const { enabled: manualReadOnly } = storeToRefs(useReadOnlyModeStore())
  const { toggle: toggleReadOnly } = useReadOnlyModeStore()
  const auth = useAuthStore()
  const readOnly = computed(() => manualReadOnly.value || auth.isOffline)
  return { readOnly, manualReadOnly, toggleReadOnly }
}
