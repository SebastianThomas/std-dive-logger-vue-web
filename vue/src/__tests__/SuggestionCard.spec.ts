import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import SuggestionCard from '@/components/dive/SuggestionCard.vue'
import type { DiveSiteSuggestion } from '@/lib/types/dive'

const suggestion = (over: Partial<DiveSiteSuggestion> = {}): DiveSiteSuggestion => ({
  site: { id: 7, name: 'Blue Hole', latitude: 1, longitude: 1 },
  score: 5.5,
  reasons: ['Only ~10km from your current location.'],
  totalDives: 2,
  topPick: false,
  ...over,
})

const mountCard = (s: DiveSiteSuggestion) =>
  mount(SuggestionCard, {
    props: { suggestion: s },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })

describe('SuggestionCard', () => {
  it('renders the site name, score, dive count and reasons', () => {
    const w = mountCard(suggestion())
    expect(w.text()).toContain('Blue Hole')
    expect(w.text()).toContain('5.5')
    expect(w.text()).toContain('2 dives logged')
    expect(w.text()).toContain('Only ~10km from your current location.')
    const link = w.findComponent(RouterLinkStub)
    expect(JSON.stringify(link.props('to'))).toContain('"siteId":"7"')
  })

  it('shows the singular "dive" for a single dive', () => {
    const w = mountCard(suggestion({ totalDives: 1 }))
    expect(w.text()).toContain('1 dive logged')
    expect(w.text()).not.toContain('1 dives')
  })

  it('shows distance when given', () => {
    const w = mountCard(suggestion({ distanceKm: 12.4 }))
    expect(w.text()).toContain('~12km away')
  })

  it.each([
    [8.5, 'suggestion-score-high'],
    [4.0, 'suggestion-score-mid'],
    [-1.0, 'suggestion-score-low'],
  ])('scores %s as %s', (score, expectedClass) => {
    const w = mountCard(suggestion({ score }))
    expect(w.find('.suggestion-score-badge').classes()).toContain(expectedClass)
  })
})
