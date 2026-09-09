import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SiteActivityChart from '@/components/dive/SiteActivityChart.vue'
import type { DiveSiteStatsPeriod } from '@/lib/types/dive'

const period = (over: Partial<DiveSiteStatsPeriod> = {}): DiveSiteStatsPeriod => ({
  start: Date.UTC(2026, 0, 1),
  diveCount: 3,
  distinctDivers: 2,
  averageMaxDepth: 18,
  deepestMaxDepth: 28,
  ...over,
})

describe('SiteActivityChart', () => {
  it('renders one activity bar and both depth points for every populated month', () => {
    const wrapper = mount(SiteActivityChart, {
      props: { periods: [period(), period({ start: Date.UTC(2026, 1, 1) })] },
    })

    expect(wrapper.findAll('rect')).toHaveLength(2)
    expect(wrapper.findAll('circle')).toHaveLength(4)
    expect(wrapper.findAll('polyline')).toHaveLength(2)
    expect(wrapper.text()).toContain('Monthly aggregates across all logged dives')
  })

  it('shows an empty state without aggregated activity', () => {
    const wrapper = mount(SiteActivityChart, { props: { periods: [] } })

    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.text()).toContain('No community dive activity')
  })
})
