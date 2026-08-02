import type { DiveProfile } from '@/lib/types/dive'

export type ModeTransition = { time: number; mode: 'OC' | 'CC' }

/**
 * Every point in a profile's measurements where the rebreather loop state actually changed,
 * in chronological order - not one entry per sample, and not the starting mode itself (there's
 * nothing to mark at the very first sample), just the moments the mode flips afterward. A profile
 * with no mode data, or that never changes mode, yields an empty list.
 */
export function detectModeTransitions(profile: DiveProfile): ModeTransition[] {
  const transitions: ModeTransition[] = []
  let lastMode: 'OC' | 'CC' | undefined
  for (const { measurement } of profile.measurements) {
    const mode = measurement.mode
    if (mode === undefined || mode === lastMode) continue
    if (lastMode !== undefined) transitions.push({ time: measurement.time, mode })
    lastMode = mode
  }
  return transitions
}

/**
 * Whether any of the given profiles actually contains both OC and CC samples - the gate for
 * showing mode-transition markers at all. A pure-CC or pure-OC dive (the overwhelming majority,
 * including every dive with no mode data at all) has nothing worth marking.
 */
export function hasBothModes(profiles: DiveProfile[]): boolean {
  let sawOC = false
  let sawCC = false
  for (const profile of profiles) {
    for (const { measurement } of profile.measurements) {
      if (measurement.mode === 'OC') sawOC = true
      else if (measurement.mode === 'CC') sawCC = true
      if (sawOC && sawCC) return true
    }
  }
  return false
}
