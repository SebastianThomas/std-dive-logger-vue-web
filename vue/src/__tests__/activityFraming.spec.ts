import { describe, it, expect } from 'vitest'
import { pickActivityFraming } from '@/lib/home/activityFraming'
import type { HomeDashboard, HomeActivity, HomeMonthlyCount } from '@/lib/types/home'

const DAY = 86_400_000

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
  divesByMonth: [],
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

/** N months (0..count-1 months ago), each with `count` dives. */
const monthlyRun = (fromMonthsAgo: number, months: number, count: number): HomeMonthlyCount[] =>
  Array.from({ length: months }, (_, i) => ({ month: ym(fromMonthsAgo - i), count }))

const yrFromFootnote = (s: string): number => Number(s.match(/~(\d+)\/yr/)?.[1] ?? '0')

describe('pickActivityFraming', () => {
  it('NONE when there are no dives', () => {
    expect(pickActivityFraming(base()).mode).toBe('NONE')
  })

  it("quotes a pause-aware recent rate, not the all-time average (the user's case)", () => {
    // 8 dives in 2021/2022 (~54 months ago), a two-year gap, then ~5/month since ~28 months ago.
    const divesByMonth: HomeMonthlyCount[] = [
      { month: ym(54), count: 3 },
      { month: ym(53), count: 3 },
      { month: ym(52), count: 2 },
      ...monthlyRun(28, 29, 5),
    ]
    const diveCount = 8 + 29 * 5
    const f = pickActivityFraming(
      base({
        diveCount,
        firstDiveStart: Date.now() - 54 * 30 * DAY,
        lastDiveStart: Date.now() - 3 * DAY,
        divesByMonth,
        windows: {
          last30Days: { diveCount: 5, bottomTime: 'PT5H' },
          last365Days: { diveCount: 58, bottomTime: 'PT44H' },
          previous365Days: { diveCount: 52, bottomTime: null },
        },
      }),
    )

    // 5 dives in 30 days is this diver's *normal* rate now - not "BUSY".
    expect(f.mode).toBe('STEADY')
    // the rate reflects the current era (~60/yr), nowhere near the all-time ~15/yr
    expect(f.footnote).toMatch(/~\d+\/yr since \w+ \d{4}/)
    expect(yrFromFootnote(f.footnote)).toBeGreaterThan(45)
    expect(yrFromFootnote(f.footnote)).toBeLessThan(75)
    // it doesn't anchor the rate to the misleading 2021 start
    expect(f.footnote).not.toMatch(/diving since 20/)
  })

  it('BUSY when the last 30 days are well above the diver\'s recent rate', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 80,
        firstDiveStart: Date.now() - 24 * 30 * DAY,
        lastDiveStart: Date.now() - 2 * DAY,
        divesByMonth: monthlyRun(23, 24, 3), // ~3/month usually
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
        divesByMonth: monthlyRun(39, 40, 1),
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
        divesByMonth: monthlyRun(39, 40, 1),
        windows: {
          last30Days: { diveCount: 0, bottomTime: null },
          last365Days: { diveCount: 5, bottomTime: 'PT4H' },
          previous365Days: { diveCount: 14, bottomTime: null },
        },
      }),
    )
    expect(f.comparison).toEqual({ text: '-9 vs the year before', direction: 'down' })
  })

  it('OCCASIONAL for a sparse diver, and a few months without a dive is not flagged as stale', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 12,
        totalBottomTime: 'PT9H',
        firstDiveStart: Date.now() - 6 * 365 * DAY,
        lastDiveStart: Date.now() - 150 * DAY,
        // dives every ~5 months
        divesByMonth: [
          { month: ym(20), count: 2 },
          { month: ym(15), count: 2 },
          { month: ym(10), count: 2 },
          { month: ym(5), count: 2 },
        ],
        windows: {
          last30Days: { diveCount: 0, bottomTime: null },
          last365Days: { diveCount: 4, bottomTime: 'PT3H' },
          previous365Days: { diveCount: 2, bottomTime: null },
        },
      }),
    )
    expect(f.mode).toBe('STEADY') // w365 >= 3
    expect(f.footnote).toMatch(/diving since \d{4}/)
    expect(f.footnote).toContain('/yr')
    expect(f.footnote).not.toMatch(/\d+ dives/)
    // 5-month gap is normal for someone who dives every ~5 months
    expect(f.staleNote).toBeNull()
  })

  it('flags a short pause as stale for a frequent diver (adaptive threshold)', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 60,
        firstDiveStart: Date.now() - 20 * 30 * DAY,
        lastDiveStart: Date.now() - 80 * DAY, // ~11 weeks
        divesByMonth: monthlyRun(19, 18, 3), // dives every month
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
        divesByMonth: monthlyRun(60, 60, 2),
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
        divesByMonth: monthlyRun(2, 3, 2),
        windows: {
          last30Days: { diveCount: 1, bottomTime: 'PT40M' },
          last365Days: { diveCount: 5, bottomTime: 'PT4H' },
          previous365Days: { diveCount: 0, bottomTime: null },
        },
      }),
    )
    expect(f.staleNote).toBeNull()
  })

  it('falls back gracefully when the backend sends no divesByMonth', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 40,
        firstDiveStart: Date.now() - 40 * 30 * DAY,
        divesByMonth: undefined,
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
