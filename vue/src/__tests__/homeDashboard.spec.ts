import { describe, it, expect, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises, RouterLinkStub, type VueWrapper } from '@vue/test-utils'
import type { HomeDashboard } from '@/lib/types/home'

const getWithToken = vi.fn()
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ getWithToken }) }))
vi.mock('@/composables/useReadOnlyMode', () => ({
  useReadOnlyMode: () => ({ readOnly: ref(false) }),
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import DashboardComponent from '@/components/home/HomeDashboard.vue'

const payload: HomeDashboard = {
  userName: 'Sam',
  diveCount: 97,
  maxDiveNumber: 97,
  totalBottomTime: 'PT71H',
  maxDepth: 42.3,
  firstDiveStart: Date.now() - 400 * 86_400_000,
  lastDiveStart: Date.now() - 3 * 86_400_000,
  divesThisYear: 12,
  windows: {
    last30Days: { diveCount: 2, bottomTime: 'PT1H30M' },
    last365Days: { diveCount: 20, bottomTime: 'PT15H' },
    previous365Days: { diveCount: 14, bottomTime: null },
  },
  recentDives: [
    {
      id: 5,
      number: 97,
      identifier: 'House Reef',
      siteName: 'Malapascua',
      start: Date.now() - 3 * 86_400_000,
      maxDepth: 18.2,
      bottomTime: 'PT52M',
    },
  ],
  topBuddies: [
    { name: 'Alex', diveCount: 30 },
    { name: 'Jo', diveCount: 12 },
  ],
  records: {
    deepest: { diveId: 8, diveNumber: 60, maxDepth: 42.3, bottomTime: 'PT35M' },
    longest: { diveId: 9, diveNumber: 71, maxDepth: 12.0, bottomTime: 'PT1H48M' },
  },
}

let wrapper: VueWrapper | null = null

const mountDashboard = async () => {
  wrapper = mount(DashboardComponent, {
    global: { stubs: { RouterLink: RouterLinkStub, HomeQuickLinks: true } },
  })
  await flushPromises()
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  getWithToken.mockReset()
})

describe('HomeDashboard', () => {
  it('renders the greeting, headline tiles, records, recent dives and buddies', async () => {
    getWithToken.mockResolvedValue({ data: payload })
    const w = await mountDashboard()

    expect(w.text()).toContain('Welcome back, Sam')
    expect(w.text()).toContain('97')
    expect(w.text()).toContain('42.3 m')
    expect(w.text()).toContain('Last 12 months') // adaptive framing (STEADY branch)
    expect(w.text()).toContain('+6 vs the year before')
    expect(w.text()).toContain('12 in ' + new Date().getFullYear())
    expect(w.text()).toContain('House Reef')
    expect(w.text()).toContain('Alex')
    expect(w.text()).toContain('Log dive #98')
    expect(w.text()).toContain('3 dives to your 100th')

    const links = w.findAllComponents(RouterLinkStub)
    expect(links.some((l) => JSON.stringify(l.props('to')).includes('"diveId":5'))).toBe(true)
    expect(links.some((l) => JSON.stringify(l.props('to')).includes('"diveId":8'))).toBe(true)
  })

  it('shows a retry affordance when the fetch fails', async () => {
    getWithToken.mockResolvedValue(undefined) // malformed response -> caught in load()
    const w = await mountDashboard()
    expect(w.text()).toContain('Retry')
    expect(w.text()).toContain("Couldn't load your dashboard")
  })
})
