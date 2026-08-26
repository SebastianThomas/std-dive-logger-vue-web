import { describe, it, expect } from 'vitest'
import { detectTrimSuggestion, TRIM_SUGGESTION_SURFACE_DEPTH_METERS } from '@/lib/graph/trimSuggestion'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

const SECOND = 1000
const MINUTE = 60 * SECOND

function measurement(id: number, time: number, depth: number): DiveMeasurementWithId {
  return {
    id,
    measurement: {
      time,
      temperature: { value: 15, unit: 'CELSIUS' },
      depth,
      ndl: '',
      deco: [],
    },
  }
}

function profile(measurements: DiveMeasurementWithId[]): DiveProfile {
  return {
    id: 1,
    diveComputer: {
      id: 1,
      manufacturer: { id: 1, name: 'Test' },
      serialNumber: '',
      customIdentifier: '',
      ccrUnitId: null,
    },
    start: measurements[0]?.measurement.time ?? 0,
    end: measurements[measurements.length - 1]?.measurement.time ?? 0,
    measurements,
    summary: { start: 0, end: 0, averageDepth: 0, maxDepth: 0, bottomTime: 'PT0S' },
  }
}

/** A steady 20m dive of `bottomMinutes`, followed by a near-surface tail of `tailMinutes` at
 * `tailDepth`, sampled once per second. */
function diveWithTrailingTail(bottomMinutes: number, tailMinutes: number, tailDepth: number): DiveProfile {
  const measurements: DiveMeasurementWithId[] = []
  let id = 0
  let t = 0
  for (let s = 0; s < bottomMinutes * 60; s++, t += SECOND) {
    measurements.push(measurement(id++, t, 20))
  }
  for (let s = 0; s < tailMinutes * 60; s++, t += SECOND) {
    measurements.push(measurement(id++, t, tailDepth))
  }
  return profile(measurements)
}

describe('detectTrimSuggestion', () => {
  it('suggests trimming a multi-minute near-surface tail (the Divesoft Liberty case)', () => {
    const dive = diveWithTrailingTail(30, 5, 0.5)
    const result = detectTrimSuggestion(dive)
    // Tail starts right after the last measurement deeper than the surface threshold.
    expect(result.suggestedEnd).toBe(30 * MINUTE)
    expect(result.suggestedStart).toBeNull()
  })

  it('does not suggest trimming a short tail below the minimum duration', () => {
    const dive = diveWithTrailingTail(30, 0.5, 0.5)
    const result = detectTrimSuggestion(dive)
    expect(result.suggestedEnd).toBeNull()
  })

  it('does not flag a real shallow safety stop as a tail', () => {
    // A 3m safety stop is well above the 1m surface threshold, so it's real depth, not a tail.
    const dive = diveWithTrailingTail(30, 5, 3)
    const result = detectTrimSuggestion(dive)
    expect(result.suggestedEnd).toBeNull()
  })

  it('is conservative about a single noisy deep sample within the tail', () => {
    const dive = diveWithTrailingTail(30, 5, 0.5)
    // A single wave-induced blip well into the tail, with well over a minute of tail remaining
    // after it so the shortened suggestion still clears the minimum-duration threshold.
    dive.measurements[dive.measurements.length - 120]!.measurement.depth =
      TRIM_SUGGESTION_SURFACE_DEPTH_METERS + 0.1
    const result = detectTrimSuggestion(dive)
    // The suggested cut moves to just after the blip, not the original (earlier) tail start -
    // under-trims rather than risking cutting into what looked like real depth.
    expect(result.suggestedEnd).toBe(
      dive.measurements[dive.measurements.length - 119]!.measurement.time,
    )
  })

  it('suggests trimming a leading near-surface stretch before the dive starts', () => {
    const measurements: DiveMeasurementWithId[] = []
    let id = 0
    let t = 0
    for (let s = 0; s < 3 * 60; s++, t += SECOND) {
      measurements.push(measurement(id++, t, 0.4))
    }
    for (let s = 0; s < 20 * 60; s++, t += SECOND) {
      measurements.push(measurement(id++, t, 20))
    }
    const result = detectTrimSuggestion(profile(measurements))
    expect(result.suggestedStart).toBe(3 * MINUTE - SECOND)
    expect(result.suggestedEnd).toBeNull()
  })

  it('suggests nothing for a profile that never reads deeper than the surface threshold', () => {
    const dive = diveWithTrailingTail(0, 5, 0.5)
    const result = detectTrimSuggestion(dive)
    expect(result).toEqual({ suggestedStart: null, suggestedEnd: null })
  })

  it('suggests nothing for a profile with fewer than two measurements', () => {
    expect(detectTrimSuggestion(profile([]))).toEqual({ suggestedStart: null, suggestedEnd: null })
    expect(detectTrimSuggestion(profile([measurement(0, 0, 20)]))).toEqual({
      suggestedStart: null,
      suggestedEnd: null,
    })
  })

  it('suggests nothing for a dive with no tail at all', () => {
    const dive = diveWithTrailingTail(30, 0, 0)
    const result = detectTrimSuggestion(dive)
    expect(result).toEqual({ suggestedStart: null, suggestedEnd: null })
  })
})
