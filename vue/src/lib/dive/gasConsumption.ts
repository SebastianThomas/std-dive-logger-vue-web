import type { Dive } from '@/lib/types/dive'

/** Fraction-of-the-larger-value tolerance for calling two RMV / total figures inconsistent.
 * Mirrors the backend `GasConsumptionComparison.RMV_MISMATCH_TOLERANCE`. Shared with
 * `lib/dive/backfill.ts` so the `GAS_CONSUMPTION_MISMATCH` chip and the DiveView warning agree. */
export const RMV_MISMATCH_TOLERANCE = 0.15

/** True when both values are usable (> 0) and differ by more than the tolerance. */
export function differsBeyondTolerance(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  if (a == null || b == null || a <= 0 || b <= 0) return false
  const larger = Math.max(a, b)
  return Math.abs(a - b) / larger > RMV_MISMATCH_TOLERANCE
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

export type GasConsumptionComparisonView = {
  /** RMV to show on the dive view - the cylinder-derived figure when available, else the entered one. */
  effectiveRmvLiters: number | null
  effectiveTotalLiters: number | null
  effectiveRmvSource: 'cylinders' | 'entered' | null
  effectiveTotalSource: 'cylinders' | 'entered' | null
  mismatch: boolean
  /** Which pair disagrees, when `mismatch` - inferred from which fields are populated. */
  reason: 'manual-vs-cylinders' | 'rmv-vs-total' | null
  insertedRmvLiters: number | null
  calculatedRmvLiters: number | null
  impliedRmvFromTotalLiters: number | null
}

/**
 * Reads `dive.gasConsumptionComparison` (computed server-side) into a view model for DiveView.
 * `mismatch` is taken as-is from the backend; `reason` is inferred here from which figures are set.
 */
export function gasConsumptionComparison(dive: Pick<Dive, 'gasConsumptionComparison'>): GasConsumptionComparisonView {
  const cmp = dive.gasConsumptionComparison ?? null
  const inserted = cmp?.insertedRmvLiters ?? null
  const calculated = cmp?.calculatedRmvLiters ?? null
  const implied = cmp?.impliedRmvFromTotalLiters ?? null
  const insertedTotal = cmp?.insertedTotalLiters ?? null
  const calculatedTotal = cmp?.calculatedTotalLiters ?? null

  const effectiveRmvLiters = calculated ?? inserted
  const effectiveTotalLiters = calculatedTotal ?? insertedTotal

  let reason: GasConsumptionComparisonView['reason'] = null
  if (cmp?.mismatch) {
    if (differsBeyondTolerance(inserted, calculated)) reason = 'manual-vs-cylinders'
    else if (differsBeyondTolerance(inserted, implied)) reason = 'rmv-vs-total'
  }

  return {
    effectiveRmvLiters,
    effectiveTotalLiters,
    effectiveRmvSource: calculated != null ? 'cylinders' : inserted != null ? 'entered' : null,
    effectiveTotalSource:
      calculatedTotal != null ? 'cylinders' : insertedTotal != null ? 'entered' : null,
    mismatch: !!cmp?.mismatch,
    reason,
    insertedRmvLiters: inserted,
    calculatedRmvLiters: calculated,
    impliedRmvFromTotalLiters: implied,
  }
}
