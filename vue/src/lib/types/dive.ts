import type { User } from './user'

export type TagDefinition = {
  id: number
  name: string
  autoDetectRule?: string | null
  userId?: number | null
  diveCount?: number
}

export type PagedResult<T> = {
  pageSize: number
  totalPages: number
  totalElements: number
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
  // Rebreather loop state (closed-circuit vs open-circuit/bailout) at this sample. Absent for
  // OC-only dives and for sources that don't report it (e.g. FIT/Garmin).
  mode?: 'OC' | 'CC'
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
  | 'DUAL_CCR_BACKMOUNT'
  | 'DUAL_CCR_SIDEMOUNT'
  | 'DUAL_CCR_BACKMOUNT_SIDEMOUNT'
  | 'DUAL_CCR_BACKMOUNT_CHESTMOUNT'
  | 'DUAL_CCR_SIDEMOUNT_CHESTMOUNT'
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
  DUAL_CCR_BACKMOUNT: 'Dual CCR (Backmount)',
  DUAL_CCR_SIDEMOUNT: 'Dual CCR (Sidemount)',
  DUAL_CCR_BACKMOUNT_SIDEMOUNT: 'Dual CCR (Backmount + Sidemount)',
  DUAL_CCR_BACKMOUNT_CHESTMOUNT: 'Dual CCR (Backmount + Chestmount)',
  DUAL_CCR_SIDEMOUNT_CHESTMOUNT: 'Dual CCR (Sidemount + Chestmount)',
  OTHER: 'Other',
}

// A CCR unit only ever applies when the rig itself is some closed-circuit rebreather variant.
export function isCcrBaseConfiguration(base: BaseConfiguration): boolean {
  return base.includes('CCR')
}

export type CcrUnit = {
  id: number
  userId: number
  name: string
  notes: string
  isPublic: boolean
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
  /** Only meaningful when `base` is a CCR variant — see {@link isCcrBaseConfiguration}. */
  ccrUnit?: CcrUnit | null
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

export type PendingImportSource = 'DIVESOFT' | 'FIT_GARMIN' | 'UDDF_SHEARWATER' | 'XML_SUBSURFACE'

/** Cheap, review-only view of a staged (not yet persisted) import - never carries profile data. */
export type PendingImportSummary = {
  id: number
  source: PendingImportSource
  externalId?: string
  filename?: string
  diveIdentifierGuess?: string
  siteNameGuess?: string
  latitudeGuess?: number
  longitudeGuess?: number
  computerSerial?: string
  startDate?: number
  durationSeconds?: number
  maxDepth?: number
  createdAt: number
  // Dive number guessed from the source file (e.g. UDDF's <divenumber>). When
  // diveNumberFractional is true, the source file encoded a "+"/"-"-prefixed Shearwater
  // bailout/CC companion marker - the backend will attach to that number on commit regardless of
  // whichever mode is selected in the UI, so the frontend preselects "attach to existing dive"
  // for it rather than showing a "New dive" mode that wouldn't reflect what actually happens.
  diveNumberGuess?: number
  diveNumberFractional?: boolean
}

export type StageImportResult = { staged: PendingImportSummary[]; errors: string[] }

/**
 * Overrides applied when committing a staged import. `linkToExistingDiveId` is mutually exclusive
 * with the site fields - when set, the parsed profile is attached to that existing dive instead
 * of creating a new one.
 */
export type ProfileTrim = { profileIndex: number; trimStart?: number; trimEnd?: number }

export type PendingImportCommitRequest = {
  diveNumber?: number
  diveIdentifier?: string
  notes?: string
  visibility?: Visibility
  namedBuddies?: string[]
  diveSiteId?: number
  newSiteName?: string
  newSiteLocation?: { lat: number; lon: number }
  linkToExistingDiveId?: number
  /** Trims applied to one or more profiles (by index, matching the preview endpoint's ordering)
   * before the dive is created/attached. */
  profileTrims?: ProfileTrim[]
}

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

export type DiveProfileRatePoint = {
  time: number
  depth: number
  rateMetersPerMinute: number
}

export type DiveProfileRatesResponse = {
  profileId: number
  rates: DiveProfileRatePoint[]
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
