import { describe, it, expect } from 'vitest'
import { computeGasList } from '@/lib/dive/gasRoles'
import type { DiveProfile, DiveMeasurementWithId, Gas } from '@/lib/types/dive'

const gas = (o2: number, he = 0): Gas => ({ o2, n2: 1 - o2 - he, he })

function measurement(
  id: number,
  time: number,
  g: Gas,
  po2: { measured?: number; calculated?: number } | undefined = undefined,
): DiveMeasurementWithId {
  return {
    id,
    measurement: {
      time,
      temperature: { value: 15, unit: 'CELSIUS' },
      depth: 20,
      ndl: '',
      deco: [],
      gas: g,
      po2,
    },
  }
}

function profile(measurements: DiveMeasurementWithId[]): DiveProfile {
  return {
    id: 1,
    diveComputer: { id: 1, manufacturer: { id: 1, name: 'Test' }, serialNumber: '', customIdentifier: '' },
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

  it('labels a CCR gas that only ever appears on-loop as Diluent', () => {
    const profiles = [
      profile([
        measurement(1, 0, gas(0.21), { measured: 1.1 }),
        measurement(2, 60_000, gas(0.21), { calculated: 1.2 }),
      ]),
    ]
    const result = computeGasList(profiles, true)
    expect(result).toEqual([{ gas: gas(0.21), roleLabel: 'Diluent' }])
  })

  it('labels a CCR gas that only ever appears with no PO2 telemetry as Bailout', () => {
    const profiles = [profile([measurement(1, 0, gas(0.32))])]
    const result = computeGasList(profiles, true)
    expect(result).toEqual([{ gas: gas(0.32), roleLabel: 'Bailout' }])
  })

  it('labels a gas seen both on-loop and off-loop as both roles', () => {
    const profiles = [
      profile([
        measurement(1, 0, gas(0.21), { measured: 1.1 }),
        measurement(2, 60_000, gas(0.21)),
      ]),
    ]
    const result = computeGasList(profiles, true)
    expect(result).toEqual([{ gas: gas(0.21), roleLabel: 'Diluent + Bailout' }])
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
})
