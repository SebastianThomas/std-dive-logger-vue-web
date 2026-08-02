import { describe, it, expect } from 'vitest'
import { detectModeTransitions, hasBothModes } from '@/lib/graph/modeTransitions'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

const measurementAt = (time: number, mode?: 'OC' | 'CC'): DiveMeasurementWithId =>
  ({ id: time, measurement: { time, depth: 1, mode } }) as unknown as DiveMeasurementWithId

const profileOf = (entries: [number, ('OC' | 'CC')?][]): DiveProfile =>
  ({ measurements: entries.map(([t, m]) => measurementAt(t, m)) }) as unknown as DiveProfile

describe('detectModeTransitions', () => {
  it('returns no transitions for a profile with no mode data at all', () => {
    const profile = profileOf([
      [0, undefined],
      [60, undefined],
    ])
    expect(detectModeTransitions(profile)).toEqual([])
  })

  it('returns no transitions for a profile that stays on one mode throughout', () => {
    const profile = profileOf([
      [0, 'CC'],
      [60, 'CC'],
      [120, 'CC'],
    ])
    expect(detectModeTransitions(profile)).toEqual([])
  })

  it('finds a single OC bailout and the return to CC', () => {
    const profile = profileOf([
      [0, 'CC'],
      [1754, 'OC'],
      [1982, 'CC'],
    ])
    expect(detectModeTransitions(profile)).toEqual([
      { time: 1754, mode: 'OC' },
      { time: 1982, mode: 'CC' },
    ])
  })

  it('does not emit a duplicate entry for consecutive samples of the same mode', () => {
    const profile = profileOf([
      [0, 'CC'],
      [10, 'CC'],
      [20, 'OC'],
      [30, 'OC'],
    ])
    expect(detectModeTransitions(profile)).toEqual([{ time: 20, mode: 'OC' }])
  })
})

describe('hasBothModes', () => {
  it('is false when no profile has any mode data', () => {
    expect(hasBothModes([profileOf([[0, undefined]])])).toBe(false)
  })

  it('is false when every profile stays on a single mode', () => {
    const profiles = [profileOf([[0, 'CC']]), profileOf([[0, 'CC']])]
    expect(hasBothModes(profiles)).toBe(false)
  })

  it('is true when one profile alone contains both modes', () => {
    const profile = profileOf([
      [0, 'CC'],
      [10, 'OC'],
    ])
    expect(hasBothModes([profile])).toBe(true)
  })

  it('is true when the modes are split across two profiles', () => {
    const profiles = [profileOf([[0, 'CC']]), profileOf([[0, 'OC']])]
    expect(hasBothModes(profiles)).toBe(true)
  })
})
