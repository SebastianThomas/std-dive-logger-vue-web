import { describe, it, expect } from 'vitest'
import {
  missingBackfillFields,
  outstandingBackfillFields,
  isFullyDismissed,
  ALL_BACKFILL_FIELDS,
} from '@/lib/dive/backfill'
import type { BackfillFieldSource } from '@/lib/dive/backfill'
import type { DiveBackfillStatus } from '@/lib/types/dive'

describe('missingBackfillFields', () => {
  it('flags every field on a wholly empty dive', () => {
    expect(missingBackfillFields({})).toEqual(ALL_BACKFILL_FIELDS)
  })

  it('flags nothing on a fully filled dive', () => {
    const full: BackfillFieldSource = {
      notes: 'Great viz, hit the wall at 30m',
      visibility: { meters: 20, description: null, feeling: 'HIGH' },
      gasConsumption: { sacBar: 0.6, rmvLiters: 14, totalLiters: 1800 },
      leaderSelfExplicit: true,
    }
    expect(missingBackfillFields(full)).toEqual([])
  })

  it('treats whitespace-only notes and a blank visibility object as missing', () => {
    const src: BackfillFieldSource = {
      notes: '   ',
      visibility: { meters: null, description: '  ', feeling: null },
      gasConsumption: { sacBar: 1, rmvLiters: 0, totalLiters: 0 },
      leaderNamedBuddyId: 7,
    }
    expect(missingBackfillFields(src)).toEqual(['VISIBILITY', 'NOTES'])
  })

  it('treats an all-zero gas consumption as missing but any non-zero as present', () => {
    expect(missingBackfillFields({ gasConsumption: { sacBar: 0, rmvLiters: 0, totalLiters: 0 } })).toContain(
      'GAS_CONSUMPTION',
    )
    expect(
      missingBackfillFields({ gasConsumption: { sacBar: 0, rmvLiters: 0, totalLiters: 500 } }),
    ).not.toContain('GAS_CONSUMPTION')
  })

  it('only counts the leader set when a named/linked/self choice exists', () => {
    expect(missingBackfillFields({})).toContain('LEADER')
    expect(missingBackfillFields({ leaderSelfExplicit: true })).not.toContain('LEADER')
    expect(missingBackfillFields({ leaderBuddyDiveId: 42 })).not.toContain('LEADER')
  })

  it('a visibility feeling alone (no distance/description) still counts as present', () => {
    expect(missingBackfillFields({ visibility: { feeling: 'LOW' } })).not.toContain('VISIBILITY')
  })
})

describe('outstandingBackfillFields / isFullyDismissed', () => {
  const status = (
    missing: DiveBackfillStatus['missingFields'],
    dismissed: DiveBackfillStatus['dismissedFields'],
    site: { siteId: number; siteName: string } = { siteId: 1, siteName: 'Site A' },
  ): DiveBackfillStatus => ({
    diveId: 1,
    number: 1,
    diveIdentifier: 'x',
    ...site,
    missingFields: missing,
    dismissedFields: dismissed,
  })

  it('subtracts dismissed from missing', () => {
    expect(outstandingBackfillFields(status(['NOTES', 'LEADER', 'VISIBILITY'], ['NOTES']))).toEqual([
      'LEADER',
      'VISIBILITY',
    ])
  })

  it('is fully dismissed only when there are gaps and none are outstanding', () => {
    expect(isFullyDismissed(status(['NOTES'], ['NOTES']))).toBe(true)
    expect(isFullyDismissed(status(['NOTES', 'LEADER'], ['NOTES']))).toBe(false)
    expect(isFullyDismissed(status([], []))).toBe(false)
    expect(isFullyDismissed(null)).toBe(false)
  })
})
