import type { HomeDashboard, HomeWindow } from '@/lib/types/home'
import { parseISODurationToMinutes } from '@/lib/utils/timeUtils'

/**
 * The home dashboard's "activity" block is deliberately *not fixed* (per the user): it headlines a
 * short window when you've been diving a lot lately, and a rolling 12-month window otherwise.
 *
 * The pause-aware maths - a "recent rate" over the diver's *current diving era* (real gaps
 * excluded), the typical interval, whether they're overdue - is precomputed and cached server-side
 * (`home.activityStats`, from the analytics deployable). This module only picks *which* window to
 * headline and writes the copy. All-time totals live in the headline tiles above, never here.
 */
export type ActivityMode = 'BUSY' | 'STEADY' | 'OCCASIONAL' | 'NONE'

export interface ActivityFraming {
  mode: ActivityMode
  headlineLabel: string
  dives: number
  hours: number | null
  comparison: { text: string; direction: 'up' | 'down' | 'flat' } | null
  /** e.g. "diving since 2019 · ~9/yr" or "~50/yr since May 2024" (never repeats the tiles). */
  footnote: string
  /** an "It's been X" fragment ("6 weeks", "8 months") when the diver is overdue for a dive
   * relative to their own cadence; null otherwise. */
  staleNote: string | null
}

const DAYS_PER_MONTH = 365.25 / 12

function windowHours(w: HomeWindow): number | null {
  if (w.bottomTime == null) return null
  return Math.round((parseISODurationToMinutes(w.bottomTime) / 60) * 10) / 10
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y ?? 2000, (m ?? 1) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

/** "It's been 6 weeks" / "It's been 8 months" from a day count. */
export function staleFragment(daysSince: number): string {
  return daysSince < 100
    ? `${Math.round(daysSince / 7)} weeks`
    : `${Math.round(daysSince / DAYS_PER_MONTH)} months`
}

export function pickActivityFraming(home: HomeDashboard): ActivityFraming {
  const { diveCount, windows, firstDiveStart, activityStats: a } = home
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

  const recentPerMonth = a.recentDivesPerMonth || (w365.diveCount > 0 ? w365.diveCount / 12 : 0)
  const recentPerYear = a.recentDivesPerYear || Math.round(recentPerMonth * 12)

  // Footnote: the rate picture only. Anchor the rate to when the diver got back into it when the
  // history has a real gap before the current era; otherwise to their first year.
  const firstYear = firstDiveStart != null ? new Date(firstDiveStart).getFullYear() : null
  let footnote: string
  if (a.eraPrecededByPause && a.eraStartMonth && recentPerYear > 0) {
    footnote = `~${recentPerYear}/yr since ${monthLabel(a.eraStartMonth)}`
  } else if (firstYear != null && recentPerYear > 0) {
    footnote = `diving since ${firstYear} · ~${recentPerYear}/yr`
  } else if (firstYear != null) {
    footnote = `diving since ${firstYear}`
  } else {
    footnote = ''
  }

  const staleNote =
    a.overdue && a.daysSinceLastDive != null ? staleFragment(a.daysSinceLastDive) : null

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

  // OCCASIONAL: not much lately - show the rolling year, no year-on-year delta.
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
