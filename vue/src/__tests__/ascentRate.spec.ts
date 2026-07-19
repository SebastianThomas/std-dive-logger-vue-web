import { describe, it, expect } from 'vitest'
import { computeAscentRates } from '@/lib/graph/ascentRate'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

const DUMMY_TEMP = { value: 15, unit: 'CELSIUS' as const }

function buildProfile(depths: number[], stepSeconds = 5): DiveProfile {
  const measurements: DiveMeasurementWithId[] = depths.map((depth, i) => ({
    id: i,
    measurement: {
      time: i * stepSeconds * 1000,
      temperature: DUMMY_TEMP,
      depth,
      ndl: '',
      deco: [],
    },
  }))
  return {
    id: 0,
    diveComputer: { id: 0, manufacturer: { id: 0, name: 'Test' }, serialNumber: '', customIdentifier: '' },
    start: measurements[0]?.measurement.time ?? 0,
    end: measurements[measurements.length - 1]?.measurement.time ?? 0,
    measurements,
    summary: {
      start: 0,
      end: 0,
      averageDepth: 0,
      maxDepth: Math.max(...depths),
      bottomTime: 'PT0S',
    },
  }
}

describe('computeAscentRates', () => {
  it('returns an empty array for fewer than 2 measurements', () => {
    expect(computeAscentRates(buildProfile([10]))).toEqual([])
    expect(computeAscentRates(buildProfile([]))).toEqual([])
  })

  it('detects a steady descent as a positive rate close to the true slope', () => {
    // 10 m/min descent, sampled every 5s for 120s
    const depths = Array.from({ length: 25 }, (_, i) => (i * 5 * 10) / 60)
    const rates = computeAscentRates(buildProfile(depths))
    const mid = rates[12]!
    expect(mid.rate).toBeGreaterThan(9)
    expect(mid.rate).toBeLessThan(11)
  })

  it('detects a steady ascent as a negative rate close to the true slope', () => {
    // 10 m/min ascent from 30m, sampled every 5s for 120s
    const depths = Array.from({ length: 25 }, (_, i) => 30 - (i * 5 * 10) / 60)
    const rates = computeAscentRates(buildProfile(depths))
    const mid = rates[12]!
    expect(mid.rate).toBeLessThan(-9)
    expect(mid.rate).toBeGreaterThan(-11)
  })

  it('settles near zero on a flat, noisy stretch instead of jittering with sensor noise', () => {
    // Depth hovering around 20m with small alternating jitter — the adaptive window should
    // widen until the jitter averages out, rather than reporting a spurious rate.
    const depths = Array.from({ length: 40 }, (_, i) => 20 + (i % 2 === 0 ? 0.05 : -0.05))
    const rates = computeAscentRates(buildProfile(depths))
    const mid = rates[20]!
    expect(Math.abs(mid.rate)).toBeLessThan(2)
  })

  it('keeps a tight window through a sharp transition instead of smoothing the peak away', () => {
    // Flat at 10m, then a fast 20 m/min descent to 30m, then flat again at 30m.
    const depths = [
      ...Array.from({ length: 10 }, () => 10),
      ...Array.from({ length: 10 }, (_, i) => 10 + (i * 5 * 20) / 60),
      ...Array.from({ length: 10 }, () => 30),
    ]
    const rates = computeAscentRates(buildProfile(depths))
    const duringDescent = rates[14]!
    expect(duringDescent.rate).toBeGreaterThan(15)
  })
})
