import { describe, it, expect } from 'vitest'
import { pickActivityFraming } from '@/lib/home/activityFraming'
import type { HomeDashboard, HomeActivity } from '@/lib/types/home'

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
  recentDives: [],
  highlightedDives: [],
  topBuddies: [],
  records: {},
  ...over,
})

describe('pickActivityFraming', () => {
  it('NONE when there are no dives', () => {
    expect(pickActivityFraming(base()).mode).toBe('NONE')
  })

  it('BUSY when the last 30 days are well above the all-time rate', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 60,
        firstDiveStart: Date.now() - 60 * 30 * DAY, // ~2 dives/mo all-time
        windows: {
          last30Days: { diveCount: 8, bottomTime: 'PT6H' },
          last365Days: { diveCount: 20, bottomTime: 'PT15H' },
          previous365Days: { diveCount: 18, bottomTime: null },
        },
      }),
    )
    expect(f.mode).toBe('BUSY')
    expect(f.dives).toBe(8)
    expect(f.hours).toBe(6)
    expect(f.comparison?.direction).toBe('up')
  })

  it('STEADY with a year-on-year delta when the last 12 months have ≥3 dives', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 40,
        firstDiveStart: Date.now() - 40 * 30 * DAY,
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
        windows: {
          last30Days: { diveCount: 0, bottomTime: null },
          last365Days: { diveCount: 5, bottomTime: 'PT4H' },
          previous365Days: { diveCount: 14, bottomTime: null },
        },
      }),
    )
    expect(f.comparison).toEqual({ text: '-9 vs the year before', direction: 'down' })
  })

  it('OCCASIONAL when there is little recent activity', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 12,
        totalBottomTime: 'PT9H',
        firstDiveStart: Date.now() - 6 * 365 * DAY,
        lastDiveStart: Date.now() - 200 * DAY,
        windows: {
          last30Days: { diveCount: 0, bottomTime: null },
          last365Days: { diveCount: 1, bottomTime: 'PT40M' },
          previous365Days: { diveCount: 2, bottomTime: null },
        },
      }),
    )
    expect(f.mode).toBe('OCCASIONAL')
    // headlines the rolling year, not the all-time total (that's a headline tile)
    expect(f.dives).toBe(1)
    expect(f.comparison).toBeNull()
    // footnote carries the rate picture only - never repeats total dives / hours
    expect(f.footnote).toMatch(/diving since \d{4}/)
    expect(f.footnote).toContain('/yr')
    expect(f.footnote).not.toMatch(/\d+ dives/)
    expect(f.staleMonths).toBeGreaterThanOrEqual(6)
  })

  it('footnote never restates the total dive count or bottom time', () => {
    const f = pickActivityFraming(
      base({
        diveCount: 135,
        totalBottomTime: 'PT114H30M',
        firstDiveStart: Date.now() - 9 * 365 * DAY,
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
        windows: {
          last30Days: { diveCount: 1, bottomTime: 'PT40M' },
          last365Days: { diveCount: 2, bottomTime: 'PT1H' },
          previous365Days: { diveCount: 0, bottomTime: null },
        },
      }),
    )
    expect(f.staleMonths).toBeNull()
  })
})
