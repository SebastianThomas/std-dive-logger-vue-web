import type { DiveMeasurementWithId, DiveProfile } from '@/lib/types/dive'

export type UsageWindow = {
  /** Epoch millis, same unit as DiveMeasurement.time / a cylinder's usageWindows bounds - no unit
   * conversion needed to feed a window straight into a cylinder's usageWindows list. */
  start: number
  end: number
}

const roundToPercent = (fraction: number): number => Math.round(fraction * 100) / 100

/**
 * Finds the contiguous time range(s) in a profile's samples where the computer's actively
 * selected gas matches a target composition (e.g. a cylinder's configured O2/He%) - used to
 * suggest "Usage Start"/"Usage End" windows instead of making the diver hunt through the profile
 * graph for when a given gas was actually breathed.
 *
 * Matches on the full O2+He composition (not O2 alone) so a trimix diluent isn't mistaken for a
 * nitrox bailout that happens to share the same O2%. Rounded to whole percent before comparing,
 * matching gasRoles.ts's own convention for the same sensor/parsing-noise reason.
 */
export function findGasMatchWindows(
  measurements: DiveMeasurementWithId[],
  targetGas: { o2: number; he: number },
  toleranceFraction = 0.01,
): UsageWindow[] {
  const targetO2 = roundToPercent(targetGas.o2)
  const targetHe = roundToPercent(targetGas.he)
  const sorted = [...measurements].sort((a, b) => a.measurement.time - b.measurement.time)

  const windows: UsageWindow[] = []
  let runStart: number | null = null
  let runEnd: number | null = null

  const matches = (m: DiveMeasurementWithId): boolean => {
    const gas = m.measurement.gas
    if (!gas) return false
    return (
      Math.abs(roundToPercent(gas.o2) - targetO2) <= toleranceFraction &&
      Math.abs(roundToPercent(gas.he) - targetHe) <= toleranceFraction
    )
  }

  const closeRun = () => {
    if (runStart != null && runEnd != null) {
      windows.push({ start: runStart, end: runEnd })
    }
    runStart = null
    runEnd = null
  }

  for (const m of sorted) {
    if (matches(m)) {
      if (runStart == null) runStart = m.measurement.time
      runEnd = m.measurement.time
    } else {
      closeRun()
    }
  }
  closeRun()

  return windows
}

/** The primary profile is the first one - the same "first/primary" convention DiveGraph.vue and
 * DiveView.vue already use throughout (there's no explicit isPrimary flag on a profile). */
export function primaryProfile(profiles: DiveProfile[] | undefined): DiveProfile | undefined {
  return profiles?.[0]
}
