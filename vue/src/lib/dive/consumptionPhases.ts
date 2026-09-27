import type { CylinderContribution, CylinderRole, CylinderUsageWindow } from '@/lib/types/dive'

/** Cylinders breathed together over the same stretch of a dive (e.g. a sidemount pair) and their
 * combined RMV - the "per consumption window" view of `CylinderConsumption.contributions`. */
export type ConsumptionPhase = {
  role: CylinderRole
  /** Positions in `configuration.cylinders` (same order as `contributions`). */
  cylinderIndexes: number[]
  /** Effective windows (explicit, or the computed complement); empty with `coversWholeDive`. */
  windows: CylinderUsageWindow[]
  coversWholeDive: boolean
  consumedLiters: number | null
  pressureMinutes: number | null
  /** Σ litres ÷ the shared pressure-minutes; null unless every cylinder in it has litres. */
  rmvLiters: number | null
  /** Cylinders in this phase without a usable start/end pressure (or size). */
  missingLiters: number
}

const windowsKey = (windows: CylinderUsageWindow[]) =>
  windows.map((w) => `${w.start ?? ''}-${w.end ?? ''}`).join(',')

/**
 * Groups breathed cylinders by role + explicit usage windows: same-role cylinders with identical
 * windows share one effective window set (all unwindowed ones share the complement), so their
 * litres add up over the same pressure-minutes. Roles never breathed on this dive (no member has
 * pressure-minutes - O2/diluent, or OC cylinders on a closed-circuit dive) are left out.
 */
export function consumptionPhases(contributions: CylinderContribution[]): ConsumptionPhase[] {
  const groups = new Map<string, number[]>()
  contributions.forEach((c, idx) => {
    const key = `${c.role}|${windowsKey(c.usageWindows)}`
    groups.set(key, [...(groups.get(key) ?? []), idx])
  })
  const phases: ConsumptionPhase[] = []
  for (const indexes of groups.values()) {
    const members = indexes.map((i) => contributions[i]!)
    const measured = members.find((c) => c.pressureMinutes != null)
    if (!measured) continue
    const withLiters = members.filter((c) => c.consumedLiters != null)
    const consumedLiters = withLiters.length
      ? withLiters.reduce((sum, c) => sum + c.consumedLiters!, 0)
      : null
    const missingLiters = members.length - withLiters.length
    const pressureMinutes = measured.pressureMinutes
    phases.push({
      role: measured.role,
      cylinderIndexes: indexes,
      windows: measured.effectiveWindows,
      coversWholeDive: measured.coversWholeDive,
      consumedLiters,
      pressureMinutes,
      rmvLiters:
        missingLiters === 0 && consumedLiters != null && pressureMinutes
          ? consumedLiters / pressureMinutes
          : null,
      missingLiters,
    })
  }
  return phases.sort(
    (a, b) =>
      (a.coversWholeDive ? -1 : (a.windows[0]?.start ?? 0)) -
      (b.coversWholeDive ? -1 : (b.windows[0]?.start ?? 0)),
  )
}

/** Only worth showing beyond the dive's own RMV when it splits or sums something. */
export function phasesAddInformation(phases: ConsumptionPhase[]): boolean {
  return phases.length > 1 || phases.some((p) => p.cylinderIndexes.length > 1)
}
