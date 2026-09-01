import type { HomeDashboard, HomeWindow } from '@/lib/types/home'
import { parseISODurationToMinutes } from '@/lib/utils/timeUtils'

/**
 * The home dashboard's "activity" block is deliberately *not fixed* (per the user): it headlines a
 * short window when you've been diving a lot lately, and a rolling 12-month window otherwise, with
 * a year-on-year delta only when there's enough recent activity for it to mean something. All-time
 * totals live in the headline tiles above, never here.
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
  /** always-present rate context, e.g. "diving since 2019 · ~9/yr" (never repeats the tiles). */
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
  const { diveCount, windows, firstDiveStart, lastDiveStart } = home
  const w30 = windows.last30Days
  const w365 = windows.last365Days
  const wPrev = windows.previous365Days

  const perMonth = diveCount / monthsSince(firstDiveStart)
  const perYear = Math.round(perMonth * 12)

  // The footnote is the only always-present context, so it must not repeat the headline tiles
  // (total dives / total bottom time / deepest / last dive) that sit right above it - it carries
  // the *rate* picture instead: when you started and roughly how often you dive.
  const footnoteParts: string[] = []
  if (firstDiveStart != null) footnoteParts.push(`diving since ${new Date(firstDiveStart).getFullYear()}`)
  if (firstDiveStart != null && perYear > 0) footnoteParts.push(`~${perYear}/yr`)
  const footnote = footnoteParts.join(' · ')

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

  // Occasional: not much lately - show the rolling year (no year-on-year delta, too sparse to
  // be meaningful), let the footnote carry the long-run rate.
  return {
    mode: 'OCCASIONAL',
    headlineLabel: 'Last 12 months',
    dives: w365.diveCount,
    hours: windowHours(w365),
    comparison: null,
    footnote,
    staleMonths: stale,
  }
}
