import type { BaseConfiguration, DiveSite, Temperature } from './dive'

export type Duration = string

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
}

type UserDiveStatsBy<K> = { key: K; stats: UserDiveStats }

export type UserDiveStatsByYear = {
  [year: string | number]: UserDiveStats
}

export type UserDiveStatsByBuddy = UserDiveStatsBy<string>
export type UserDiveStatsByBaseConfiguration = UserDiveStatsBy<BaseConfiguration>

export type UserDiveStatsBySite = UserDiveStatsBy<DiveSite>
