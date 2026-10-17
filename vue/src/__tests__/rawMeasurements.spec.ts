import { describe, expect, it } from 'vitest'
import { isReactive, reactive } from 'vue'
import { withRawMeasurements } from '@/lib/dive/rawMeasurements'
import type { DiveProfile } from '@/lib/types/dive'

describe('withRawMeasurements', () => {
  it('keeps samples out of deep reactivity, the rest of the dive reactive', () => {
    const profile = { id: 1, measurements: [{ id: 1, measurement: { time: 0, depth: 1 } }] }
    const dive = reactive(withRawMeasurements({ profiles: [profile as unknown as DiveProfile] }))
    expect(isReactive(dive.profiles[0])).toBe(true)
    expect(isReactive(dive.profiles[0]!.measurements)).toBe(false)
    expect(isReactive(dive.profiles[0]!.measurements[0])).toBe(false)
  })

  it('tolerates a dive without profiles or samples', () => {
    expect(() => withRawMeasurements({ profiles: null })).not.toThrow()
    expect(() =>
      withRawMeasurements({ profiles: [{ measurements: null } as unknown as DiveProfile] }),
    ).not.toThrow()
  })
})
