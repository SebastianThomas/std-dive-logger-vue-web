import type { BaseConfiguration, BuddyRole, DiveSite, TagDefinition, Temperature } from './dive'

type Duration = string

export type UserDiveStats = {
  diveCount: number
  maxDiveNr: number
  longestDive: Duration
  maxDepth: number
  totalTime: Duration
  nrOfBuddies?: number
  nrOfSites?: number
  maxTemp?: Temperature
  minTemp?: Temperature
  // Per-dive max TTS, then averaged/maxed across dives - not an average/max of raw per-sample
  // TTS readings.
  avgMaxTimeToSurface?: Duration
  maxMaxTimeToSurface?: Duration
}

type UserDiveStatsBy<K> = { key: K; stats: UserDiveStats }

export type UserDiveStatsByYear = {
  [year: string | number]: UserDiveStats
}

export type UserDiveStatsByBuddy = UserDiveStatsBy<string>
export type UserDiveStatsByBaseConfiguration = UserDiveStatsBy<BaseConfiguration>
export type UserDiveStatsByTag = UserDiveStatsBy<TagDefinition>

export type UserDiveStatsBySite = UserDiveStatsBy<DiveSite>
export type UserDiveStatsBySiteType = UserDiveStatsBy<string>

export type BuddyRoleCount = { role: BuddyRole; count: number }

export type BuddyRoleBreakdown = { group: string; counts: BuddyRoleCount[]; total: number }

export type BuddyRoleStats = {
  overall: BuddyRoleCount[]
  byBuddy: BuddyRoleBreakdown[]
  bySite: BuddyRoleBreakdown[]
  byYear: BuddyRoleBreakdown[]
  byMonth: BuddyRoleBreakdown[]
}
