import { markRaw } from 'vue'
import type { DiveProfile } from '@/lib/types/dive'

/**
 * Marks every profile's samples non-reactive. They're only ever replaced wholesale (a new dive
 * from the API), never edited in place, and deep reactivity over thousands of samples made each
 * pass over them ~30x slower - a long multi-computer dive spent most of its load time on that.
 */
export function withRawMeasurements<T extends { profiles?: DiveProfile[] | null }>(dive: T): T {
  for (const profile of dive.profiles ?? []) {
    if (profile.measurements) markRaw(profile.measurements)
  }
  return dive
}
