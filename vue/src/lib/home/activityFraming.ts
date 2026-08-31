import type { HomeDashboard, HomeWindow } from '@/lib/types/home'
import { parseISODurationToMinutes } from '@/lib/utils/timeUtils'

/**
 * The home dashboard's "activity" block is deliberately *not fixed* (per the user): it headlines a
 * short window when you've been diving a lot lately, a rolling 12-month window when you dive
 * steadily, and all-time totals when you dive occasionally.
 */
export type ActivityMode = 'BUSY' | 'STEADY' | 'OCCASIONAL' | 'NONE'

export interface ActivityFraming {
  mode: ActivityMode
  /** e.g. "This month", "Last 12 months", "All time". */
  headlineLabel: string
  dives: number
  /** hours over the headline window, rounded to 1dp; null when unknown. */
  hours: number | null
  /** optional "vs …" line under the headline. */
  comparison: { text: string; direction: 'up' | 'down' | 'flat' } | null
  /** always-present all-time context, e.g. "58 dives · 71h all-time · ~9/yr". */
  footnote: string
  /** months since the last logged dive, only when it's been a while (≥ 5). */
  staleMonths: number | null
}

const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000

function windowHours(w: HomeWindow): number | null {
  if (w.bottomTime == null) return null
  return Math.round((parseISODurationToMinutes(w.bottomTime) / 60) * 10) / 10
}

function monthsSince(epochMs: number | null | undefined): number {
  if (epochMs == null) return 1
  return Math.max(1, (Date.now() - epochMs) / MS_PER_MONTH)
}

export function pickActivityFraming(home: HomeDashboard): ActivityFraming {
  const { diveCount, windows, firstDiveStart, lastDiveStart, totalBottomTime } = home
  const w30 = windows.last30Days
  const w365 = windows.last365Days
  const wPrev = windows.previous365Days

  const perMonth = diveCount / monthsSince(firstDiveStart)
  const perYear = Math.round(perMonth * 12)
  const totalHours =
    totalBottomTime == null
      ? null
      : Math.round((parseISODurationToMinutes(totalBottomTime) / 60) * 10) / 10

  const footnoteParts = [`${diveCount} ${diveCount === 1 ? 'dive' : 'dives'}`]
  if (totalHours != null && totalHours > 0) footnoteParts.push(`${totalHours}h`)
  let footnote = `${footnoteParts.join(' · ')} all-time`
  if (firstDiveStart != null && perYear > 0) footnote += ` · ~${perYear}/yr`

  const staleMonths =
    lastDiveStart != null && diveCount > 0
      ? Math.floor((Date.now() - lastDiveStart) / MS_PER_MONTH)
      : null
  const stale = staleMonths != null && staleMonths >= 5 ? staleMonths : null

  if (diveCount === 0) {
    return {
      mode: 'NONE',
      headlineLabel: 'No dives yet',
      dives: 0,
      hours: null,
      comparison: null,
      footnote: 'Log your first dive to start tracking.',
      staleMonths: null,
    }
  }

  // Busy lately: this month is well above your usual rate (and at least a few dives).
  if (w30.diveCount >= Math.max(3, perMonth * 1.5)) {
    const rate = perMonth < 1 ? '1' : String(Math.round(perMonth))
    return {
      mode: 'BUSY',
      headlineLabel: 'Last 30 days',
      dives: w30.diveCount,
      hours: windowHours(w30),
      comparison: { text: `well above your usual ~${rate}/mo`, direction: 'up' },
      footnote,
      staleMonths: stale,
    }
  }

  // Steady: enough dives in the last year to compare year-on-year.
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
      staleMonths: stale,
    }
  }

  // Occasional: not much lately - just show the all-time picture.
  return {
    mode: 'OCCASIONAL',
    headlineLabel: 'All time',
    dives: diveCount,
    hours: totalHours,
    comparison:
      perYear > 0 ? { text: `~${perYear} a year`, direction: 'flat' } : null,
    footnote,
    staleMonths: stale,
  }
}
