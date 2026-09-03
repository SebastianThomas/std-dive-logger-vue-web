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
  it('flags every checklist gap on a wholly empty dive (not the mutually-exclusive MISMATCH one)', () => {
    // GAS_CONSUMPTION_MISMATCH only applies once figures exist to be inconsistent - an empty dive
    // gets plain GAS_CONSUMPTION instead. ALL_BACKFILL_FIELDS carries both for the category picker.
    expect(missingBackfillFields({})).toEqual(['VISIBILITY', 'GAS_CONSUMPTION', 'LEADER', 'NOTES'])
    expect(ALL_BACKFILL_FIELDS).toContain('GAS_CONSUMPTION_MISMATCH')
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

  it('does not flag GAS_CONSUMPTION when tracked cylinders carry pressures', () => {
    expect(
      missingBackfillFields({ gasConsumption: null, hasCylinderGasData: true }),
    ).not.toContain('GAS_CONSUMPTION')
    expect(missingBackfillFields({ gasConsumption: null, hasCylinderGasData: false })).toContain(
      'GAS_CONSUMPTION',
    )
  })

  it('only counts the leader set when a named/linked/self choice exists', () => {
    expect(missingBackfillFields({})).toContain('LEADER')
    expect(missingBackfillFields({ leaderSelfExplicit: true })).not.toContain('LEADER')
    expect(missingBackfillFields({ leaderBuddyDiveId: 42 })).not.toContain('LEADER')
  })

  it('a leader chosen as a not-yet-saved buddy (by name) counts as set', () => {
    expect(missingBackfillFields({ leaderNamedBuddyName: 'Alex' })).not.toContain('LEADER')
    expect(missingBackfillFields({ leaderNamedBuddyName: '' })).toContain('LEADER')
  })

  it('a visibility feeling alone (no distance/description) still counts as present', () => {
    expect(missingBackfillFields({ visibility: { feeling: 'LOW' } })).not.toContain('VISIBILITY')
  })
})

describe('GAS_CONSUMPTION_MISMATCH', () => {
  const base: BackfillFieldSource = {
    notes: 'x',
    visibility: { feeling: 'HIGH' },
    leaderSelfExplicit: true,
  }

  it('flags a dive whose entered RMV is >15% off the cylinder-derived RMV', () => {
    const fields = missingBackfillFields({
      ...base,
      gasConsumption: { sacBar: 0, rmvLiters: 12, totalLiters: 0 },
      calculatedRmvLiters: 18,
    })
    expect(fields).toContain('GAS_CONSUMPTION_MISMATCH')
    expect(fields).not.toContain('GAS_CONSUMPTION')
  })

  it('does not flag when entered and calculated RMV agree within 15%', () => {
    expect(
      missingBackfillFields({
        ...base,
        gasConsumption: { sacBar: 0, rmvLiters: 16, totalLiters: 0 },
        calculatedRmvLiters: 18,
      }),
    ).not.toContain('GAS_CONSUMPTION_MISMATCH')
  })

  it('uses the RMV implied by total litres / depth / duration when no RMV was entered', () => {
    // 1800 l / (3 ata * 40 min) = 15 l/min, vs a calculated 22 => mismatch
    expect(
      missingBackfillFields({
        ...base,
        gasConsumption: { sacBar: 0, rmvLiters: 0, totalLiters: 1800 },
        avgDepthMeters: 20,
        durationMinutes: 40,
        calculatedRmvLiters: 22,
      }),
    ).toContain('GAS_CONSUMPTION_MISMATCH')
  })

  it('flags an entered total-litres that is >15% off the cylinder-derived total', () => {
    expect(
      missingBackfillFields({
        ...base,
        gasConsumption: { sacBar: 0, rmvLiters: 16, totalLiters: 1000 },
        calculatedRmvLiters: 16, // RMV agrees
        calculatedTotalLiters: 1800, // total does not
      }),
    ).toContain('GAS_CONSUMPTION_MISMATCH')
  })

  it('flags an internal entered-RMV vs implied-from-total disagreement', () => {
    expect(
      missingBackfillFields({
        ...base,
        gasConsumption: { sacBar: 0, rmvLiters: 15, totalLiters: 3000 },
        avgDepthMeters: 20,
        durationMinutes: 40,
      }),
    ).toContain('GAS_CONSUMPTION_MISMATCH')
  })

  it('never flags a dive with no gas figures at all', () => {
    expect(missingBackfillFields({ ...base, calculatedRmvLiters: 18 })).not.toContain(
      'GAS_CONSUMPTION_MISMATCH',
    )
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
