import { describe, it, expect } from 'vitest'
import { pickActivityFraming, staleFragment } from '@/lib/home/activityFraming'
import type { HomeDashboard, HomeActivity, DiverActivityStats } from '@/lib/types/home'

const DAY = 86_400_000

/** All-zero cache blob (what the backend sends before the first analytics recompute). */
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

const base = (over: Partial<HomeDashboard> = {}): HomeDashboard => ({
  userName: 'Diver',
  diveCount: 0,
  maxDiveNumber: 0,
  totalBottomTime: null,
  maxDepth: null,
  firstDiveStart: null,
  lastDiveStart: null,
  divesThisYear: 0,
  windows: {
    last30Days: { diveCount: 0, bottomTime: null },
    last365Days: { diveCount: 0, bottomTime: null },
    previous365Days: { diveCount: 0, bottomTime: null },
  } satisfies HomeActivity,
  activityStats: stats(),
  reminders: [],
  recentDives: [],
  highlightedDives: [],
  topBuddies: [],
  records: {},
  ...over,
})

/** "YYYY-MM" for the month `monthsAgo` before the current one. */
const ym = (monthsAgo: number): string => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const yrFromFootnote = (s: string): number => Number(s.match(/~(\d+)\/yr/)?.[1] ?? '0')

describe('staleFragment', () => {
  it('reads as weeks under ~3 months and months beyond', () => {
    expect(staleFragment(21)).toBe('3 weeks')
    expect(staleFragment(80)).toBe('11 weeks')
    expect(staleFragment(120)).toBe('4 months')
    expect(staleFragment(200)).toBe('7 months')
  })
})

describe('pickActivityFraming', () => {
  it('NONE when there are no dives', () => {
    expect(pickActivityFraming(base()).mode).toBe('NONE')
  })

  it("quotes the cached pause-aware rate, not the all-time average (the user's case)", () => {
    // 8 dives in 2021/2022, a two-year gap, then ~5/month since ~28 months ago. The analytics
    // deployable already excluded the gap -> recentDivesPerYear ~60, era anchored to the restart.
    const f = pickActivityFraming(
      base({
        diveCount: 8 + 29 * 5,
        firstDiveStart: Date.now() - 54 * 30 * DAY,
        lastDiveStart: Date.now() - 3 * DAY,
        activityStats: stats({
          recentDivesPerMonth: 5,
          recentDivesPerYear: 60,
          eraStartMonth: ym(28),
          eraPrecededByPause: true,
        }),
        windows: {
          last30Days: { diveCount: 5, bottomTime: 'PT5H' },
          last365Days: { diveCount: 58, bottomTime: 'PT44H' },
          previous365Days: { diveCount: 52, bottomTime: null },
        },
      }),
    )

    // 5 dives in 30 days is this diver's *normal* rate now - not "BUSY".
    expect(f.mode).toBe('STEADY')
    expect(f.footnote).toMatch(/~\d+\/yr since \w+ \d{4}/)
    expect(yrFromFootnote(f.footnote)).toBe(60)
    // it doesn't anchor the rate to the misleading 2021 start
    expect(f.footnote).not.toMatch(/diving since 20/)
  })

  it("BUSY when the last 30 days are well above the diver's recent rate", () => {
    const f = pickActivityFraming(
      base({
        diveCount: 80,
        firstDiveStart: Date.now() - 24 * 30 * DAY,
        lastDiveStart: Date.now() - 2 * DAY,
        activityStats: stats({ recentDivesPerMonth: 3, recentDivesPerYear: 36, eraStartMonth: ym(23) }),
        windows: {
          last30Days: { diveCount: 10, bottomTime: 'PT8H' }, // a liveaboard week
          last365Days: { diveCount: 40, bottomTime: 'PT30H' },
          previous365Days: { diveCount: 36, bottomTime: null },
        },
      }),
    )
    expect(f.mode).toBe('BUSY')
    expect(f.dives).toBe(10)
    expect(f.hours).toBe(8)
    expect(f.comparison).toEqual({ text: 'above your recent ~3/mo', direction: 'up' })
  })

  it('STEADY with a year-on-year delta when the last 12 months have ≥3 dives', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 40,
        firstDiveStart: Date.now() - 40 * 30 * DAY,
        activityStats: stats({ recentDivesPerMonth: 1.5, recentDivesPerYear: 18 }),
        windows: {
          last30Days: { diveCount: 1, bottomTime: 'PT45M' },
          last365Days: { diveCount: 18, bottomTime: 'PT13H30M' },
          previous365Days: { diveCount: 12, bottomTime: null },
        },
      }),
    )
    expect(f.mode).toBe('STEADY')
    expect(f.dives).toBe(18)
    expect(f.comparison).toEqual({ text: '+6 vs the year before', direction: 'up' })
  })

  it('STEADY reports a drop as a down delta', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 40,
        firstDiveStart: Date.now() - 40 * 30 * DAY,
        activityStats: stats({ recentDivesPerMonth: 0.5, recentDivesPerYear: 6 }),
        windows: {
          last30Days: { diveCount: 0, bottomTime: null },
          last365Days: { diveCount: 5, bottomTime: 'PT4H' },
          previous365Days: { diveCount: 14, bottomTime: null },
        },
      }),
    )
    expect(f.comparison).toEqual({ text: '-9 vs the year before', direction: 'down' })
  })

  it('OCCASIONAL for a sparse diver, and a normal-length gap is not flagged as stale', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 12,
        totalBottomTime: 'PT9H',
        firstDiveStart: Date.now() - 6 * 365 * DAY,
        lastDiveStart: Date.now() - 150 * DAY,
        // dives every ~5 months - the backend doesn't mark this diver overdue
        activityStats: stats({
          recentDivesPerMonth: 0.2,
          recentDivesPerYear: 2,
          typicalIntervalDays: 150,
          daysSinceLastDive: 150,
          overdue: false,
        }),
        windows: {
          last30Days: { diveCount: 0, bottomTime: null },
          last365Days: { diveCount: 2, bottomTime: 'PT1H30M' },
          previous365Days: { diveCount: 2, bottomTime: null },
        },
      }),
    )
    expect(f.mode).toBe('OCCASIONAL')
    expect(f.footnote).toMatch(/diving since \d{4}/)
    expect(f.footnote).toContain('/yr')
    expect(f.footnote).not.toMatch(/\d+ dives/)
    expect(f.staleNote).toBeNull()
  })

  it('surfaces a stale fragment when the backend marks the diver overdue', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 60,
        firstDiveStart: Date.now() - 20 * 30 * DAY,
        lastDiveStart: Date.now() - 80 * DAY, // ~11 weeks
        activityStats: stats({
          recentDivesPerMonth: 3,
          recentDivesPerYear: 36,
          typicalIntervalDays: 12,
          daysSinceLastDive: 80,
          overdue: true,
        }),
        windows: {
          last30Days: { diveCount: 0, bottomTime: null },
          last365Days: { diveCount: 30, bottomTime: 'PT22H' },
          previous365Days: { diveCount: 28, bottomTime: null },
        },
      }),
    )
    expect(f.staleNote).toBe('11 weeks')
  })

  it('footnote never restates the total dive count or bottom time', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 135,
        totalBottomTime: 'PT114H30M',
        firstDiveStart: Date.now() - 9 * 365 * DAY,
        activityStats: stats({ recentDivesPerMonth: 1.3, recentDivesPerYear: 16 }),
        windows: {
          last30Days: { diveCount: 1, bottomTime: 'PT50M' },
          last365Days: { diveCount: 16, bottomTime: 'PT12H' },
          previous365Days: { diveCount: 14, bottomTime: null },
        },
      }),
    )
    expect(f.footnote).not.toContain('135')
    expect(f.footnote).not.toContain('114')
    expect(f.footnote).not.toContain('all-time')
  })

  it('does not flag a recent dive as stale', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 5,
        lastDiveStart: Date.now() - 10 * DAY,
        activityStats: stats({
          recentDivesPerMonth: 2,
          recentDivesPerYear: 24,
          daysSinceLastDive: 10,
          overdue: false,
        }),
        windows: {
          last30Days: { diveCount: 1, bottomTime: 'PT40M' },
          last365Days: { diveCount: 5, bottomTime: 'PT4H' },
          previous365Days: { diveCount: 0, bottomTime: null },
        },
      }),
    )
    expect(f.staleNote).toBeNull()
  })

  it('derives a rate from the 12-month window when the cache has no era rate yet', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 40,
        firstDiveStart: Date.now() - 40 * 30 * DAY,
        activityStats: stats(), // all zeros: user not yet picked up by the analytics sweep
        windows: {
          last30Days: { diveCount: 1, bottomTime: 'PT45M' },
          last365Days: { diveCount: 18, bottomTime: 'PT13H' },
          previous365Days: { diveCount: 12, bottomTime: null },
        },
      }),
    )
    expect(f.mode).toBe('STEADY')
    expect(f.footnote).toMatch(/diving since \d{4} · ~\d+\/yr/)
  })
})
