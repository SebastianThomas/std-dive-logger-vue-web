import type {
  DiveConfigurationCylinder,
  DiveMeasurementWithId,
  DiveProfile,
} from '@/lib/types/dive'

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

export type BoundaryCandidate = {
  /** Epoch millis - drop straight into a cylinder usage window's start/end. */
  ms: number
  kind: 'dive-start' | 'dive-end' | 'gas-switch' | 'gas-match' | 'other-cylinder'
}

/**
 * Every timestamp worth offering as a one-click value for a usage-window bound: the dive's start
 * and end, each point the primary computer's selected gas changed, the edges of each run where
 * that gas matched this cylinder's mix, and every window bound already set on the dive's *other*
 * cylinders (so adjacent windows can be lined up exactly). De-duped, ascending.
 */
export function candidateBoundaryTimes(
  profile: DiveProfile | undefined,
  allCylinders: DiveConfigurationCylinder[],
  thisCylinderId: number,
  thisCylinderGas: { o2: number; he: number },
): BoundaryCandidate[] {
  const out: BoundaryCandidate[] = []
  const seen = new Set<number>()
  // One chip per distinct timestamp - the first `push` wins, so the call order below
  // (dive bounds, then gas switches, then gas-match edges, then other cylinders) is the priority.
  const push = (ms: number | null | undefined, kind: BoundaryCandidate['kind']) => {
    if (ms == null || seen.has(ms)) return
    seen.add(ms)
    out.push({ ms, kind })
  }

  const measurements = profile?.measurements
    ? [...profile.measurements].sort((a, b) => a.measurement.time - b.measurement.time)
    : []
  if (measurements.length) {
    push(measurements[0]!.measurement.time, 'dive-start')
    push(measurements[measurements.length - 1]!.measurement.time, 'dive-end')

    let prev: { o2: number; he: number } | null = null
    for (const m of measurements) {
      const g = m.measurement.gas
      if (!g) continue
      const cur = { o2: roundToPercent(g.o2), he: roundToPercent(g.he) }
      if (prev && (prev.o2 !== cur.o2 || prev.he !== cur.he)) {
        push(m.measurement.time, 'gas-switch')
      }
      prev = cur
    }

    for (const w of findGasMatchWindows(profile!.measurements!, thisCylinderGas)) {
      push(w.start, 'gas-match')
      push(w.end, 'gas-match')
    }
  }

  for (const c of allCylinders) {
    if (c.id === thisCylinderId) continue
    for (const w of c.usageWindows ?? []) {
      push(w.start, 'other-cylinder')
      push(w.end, 'other-cylinder')
    }
  }

  return out.sort((a, b) => a.ms - b.ms)
}
