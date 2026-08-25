import { describe, expect, it } from 'vitest'
import { findGasMatchWindows, primaryProfile } from '../lib/dive/cylinderUsageWindows'
import type { DiveMeasurementWithId, DiveProfile } from '../lib/types/dive'

const sample = (id: number, time: number, gas?: { o2: number; he: number }): DiveMeasurementWithId => ({
  id,
  measurement: {
    time,
    temperature: { value: 20, unit: 'CELSIUS' },
    depth: 20,
    ndl: '',
    deco: [],
    gas: gas ? { ...gas, n2: 1 - gas.o2 - gas.he } : undefined,
  },
})

describe('findGasMatchWindows', () => {
  it('finds a single contiguous window matching the target gas', () => {
    const measurements = [
      sample(1, 1000, { o2: 0.21, he: 0 }),
      sample(2, 2000, { o2: 0.32, he: 0 }),
      sample(3, 3000, { o2: 0.32, he: 0 }),
      sample(4, 4000, { o2: 0.32, he: 0 }),
      sample(5, 5000, { o2: 0.21, he: 0 }),
    ]

    const windows = findGasMatchWindows(measurements, { o2: 0.32, he: 0 })

    expect(windows).toEqual([{ start: 2000, end: 4000 }])
  })

  it('finds multiple non-contiguous windows for the same gas (e.g. bailout breathed twice)', () => {
    const measurements = [
      sample(1, 1000, { o2: 0.21, he: 0 }),
      sample(2, 2000, { o2: 0.5, he: 0 }),
      sample(3, 3000, { o2: 0.21, he: 0 }),
      sample(4, 4000, { o2: 0.21, he: 0 }),
      sample(5, 5000, { o2: 0.5, he: 0 }),
      sample(6, 6000, { o2: 0.5, he: 0 }),
    ]

    const windows = findGasMatchWindows(measurements, { o2: 0.5, he: 0 })

    expect(windows).toEqual([
      { start: 2000, end: 2000 },
      { start: 5000, end: 6000 },
    ])
  })

  it('matches on both O2 and He so a trimix diluent is not confused with a same-O2% nitrox', () => {
    const measurements = [
      sample(1, 1000, { o2: 0.21, he: 0.35 }),
      sample(2, 2000, { o2: 0.21, he: 0 }),
    ]

    const windows = findGasMatchWindows(measurements, { o2: 0.21, he: 0 })

    expect(windows).toEqual([{ start: 2000, end: 2000 }])
  })

  it('treats a sample missing gas data as breaking a run', () => {
    const measurements = [
      sample(1, 1000, { o2: 0.32, he: 0 }),
      sample(2, 2000),
      sample(3, 3000, { o2: 0.32, he: 0 }),
    ]

    const windows = findGasMatchWindows(measurements, { o2: 0.32, he: 0 })

    expect(windows).toEqual([
      { start: 1000, end: 1000 },
      { start: 3000, end: 3000 },
    ])
  })

  it('tolerates small sensor/parsing noise around the target percentage', () => {
    const measurements = [sample(1, 1000, { o2: 0.319, he: 0 })]

    expect(findGasMatchWindows(measurements, { o2: 0.32, he: 0 })).toEqual([
      { start: 1000, end: 1000 },
    ])
  })

  it('returns no windows when nothing matches', () => {
    const measurements = [sample(1, 1000, { o2: 0.21, he: 0 })]

    expect(findGasMatchWindows(measurements, { o2: 0.32, he: 0 })).toEqual([])
  })

  it('sorts out-of-order measurements before scanning for runs', () => {
    const measurements = [
      sample(1, 3000, { o2: 0.32, he: 0 }),
      sample(2, 1000, { o2: 0.21, he: 0 }),
      sample(3, 2000, { o2: 0.32, he: 0 }),
    ]

    expect(findGasMatchWindows(measurements, { o2: 0.32, he: 0 })).toEqual([
      { start: 2000, end: 3000 },
    ])
  })
})

describe('primaryProfile', () => {
  const profileStub = (id: number) => ({ id }) as unknown as DiveProfile

  it('returns the first profile as the primary one', () => {
    const profiles = [profileStub(1), profileStub(2)]
    expect(primaryProfile(profiles)).toBe(profiles[0])
  })

  it('returns undefined for an empty or missing profile list', () => {
    expect(primaryProfile([])).toBeUndefined()
    expect(primaryProfile(undefined)).toBeUndefined()
  })
})
