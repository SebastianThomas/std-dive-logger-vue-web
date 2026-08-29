import { describe, expect, it } from 'vitest'
import {
  findGasMatchWindows,
  primaryProfile,
  candidateBoundaryTimes,
} from '../lib/dive/cylinderUsageWindows'
import type {
  DiveConfigurationCylinder,
  DiveMeasurementWithId,
  DiveProfile,
} from '../lib/types/dive'

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

describe('candidateBoundaryTimes', () => {
  const profile = {
    measurements: [
      sample(1, 1000, { o2: 0.21, he: 0 }),
      sample(2, 2000, { o2: 0.21, he: 0 }),
      sample(3, 3000, { o2: 0.5, he: 0 }), // gas switch at 3000
      sample(4, 4000, { o2: 0.5, he: 0 }),
      sample(5, 5000, { o2: 0.21, he: 0 }), // switch back at 5000
    ],
  } as unknown as DiveProfile

  const cyl = (id: number, windows: { start: number | null; end: number | null }[] = []) =>
    ({ id, gas: { o2: 0.21, he: 0 }, usageWindows: windows }) as unknown as DiveConfigurationCylinder

  it('offers dive start/end, gas switches and gas-match run edges, de-duped and ascending', () => {
    const c = candidateBoundaryTimes(profile, [cyl(1)], 1, { o2: 0.21, he: 0 })
    const at = (ms: number) => c.find((x) => x.ms === ms)?.kind
    // One chip per timestamp; earlier-priority kind wins (dive bounds > switch > gas-match).
    expect(at(1000)).toBe('dive-start')
    expect(at(5000)).toBe('dive-end')
    expect(at(3000)).toBe('gas-switch') // 21/0 -> 50/0
    // 2000 is the end of the first run where the 21/0 gas matched, not a switch or a dive bound.
    expect(at(2000)).toBe('gas-match')
    expect(c.map((x) => x.ms)).toEqual([...c.map((x) => x.ms)].sort((a, b) => a - b))
  })

  it('includes the window bounds of the dive\'s other cylinders but not this one\'s', () => {
    const cylinders = [cyl(1, [{ start: 1500, end: 2500 }]), cyl(2, [{ start: 4200, end: 4800 }])]
    const c = candidateBoundaryTimes(profile, cylinders, 1, { o2: 0.21, he: 0 })
    const other = c.filter((x) => x.kind === 'other-cylinder').map((x) => x.ms)
    expect(other).toEqual([4200, 4800])
    expect(other).not.toContain(1500)
  })
})
