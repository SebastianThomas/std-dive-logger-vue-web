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

function buildProfile(depths: number[], stepSeconds = 5, epochOffset = 0): DiveProfile {
  const measurements: DiveMeasurementWithId[] = depths.map((depth, i) => ({
    id: i,
    measurement: {
      time: epochOffset + i * stepSeconds * 1000,
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

  it('shows elapsed dive time in the tooltip, not the raw epoch timestamp', async () => {
    // Measurement times are absolute epoch ms (matching the backend's Instant), not
    // dive-relative — regression test for a bug where the tooltip showed ~490,000 hours
    // because the elapsed-time baseline collapsed to 0 instead of the profile's actual start.
    const epochOffset = 1_753_000_000_000
    const depths = Array.from({ length: 5 }, (_, i) => i * 2)
    const wrapper = mount(AscentRatePanel, {
      props: { profiles: [buildProfile(depths, 5, epochOffset)], externalHoverTimeMs: null },
    })
    await wrapper.find('button').trigger('click')
    await wrapper.setProps({ externalHoverTimeMs: epochOffset + 10_000 })
    await wrapper.vm.$nextTick()

    const text = wrapper.text()
    expect(text).toContain('10s')
    expect(text).not.toMatch(/\d{3,}:/)
  })

  it('flips the tooltip to the left when it would overflow the right edge', async () => {
    const origOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!
    const origRect = HTMLElement.prototype.getBoundingClientRect
    // A 300px-wide container (so the chart's own inner width is 300 - 40 - 36 = 224) with a
    // 150px-wide tooltip — anchoring near the chart's right edge should overflow and flip.
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.className?.toString().includes('bg-white') ? 150 : 300
      },
    })
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { width: 300, height: 110, left: 0, top: 0, right: 300, bottom: 110, x: 0, y: 0 } as DOMRect
    }
    try {
      const depths = Array.from({ length: 10 }, (_, i) => i)
      const wrapper = mount(AscentRatePanel, {
        props: { profiles: [buildProfile(depths)], externalHoverTimeMs: null },
      })
      await wrapper.find('button').trigger('click')
      // Hover right at the end of the profile — the far right edge of the chart.
      await wrapper.setProps({ externalHoverTimeMs: (depths.length - 1) * 5 * 1000 })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const tooltipDiv = wrapper.find('[class*="bg-white"][class*="dark:bg-gray"]')
      expect(tooltipDiv.exists()).toBe(true)
      const left = parseFloat((tooltipDiv.element as HTMLElement).style.left)
      // Unflipped, the anchor (~innerWidth = 224) plus the 8px offset would already sit past
      // the 300px container before even adding the tooltip's own width — flipping pulls it
      // well back to the left of that anchor instead.
      expect(left).toBeLessThan(224 - 150)
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', origOffsetWidth)
      HTMLElement.prototype.getBoundingClientRect = origRect
    }
  })
})
