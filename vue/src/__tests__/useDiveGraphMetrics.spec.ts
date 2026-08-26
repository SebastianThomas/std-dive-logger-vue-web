import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useDiveGraphMetrics } from '@/composables/useDiveGraphMetrics'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

function measurement(
  time: number,
  overrides: Partial<DiveMeasurementWithId['measurement']> = {},
): DiveMeasurementWithId {
  return {
    id: time,
    measurement: {
      time,
      temperature: { value: 15, unit: 'CELSIUS' },
      depth: 20,
      ndl: '',
      deco: [],
      ...overrides,
    },
  }
}

function profileOf(measurements: DiveMeasurementWithId[]): DiveProfile {
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

describe('useDiveGraphMetrics - hasPo2Setpoint', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is unavailable on an OC profile even with maxSetPoint samples present', () => {
    const profiles = ref<DiveProfile[]>([
      profileOf([
        measurement(0, { mode: 'OC', po2: { maxSetPoint: 1.3 } }),
        measurement(60, { mode: 'OC', po2: { maxSetPoint: 1.3 } }),
      ]),
    ])
    const { getProfileMetricAvailability } = useDiveGraphMetrics(profiles)

    expect(getProfileMetricAvailability(0).hasPo2Setpoint).toBe(false)
  })

  it('is unavailable when mode is entirely unreported, even with maxSetPoint samples present', () => {
    const profiles = ref<DiveProfile[]>([
      profileOf([
        measurement(0, { po2: { maxSetPoint: 1.3 } }),
        measurement(60, { po2: { maxSetPoint: 1.3 } }),
      ]),
    ])
    const { getProfileMetricAvailability } = useDiveGraphMetrics(profiles)

    expect(getProfileMetricAvailability(0).hasPo2Setpoint).toBe(false)
  })

  it('is available on a genuine CC profile with maxSetPoint samples', () => {
    const profiles = ref<DiveProfile[]>([
      profileOf([
        measurement(0, { mode: 'CC', po2: { maxSetPoint: 1.3 } }),
        measurement(60, { mode: 'CC', po2: { maxSetPoint: 1.3 } }),
      ]),
    ])
    const { getProfileMetricAvailability } = useDiveGraphMetrics(profiles)

    expect(getProfileMetricAvailability(0).hasPo2Setpoint).toBe(true)
  })

  it('stays unavailable on a CC profile with fewer than 2 setpoint samples', () => {
    const profiles = ref<DiveProfile[]>([
      profileOf([measurement(0, { mode: 'CC', po2: { maxSetPoint: 1.3 } })]),
    ])
    const { getProfileMetricAvailability } = useDiveGraphMetrics(profiles)

    expect(getProfileMetricAvailability(0).hasPo2Setpoint).toBe(false)
  })
})

describe('useDiveGraphMetrics - hasGf', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is unavailable on a gauge-mode computer (n2 explicitly reported as 0 every sample)', () => {
    const profiles = ref<DiveProfile[]>([
      profileOf([measurement(0, { n2: 0 }), measurement(60, { n2: 0 })]),
    ])
    const { getProfileMetricAvailability } = useDiveGraphMetrics(profiles)

    expect(getProfileMetricAvailability(0).hasGf).toBe(false)
  })

  it('is unavailable when n2 is simply never reported at all', () => {
    const profiles = ref<DiveProfile[]>([profileOf([measurement(0), measurement(60)])])
    const { getProfileMetricAvailability } = useDiveGraphMetrics(profiles)

    expect(getProfileMetricAvailability(0).hasGf).toBe(false)
  })

  it('is available once at least one sample has a real nonzero GF99 reading', () => {
    const profiles = ref<DiveProfile[]>([
      profileOf([measurement(0, { n2: 0 }), measurement(60, { n2: 42 })]),
    ])
    const { getProfileMetricAvailability } = useDiveGraphMetrics(profiles)

    expect(getProfileMetricAvailability(0).hasGf).toBe(true)
  })
})
