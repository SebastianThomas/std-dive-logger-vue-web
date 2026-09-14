import { describe, it, expect } from 'vitest'
import {
  assignLabelRows,
  detectGasSwitches,
  gasLabel,
  groupGasSwitches,
} from '@/lib/graph/gasSwitches'
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

describe('groupGasSwitches', () => {
  const sw = (time: number, label: string) => ({ time, o2: 0, he: 0, label })

  it('gives two computers switching to the same gas seconds apart one label', () => {
    expect(groupGasSwitches([sw(1_000, 'EAN50'), sw(9_000, 'EAN50')])).toEqual([
      { label: 'EAN50', times: [1_000, 9_000] },
    ])
  })

  it('keeps different gases, and the same gas far apart, as separate labels', () => {
    expect(
      groupGasSwitches([sw(1_000, 'EAN50'), sw(5_000, 'O2'), sw(600_000, 'EAN50')]).map(
        (g) => g.label,
      ),
    ).toEqual(['EAN50', 'O2', 'EAN50'])
  })

  it('groups regardless of the order the profiles were listed in', () => {
    expect(groupGasSwitches([sw(9_000, 'EAN50'), sw(1_000, 'EAN50')])).toEqual([
      { label: 'EAN50', times: [1_000, 9_000] },
    ])
  })
})

describe('assignLabelRows', () => {
  it('keeps labels that fit side by side on the first row', () => {
    expect(
      assignLabelRows([
        { x: 0, width: 30 },
        { x: 40, width: 30 },
      ]),
    ).toEqual([0, 0])
  })

  it('moves an overlapping label down a row, and reuses a row once it is free', () => {
    expect(
      assignLabelRows([
        { x: 100, width: 30 },
        { x: 0, width: 30 },
        { x: 10, width: 30 },
      ]),
    ).toEqual([0, 0, 1])
  })
})
