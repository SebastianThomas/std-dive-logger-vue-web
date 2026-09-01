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
  recentDives: HomeRecentDive[]
  /** The user's highlighted ('starred') dives, most recent first (capped server-side). */
  highlightedDives: HomeRecentDive[]
  topBuddies: HomeBuddy[]
  records: HomeRecords
}
