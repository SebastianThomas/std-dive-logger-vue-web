import { describe, it, expect } from 'vitest'
import { computeGasList, isGaugeModeProfile } from '@/lib/dive/gasRoles'
import type { DiveProfile, DiveMeasurementWithId, Gas } from '@/lib/types/dive'

const gas = (o2: number, he = 0): Gas => ({ o2, n2: 1 - o2 - he, he })

function measurement(
  id: number,
  time: number,
  g: Gas,
  po2: { measured?: number; calculated?: number } | undefined = undefined,
  depth = 20,
  mode?: 'OC' | 'CC',
  n2?: number,
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
      n2,
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
      ccrUnitId: null,
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

  it('does not guess Diluent from PO2-telemetry presence alone when the source never reports mode', () => {
    // A mode-less computer reporting PO2 (measured or calculated) used to be assumed CCR and
    // defaulted to "Diluent" - wrong for a plain OC bailout/backup computer that also happens to
    // report a calculated PPO2 on some samples, which produced a spurious extra entry for a gas
    // actually breathed as bailout (or with no determinable role at all). No role is asserted now
    // regardless of PO2 presence.
    const profiles = [
      profile([
        measurement(1, 0, gas(0.21), { measured: 1.1 }),
        measurement(2, 60_000, gas(0.21), { calculated: 1.2 }),
      ]),
    ]
    const result = computeGasList(profiles, true)
    expect(result).toHaveLength(1)
    expect(result[0]?.role).toBeNull()
    expect(result[0]?.roleLabel).toBeNull()
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

  it('drops mode-less samples from a computer that DOES tag mode elsewhere in the same dive, rather than showing them as spurious extra unlabeled entries', () => {
    // Reproduces a real reported case: a CCR handset ("Perdix 2") tags mode reliably on most
    // samples (contributing a real "21/0 Diluent" entry) but has a few mode-less gaps - some at
    // the *same* composition (21/0) and some at a slightly different one (23/0, e.g. sensor
    // noise during the gap) - both used to show up as spurious separate unlabeled entries. A
    // second, genuinely mode-less bailout computer's own reading must still show up normally.
    const handset = profile(
      [
        measurement(1, 0, gas(0.21), undefined, 20, 'CC'),
        measurement(2, 30_000, gas(0.21), undefined, 20, 'CC'),
        measurement(3, 60_000, gas(0.21)), // mode-less gap, same composition
        measurement(4, 90_000, gas(0.23)), // mode-less gap, drifted composition
      ],
      'Perdix 2',
    )
    const bailoutComputer = profile(
      [measurement(5, 0, gas(0.21))], // never tags mode at all
      'Liberty Sidemount',
    )

    const result = computeGasList([handset, bailoutComputer], true)

    expect(result).toHaveLength(2)
    expect(result.every((r) => r.roleLabel !== null)).toBe(false)
    const unlabeled = result.filter((r) => r.roleLabel === null)
    expect(unlabeled).toHaveLength(1)
    expect(unlabeled[0]?.contributingComputers.map((c) => c.customIdentifier)).toEqual([
      'Liberty Sidemount',
    ])
    const diluent = result.find((r) => r.role === 'diluent')
    expect(diluent?.gas).toEqual(gas(0.21))
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

  it('excludes a gauge-mode computer\'s default gas, but keeps a real gas from another computer', () => {
    const gaugeModeProfile = profile(
      [
        measurement(1, 0, gas(0.21), undefined, 20, undefined, 0),
        measurement(2, 60_000, gas(0.21), undefined, 20, undefined, 0),
      ],
      'Bottom Timer',
    )
    const trackedProfile = profile(
      [measurement(3, 0, gas(0.32), undefined, 20, undefined, 5)],
      'Real Computer',
    )
    const result = computeGasList([gaugeModeProfile, trackedProfile], false)
    expect(result).toHaveLength(1)
    expect(result[0]?.gas).toEqual(gas(0.32))
  })

  it('does not exclude a profile that simply never reports n2 at all (e.g. FIT/Garmin)', () => {
    // measurement() defaults n2 to undefined - distinct from a computer that explicitly reports
    // a flat 0 every sample. Only the latter is gauge mode; the former says nothing either way.
    const profiles = [profile([measurement(1, 0, gas(0.21))])]
    const result = computeGasList(profiles, false)
    expect(result).toHaveLength(1)
  })
})

describe('isGaugeModeProfile', () => {
  it('is true when every reported n2 sample is exactly 0', () => {
    const p = profile([
      measurement(1, 0, gas(0.21), undefined, 20, undefined, 0),
      measurement(2, 60_000, gas(0.21), undefined, 20, undefined, 0),
    ])
    expect(isGaugeModeProfile(p)).toBe(true)
  })

  it('is false when n2 is simply never reported (undefined), not explicitly 0', () => {
    const p = profile([measurement(1, 0, gas(0.21)), measurement(2, 60_000, gas(0.21))])
    expect(isGaugeModeProfile(p)).toBe(false)
  })

  it('is false when at least one sample has a real nonzero GF99 reading', () => {
    const p = profile([
      measurement(1, 0, gas(0.21), undefined, 20, undefined, 0),
      measurement(2, 60_000, gas(0.21), undefined, 20, undefined, 12),
    ])
    expect(isGaugeModeProfile(p)).toBe(false)
  })
})
