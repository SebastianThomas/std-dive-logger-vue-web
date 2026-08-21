import type { BasicDiveInfo, BuddyRole, TeamTerminology } from './dive'
import type { User } from './user'

export type DiveTripType = 'TRIP' | 'COURSE'

export const DIVE_TRIP_TYPE_LABELS: Record<DiveTripType, string> = {
  TRIP: 'Trip',
  COURSE: 'Course',
}

export type DiveTrip = {
  id: number
  name: string
  type: DiveTripType
  ownerUserId: number
  teamTerminology?: TeamTerminology | null
  // Backend Instant fields serialize as epoch-millis numbers (WRITE_DATES_AS_TIMESTAMPS), not
  // ISO strings - matches every other Instant-backed field in dive.ts.
  createdAt: number
}

export type DiveTripMember = {
  type: 'DIVE' | 'TRIP'
  dive?: BasicDiveInfo | null
  subTrip?: DiveTrip | null
}

export type DiveTripDefaultTeamMember = {
  id: number
  buddyUser?: User | null
  buddyName?: string | null
  role: BuddyRole
}

export type DiveTripDefaultTeamEntryInput = {
  buddyUserId?: number | null
  buddyName?: string | null
  role: BuddyRole
}
