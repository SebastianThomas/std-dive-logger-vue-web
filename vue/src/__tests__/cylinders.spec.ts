import { describe, it, expect } from 'vitest'
import {
  STANDARD_CYLINDERS,
  DEFAULT_STANDARD_CYLINDER_KEY,
  matchStandard,
  inferMaterial,
  snapToNearestStandard,
  cylinderWaterVolumeLiters,
} from '@/lib/dive/cylinders'

describe('STANDARD_CYLINDERS quick-fill list', () => {
  it('is all in litres, with unique keys, and includes twinsets', () => {
    expect(STANDARD_CYLINDERS.every((c) => c.size.unit === 'LITER')).toBe(true)
    expect(new Set(STANDARD_CYLINDERS.map((c) => c.key)).size).toBe(STANDARD_CYLINDERS.length)
    // "double 8": a 2× 8 L steel twinset stored as its combined 16 L water volume.
    const twin8 = STANDARD_CYLINDERS.find((c) => c.key === 'steel-twin-8')
    expect(twin8).toMatchObject({ size: { unit: 'LITER', value: 16 }, material: 'STEEL' })
  })

  it('exposes the "12 L Steel" default key', () => {
    const entry = STANDARD_CYLINDERS.find((c) => c.key === DEFAULT_STANDARD_CYLINDER_KEY)
    expect(entry).toMatchObject({ size: { unit: 'LITER', value: 12 }, material: 'STEEL' })
  })
})

describe('snapToNearestStandard', () => {
  it('snaps a close custom size onto the nearest same-material standard', () => {
    expect(snapToNearestStandard({ unit: 'LITER', value: 14.6 }, 'STEEL')?.key).toBe('steel-15')
    expect(snapToNearestStandard({ unit: 'LITER', value: 11.4 }, 'ALU')?.key).toBe('alu-11.1')
  })

  it('returns null when nothing is within tolerance, or for a cuft size', () => {
    expect(snapToNearestStandard({ unit: 'LITER', value: 13 }, 'STEEL')).toBeNull()
    expect(snapToNearestStandard({ unit: 'CUFT', value: 80 }, 'ALU')).toBeNull()
  })
})

describe('cylinderWaterVolumeLiters', () => {
  it('is the value itself for a litre size', () => {
    expect(cylinderWaterVolumeLiters({ unit: 'LITER', value: 12 })).toBe(12)
  })
  it('converts a cuft rating to a realistic water volume', () => {
    expect(cylinderWaterVolumeLiters({ unit: 'CUFT', value: 80 })).toBeGreaterThan(9)
    expect(cylinderWaterVolumeLiters({ unit: 'CUFT', value: 80 })).toBeLessThan(13)
  })
})

describe('matchStandard', () => {
  it('matches a plain single-material size on value alone', () => {
    expect(matchStandard({ unit: 'LITER', value: 12 }, 'STEEL')).toBe('steel-12')
    expect(matchStandard({ unit: 'LITER', value: 11.1 }, 'ALU')).toBe('alu-11.1')
  })

  it('disambiguates a shared value (7 L) by material', () => {
    expect(matchStandard({ unit: 'LITER', value: 7 }, 'STEEL')).toBe('steel-7')
    expect(matchStandard({ unit: 'LITER', value: 7 }, 'ALU')).toBe('alu-7')
  })

  it('is "custom" for a shared value with no/unknown material', () => {
    expect(matchStandard({ unit: 'LITER', value: 7 }, null)).toBe('custom')
  })

  it('is "custom" for an off-catalog size or a cuft unit', () => {
    expect(matchStandard({ unit: 'LITER', value: 13 }, 'STEEL')).toBe('custom')
    expect(matchStandard({ unit: 'CUFT', value: 80 }, 'ALU')).toBe('custom')
    expect(matchStandard(null, 'STEEL')).toBe('custom')
  })
})

describe('inferMaterial', () => {
  it('follows the mirrored inference table', () => {
    expect(inferMaterial(3, 'LITER')).toBe('STEEL')
    expect(inferMaterial(3.5, 'LITER')).toBe('STEEL')
    expect(inferMaterial(5.5, 'LITER')).toBe('ALU')
    expect(inferMaterial(7, 'LITER')).toBe('ALU')
    expect(inferMaterial(8.4, 'LITER')).toBe('ALU')
    expect(inferMaterial(8.5, 'LITER')).toBe('STEEL')
    expect(inferMaterial(12, 'LITER')).toBe('STEEL')
  })

  it('treats any cuft-unit size as aluminium', () => {
    expect(inferMaterial(2, 'CUFT')).toBe('ALU')
    expect(inferMaterial(80, 'CUFT')).toBe('ALU')
  })
})
