import { describe, it, expect } from 'vitest'
import { computeGasList } from '@/lib/dive/gasRoles'
import type { DiveProfile, DiveMeasurementWithId, Gas } from '@/lib/types/dive'

const gas = (o2: number, he = 0): Gas => ({ o2, n2: 1 - o2 - he, he })

function measurement(
  id: number,
  time: number,
  g: Gas,
  po2: { measured?: number; calculated?: number } | undefined = undefined,
  depth = 20,
  mode?: 'OC' | 'CC',
): DiveMeasurementWithId {
  return {
    id,
    measurement: {
      time,
      temperature: { value: 15, unit: 'CELSIUS' },
      depth,
      ndl: '',
      deco: [],
      gas: g,
      po2,
      mode,
    },
  }
}

function profile(measurements: DiveMeasurementWithId[], computerName = 'Test'): DiveProfile {
  return {
    id: 1,
    diveComputer: {
      id: 1,
      manufacturer: { id: 1, name: 'Test' },
      serialNumber: '',
      customIdentifier: computerName,
    },
    start: measurements[0]?.measurement.time ?? 0,
    end: measurements[measurements.length - 1]?.measurement.time ?? 0,
    measurements,
    summary: { start: 0, end: 0, averageDepth: 0, maxDepth: 0, bottomTime: 'PT0S' },
  }
}

describe('computeGasList', () => {
  it('never labels gases on an OC dive, even with multiple mixes', () => {
    const profiles = [
      profile([measurement(1, 0, gas(0.21)), measurement(2, 60_000, gas(0.32))]),
    ]
    const result = computeGasList(profiles, false)
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.roleLabel === null)).toBe(true)
  })

  it('labels a CCR gas logged as CC mode as Diluent', () => {
    const profiles = [
      profile([
        measurement(1, 0, gas(0.21), undefined, 20, 'CC'),
        measurement(2, 60_000, gas(0.21), undefined, 20, 'CC'),
      ]),
    ]
    const result = computeGasList(profiles, true)
    expect(result).toHaveLength(1)
    expect(result[0]?.role).toBe('diluent')
    expect(result[0]?.roleLabel).toBe('Diluent')
  })

  it('labels a CCR gas logged as OC mode as Bailout', () => {
    const profiles = [profile([measurement(1, 0, gas(0.32), undefined, 20, 'OC')])]
    const result = computeGasList(profiles, true)
    expect(result).toHaveLength(1)
    expect(result[0]?.role).toBe('bailout')
    expect(result[0]?.roleLabel).toBe('Bailout')
  })

  it('falls back to PO2-telemetry presence as Diluent when the source never reports mode', () => {
    const profiles = [
      profile([
        measurement(1, 0, gas(0.21), { measured: 1.1 }),
        measurement(2, 60_000, gas(0.21), { calculated: 1.2 }),
      ]),
    ]
    const result = computeGasList(profiles, true)
    expect(result).toHaveLength(1)
    expect(result[0]?.roleLabel).toBe('Diluent')
  })

  it('does not guess Bailout for a mode-less sample that simply has no PO2 telemetry', () => {
    // No mode, no PO2 - genuinely no signal either way, so no role is asserted (previously this
    // defaulted to "Bailout", which was often wrong for a sample still genuinely on-loop but
    // missing a PO2 reading, e.g. a transient sensor dropout).
    const profiles = [profile([measurement(1, 0, gas(0.32))])]
    const result = computeGasList(profiles, true)
    expect(result).toHaveLength(1)
    expect(result[0]?.role).toBeNull()
    expect(result[0]?.roleLabel).toBeNull()
  })

  it('splits a gas genuinely breathed both on-loop and off-loop into two separate entries', () => {
    const profiles = [
      profile([
        measurement(1, 0, gas(0.21), undefined, 20, 'CC'),
        measurement(2, 60_000, gas(0.21), undefined, 20, 'OC'),
      ]),
    ]
    const result = computeGasList(profiles, true)
    expect(result).toHaveLength(2)
    const roles = result.map((r) => r.roleLabel).sort()
    expect(roles).toEqual(['Bailout', 'Diluent'])
    // Neither entry claims the combined "Diluent + Bailout" label anymore.
    expect(result.every((r) => r.roleLabel !== 'Diluent + Bailout')).toBe(true)
  })

  it('attributes each entry to the computer(s) that actually logged it that way', () => {
    const profiles = [
      profile([measurement(1, 0, gas(0.21), undefined, 20, 'CC')], 'Handset A'),
      profile([measurement(2, 0, gas(0.21), undefined, 20, 'OC')], 'Bailout Computer'),
    ]
    const result = computeGasList(profiles, true)
    expect(result).toHaveLength(2)
    const diluentEntry = result.find((r) => r.role === 'diluent')
    const bailoutEntry = result.find((r) => r.role === 'bailout')
    expect(diluentEntry?.contributingComputers.map((c) => c.customIdentifier)).toEqual([
      'Handset A',
    ])
    expect(bailoutEntry?.contributingComputers.map((c) => c.customIdentifier)).toEqual([
      'Bailout Computer',
    ])
  })

  it('deduplicates by composition across profiles', () => {
    const profiles = [
      profile([measurement(1, 0, gas(0.21))]),
      profile([measurement(2, 0, gas(0.21))]),
    ]
    const result = computeGasList(profiles, false)
    expect(result).toHaveLength(1)
  })

  it('ignores measurements with no gas recorded', () => {
    const m = measurement(1, 0, gas(0.21))
    m.measurement.gas = undefined
    const profiles = [profile([m])]
    expect(computeGasList(profiles, true)).toEqual([])
  })

  it('ignores a surface (depth 0) reading of a gas never actually breathed underwater', () => {
    const profiles = [
      profile([
        measurement(1, 0, gas(0.21), undefined, 0),
        measurement(2, 60_000, gas(0.32), undefined, 20),
      ]),
    ]
    const result = computeGasList(profiles, false)
    expect(result).toHaveLength(1)
    expect(result[0]?.gas).toEqual(gas(0.32))
    expect(result[0]?.roleLabel).toBeNull()
  })

  it('treats near-identical fractions (sensor/parsing noise) as the same gas', () => {
    const profiles = [
      profile([measurement(1, 0, gas(0.32)), measurement(2, 60_000, gas(0.319))]),
    ]
    const result = computeGasList(profiles, false)
    expect(result).toHaveLength(1)
  })
})
