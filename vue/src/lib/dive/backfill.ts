import type { DiveBackfillMissingField, DiveBackfillStatus } from '@/lib/types/dive'

/** Display labels for each backfill reason - shared by the Backfill view and the edit-page hints. */
export const BACKFILL_FIELD_LABELS: Record<DiveBackfillMissingField, string> = {
  VISIBILITY: 'Visibility',
  GAS_CONSUMPTION: 'Gas Consumption',
  WATER_TYPE: 'Water Type & Current',
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
  WATER_TYPE: 'backfill-water-type',
  LEADER: 'dive-leader',
  NOTES: 'backfill-notes',
}

export const ALL_BACKFILL_FIELDS: DiveBackfillMissingField[] = [
  'VISIBILITY',
  'GAS_CONSUMPTION',
  'WATER_TYPE',
  'LEADER',
  'NOTES',
]

/** The shape `missingBackfillFields` needs - a subset of the edit form's `DiveFormData`. */
export type BackfillFieldSource = {
  notes?: string | null
  visibility?: {
    meters?: number | null
    description?: string | null
    feeling?: unknown
  } | null
  waterType?: unknown | null
  /** The dive site's own water type - satisfies the gap even when the dive has no override. */
  siteWaterType?: unknown | null
  gasConsumption?: {
    sacBar?: number | null
    rmvLiters?: number | null
    totalLiters?: number | null
  } | null
  leaderNamedBuddyId?: number | null
  leaderBuddyDiveId?: number | null
  leaderSelfExplicit?: boolean | null
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
  if (gasEmpty) missing.push('GAS_CONSUMPTION')

  if (src.waterType == null && src.siteWaterType == null) missing.push('WATER_TYPE')

  const leaderUnset =
    src.leaderNamedBuddyId == null &&
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

export type WaterTypeSite = { siteId: number; siteName: string; diveCount: number }

/**
 * Sites that have active (non-dismissed) dives still missing water type, with a count each - powers
 * the "set water type by site" bulk action (a dive site's water is a fixed physical property, so
 * one choice resolves the gap for every dive there at once).
 */
export function waterTypeSites(queue: DiveBackfillStatus[]): WaterTypeSite[] {
  const bySite = new Map<number, WaterTypeSite>()
  for (const status of queue) {
    if (!outstandingBackfillFields(status).includes('WATER_TYPE')) continue
    const entry = bySite.get(status.siteId)
    if (entry) {
      entry.diveCount += 1
    } else {
      bySite.set(status.siteId, {
        siteId: status.siteId,
        siteName: status.siteName,
        diveCount: 1,
      })
    }
  }
  return [...bySite.values()].sort(
    (a, b) => b.diveCount - a.diveCount || a.siteName.localeCompare(b.siteName),
  )
}
