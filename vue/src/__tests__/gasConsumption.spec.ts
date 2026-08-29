import { describe, it, expect } from 'vitest'
import {
  gasConsumptionComparison,
  buildLiveComparisonView,
  differsBeyondTolerance,
  impliedRmvFromTotal,
  MISMATCH_TOLERANCE,
} from '@/lib/dive/gasConsumption'
import type { DiveConfigurationCylinder, GasConsumptionComparison } from '@/lib/types/dive'

const cmp = (
  over: Partial<GasConsumptionComparison>,
): { gasConsumptionComparison: GasConsumptionComparison } => ({
  gasConsumptionComparison: {
    insertedRmvLiters: null,
    insertedTotalLiters: null,
    impliedRmvFromTotalLiters: null,
    calculatedRmvLiters: null,
    calculatedTotalLiters: null,
    ocPressureMinutes: null,
    avgDepthMeters: null,
    durationMinutes: null,
    rmvVsCalculatedMismatch: false,
    totalLitersMismatch: false,
    rmvVsImpliedMismatch: false,
    mismatch: false,
    contributions: [],
    ...over,
  },
})

const cyl = (over: Partial<DiveConfigurationCylinder> = {}): DiveConfigurationCylinder => ({
  id: 1,
  size: { unit: 'LITER', value: 12 },
  material: 'STEEL',
  startBar: 220,
  endBar: 80,
  notes: '',
  gas: { o2: 0.21, he: 0 },
  role: 'OC',
  usageWindows: [],
  ...over,
})

describe('differsBeyondTolerance', () => {
  it('is false when either side is missing or non-positive', () => {
    expect(differsBeyondTolerance(null, 10)).toBe(false)
    expect(differsBeyondTolerance(10, 0)).toBe(false)
    expect(differsBeyondTolerance(undefined, undefined)).toBe(false)
  })

  it('compares against the larger value at the 15% tolerance', () => {
    expect(MISMATCH_TOLERANCE).toBe(0.15)
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

describe('gasConsumptionComparison (from the backend record)', () => {
  it('returns an all-null view when the dive has no comparison record', () => {
    const view = gasConsumptionComparison({ gasConsumptionComparison: null })
    expect(view).toMatchObject({ effectiveRmvLiters: null, mismatch: false, reason: null })
  })

  it('prefers the cylinder-derived figures for display, tagging their source', () => {
    const view = gasConsumptionComparison(
      cmp({
        insertedRmvLiters: 14,
        calculatedRmvLiters: 15,
        insertedTotalLiters: 1700,
        calculatedTotalLiters: 1800,
      }),
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
  })

  it('takes the headline reason from the backend booleans in precedence order', () => {
    expect(
      gasConsumptionComparison(cmp({ mismatch: true, rmvVsCalculatedMismatch: true })).reason,
    ).toBe('rmv-vs-cylinders')
    expect(
      gasConsumptionComparison(
        cmp({ mismatch: true, totalLitersMismatch: true, rmvVsImpliedMismatch: true }),
      ).reason,
    ).toBe('total-vs-cylinders')
    expect(
      gasConsumptionComparison(cmp({ mismatch: true, rmvVsImpliedMismatch: true })).reason,
    ).toBe('rmv-vs-total')
  })

  it('reports no reason when the backend flagged no mismatch', () => {
    const view = gasConsumptionComparison(cmp({ insertedRmvLiters: 14, calculatedRmvLiters: 15 }))
    expect(view.mismatch).toBe(false)
    expect(view.reason).toBeNull()
  })
})

describe('buildLiveComparisonView (edit form)', () => {
  it('computes per-cylinder litres live from the form', () => {
    const view = buildLiveComparisonView({
      enteredRmvLiters: 16,
      enteredTotalLiters: null,
      cylinders: [cyl({ startBar: 200, endBar: 50 })], // 150 bar * 12 L = 1800 L
      calculatedRmvLiters: 16,
      calculatedTotalLiters: 1800,
      ocPressureMinutes: 100,
      avgDepthMeters: 15,
      durationMinutes: 45,
    })
    expect(view.contributions).toHaveLength(1)
    expect(view.contributions[0]!.consumedLiters).toBeCloseTo(1800, 5)
    expect(view.mismatch).toBe(false)
  })

  it('flags an entered RMV that disagrees with the cylinder baseline', () => {
    const view = buildLiveComparisonView({
      enteredRmvLiters: 22,
      enteredTotalLiters: null,
      cylinders: [cyl()],
      calculatedRmvLiters: 17,
      calculatedTotalLiters: 1680,
      ocPressureMinutes: 100,
      avgDepthMeters: 15,
      durationMinutes: 45,
    })
    expect(view.mismatch).toBe(true)
    expect(view.reason).toBe('rmv-vs-cylinders')
  })

  it('a cuft cylinder contributes a realistic litre figure, not a ~200x one', () => {
    const view = buildLiveComparisonView({
      enteredRmvLiters: null,
      enteredTotalLiters: null,
      cylinders: [cyl({ size: { unit: 'CUFT', value: 80 }, startBar: 200, endBar: 50 })],
      calculatedRmvLiters: null,
      calculatedTotalLiters: null,
      ocPressureMinutes: null,
      avgDepthMeters: null,
      durationMinutes: null,
    })
    // 150 bar * ~11 L ≈ 1650 L, not ~340 000 L.
    expect(view.contributions[0]!.consumedLiters).toBeGreaterThan(1200)
    expect(view.contributions[0]!.consumedLiters).toBeLessThan(2000)
  })
})
