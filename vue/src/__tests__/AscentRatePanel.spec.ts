import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AscentRatePanel from '@/components/dive/view/AscentRatePanel.vue'
import type { DiveProfile, DiveMeasurementWithId } from '@/lib/types/dive'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

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
    diveComputer: {
      id: 0,
      manufacturer: { id: 0, name: 'Test' },
      serialNumber: '',
      customIdentifier: '',
    },
    start: measurements[0]?.measurement.time ?? 0,
    end: measurements[measurements.length - 1]?.measurement.time ?? 0,
    measurements,
    summary: {
      start: 0,
      end: 0,
      averageDepth: 0,
      maxDepth: Math.max(...depths, 0),
      bottomTime: 'PT0S',
    },
  }
}

describe('AscentRatePanel', () => {
  it('starts collapsed and shows a peak-descent summary badge without expanding', () => {
    // A fast 20 m/min descent, no ascent at all.
    const depths = Array.from({ length: 25 }, (_, i) => (i * 5 * 20) / 60)
    const wrapper = mount(AscentRatePanel, {
      props: { profiles: [buildProfile(depths)] },
    })
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.text()).toContain('peak descent')
    expect(wrapper.text()).not.toContain('peak ascent')
    expect(wrapper.text()).toContain('m/min')
  })

  it('shows separate peak badges for descent and ascent when a profile has both', () => {
    const descent = Array.from({ length: 15 }, (_, i) => (i * 5 * 20) / 60)
    const ascent = Array.from(
      { length: 15 },
      (_, i) => descent[descent.length - 1]! - (i * 5 * 12) / 60,
    )
    const wrapper = mount(AscentRatePanel, {
      props: { profiles: [buildProfile([...descent, ...ascent])] },
    })
    expect(wrapper.text()).toContain('peak descent')
    expect(wrapper.text()).toContain('peak ascent')
  })

  it('renders the chart once expanded', async () => {
    const depths = Array.from({ length: 25 }, (_, i) => (i * 5 * 10) / 60)
    const wrapper = mount(AscentRatePanel, {
      props: { profiles: [buildProfile(depths)] },
    })
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('shows no data state for an empty profile set', () => {
    const wrapper = mount(AscentRatePanel, { props: { profiles: [] } })
    expect(wrapper.text()).toContain('no data')
  })
})
