import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SiteVisibilityChart from '@/components/dive/SiteVisibilityChart.vue'
import type { SiteVisibilityLog } from '@/lib/types/dive'

const log = (over: Partial<SiteVisibilityLog>): SiteVisibilityLog => ({
  diveId: 1,
  diveNumber: 1,
  diveIdentifier: 'd',
  date: Date.UTC(2026, 5, 15),
  meters: 20,
  feeling: null,
  ...over,
})

describe('SiteVisibilityChart', () => {
  it('plots one circle per log that has a visibility distance', () => {
    const wrapper = mount(SiteVisibilityChart, {
      props: {
        logs: [
          log({ diveId: 1, meters: 15 }),
          log({ diveId: 2, meters: 30 }),
          log({ diveId: 3, meters: 5 }),
        ],
      },
    })
    expect(wrapper.findAll('circle')).toHaveLength(3)
    // no connecting lines between points (deliberate - iterate later)
    expect(wrapper.find('polyline').exists()).toBe(false)
    expect(wrapper.find('path').exists()).toBe(false)
  })

  it('excludes feeling-only logs from the plot but counts them in the footnote', () => {
    const wrapper = mount(SiteVisibilityChart, {
      props: {
        logs: [
          log({ diveId: 1, meters: 12 }),
          log({ diveId: 2, meters: null, feeling: 'LOW' }),
          log({ diveId: 3, meters: null, feeling: 'HIGH' }),
        ],
      },
    })
    expect(wrapper.findAll('circle')).toHaveLength(1)
    expect(wrapper.text()).toContain('2 more logged a feeling only')
  })

  it('shows an empty state when no log has a distance', () => {
    const wrapper = mount(SiteVisibilityChart, {
      props: { logs: [log({ meters: null, feeling: 'AVERAGE' })] },
    })
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.text()).toContain('No visibility distances logged')
  })

  it('colours a point by its visibility feeling', () => {
    const wrapper = mount(SiteVisibilityChart, {
      props: { logs: [log({ meters: 20, feeling: 'HIGH' })] },
    })
    expect(wrapper.find('circle').attributes('fill')).toBe('#22c55e')
  })
})
