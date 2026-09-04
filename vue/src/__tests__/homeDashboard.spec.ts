import { describe, it, expect, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises, RouterLinkStub, type VueWrapper } from '@vue/test-utils'
import type { DiverReminder, HomeDashboard } from '@/lib/types/home'

const getWithToken = vi.fn()
const postWithToken = vi.fn().mockResolvedValue({ status: 204 })
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ getWithToken, postWithToken }) }))
vi.mock('@/composables/useReadOnlyMode', () => ({
  useReadOnlyMode: () => ({ readOnly: ref(false) }),
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

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
  activityStats: {
    divesByMonth: [],
    recentDivesPerMonth: 1.7,
    recentDivesPerYear: 20,
    eraStartMonth: null,
    eraPrecededByPause: false,
    typicalIntervalDays: 18,
    daysSinceLastDive: 3,
    expectedNextDiveBy: Date.now() + 15 * 86_400_000,
    overdue: false,
    recentCadenceDays: 18,
    cadenceTrend: 'STEADY',
    nudgeThresholdDays: 32,
    nudgeLevel: 'NONE',
    currentMonthStreak: 3,
    longestMonthStreak: 5,
    busiestMonth: 7,
    busiestMonthShare: 0.22,
    depthTrend: 'DEEPER',
    recentAvgMaxDepth: 24,
    priorAvgMaxDepth: 19,
    distinctSites: 14,
    newSitesThisYear: 2,
    divesThisYear: 12,
    projectedDivesThisYear: 24,
    nextMilestone: 100,
    divesToNextMilestone: 3,
  },
  reminders: [],
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
  highlightedDives: [
    {
      id: 12,
      number: 40,
      identifier: 'Thistlegorm',
      siteName: 'Red Sea',
      start: Date.now() - 120 * 86_400_000,
      maxDepth: 30,
      bottomTime: 'PT48M',
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

const reminder = (over: Partial<DiverReminder> = {}): DiverReminder => ({
  id: 1,
  kind: 'DIVE_AGAIN_NUDGE',
  title: 'Time to go diving again',
  body: "It's been 7 weeks since your last dive — you usually dive about every 2 weeks. Plan the next one?",
  diveId: null,
  yearsAgo: null,
  relevantOn: '2026-09-03',
  createdAt: Date.now(),
  ...over,
})

const withReminders = (reminders: DiverReminder[]): HomeDashboard => ({ ...payload, reminders })

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
  postWithToken.mockClear()
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
    expect(w.text()).toContain('12 so far in ' + new Date().getFullYear())
    expect(w.text()).toContain('Records')
    expect(w.text()).not.toContain('Personal bests')
    expect(w.text()).toContain('Highlighted')
    expect(w.text()).toContain('Thistlegorm')
    expect(w.text()).toContain('House Reef')
    expect(w.text()).toContain('Alex')
    expect(w.text()).toContain('Log dive #98')
    expect(w.text()).toContain('3 dives to your 100th')

    const links = w.findAllComponents(RouterLinkStub)
    expect(links.some((l) => JSON.stringify(l.props('to')).includes('"diveId":5'))).toBe(true)
    expect(links.some((l) => JSON.stringify(l.props('to')).includes('"diveId":8'))).toBe(true)
    expect(links.some((l) => JSON.stringify(l.props('to')).includes('"diveId":12'))).toBe(true)
    expect(
      links.some((l) => JSON.stringify(l.props('to')).includes('"highlighted":"1"')),
    ).toBe(true)
  })

  it('renders the trend chips from the cached activity stats', async () => {
    getWithToken.mockResolvedValue({ data: payload })
    const w = await mountDashboard()

    expect(w.text()).toContain('3-month streak')
    expect(w.text()).toContain('Mostly dives in July')
    expect(w.text()).toContain('Going deeper (~24 m avg)')
    expect(w.text()).toContain('2 new sites this year')
    expect(w.text()).toContain('On track for ~24 this year')
    expect(w.text()).toContain('3 to dive #100')
  })

  it('shows no reminder banners when there are none', async () => {
    getWithToken.mockResolvedValue({ data: payload })
    const w = await mountDashboard()
    expect(w.text()).not.toContain('Plan the next one?')
    expect(w.text()).not.toContain('years ago today')
  })

  it('renders a dive-again nudge reminder and dismisses it via the API', async () => {
    getWithToken.mockResolvedValue({ data: withReminders([reminder({ id: 7 })]) })
    const w = await mountDashboard()

    expect(w.text()).toContain('Time to go diving again')
    expect(w.text()).toContain("It's been 7 weeks since your last dive")
    // the quieter in-section staleNote is suppressed while the banner is up
    expect(w.text()).not.toContain('since your last logged dive')

    const dismiss = w.find('button[title="Dismiss"]')
    expect(dismiss.exists()).toBe(true)
    await dismiss.trigger('click')
    await flushPromises()

    expect(postWithToken).toHaveBeenCalledWith('/v1/reminders/7/dismiss')
    expect(w.text()).not.toContain('Time to go diving again')
  })

  it('renders a dive anniversary reminder linking to the dive', async () => {
    getWithToken.mockResolvedValue({
      data: withReminders([
        reminder({
          id: 3,
          kind: 'DIVE_ANNIVERSARY',
          title: '3 years ago today',
          body: 'Blue Hole · 27 m · 45 min',
          diveId: 228,
          yearsAgo: 3,
        }),
      ]),
    })
    const w = await mountDashboard()

    expect(w.text()).toContain('3 years ago today')
    expect(w.text()).toContain('Blue Hole')
    const links = w.findAllComponents(RouterLinkStub)
    expect(links.some((l) => JSON.stringify(l.props('to')).includes('"diveId":228'))).toBe(true)
  })

  it('shows a retry affordance when the fetch fails', async () => {
    getWithToken.mockResolvedValue(undefined) // malformed response -> caught in load()
    const w = await mountDashboard()
    expect(w.text()).toContain('Retry')
    expect(w.text()).toContain("Couldn't load your dashboard")
  })
})
