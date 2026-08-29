import { describe, it, expect } from 'vitest'
import {
  gasConsumptionComparison,
  differsBeyondTolerance,
  impliedRmvFromTotal,
  RMV_MISMATCH_TOLERANCE,
} from '@/lib/dive/gasConsumption'
import type { GasConsumptionComparison } from '@/lib/types/dive'

const cmp = (over: Partial<GasConsumptionComparison>): { gasConsumptionComparison: GasConsumptionComparison } => ({
  gasConsumptionComparison: {
    insertedRmvLiters: null,
    insertedTotalLiters: null,
    impliedRmvFromTotalLiters: null,
    calculatedRmvLiters: null,
    calculatedTotalLiters: null,
    mismatch: false,
    ...over,
  },
})

describe('differsBeyondTolerance', () => {
  it('is false when either side is missing or non-positive', () => {
    expect(differsBeyondTolerance(null, 10)).toBe(false)
    expect(differsBeyondTolerance(10, 0)).toBe(false)
    expect(differsBeyondTolerance(undefined, undefined)).toBe(false)
  })

  it('compares against the larger value at the 15% tolerance', () => {
    expect(RMV_MISMATCH_TOLERANCE).toBe(0.15)
    expect(differsBeyondTolerance(15, 17)).toBe(false) // 2/17 ≈ 11.8%
    expect(differsBeyondTolerance(15, 18)).toBe(true) // 3/18 ≈ 16.7%
  })
})

describe('impliedRmvFromTotal', () => {
  it('is total / ((1 + avgDepth/10) * durationMinutes)', () => {
    // 1800 l over 40 min at 20 m avg (3 ata) => 15 l/min
    expect(impliedRmvFromTotal(1800, 20, 40)).toBeCloseTo(15, 5)
  })

  it('is null when any input is missing or non-positive', () => {
    expect(impliedRmvFromTotal(1800, null, 40)).toBeNull()
    expect(impliedRmvFromTotal(0, 20, 40)).toBeNull()
    expect(impliedRmvFromTotal(1800, 20, 0)).toBeNull()
  })
})

describe('gasConsumptionComparison', () => {
  it('returns an all-null view when the dive has no comparison record', () => {
    const view = gasConsumptionComparison({ gasConsumptionComparison: null })
    expect(view).toMatchObject({
      effectiveRmvLiters: null,
      effectiveTotalLiters: null,
      mismatch: false,
      reason: null,
    })
  })

  it('prefers the cylinder-derived figures for display, tagging their source', () => {
    const view = gasConsumptionComparison(
      cmp({ insertedRmvLiters: 14, calculatedRmvLiters: 15, insertedTotalLiters: 1700, calculatedTotalLiters: 1800 }),
    )
    expect(view.effectiveRmvLiters).toBe(15)
    expect(view.effectiveRmvSource).toBe('cylinders')
    expect(view.effectiveTotalLiters).toBe(1800)
    expect(view.effectiveTotalSource).toBe('cylinders')
  })

  it('falls back to the entered figures when nothing is calculated', () => {
    const view = gasConsumptionComparison(cmp({ insertedRmvLiters: 14, insertedTotalLiters: 1700 }))
    expect(view.effectiveRmvLiters).toBe(14)
    expect(view.effectiveRmvSource).toBe('entered')
    expect(view.effectiveTotalSource).toBe('entered')
  })

  it('infers a manual-vs-cylinders reason from the populated fields', () => {
    const view = gasConsumptionComparison(
      cmp({ insertedRmvLiters: 12, calculatedRmvLiters: 18, mismatch: true }),
    )
    expect(view.reason).toBe('manual-vs-cylinders')
  })

  it('infers an rmv-vs-total reason when the disagreement is internal', () => {
    const view = gasConsumptionComparison(
      cmp({ insertedRmvLiters: 12, impliedRmvFromTotalLiters: 18, mismatch: true }),
    )
    expect(view.reason).toBe('rmv-vs-total')
  })

  it('reports no reason when the backend flagged no mismatch', () => {
    const view = gasConsumptionComparison(
      cmp({ insertedRmvLiters: 14, calculatedRmvLiters: 15 }),
    )
    expect(view.mismatch).toBe(false)
    expect(view.reason).toBeNull()
  })
})
