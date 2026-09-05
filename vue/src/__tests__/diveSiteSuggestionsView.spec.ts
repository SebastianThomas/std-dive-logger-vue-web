import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises, RouterLinkStub, type VueWrapper } from '@vue/test-utils'
import type { DiveSiteSuggestion } from '@/lib/types/dive'

const getWithToken = vi.fn()
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ getWithToken }) }))

import DiveSiteSuggestionsView from '@/views/DiveSiteSuggestionsView.vue'

const suggestion = (over: Partial<DiveSiteSuggestion> = {}): DiveSiteSuggestion => ({
  site: { id: 1, name: 'Blue Hole', latitude: 1, longitude: 1 },
  score: 5.5,
  reasons: ['You dived here 9 weeks ago - due for a revisit.'],
  totalDives: 3,
  topPick: false,
  ...over,
})

let wrapper: VueWrapper | null = null

const mountView = async () => {
  wrapper = mount(DiveSiteSuggestionsView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
  await flushPromises()
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  getWithToken.mockReset()
  Reflect.deleteProperty(navigator, 'geolocation')
})

describe('DiveSiteSuggestionsView', () => {
  it('shows a loading state while the request is in flight', async () => {
    let resolveFn: (v: unknown) => void = () => {}
    getWithToken.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve
      }),
    )
    wrapper = mount(DiveSiteSuggestionsView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Dusting off your dive log')
    expect(wrapper.find('.fa-compass.fa-spin').exists()).toBe(true)

    resolveFn({ data: [] })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Dusting off your dive log')
  })

  it('renders each suggestion with its reasons and a score badge', async () => {
    getWithToken.mockResolvedValue({
      data: [
        suggestion({ site: { id: 1, name: 'Blue Hole', latitude: 1, longitude: 1 }, score: 8.1 }),
        suggestion({
          site: { id: 2, name: 'Middle Reef', latitude: 2, longitude: 2 },
          score: 3.2,
          reasons: ['Only 1 dive logged here so far - an underrated pick.'],
        }),
        suggestion({
          site: { id: 3, name: 'Deep Trench', latitude: 3, longitude: 3 },
          score: -2.6,
          reasons: ['Notably deeper than your own logged max.'],
        }),
      ],
    })
    const w = await mountView()

    expect(w.text()).toContain('Blue Hole')
    expect(w.text()).toContain('due for a revisit')
    expect(w.text()).toContain('Middle Reef')
    expect(w.text()).toContain('underrated pick')
    expect(w.text()).toContain('Deep Trench')
    expect(w.text()).toContain('8.1')
    expect(w.text()).toContain('3.2')
    expect(w.text()).toContain('-2.6')

    const badges = w.findAll('.suggestion-score-badge')
    expect(badges).toHaveLength(3)
    expect(badges[0]!.classes()).toContain('suggestion-score-high')
    expect(badges[1]!.classes()).toContain('suggestion-score-mid')
    expect(badges[2]!.classes()).toContain('suggestion-score-low')

    const links = w.findAllComponents(RouterLinkStub)
    expect(links.some((l) => JSON.stringify(l.props('to')).includes('"siteId":"1"'))).toBe(true)
  })

  it('shows the empty state when there are no suggestions', async () => {
    getWithToken.mockResolvedValue({ data: [] })
    const w = await mountView()
    expect(w.text()).toContain('No suggestions yet')
  })

  it('shows an error message when the request fails', async () => {
    getWithToken.mockRejectedValue(new Error('network down'))
    const w = await mountView()
    expect(w.text()).toContain('Failed to load suggestions')
  })

  it('omits lat/lon and flags location as unavailable when geolocation is missing', async () => {
    getWithToken.mockResolvedValue({ data: [] })
    const w = await mountView()

    expect(getWithToken).toHaveBeenCalledWith(
      '/v1/dives/sites/suggestions',
      expect.objectContaining({ params: { limit: 12 } }),
    )
    expect(w.text()).toContain('Location unavailable')
  })

  it('includes lat/lon and hides the location note when geolocation succeeds', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: { latitude: 12.5, longitude: 34.5 },
          } as GeolocationPosition),
      },
    })
    getWithToken.mockResolvedValue({ data: [] })
    const w = await mountView()

    expect(getWithToken).toHaveBeenCalledWith(
      '/v1/dives/sites/suggestions',
      expect.objectContaining({
        params: { limit: 12, lat: 12.5, lon: 34.5, maxDistanceKm: 50 },
      }),
    )
    expect(w.text()).not.toContain('Location unavailable')
  })

  it('re-fetches when Refresh is clicked', async () => {
    getWithToken.mockResolvedValue({ data: [] })
    const w = await mountView()
    expect(getWithToken).toHaveBeenCalledTimes(1)

    const refreshButton = w.findAll('button').find((b) => b.text().includes('Refresh'))
    await refreshButton?.trigger('click')
    await flushPromises()
    expect(getWithToken).toHaveBeenCalledTimes(2)
  })

  it('separates the top pick from the rest under a "More to consider" heading', async () => {
    getWithToken.mockResolvedValue({
      data: [
        suggestion({
          site: { id: 1, name: 'Blue Hole', latitude: 1, longitude: 1 },
          score: 9.0,
          topPick: true,
        }),
        suggestion({ site: { id: 2, name: 'Middle Reef', latitude: 2, longitude: 2 }, score: 3.0 }),
      ],
    })
    const w = await mountView()

    expect(w.find('.top-pick-card').exists()).toBe(true)
    expect(w.text()).toContain('Top pick')
    expect(w.text()).not.toContain('Tied top pick')
    expect(w.text()).toContain('More to consider')
  })

  it('shows "Tied top pick" wording when two sites tie for the top', async () => {
    getWithToken.mockResolvedValue({
      data: [
        suggestion({
          site: { id: 1, name: 'Twin A', latitude: 1, longitude: 1 },
          score: 5.0,
          topPick: true,
        }),
        suggestion({
          site: { id: 2, name: 'Twin B', latitude: 2, longitude: 2 },
          score: 5.0,
          topPick: true,
        }),
      ],
    })
    const w = await mountView()

    expect(w.findAll('.top-pick-card')).toHaveLength(2)
    expect(w.text()).toContain('Tied top pick')
    expect(w.text()).not.toContain('More to consider')
  })

  it('sends the selected distance preference and refetches when a chip is clicked', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition),
      },
    })
    getWithToken.mockResolvedValue({ data: [] })
    const w = await mountView()
    expect(getWithToken).toHaveBeenCalledTimes(1)

    const dayTrip = w.findAll('button').find((b) => b.text() === 'Day trip')
    await dayTrip?.trigger('click')
    await flushPromises()

    expect(getWithToken).toHaveBeenCalledTimes(2)
    expect(getWithToken).toHaveBeenLastCalledWith(
      '/v1/dives/sites/suggestions',
      expect.objectContaining({
        params: { limit: 12, lat: 1, lon: 2, maxDistanceKm: 100 },
      }),
    )
  })
})
