import type {
  CylinderContribution,
  DiveConfigurationCylinder,
  Dive,
  GasConsumptionComparison,
} from '@/lib/types/dive'
import { cylinderWaterVolumeLiters } from '@/lib/dive/cylinders'

/** Fraction-of-the-larger-value tolerance for calling two RMV / total figures inconsistent.
 * Mirrors the backend `GasConsumptionComparison.MISMATCH_TOLERANCE`. Shared with
 * `lib/dive/backfill.ts` so the `GAS_CONSUMPTION_MISMATCH` chip and the DiveView warning agree. */
export const MISMATCH_TOLERANCE = 0.15

/** True when both values are usable (> 0) and differ by more than the tolerance. */
export function differsBeyondTolerance(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  if (a == null || b == null || a <= 0 || b <= 0) return false
  const larger = Math.max(a, b)
  return Math.abs(a - b) / larger > MISMATCH_TOLERANCE
}

/**
 * Surface RMV implied by a whole-dive total-litres figure:
 * `total / (avgAmbientAta * durationMinutes)` with `avgAmbientAta = 1 + avgDepth/10`.
 * `null` when any input is missing/non-positive. Mirrors the backend's `impliedRmvFromTotal`.
 */
export function impliedRmvFromTotal(
  totalLiters: number | null | undefined,
  avgDepthMeters: number | null | undefined,
  durationMinutes: number | null | undefined,
): number | null {
  if (
    totalLiters == null ||
    totalLiters <= 0 ||
    avgDepthMeters == null ||
    durationMinutes == null ||
    durationMinutes <= 0
  ) {
    return null
  }
  const avgAmbientAta = 1 + avgDepthMeters / 10
  return totalLiters / (avgAmbientAta * durationMinutes)
}

/** Which pair disagrees, headline precedence: cylinder RMV first, then cylinder total, then the
 * internal entered-RMV-vs-entered-total consistency check. */
export type MismatchReason = 'rmv-vs-cylinders' | 'total-vs-cylinders' | 'rmv-vs-total' | null

export type GasConsumptionComparisonView = {
  /** RMV to show on the dive view - the cylinder-derived figure when available, else the entered one. */
  effectiveRmvLiters: number | null
  effectiveTotalLiters: number | null
  effectiveRmvSource: 'cylinders' | 'entered' | null
  effectiveTotalSource: 'cylinders' | 'entered' | null
  mismatch: boolean
  reason: MismatchReason
  insertedRmvLiters: number | null
  insertedTotalLiters: number | null
  calculatedRmvLiters: number | null
  calculatedTotalLiters: number | null
  impliedRmvFromTotalLiters: number | null
  /** The pieces the "show the calculation" panel renders. */
  ocPressureMinutes: number | null
  avgDepthMeters: number | null
  durationMinutes: number | null
  contributions: CylinderContribution[]
}

const EMPTY_VIEW: GasConsumptionComparisonView = {
  effectiveRmvLiters: null,
  effectiveTotalLiters: null,
  effectiveRmvSource: null,
  effectiveTotalSource: null,
  mismatch: false,
  reason: null,
  insertedRmvLiters: null,
  insertedTotalLiters: null,
  calculatedRmvLiters: null,
  calculatedTotalLiters: null,
  impliedRmvFromTotalLiters: null,
  ocPressureMinutes: null,
  avgDepthMeters: null,
  durationMinutes: null,
  contributions: [],
}

function reasonFor(cmp: GasConsumptionComparison): MismatchReason {
  if (!cmp.mismatch) return null
  if (cmp.rmvVsCalculatedMismatch) return 'rmv-vs-cylinders'
  if (cmp.totalLitersMismatch) return 'total-vs-cylinders'
  if (cmp.rmvVsImpliedMismatch) return 'rmv-vs-total'
  return null
}

/**
 * Reads `dive.gasConsumptionComparison` (computed server-side) into a view model for DiveView.
 * All mismatch flags come straight from the backend so the chip, the DiveView box and this agree.
 */
export function gasConsumptionComparison(
  dive: Pick<Dive, 'gasConsumptionComparison'>,
): GasConsumptionComparisonView {
  const cmp = dive.gasConsumptionComparison ?? null
  if (!cmp) return EMPTY_VIEW

  const effectiveRmvLiters = cmp.calculatedRmvLiters ?? cmp.insertedRmvLiters
  const effectiveTotalLiters = cmp.calculatedTotalLiters ?? cmp.insertedTotalLiters

  return {
    effectiveRmvLiters,
    effectiveTotalLiters,
    effectiveRmvSource:
      cmp.calculatedRmvLiters != null ? 'cylinders' : cmp.insertedRmvLiters != null ? 'entered' : null,
    effectiveTotalSource:
      cmp.calculatedTotalLiters != null
        ? 'cylinders'
        : cmp.insertedTotalLiters != null
          ? 'entered'
          : null,
    mismatch: cmp.mismatch,
    reason: reasonFor(cmp),
    insertedRmvLiters: cmp.insertedRmvLiters,
    insertedTotalLiters: cmp.insertedTotalLiters,
    calculatedRmvLiters: cmp.calculatedRmvLiters,
    calculatedTotalLiters: cmp.calculatedTotalLiters,
    impliedRmvFromTotalLiters: cmp.impliedRmvFromTotalLiters,
    ocPressureMinutes: cmp.ocPressureMinutes,
    avgDepthMeters: cmp.avgDepthMeters,
    durationMinutes: cmp.durationMinutes,
    contributions: cmp.contributions ?? [],
  }
}

/** Per-cylinder Δbar → litres, computed live from the edit form. The litres update as the user
 * types; the pressure-minutes / per-cylinder RMV / effective windows need the depth profile and so
 * come from the last save (`saved`, matched by list position) - the same limitation the live
 * combined RMV already has. */
function liveContributions(
  cylinders: DiveConfigurationCylinder[],
  saved: CylinderContribution[],
): CylinderContribution[] {
  return cylinders.map((c, i) => {
    const waterVolumeLiters = cylinderWaterVolumeLiters(c.size)
    const usable =
      c.startBar != null && c.endBar != null && c.startBar - c.endBar > 0
        ? (c.startBar - c.endBar) * waterVolumeLiters
        : null
    const prior = saved[i]
    const priorPm = prior?.pressureMinutes ?? null
    return {
      waterVolumeLiters,
      material: c.material ?? null,
      role: c.role,
      startBar: c.startBar ?? null,
      endBar: c.endBar ?? null,
      consumedLiters: usable,
      usageWindows: c.usageWindows ?? [],
      pressureMinutes: priorPm,
      rmvLiters: usable != null && priorPm != null && priorPm > 0 ? usable / priorPm : null,
      effectiveWindows: prior?.effectiveWindows ?? c.usageWindows ?? [],
      coversWholeDive: prior?.coversWholeDive ?? (c.usageWindows ?? []).length === 0,
    }
  })
}

/**
 * Builds a comparison view straight from the edit form so the warning + "show the working" panel
 * update as the user types. The cylinder-derived RMV / total / pressure-minutes come from the last
 * saved state (the calculator's windowed-vs-complement maths isn't re-run client-side); only the
 * entered figures and the per-cylinder litres table are live.
 */
export function buildLiveComparisonView(input: {
  enteredRmvLiters: number | null | undefined
  enteredTotalLiters: number | null | undefined
  cylinders: DiveConfigurationCylinder[]
  /** Per-cylinder figures from the last save, matched to `cylinders` by position. */
  savedContributions?: CylinderContribution[] | null
  calculatedRmvLiters: number | null | undefined
  calculatedTotalLiters: number | null | undefined
  ocPressureMinutes: number | null | undefined
  avgDepthMeters: number | null | undefined
  durationMinutes: number | null | undefined
}): GasConsumptionComparisonView {
  const enteredRmv =
    input.enteredRmvLiters && input.enteredRmvLiters > 0 ? input.enteredRmvLiters : null
  const enteredTotal =
    input.enteredTotalLiters && input.enteredTotalLiters > 0 ? input.enteredTotalLiters : null
  const implied = impliedRmvFromTotal(enteredTotal, input.avgDepthMeters, input.durationMinutes)
  const insertedRmv = enteredRmv ?? implied
  const calcRmv = input.calculatedRmvLiters ?? null
  const calcTotal = input.calculatedTotalLiters ?? null

  const rmvVsCylinders = differsBeyondTolerance(insertedRmv, calcRmv)
  const totalVsCylinders = differsBeyondTolerance(enteredTotal, calcTotal)
  const rmvVsTotal = differsBeyondTolerance(enteredRmv, implied)
  const mismatch = rmvVsCylinders || totalVsCylinders || rmvVsTotal

  let reason: MismatchReason = null
  if (rmvVsCylinders) reason = 'rmv-vs-cylinders'
  else if (totalVsCylinders) reason = 'total-vs-cylinders'
  else if (rmvVsTotal) reason = 'rmv-vs-total'

  return {
    effectiveRmvLiters: calcRmv ?? insertedRmv,
    effectiveTotalLiters: calcTotal ?? enteredTotal,
    effectiveRmvSource: calcRmv != null ? 'cylinders' : insertedRmv != null ? 'entered' : null,
    effectiveTotalSource: calcTotal != null ? 'cylinders' : enteredTotal != null ? 'entered' : null,
    mismatch,
    reason,
    insertedRmvLiters: insertedRmv,
    insertedTotalLiters: enteredTotal,
    calculatedRmvLiters: calcRmv,
    calculatedTotalLiters: calcTotal,
    impliedRmvFromTotalLiters: implied,
    ocPressureMinutes: input.ocPressureMinutes ?? null,
    avgDepthMeters: input.avgDepthMeters ?? null,
    durationMinutes: input.durationMinutes ?? null,
    contributions: liveContributions(input.cylinders, input.savedContributions ?? []),
  }
}
