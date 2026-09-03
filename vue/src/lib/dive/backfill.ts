import type { DiveBackfillMissingField, DiveBackfillStatus } from '@/lib/types/dive'
import { differsBeyondTolerance, impliedRmvFromTotal } from '@/lib/dive/gasConsumption'

/** Display labels for each backfill reason - shared by the Backfill view and the edit-page hints. */
export const BACKFILL_FIELD_LABELS: Record<DiveBackfillMissingField, string> = {
  VISIBILITY: 'Visibility',
  GAS_CONSUMPTION: 'Gas Consumption',
  GAS_CONSUMPTION_MISMATCH: 'Gas Consumption Mismatch',
  LEADER: 'Dive Leader',
  NOTES: 'Notes',
}

/**
 * DOM ids on `EditDiveForm.vue` that each backfill reason points at, so the banner chips and the
 * "jump to field" links can `scrollIntoView` the right spot. `dive-leader` already exists on the
 * leader `<select>`; the rest are added by this change.
 */
export const BACKFILL_FIELD_ANCHORS: Record<DiveBackfillMissingField, string> = {
  VISIBILITY: 'backfill-visibility',
  GAS_CONSUMPTION: 'backfill-gas-consumption',
  GAS_CONSUMPTION_MISMATCH: 'backfill-gas-consumption',
  LEADER: 'dive-leader',
  NOTES: 'backfill-notes',
}

export const ALL_BACKFILL_FIELDS: DiveBackfillMissingField[] = [
  'VISIBILITY',
  'GAS_CONSUMPTION',
  'GAS_CONSUMPTION_MISMATCH',
  'LEADER',
  'NOTES',
]

/** The shape `missingBackfillFields` needs - a subset of the edit form's `DiveFormData` plus the
 * loaded dive's calculated-RMV baseline / average depth / duration (for the mismatch check). */
export type BackfillFieldSource = {
  notes?: string | null
  visibility?: {
    meters?: number | null
    description?: string | null
    feeling?: unknown
  } | null
  gasConsumption?: {
    sacBar?: number | null
    rmvLiters?: number | null
    totalLiters?: number | null
  } | null
  /** True when ≥1 tracked cylinder carries both start + end pressure - the calculator derives
   * RMV / total litres from those, so a manual whole-dive entry isn't a `GAS_CONSUMPTION` gap. */
  hasCylinderGasData?: boolean | null
  leaderNamedBuddyId?: number | null
  /** Leader chosen as a buddy added this session (not persisted yet) - counts as "set" for the
   * live hint even though it has no id until the dive is saved. */
  leaderNamedBuddyName?: string | null
  leaderBuddyDiveId?: number | null
  leaderSelfExplicit?: boolean | null
  /** OC RMV derived from tracked cylinders (`Dive.gasConsumptionComparison.calculatedRmvLiters`
   * / `cylinderConsumption.ocRmvLiters`). Enables the `GAS_CONSUMPTION_MISMATCH` check live. */
  calculatedRmvLiters?: number | null
  /** Σ litres the tracked OC cylinders gave up (`cylinderConsumption.ocConsumedLiters`). */
  calculatedTotalLiters?: number | null
  avgDepthMeters?: number | null
  durationMinutes?: number | null
}

/**
 * Mirror of the backend's `GasConsumptionComparison.mismatch` (15% tolerance) - OR of three checks:
 * entered RMV (or, absent that, the RMV implied by total litres / depth / duration) vs the
 * cylinder-derived RMV; entered total litres vs the cylinder-derived total; and the entered RMV vs
 * its own implied-from-total value.
 */
export function gasConsumptionMismatch(src: BackfillFieldSource): boolean {
  const gas = src.gasConsumption
  if (!gas) return false
  const calcRmv = src.calculatedRmvLiters ?? null
  const calcTotal = src.calculatedTotalLiters ?? null
  const enteredRmv = gas.rmvLiters && gas.rmvLiters > 0 ? gas.rmvLiters : null
  const enteredTotal = gas.totalLiters && gas.totalLiters > 0 ? gas.totalLiters : null
  const implied = impliedRmvFromTotal(gas.totalLiters, src.avgDepthMeters, src.durationMinutes)
  const insertedRmv = enteredRmv ?? implied
  return (
    differsBeyondTolerance(insertedRmv, calcRmv) ||
    differsBeyondTolerance(enteredTotal, calcTotal) ||
    differsBeyondTolerance(enteredRmv, implied)
  )
}

/**
 * Client-side mirror of the backend's `DiveEntity.toBackfillStatus()` field logic, so the edit
 * form's pointers update live (a hint vanishes the moment its field gets a value) instead of only
 * on reload. Keep in sync with the backend if either side's "what counts as empty" changes.
 */
export function missingBackfillFields(src: BackfillFieldSource): DiveBackfillMissingField[] {
  const missing: DiveBackfillMissingField[] = []

  const vis = src.visibility
  const visibilityEmpty =
    !vis ||
    (vis.meters == null &&
      (vis.description == null || vis.description.trim() === '') &&
      vis.feeling == null)
  if (visibilityEmpty) missing.push('VISIBILITY')

  const gas = src.gasConsumption
  const gasEmpty = !gas || (!gas.sacBar && !gas.rmvLiters && !gas.totalLiters)
  if (gasEmpty && !src.hasCylinderGasData) missing.push('GAS_CONSUMPTION')
  else if (gasConsumptionMismatch(src)) missing.push('GAS_CONSUMPTION_MISMATCH')

  const leaderUnset =
    src.leaderNamedBuddyId == null &&
    (src.leaderNamedBuddyName == null || src.leaderNamedBuddyName === '') &&
    src.leaderBuddyDiveId == null &&
    !src.leaderSelfExplicit
  if (leaderUnset) missing.push('LEADER')

  if (src.notes == null || src.notes.trim() === '') missing.push('NOTES')

  return missing
}

/** Missing minus dismissed - what still actually needs attention. */
export function outstandingBackfillFields(
  status: Pick<DiveBackfillStatus, 'missingFields' | 'dismissedFields'> | null | undefined,
): DiveBackfillMissingField[] {
  if (!status) return []
  return status.missingFields.filter((f) => !status.dismissedFields.includes(f))
}

/** True when the dive has real gaps but the user has dismissed all of them. */
export function isFullyDismissed(
  status: Pick<DiveBackfillStatus, 'missingFields' | 'dismissedFields'> | null | undefined,
): boolean {
  return (
    !!status && status.missingFields.length > 0 && outstandingBackfillFields(status).length === 0
  )
}

