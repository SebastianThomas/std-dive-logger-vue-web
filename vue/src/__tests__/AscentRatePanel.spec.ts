import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AscentRatePanel from '@/components/dive/view/AscentRatePanel.vue'
import type { DiveProfile, DiveMeasurementWithId, DiveProfileRatesResponse } from '@/lib/types/dive'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

const getWithToken = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ getWithToken }),
}))

const DUMMY_TEMP = { value: 15, unit: 'CELSIUS' as const }

function buildProfile(depths: number[], stepSeconds = 5, epochOffset = 0, id = 0): DiveProfile {
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
    id,
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

// Backend response fixture: a plain central-difference rate, just enough signal for these tests
// (badges, tiers, hover) to exercise the panel with realistic-looking data. The actual smoothing
// algorithm lives and is tested on the backend (DiveProfileSegmenterTest); this component only
// displays whatever the backend sends.
function ratesFromProfile(profile: DiveProfile): DiveProfileRatesResponse {
  const points = profile.measurements
  return {
    profileId: profile.id,
    rates: points.map((m, i) => {
      const prev = points[Math.max(0, i - 1)]!
      const next = points[Math.min(points.length - 1, i + 1)]!
      const dtMinutes = (next.measurement.time - prev.measurement.time) / 60_000
      const rateMetersPerMinute =
        dtMinutes > 0 ? (next.measurement.depth - prev.measurement.depth) / dtMinutes : 0
      return { time: m.measurement.time, depth: m.measurement.depth, rateMetersPerMinute }
    }),
  }
}

function mockRatesFor(...profiles: DiveProfile[]) {
  getWithToken.mockResolvedValue({ data: profiles.map(ratesFromProfile) })
}

async function mountAndAwaitRates(props: {
  profiles: DiveProfile[]
  diveId?: number
  externalHoverTimeMs?: number | null
  selectedProfiles?: number[]
  visibleProfiles?: boolean[]
}) {
  const wrapper = mount(AscentRatePanel, { props })
  await flushPromises()
  return wrapper
}

describe('AscentRatePanel', () => {
  it('starts collapsed and shows a peak-descent summary badge without expanding', async () => {
    // A fast 20 m/min descent, no ascent at all.
    const depths = Array.from({ length: 25 }, (_, i) => (i * 5 * 20) / 60)
    const profile = buildProfile(depths)
    mockRatesFor(profile)
    const wrapper = await mountAndAwaitRates({ profiles: [profile], diveId: 1 })
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.text()).toContain('peak descent')
    expect(wrapper.text()).not.toContain('peak ascent')
    expect(wrapper.text()).toContain('m/min')
  })

  it('shows separate peak badges for descent and ascent when a profile has both', async () => {
    const descent = Array.from({ length: 15 }, (_, i) => (i * 5 * 20) / 60)
    const ascent = Array.from(
      { length: 15 },
      (_, i) => descent[descent.length - 1]! - (i * 5 * 12) / 60,
    )
    const profile = buildProfile([...descent, ...ascent])
    mockRatesFor(profile)
    const wrapper = await mountAndAwaitRates({ profiles: [profile], diveId: 1 })
    expect(wrapper.text()).toContain('peak descent')
    expect(wrapper.text()).toContain('peak ascent')
  })

  it('renders the chart once expanded', async () => {
    const depths = Array.from({ length: 25 }, (_, i) => (i * 5 * 10) / 60)
    const profile = buildProfile(depths)
    mockRatesFor(profile)
    const wrapper = await mountAndAwaitRates({ profiles: [profile], diveId: 1 })
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('shows no data state for an empty profile set', async () => {
    const wrapper = await mountAndAwaitRates({ profiles: [] })
    expect(wrapper.text()).toContain('no data')
  })

  it('shows elapsed dive time in the tooltip, not the raw epoch timestamp', async () => {
    // Measurement times are absolute epoch ms (matching the backend's Instant), not
    // dive-relative — regression test for a bug where the tooltip showed ~490,000 hours
    // because the elapsed-time baseline collapsed to 0 instead of the profile's actual start.
    const epochOffset = 1_753_000_000_000
    const depths = Array.from({ length: 5 }, (_, i) => i * 2)
    const profile = buildProfile(depths, 5, epochOffset)
    mockRatesFor(profile)
    const wrapper = await mountAndAwaitRates({
      profiles: [profile],
      diveId: 1,
      externalHoverTimeMs: null,
    })
    await wrapper.find('button').trigger('click')
    await wrapper.setProps({ externalHoverTimeMs: epochOffset + 10_000 })
    await wrapper.vm.$nextTick()

    const text = wrapper.text()
    expect(text).toContain('10s')
    expect(text).not.toMatch(/\d{3,}:/)
  })

  it('flips the tooltip to the left when it would overflow the right edge', async () => {
    const origRect = HTMLElement.prototype.getBoundingClientRect
    // A 300px-wide container, so the chart's own inner width is 300 - 40 - 36 = 224. The
    // tooltip's width is fixed (10rem / 160px, matching the DiveGraph tooltip) and known up
    // front, so the flip is computed synchronously rather than measured from the DOM.
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { width: 300, height: 110, left: 0, top: 0, right: 300, bottom: 110, x: 0, y: 0 } as DOMRect
    }
    try {
      const depths = Array.from({ length: 10 }, (_, i) => i)
      const profile = buildProfile(depths)
      mockRatesFor(profile)
      const wrapper = await mountAndAwaitRates({
        profiles: [profile],
        diveId: 1,
        externalHoverTimeMs: null,
      })
      await wrapper.find('button').trigger('click')
      // Hover right at the end of the profile — the far right edge of the chart.
      await wrapper.setProps({ externalHoverTimeMs: (depths.length - 1) * 5 * 1000 })
      await wrapper.vm.$nextTick()

      const tooltipDiv = wrapper.find('[class*="bg-white"][class*="dark:bg-gray"]')
      expect(tooltipDiv.exists()).toBe(true)
      const left = parseFloat((tooltipDiv.element as HTMLElement).style.left)
      // Unflipped, the anchor (~innerWidth = 224) plus the 8px offset would already sit past
      // the 300px container before even adding the tooltip's own 160px width — flipping pulls
      // it well back to the left of that anchor instead.
      expect(left).toBeLessThan(224 - 160)
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origRect
    }
  })

  it('gives the ascent-rate tooltip the same look as the main chart tooltip', async () => {
    const depths = Array.from({ length: 10 }, (_, i) => i)
    const profile = buildProfile(depths)
    mockRatesFor(profile)
    const wrapper = await mountAndAwaitRates({
      profiles: [profile],
      diveId: 1,
      externalHoverTimeMs: null,
    })
    await wrapper.find('button').trigger('click')
    await wrapper.setProps({ externalHoverTimeMs: 10_000 })
    await wrapper.vm.$nextTick()

    const tooltipDiv = wrapper.find('[class*="bg-white"][class*="dark:bg-gray"]')
    expect(tooltipDiv.exists()).toBe(true)
    // Same card chrome and fixed width as DiveGraphTooltip.vue's single-profile tooltip.
    expect(tooltipDiv.classes()).toEqual(
      expect.arrayContaining(['bg-white', 'dark:bg-gray-800', 'shadow', 'rounded', 'px-2', 'py-1']),
    )
    expect((tooltipDiv.element as HTMLElement).style.width).toBe('10rem')
  })

  it('shows only the selected profile\'s peak, not the max across every visible profile', async () => {
    // Two profiles of the same dive: a mild 10 m/min descent (profile 0, selected) and a much
    // faster 30 m/min descent (profile 1) - if both were still combined, the badge would read 30.
    const mild = Array.from({ length: 10 }, (_, i) => (i * 5 * 10) / 60)
    const fast = Array.from({ length: 10 }, (_, i) => (i * 5 * 30) / 60)
    const profile0 = buildProfile(mild, 5, 0, 0)
    const profile1 = buildProfile(fast, 5, 0, 1)
    mockRatesFor(profile0, profile1)
    const wrapper = await mountAndAwaitRates({
      profiles: [profile0, profile1],
      diveId: 1,
      selectedProfiles: [0],
      visibleProfiles: [true, true],
    })
    expect(wrapper.text()).toMatch(/peak descent 10 m\/min/)
    expect(wrapper.text()).not.toMatch(/peak descent 30 m\/min/)
  })

  it('draws only one profile\'s area even when two profiles are visible, not both overlapped', async () => {
    const mild = Array.from({ length: 10 }, (_, i) => (i * 5 * 10) / 60)
    const fast = Array.from({ length: 10 }, (_, i) => (i * 5 * 30) / 60)
    const profile0 = buildProfile(mild, 5, 0, 0)
    const profile1 = buildProfile(fast, 5, 0, 1)
    mockRatesFor(profile0, profile1)
    const wrapper = await mountAndAwaitRates({
      profiles: [profile0, profile1],
      diveId: 1,
      selectedProfiles: [0],
      visibleProfiles: [true, true],
    })
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()
    // Four tiers (slow/normal/quick/extreme) for one profile - eight would mean both got drawn.
    const paths = wrapper.findAll('path').filter((p) => p.attributes('fill-opacity') !== undefined)
    expect(paths.length).toBe(4)
  })

  it('shows a small color-coded speed legend instead of the old prose paragraph', async () => {
    const depths = Array.from({ length: 10 }, (_, i) => i)
    const profile = buildProfile(depths)
    mockRatesFor(profile)
    const wrapper = await mountAndAwaitRates({ profiles: [profile], diveId: 1 })
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    expect(text).toContain('slow')
    expect(text).toContain('normal')
    expect(text).toContain('quick')
    expect(text).toContain('very fast')
    expect(text).not.toContain('Ascent is plotted above the line')
  })
})
