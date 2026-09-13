import type { DiveProfile } from '@/lib/types/dive'

export type GasSwitch = { time: number; o2: number; he: number; label: string }

// Two logged mixes closer than half a percentage point are the same gas (float noise in exports).
const FRACTION_TOLERANCE = 0.005

/** A mix's usual diver-facing name: AIR, EANxx, O2, or TX o2/he (both in %). */
export function gasLabel(o2: number, he: number): string {
  const o2Pct = Math.round(o2 * 100)
  const hePct = Math.round(he * 100)
  if (hePct > 0) return `TX ${o2Pct}/${hePct}`
  if (o2Pct >= 99) return 'O2'
  if (o2Pct === 21) return 'AIR'
  return `EAN${o2Pct}`
}

/**
 * Every point in a profile's measurements where the breathing gas actually changed, in
 * chronological order - not the starting gas itself, only the switches after it. A profile with a
 * single gas (or no gas data) yields an empty list.
 */
export function detectGasSwitches(profile: DiveProfile): GasSwitch[] {
  const switches: GasSwitch[] = []
  let last: { o2: number; he: number } | undefined
  for (const { measurement } of profile.measurements) {
    const o2 = measurement.gas?.o2
    if (o2 === undefined) continue
    const he = measurement.gas?.he ?? 0
    if (
      last &&
      Math.abs(last.o2 - o2) <= FRACTION_TOLERANCE &&
      Math.abs(last.he - he) <= FRACTION_TOLERANCE
    ) {
      continue
    }
    if (last) switches.push({ time: measurement.time, o2, he, label: gasLabel(o2, he) })
    last = { o2, he }
  }
  return switches
}
