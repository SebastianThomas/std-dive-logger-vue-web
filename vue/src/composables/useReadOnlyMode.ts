import { storeToRefs } from 'pinia'
import { useReadOnlyModeStore } from '@/stores/readOnlyMode'

/** `readOnly` is true while the session-wide manual toggle is on - combine with a component's own
 * ownership check (e.g. `isMine`) where one exists, since either should be enough to lock a
 * control: `v-if="!readOnly && isMine"`. */
export function useReadOnlyMode() {
  const { enabled: readOnly } = storeToRefs(useReadOnlyModeStore())
  const { toggle: toggleReadOnly } = useReadOnlyModeStore()
  return { readOnly, toggleReadOnly }
}
