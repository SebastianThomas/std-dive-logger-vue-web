import type { DiveProfile } from '@/lib/types/dive'

// 10m of seawater ≈ 1 additional atmosphere - same approximation the backend's own
// DiveGasCalculator uses for its server-side PO2 estimate.
const METERS_PER_ATMOSPHERE = 10

/**
 * Synthesizes a calculated-PO2 line (FO2 × ambient pressure) for a profile whose source device
 * never logged one itself - most commonly a CCR handset running fixed-setpoint mode, which only
 * reports measured PO2 and/or setpoint, never its own "calculated" value. Carries the last-known
 * O2 fraction forward between gas-mix samples, since gas switches are logged far less often than
 * depth.
 */
export function synthesizePo2Calculated(profile: DiveProfile): [number, number][] {
  const points: [number, number][] = []
  let lastO2: number | undefined

  for (const m of profile.measurements) {
    if (m.measurement.gas?.o2 !== undefined) lastO2 = m.measurement.gas.o2
    if (lastO2 === undefined) continue

    const { time, depth } = m.measurement
    if (!Number.isFinite(time) || !Number.isFinite(depth)) continue

    points.push([time, lastO2 * (1 + depth / METERS_PER_ATMOSPHERE)])
  }

  return points
}
