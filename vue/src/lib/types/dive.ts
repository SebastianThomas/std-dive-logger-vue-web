import type { User } from './user'

export type TagDefinition = {
  id: number
  name: string
  autoDetectRule?: string | null
  userId?: number | null
}

export type PagedResult<T> = {
  pageSize: number
  totalPages: number
  result: T[]
}

export type DiveComputerManufacturer = {
  id: number
  name: string
}

export type DiveComputer = {
  id: number
  manufacturer: DiveComputerManufacturer
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

export type Temperature = { value: number; unit: 'CELSIUS' | 'KELVIN' }

export type DiveMeasurement = {
  time: number
  temperature: Temperature
  depth: number
  ndl: string
  deco: Deco[]
  po2?: {
    measured?: number
    calculated?: number
    maxSetPoint?: number
  }
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

export type VisibilityFeeling = 'HIGH' | 'AVERAGE' | 'LOW'

export type Visibility = {
  meters?: number
  description?: string
  feeling: VisibilityFeeling
}

export type GasConsumption = {
  sacBar: number
  rmvLiters: number
  totalLiters: number
}

export type SuitType =
  | 'NONE'
  | 'RASHGUARD'
  | 'THERMOCLINE'
  | 'NEOPRENE'
  | 'MEMBRANE_DRY'
  | 'NEOPRENE_DRY'
  | 'OTHER'

export type Suit = {
  id: number
  userId: number
  type: SuitType
  thickness?: number | null
  notes: string
}

export type BaseConfiguration =
  | 'SINGLE_TANK'
  | 'SINGLE_TANK_AVELO'
  | 'SIDEMOUNT'
  | 'BACKMOUNT_DOUBLES'
  | 'BACKMOUNT_CCR'
  | 'SIDEMOUNT_CCR'
  | 'CHESTMOUNT_CCR'
  | 'OTHER'

// Display labels for BaseConfiguration values
export const BASE_CONFIGURATION_LABELS: Record<BaseConfiguration, string> = {
  SINGLE_TANK: 'Single Tank',
  SINGLE_TANK_AVELO: 'Single Tank (Avelo)',
  SIDEMOUNT: 'Sidemount',
  BACKMOUNT_DOUBLES: 'Backmount Doubles',
  BACKMOUNT_CCR: 'Backmount CCR',
  SIDEMOUNT_CCR: 'Sidemount CCR',
  CHESTMOUNT_CCR: 'Chestmount CCR',
  OTHER: 'Other',
}

// Display labels for SuitType values
export const SUIT_TYPE_LABELS: Record<SuitType, string> = {
  NONE: 'None',
  RASHGUARD: 'Rashguard',
  THERMOCLINE: 'Thermocline',
  NEOPRENE: 'Neoprene',
  MEMBRANE_DRY: 'Membrane Dry',
  NEOPRENE_DRY: 'Neoprene Dry',
  OTHER: 'Other',
}

export type WeightFeeling = 'LIGHT' | 'GOOD' | 'HEAVY'

export type CylinderSizeUnit = 'LITER' | 'CUFT'

export type CylinderSize = {
  unit: CylinderSizeUnit
  value: number
}

export type DiveConfigurationCylinder = {
  id: number
  size: CylinderSize
  startBar?: number | null
  endBar?: number | null
  notes?: string
}

export type DiveConfiguration = {
  suit: Suit
  base: BaseConfiguration
  weight: number
  weightFeeling?: WeightFeeling
  cylinders: DiveConfigurationCylinder[]
}

export type Dive = {
  id: number
  user: User
  number: number
  notes: string
  customIdentifier: string
  previewImage?: string
  visibility: Visibility
  gasConsumption: GasConsumption
  configuration: DiveConfiguration
  site: DiveSite
  profiles: DiveProfile[]
  buddiesDives: {
    buddy: User
    diveId: number
  }[]
  namedBuddies: string[]
  summary: DiveSummary
  tags: TagDefinition[]
}

export type DiveWithoutProfiles = {
  id: number
  user: User
  number: number
  customIdentifier: string
  previewImage: string
  site: DiveSite
  buddiesDives: {
    buddy: User
    diveId: number
  }[]
  namedBuddies: string[]
  summary: DiveSummary
  tags: TagDefinition[]
}
export type UploadDiveResult = { dives: DiveWithoutProfiles[]; errors: string[] }

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
  measurements?: DiveMeasurementWithId[] | null
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

export type AlignmentType =
  | 'AUTO_MIN_AVG_DISTANCE'
  | 'AUTO_MIN_AVG_SQ_DISTANCE'
  | 'AUTO_MIN_MAX_DISTANCE'
