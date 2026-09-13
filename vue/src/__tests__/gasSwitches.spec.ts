import { describe, it, expect } from 'vitest'
import { detectGasSwitches, gasLabel } from '@/lib/graph/gasSwitches'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

const measurementAt = (time: number, gas?: { o2: number; he?: number }): DiveMeasurementWithId =>
  ({ id: time, measurement: { time, depth: 10, gas } }) as unknown as DiveMeasurementWithId

const profileOf = (entries: [number, { o2: number; he?: number }?][]): DiveProfile =>
  ({ measurements: entries.map(([t, g]) => measurementAt(t, g)) }) as unknown as DiveProfile

describe('detectGasSwitches', () => {
  it('returns nothing for a single-gas profile', () => {
    expect(
      detectGasSwitches(
        profileOf([
          [0, { o2: 0.21 }],
          [60, { o2: 0.21 }],
        ]),
      ),
    ).toEqual([])
  })

  it('marks every switch after the starting gas, not the starting gas itself', () => {
    const switches = detectGasSwitches(
      profileOf([
        [0, { o2: 0.21 }],
        [60, { o2: 0.21 }],
        [120, { o2: 0.5 }],
        [180, { o2: 0.5 }],
        [240, { o2: 1.0 }],
      ]),
    )
    expect(switches.map((s) => [s.time, s.label])).toEqual([
      [120, 'EAN50'],
      [240, 'O2'],
    ])
  })

  it('treats float noise in the logged fractions as the same gas', () => {
    expect(
      detectGasSwitches(
        profileOf([
          [0, { o2: 0.5 }],
          [60, { o2: 0.5001 }],
        ]),
      ),
    ).toEqual([])
  })

  it('skips samples without gas data instead of treating them as a switch', () => {
    const switches = detectGasSwitches(
      profileOf([[0, { o2: 0.21 }], [60, undefined], [120, { o2: 0.21 }], [180, { o2: 0.5 }]]),
    )
    expect(switches.map((s) => s.time)).toEqual([180])
  })
})

describe('gasLabel', () => {
  it('names the usual mixes', () => {
    expect(gasLabel(0.209, 0)).toBe('AIR')
    expect(gasLabel(0.32, 0)).toBe('EAN32')
    expect(gasLabel(1, 0)).toBe('O2')
    expect(gasLabel(0.18, 0.45)).toBe('TX 18/45')
  })
})
