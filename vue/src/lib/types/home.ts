// Mirrors the backend `model/dive/home/*` records (GET /v1/home). Convention only - no
// compile-time contract across the repo boundary. `Instant` serializes as epoch-millis (number),
// `Duration` as an ISO-8601 string ("PT40M"); both are `@JsonInclude(NON_NULL)`.

export interface HomeWindow {
  diveCount: number
  bottomTime?: string | null
}

export interface HomeActivity {
  last30Days: HomeWindow
  last365Days: HomeWindow
  previous365Days: HomeWindow
}

/** One calendar month's dive count ("YYYY-MM"), months-with-dives only, ascending. */
export interface HomeMonthlyCount {
  month: string
  count: number
}

export type DepthTrend = 'DEEPER' | 'SHALLOWER' | 'STEADY' | 'UNKNOWN'
export type CadenceTrend = 'PICKING_UP' | 'STEADY' | 'SLOWING' | 'UNKNOWN'
export type NudgeLevel = 'NONE' | 'GENTLE' | 'KEEN' | 'DORMANT'
export type ReminderKind = 'DIVE_ANNIVERSARY' | 'DIVE_AGAIN_NUDGE'

/**
 * A time-sensitive home-page prompt: a dive anniversary ("3 years ago today ...") or the dynamic
 * "time to go diving again" nudge. Computed + stored by the analytics deployable, recomputed daily;
 * dismissed via `POST /v1/reminders/{id}/dismiss`. Mirrors the backend `DiverReminder`.
 */
export interface DiverReminder {
  id: number
  kind: ReminderKind
  title: string
  body: string
  /** Deep-link target (the representative dive for an anniversary); null for a nudge. */
  diveId?: number | null
  /** Anniversary only. */
  yearsAgo?: number | null
  /** "YYYY-MM-DD" */
  relevantOn: string
  createdAt: number
}

/**
 * Precomputed activity / trend stats, cached server-side (analytics deployable) and recomputed
 * only when the diver's dives change. Mirrors the backend `DiverActivityStats` record.
 */
export interface DiverActivityStats {
  divesByMonth: HomeMonthlyCount[]
  /** Dives/year over the *current diving era* - real pauses before it excluded. */
  recentDivesPerMonth: number
  recentDivesPerYear: number
  /** "YYYY-MM" the current era started at; null on an empty logbook. */
  eraStartMonth?: string | null
  /** true when earlier dives are separated from the era by a real pause. */
  eraPrecededByPause: boolean

  /** Typical days between dives: the dynamic recentCadenceDays if known, else the median gap. */
  typicalIntervalDays?: number | null
  daysSinceLastDive?: number | null
  /** lastDive + typicalIntervalDays (epoch millis). */
  expectedNextDiveBy?: number | null
  /** true once the nudge is GENTLE or KEEN. */
  overdue: boolean
  /** Dynamic expected interval from the diver's current pace (not their all-time median). */
  recentCadenceDays?: number | null
  /** Last ~90 days vs the ~90 before. */
  cadenceTrend: CadenceTrend
  /** daysSinceLastDive at which the nudge starts firing for this diver. */
  nudgeThresholdDays?: number | null
  nudgeLevel: NudgeLevel

  currentMonthStreak: number
  longestMonthStreak: number

  /** 1-12, the month of the year this diver dives most; null on an empty logbook. */
  busiestMonth?: number | null
  busiestMonthShare: number

  depthTrend: DepthTrend
  recentAvgMaxDepth?: number | null
  priorAvgMaxDepth?: number | null

  distinctSites: number
  newSitesThisYear: number

  divesThisYear: number
  projectedDivesThisYear?: number | null
  nextMilestone?: number | null
  divesToNextMilestone?: number | null
}

export interface HomeRecentDive {
  id: number
  number: number
  identifier?: string | null
  siteName?: string | null
  start?: number | null
  maxDepth?: number | null
  bottomTime?: string | null
}

export interface HomeBuddy {
  name: string
  diveCount: number
}

export interface HomeRecordDive {
  diveId: number
  diveNumber: number
  identifier?: string | null
  diveStart?: number | null
  maxDepth?: number | null
  bottomTime?: string | null
}

export interface HomeRecords {
  deepest?: HomeRecordDive | null
  longest?: HomeRecordDive | null
}

export interface HomeDashboard {
  userName: string
  diveCount: number
  maxDiveNumber: number
  totalBottomTime?: string | null
  maxDepth?: number | null
  firstDiveStart?: number | null
  lastDiveStart?: number | null
  divesThisYear: number
  windows: HomeActivity
  /** Precomputed pause-aware rate, streaks, seasonality, depth trend, "dive again" nudge. */
  activityStats: DiverActivityStats
  /** Dive anniversaries + the "dive again" nudge, currently relevant and not dismissed. */
  reminders: DiverReminder[]
  recentDives: HomeRecentDive[]
  /** The user's highlighted ('starred') dives, most recent first (capped server-side). */
  highlightedDives: HomeRecentDive[]
  topBuddies: HomeBuddy[]
  records: HomeRecords
}
