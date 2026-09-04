import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeActivityExtras from '@/components/home/HomeActivityExtras.vue'
import type { DiverActivityStats } from '@/lib/types/home'

const stats = (over: Partial<DiverActivityStats> = {}): DiverActivityStats => ({
  divesByMonth: [],
  recentDivesPerMonth: 0,
  recentDivesPerYear: 0,
  eraStartMonth: null,
  eraPrecededByPause: false,
  typicalIntervalDays: null,
  daysSinceLastDive: null,
  expectedNextDiveBy: null,
  overdue: false,
  recentCadenceDays: null,
  cadenceTrend: 'UNKNOWN',
  nudgeThresholdDays: null,
  nudgeLevel: 'NONE',
  currentMonthStreak: 0,
  longestMonthStreak: 0,
  busiestMonth: null,
  busiestMonthShare: 0,
  depthTrend: 'UNKNOWN',
  recentAvgMaxDepth: null,
  priorAvgMaxDepth: null,
  distinctSites: 0,
  newSitesThisYear: 0,
  divesThisYear: 0,
  projectedDivesThisYear: null,
  nextMilestone: null,
  divesToNextMilestone: null,
  ...over,
})

describe('HomeActivityExtras', () => {
  it('renders nothing when there is nothing noteworthy', () => {
    const w = mount(HomeActivityExtras, { props: { stats: stats() } })
    expect(w.find('span').exists()).toBe(false)
  })

  it('prefers a live streak over a past best run', () => {
    const w = mount(HomeActivityExtras, {
      props: { stats: stats({ currentMonthStreak: 4, longestMonthStreak: 9 }) },
    })
    expect(w.text()).toContain('4-month streak')
    expect(w.text()).not.toContain('Best run')
  })

  it('falls back to the best run once the streak is broken', () => {
    const w = mount(HomeActivityExtras, {
      props: { stats: stats({ currentMonthStreak: 0, longestMonthStreak: 9 }) },
    })
    expect(w.text()).toContain('Best run: 9 months')
  })

  it('only shows seasonality when one month clearly dominates', () => {
    expect(
      mount(HomeActivityExtras, { props: { stats: stats({ busiestMonth: 8, busiestMonthShare: 0.1 }) } }).text(),
    ).not.toContain('Mostly dives')
    expect(
      mount(HomeActivityExtras, { props: { stats: stats({ busiestMonth: 8, busiestMonthShare: 0.3 }) } }).text(),
    ).toContain('Mostly dives in August')
  })

  it('shows a shallower-lately trend without a depth number', () => {
    const w = mount(HomeActivityExtras, { props: { stats: stats({ depthTrend: 'SHALLOWER' }) } })
    expect(w.text()).toContain('Shallower lately')
  })

  it('singularises the new-site chip', () => {
    expect(
      mount(HomeActivityExtras, { props: { stats: stats({ newSitesThisYear: 1 }) } }).text(),
    ).toContain('1 new site this year')
    expect(
      mount(HomeActivityExtras, { props: { stats: stats({ newSitesThisYear: 3 }) } }).text(),
    ).toContain('3 new sites this year')
  })

  it('shows the milestone chip only when both fields are present', () => {
    expect(
      mount(HomeActivityExtras, {
        props: { stats: stats({ nextMilestone: 50, divesToNextMilestone: 4 }) },
      }).text(),
    ).toContain('4 to dive #50')
    expect(
      mount(HomeActivityExtras, { props: { stats: stats({ nextMilestone: 50 }) } }).text(),
    ).not.toContain('to dive #')
  })
})
