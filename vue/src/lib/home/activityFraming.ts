import type { HomeDashboard, HomeMonthlyCount, HomeWindow } from '@/lib/types/home'
import { parseISODurationToMinutes } from '@/lib/utils/timeUtils'

/**
 * The home dashboard's "activity" block is deliberately *not fixed* (per the user): it headlines a
 * short window when you've been diving a lot lately, and a rolling 12-month window otherwise.
 *
 * The *rate* it quotes ("~N/yr") is short-term and pause-aware: it's computed over the diver's
 * *current diving era*. `divesByMonth` from the backend is walked back from the most recent dive
 * month, stopping at the first gap that's a real pause *for this diver* (~3x their own typical
 * month-to-month gap). So a diver who did 8 dives in 2021, stopped for two years, then came back
 * and now dives monthly sees "~50/yr", not the all-time "~15/yr". All-time totals live in the
 * headline tiles above, never here.
 */
export type ActivityMode = 'BUSY' | 'STEADY' | 'OCCASIONAL' | 'NONE'

export interface ActivityFraming {
  mode: ActivityMode
  /** e.g. "Last 30 days", "Last 12 months". */
  headlineLabel: string
  dives: number
  /** hours over the headline window, rounded to 1dp; null when unknown. */
  hours: number | null
  /** optional "vs …" line under the headline. */
  comparison: { text: string; direction: 'up' | 'down' | 'flat' } | null
  /** the always-present rate context, e.g. "diving since 2019 · ~9/yr" or "~50/yr since May 2024"
   * (never repeats the headline tiles). */
  footnote: string
  /** an "It's been X" fragment ("6 weeks", "8 months") when the diver has paused for noticeably
   * longer than is normal *for them*; null when they're on their usual cadence. */
  staleNote: string | null
}

const DAY = 24 * 60 * 60 * 1000
const DAYS_PER_MONTH = 365.25 / 12
const MS_PER_MONTH = DAYS_PER_MONTH * DAY

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

function windowHours(w: HomeWindow): number | null {
  if (w.bottomTime == null) return null
  return Math.round((parseISODurationToMinutes(w.bottomTime) / 60) * 10) / 10
}

/** "2024-05" -> a monotonic month integer for gap arithmetic. */
function monthIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return (y ?? 0) * 12 + ((m ?? 1) - 1)
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y ?? 2000, (m ?? 1) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

interface Era {
  ratePerMonth: number
  ratePerYear: number
  /** "YYYY-MM" the current era started at. */
  startMonth: string
  /** true when there are earlier dives cut off from the era by a real pause. */
  precededByPause: boolean
  /** median months between consecutive dive-months in the era (>= ~0.5). */
  typicalGapMonths: number
}

function currentEra(byMonth: HomeMonthlyCount[]): Era | null {
  const active = byMonth
    .filter((b) => b.count > 0)
    .map((b) => ({ idx: monthIndex(b.month), month: b.month, count: b.count }))
    .sort((a, b) => a.idx - b.idx)
  if (!active.length) return null

  let start = active.length - 1
  const eraGaps: number[] = []
  for (let i = active.length - 1; i > 0; i--) {
    const gap = active[i]!.idx - active[i - 1]!.idx
    // While the cadence is still unknown be generous (5 months); once we've seen a few gaps,
    // a pause is ~3x this diver's own typical gap, clamped to a sane band.
    const cutoff = eraGaps.length >= 2 ? clamp(Math.round(median(eraGaps) * 3), 4, 15) : 5
    if (gap > cutoff) break
    eraGaps.push(gap)
    start = i - 1
  }

  const era = active.slice(start)
  const dives = era.reduce((s, m) => s + m.count, 0)
  const spanMonths = Math.max(1, era[era.length - 1]!.idx - era[0]!.idx + 1)
  const ratePerMonth = dives / spanMonths
  return {
    ratePerMonth,
    ratePerYear: Math.round(ratePerMonth * 12),
    startMonth: era[0]!.month,
    precededByPause: start > 0,
    typicalGapMonths: median(eraGaps) || 1,
  }
}

export function pickActivityFraming(home: HomeDashboard): ActivityFraming {
  const { diveCount, windows, firstDiveStart, lastDiveStart, divesByMonth } = home
  const w30 = windows.last30Days
  const w365 = windows.last365Days
  const wPrev = windows.previous365Days

  if (diveCount === 0) {
    return {
      mode: 'NONE',
      headlineLabel: 'No dives yet',
      dives: 0,
      hours: null,
      comparison: null,
      footnote: 'Log your first dive to start tracking.',
      staleNote: null,
    }
  }

  const era = currentEra(divesByMonth ?? [])
  // Recent per-month rate: the era's, else the rolling year, else (older backend / very new
  // logbook) the all-time average.
  const recentPerMonth =
    era?.ratePerMonth ??
    (w365.diveCount > 0
      ? w365.diveCount / 12
      : firstDiveStart != null
        ? diveCount / Math.max(1, (Date.now() - firstDiveStart) / MS_PER_MONTH)
        : 0)
  const recentPerYear = era?.ratePerYear ?? Math.round(recentPerMonth * 12)

  // Footnote: the rate picture only. When the diving history has a real gap before the current
  // era, anchor the rate to when they got back into it rather than to a misleading all-time start.
  const firstYear = firstDiveStart != null ? new Date(firstDiveStart).getFullYear() : null
  const earliestMonth = (divesByMonth ?? [])[0]?.month
  const eraStartsWellAfterFirstDive =
    era != null &&
    earliestMonth != null &&
    monthIndex(era.startMonth) - monthIndex(earliestMonth) >= 10

  let footnote: string
  if (era?.precededByPause && eraStartsWellAfterFirstDive && recentPerYear > 0) {
    footnote = `~${recentPerYear}/yr since ${monthLabel(era.startMonth)}`
  } else if (firstYear != null && recentPerYear > 0) {
    footnote = `diving since ${firstYear} · ~${recentPerYear}/yr`
  } else if (firstYear != null) {
    footnote = `diving since ${firstYear}`
  } else {
    footnote = ''
  }

  // Stale: only when the gap since the last dive is unusual *for this diver*.
  let staleNote: string | null = null
  if (lastDiveStart != null) {
    const daysSince = (Date.now() - lastDiveStart) / DAY
    const typicalGapDays =
      era != null
        ? era.typicalGapMonths * DAYS_PER_MONTH
        : recentPerMonth > 0
          ? DAYS_PER_MONTH / recentPerMonth
          : 90
    if (daysSince >= clamp(typicalGapDays * 2.5, 42, 245)) {
      staleNote =
        daysSince < 100
          ? `${Math.round(daysSince / 7)} weeks`
          : `${Math.round(daysSince / DAYS_PER_MONTH)} months`
    }
  }

  // BUSY: the last 30 days are clearly above the diver's recent rate (and a few dives at least).
  if (w30.diveCount >= Math.max(3, recentPerMonth * 1.6)) {
    const rate = recentPerMonth < 0.75 ? '1' : String(Math.round(recentPerMonth))
    return {
      mode: 'BUSY',
      headlineLabel: 'Last 30 days',
      dives: w30.diveCount,
      hours: windowHours(w30),
      comparison: { text: `above your recent ~${rate}/mo`, direction: 'up' },
      footnote,
      staleNote,
    }
  }

  // STEADY: enough dives in the last year to compare year-on-year.
  if (w365.diveCount >= 3) {
    const delta = w365.diveCount - wPrev.diveCount
    const comparison =
      delta === 0
        ? { text: 'same as the year before', direction: 'flat' as const }
        : {
            text: `${delta > 0 ? '+' : ''}${delta} vs the year before`,
            direction: delta > 0 ? ('up' as const) : ('down' as const),
          }
    return {
      mode: 'STEADY',
      headlineLabel: 'Last 12 months',
      dives: w365.diveCount,
      hours: windowHours(w365),
      comparison,
      footnote,
      staleNote,
    }
  }

  // OCCASIONAL: not much lately - show the rolling year, no year-on-year delta (too sparse to
  // mean anything), let the footnote carry the rate.
  return {
    mode: 'OCCASIONAL',
    headlineLabel: 'Last 12 months',
    dives: w365.diveCount,
    hours: windowHours(w365),
    comparison: null,
    footnote,
    staleNote,
  }
}
