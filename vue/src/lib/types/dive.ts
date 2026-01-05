import type { User } from './share'

export type PagedResult<T> = {
  pageSize: number
  totalPages: number
  result: T[]
}

export type DiveComputer = {
  id: number
  manufacturer: {
    id: number
    name: string
  }
  serialNumber: string
  customIdentifier: string
}

export type Deco = {
  type: string
  depth: number
  seconds: number
}

export type Gas = {
  o2: number
  n2: number
  he: number
  size?: {
    unit: 'LITER' | 'CUFT'
    value: number
  }
  content?: {
    unit: 'BAR' | 'PSI'
    value: number
  }
  description?: string
}

export type DiveMeasurement = {
  time: number
  temperature: { value: number; unit: 'CELSIUS' | 'KELVIN' }
  depth: number
  ndl: string
  deco: Deco[]
  gas?: Gas
  rmvLiters?: number
  n2?: number
  o2Tox?: number
  cns?: number
}

export type DiveMeasurementWithId = {
  id: number
  measurement: DiveMeasurement
}

export type DiveProfileSummary = {
  start: number
  end: number
  averageDepth: number
  maxDepth: number
  surfaceInterval?: string
  bottomTime: string
  descentTime?: string
  ascentTime?: string
  avgAscentRate?: number
  startN2?: number
  endN2?: number
  o2Toxicity?: number
  startCNS?: number
  endCNS?: number
}

export type DiveProfile = {
  id: number
  diveComputer: DiveComputer
  start: number
  end: number
  measurements: DiveMeasurementWithId[]
  summary: DiveProfileSummary
}

export type Duration = string

export type DiveSummary = {
  start: number
  end: number
  maxDepth: number
  averageDepth: number
  bottomTime: Duration
  surfaceIntervalBefore: Duration
}

export type Dive = {
  id: number
  user: User
  number: number
  customIdentifier: string
  previewImage: string
  site: DiveSite
  profiles: DiveProfile[]
  buddiesDives: {
    buddy: User
    diveId: number
  }[]
  namedBuddies: string[]
  summary: DiveSummary
}

export type DiveWithoutProfiles = Omit<Dive, 'profiles'>

export type DiveProfileWithoutMeasurements = {
  id: number
  diveComputer: DiveComputer
  start: number
  end: number
  summary: DiveProfileSummary
}

export type DiveProfileSegmentType = 'SURFACE' | 'DESCENT' | 'HOLD_LEVEL' | 'ASCENT' | 'UNKNOWN'

export type DiveProfileSegment = {
  profile: DiveProfileWithoutMeasurements
  firstMeasurementIdx: number
  type: DiveProfileSegmentType
  measurements?: DiveMeasurementWithId[]
}

export type DiveProfileSegmentWithId = {
  id: number
  segment: DiveProfileSegment
}

export type DiveDepthVarianceStats = {
  version: number
  avgDepth: number
  maxDepth: number
  minDepth: number
  deviationAvg: number
  deviationVariance: number
  deviation01p: number
  deviation10p: number
  deviationMedian: number
  deviation90p: number
  deviationMax: number
}

export type DiveDepthVariance = {
  diveId: number
  profileId: number
  profileSegmentId: number
  startIdx: number
  lastIdx: number
  stats: DiveDepthVarianceStats
}

export type BuddyDive = {
  buddy: User
  diveId: number
}

export type DiveSite = {
  id?: number
  name: string
  latitude: number
  longitude: number
}

export type BasicDiveInfo = {
  id: number
  number: number
  customIdentifier: string
}

export type SiteWithDives = {
  site: DiveSite
  diveInfo: BasicDiveInfo[]
}
