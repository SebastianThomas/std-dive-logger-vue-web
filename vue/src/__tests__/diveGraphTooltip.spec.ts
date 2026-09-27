import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DiveGraphTooltip, {
  type MetricAvailability,
  type TooltipProfileData,
} from '@/components/dive/view/DiveGraphTooltip.vue'

const availability: MetricAvailability = {
  hasTemp: true,
  hasNdl: true,
  hasTts: true,
  hasDeco: true,
  hasOtu: false,
  hasCns: true,
  hasGf: false,
  hasPo2Measured: false,
  hasPo2Calculated: false,
  hasPo2Setpoint: false,
  hasRmv: false,
  hasGasO2: false,
  hasGasN2: false,
  hasGasHe: false,
}

const profile = (idx: number, over: Partial<TooltipProfileData> = {}): TooltipProfileData => ({
  profileIdx: idx,
  profileNum: idx + 1,
  timeDisplay: '20:00',
  absoluteTime: '20:00',
  depth: 6,
  temp: 12,
  ndl: '0 min',
  tts: '9 min',
  cns: 7,
  ...over,
})

const mountTooltip = (profiles: TooltipProfileData[], selectedProfiles: number[]) =>
  mount(DiveGraphTooltip, {
    props: {
      data: { profiles, metricAvailability: availability },
      left: 0,
      top: 0,
      selectedProfiles,
    },
  })

describe('DiveGraphTooltip', () => {
  it('keeps every reading on the same row in all side-by-side columns', () => {
    // Only the first computer is in a mandatory stop.
    const w = mountTooltip(
      [profile(0, { decoDepth: 6, decoSeconds: 120 }), profile(1)],
      [0, 1],
    )
    const cells = w.findAll('.grid > div').map((c) => c.text())
    const columns = [cells.filter((_, i) => i % 2 === 0), cells.filter((_, i) => i % 2 === 1)]

    expect(columns[0]).toEqual([
      'Profile 1',
      'Depth: 6.0 m',
      'Temp: 12.0 °C',
      'NDL: 0 min',
      'TTS: 9 min',
      'Stop: 6 m / 2 min',
      'CNS: 7%',
    ])
    // The second column has the same row count, with a placeholder where it has no stop.
    expect(columns[1]).toEqual([
      'Profile 2',
      'Depth: 6.0 m',
      'Temp: 12.0 °C',
      'NDL: 0 min',
      'TTS: 9 min',
      'Stop: -',
      'CNS: 7%',
    ])
  })

  it('has no stop row when no computer is in a stop', () => {
    const w = mountTooltip([profile(0), profile(1)], [0, 1])
    expect(w.text()).not.toContain('Stop')
  })

  it('calls the current stop "Stop", not "Deco", in the single-profile view', () => {
    const w = mountTooltip([profile(0, { decoDepth: 9, decoSeconds: 60 })], [0])
    expect(w.text()).toContain('Stop: 9 m / 1 min')
    expect(w.text()).not.toContain('Deco')
  })
})
