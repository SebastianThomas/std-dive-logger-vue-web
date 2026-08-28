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
  // Permanently paired CCR unit, if any - PUT /v1/computers/{id} treats a missing/null value as
  // an explicit "clear the link", so any update must always echo the current value back rather
  // than omitting it, or a rename silently unlinks the unit.
  ccrUnitId: number | null
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
  // Time needed for a safe ascent from here (device-assumed ascent rate) - not the same as being
  // in mandatory deco, a plain ascent from a few meters still reads a small non-zero value here.
  timeToSurface?: Duration
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
  // null for a manually-entered dive with no real depth-time profile to average from, unless the
  // diver explicitly set one (see EditDiveForm.vue's Average Depth field).
  averageDepth: number | null
  bottomTime: Duration
  surfaceIntervalBefore: Duration
  maxTimeToSurface?: Duration
}

export type VisibilityFeeling = 'HIGH' | 'AVERAGE' | 'LOW'

export type Visibility = {
  meters?: number | null
  description?: string | null
  // Nullable on the backend (Visibility.EMPTY has a null feeling) - a sparsely-logged dive may
  // have a visibility row with only a distance or note and no feeling.
  feeling?: VisibilityFeeling | null
}

export type WaterType = 'SALT' | 'FRESH' | 'BRACKISH'

export const WATER_TYPE_LABELS: Record<WaterType, string> = {
  SALT: 'Salt',
  FRESH: 'Fresh',
  BRACKISH: 'Brackish',
}

export type Current = {
  knots?: number
  description?: string
  /** 0 (none) to 5 (strong) - a plain feeling scale, not a named enum like VisibilityFeeling. */
  feeling?: number
}

export type GasConsumption = {
  sacBar: number
  rmvLiters: number
  totalLiters: number
}

// --- Reimport-in-place (see DiveController's /profiles/{id}/reimport + /reimport/{pid}/commit) -

export type ReimportFieldConflict<T> = { existing: T; reimported: T }

export type ReimportConflicts = {
  notes?: ReimportFieldConflict<string>
  visibility?: ReimportFieldConflict<Visibility>
  namedBuddies?: ReimportFieldConflict<string[]>
  gasConsumption?: ReimportFieldConflict<GasConsumption>
}

export function reimportHasAnyConflict(conflicts: ReimportConflicts): boolean {
  return (
    conflicts.notes != null ||
    conflicts.visibility != null ||
    conflicts.namedBuddies != null ||
    conflicts.gasConsumption != null
  )
}

export type ReimportPreviewResult = {
  pendingImportId: number
  conflicts: ReimportConflicts
}

export type ReimportChoice = 'EXISTING' | 'NEW'
export type ReimportBuddiesChoice = 'EXISTING' | 'NEW' | 'UNION'

export type ReimportResolution = {
  notes?: ReimportChoice | null
  visibility?: ReimportChoice | null
  namedBuddies?: ReimportBuddiesChoice | null
  gasConsumption?: ReimportChoice | null
}

export type SuitType =
  | 'NONE'
  | 'RASHGUARD'
  | 'THERMOCLINE'
  | 'NEOPRENE'
  | 'MEMBRANE_DRY'
  | 'NEOPRENE_DRY'

export type Suit = {
  id: number
  userId: number
  // null means "not specified" - distinct from NONE, which means the diver actually wore no
  // exposure suit at all.
  type: SuitType | null
  thickness?: number | null
  notes: string
}

// How the diver's own cylinders (whether OC-only or CCR bailout) are rigged - independent of
// whether/how many CCR units are in play (see CcrUnit.mountPosition and
// DiveConfiguration.ccrUnit/secondaryCcrUnit below). Cylinder count/size is tracked in even finer
// detail via DiveConfiguration.cylinders and isn't duplicated here.
export type BaseConfiguration = 'BACKMOUNT' | 'SIDEMOUNT'

// Display labels for BaseConfiguration values
export const BASE_CONFIGURATION_LABELS: Record<BaseConfiguration, string> = {
  BACKMOUNT: 'Backmount',
  SIDEMOUNT: 'Sidemount',
}

// How a specific CcrUnit is worn - an intrinsic property of that physical unit, not of any one
// dive. Unlike a diver's own BaseConfiguration (backmount/sidemount only), a rebreather can also
// be chestmounted.
export type CcrMountPosition = 'BACKMOUNT' | 'SIDEMOUNT' | 'CHESTMOUNT'

export const CCR_MOUNT_POSITION_LABELS: Record<CcrMountPosition, string> = {
  BACKMOUNT: 'Backmount',
  SIDEMOUNT: 'Sidemount',
  CHESTMOUNT: 'Chestmount',
}

export type CcrUnit = {
  id: number
  userId: number
  name: string
  notes: string
  isPublic: boolean
  mountPosition?: CcrMountPosition | null
}

// Display labels for SuitType values
export const SUIT_TYPE_LABELS: Record<SuitType, string> = {
  NONE: 'None',
  RASHGUARD: 'Rashguard',
  THERMOCLINE: 'Thermocline',
  NEOPRENE: 'Neoprene',
  MEMBRANE_DRY: 'Membrane Dry',
  NEOPRENE_DRY: 'Neoprene Dry',
}

export function suitTypeLabel(type: SuitType | null | undefined): string {
  return type ? SUIT_TYPE_LABELS[type] : 'Not specified'
}

export type WeightFeeling = 'LIGHT' | 'GOOD' | 'HEAVY'

export type CylinderSizeUnit = 'LITER' | 'CUFT'

export type CylinderSize = {
  unit: CylinderSizeUnit
  value: number
}

/** What a cylinder was actually used for - decides how it feeds into gas-consumption
 * calculations. See CylinderConsumptionCalculator (backend) for the full reasoning. */
export type CylinderRole = 'OC' | 'DILUENT' | 'O2' | 'BAILOUT'

export const CYLINDER_ROLE_LABELS: Record<CylinderRole, string> = {
  OC: 'OC',
  DILUENT: 'Diluent',
  O2: 'O2',
  BAILOUT: 'Bailout',
}

/** The only roles that make sense to pick on a CCR dive - a diluent/O2/bailout cylinder has no
 * meaning on OC, and OC's own single role isn't a real choice there either (see
 * EditDiveForm.vue's cylinder Role field, which is a fixed, non-editable "OC" for an OC dive
 * rather than a dropdown at all). */
export const CCR_CYLINDER_ROLES: CylinderRole[] = ['DILUENT', 'O2', 'BAILOUT']

export type DiveConfigurationCylinder = {
  id: number
  size: CylinderSize
  startBar?: number | null
  endBar?: number | null
  notes?: string
  /** O2/He fraction of the gas in this cylinder - N2 is implied. */
  gas: { o2: number; he: number }
  role: CylinderRole
  /** Both null means "used for the whole dive" - the common single-cylinder case, no extra data
   * entry required. Only set when more than one cylinder of the same role was used across the
   * dive (e.g. twin/sidemount cylinders switched partway through). Epoch millis, like every other
   * `Instant` field the backend serializes (e.g. `DiveSummary.start`) - NOT an ISO string. */
  usageStart?: number | null
  usageEnd?: number | null
}

/** Computed from tracked cylinders - see CylinderConsumptionCalculator (backend). Every field is
 * `null`, not zero, when there's nothing to compute it from. */
export type CylinderConsumption = {
  ocRmvLiters?: number | null
  bailoutRmvLiters?: number | null
  o2Liters?: number | null
  diluentLiters?: number | null
}

export type DiveConfiguration = {
  suit: Suit
  /** The diver's own rig - independent of CCR (see ccrUnit/secondaryCcrUnit below). Null means
   * "not specified" and is never guessed. */
  base?: BaseConfiguration | null
  weight: number
  weightFeeling?: WeightFeeling
  cylinders: DiveConfigurationCylinder[]
  /** A dive can reference up to two CCR units for genuine dual-rebreather setups - each unit's
   * own CcrMountPosition says how it's worn, so every combination (e.g. one backmount + one
   * sidemount) is representable without a dedicated value per pairing. */
  ccrUnit?: CcrUnit | null
  secondaryCcrUnit?: CcrUnit | null
  /** A suit type noted for this dive with no specific saved Suit behind it (e.g. a one-off
   * rental). Independent of `suit` — the two are meant to be mutually exclusive in the UI
   * (picking one clears the other) but nothing enforces that here. */
  adHocSuitType?: SuitType | null
}

export type BuddyRole =
  | 'MORE_EXPERIENCED'
  | 'EQUAL_EXPERIENCE'
  | 'LESS_EXPERIENCED'
  | 'INSTRUCTOR'
  | 'DIVEMASTER'

export const BUDDY_ROLE_LABELS: Record<BuddyRole, string> = {
  MORE_EXPERIENCED: 'More experienced',
  EQUAL_EXPERIENCE: 'Equal experience',
  LESS_EXPERIENCED: 'Less experienced',
  INSTRUCTOR: 'Instructor',
  DIVEMASTER: 'Divemaster',
}

export type NamedBuddy = {
  id: number
  name: string
  role?: BuddyRole | null
}

/** A saved default role for one buddy - applied automatically the next time that buddy is newly
 * added to a dive (manually or via import). Either `buddyUser` or `buddyName` is set, never both. */
export type DiveBuddyDefaultRole = {
  id: number
  buddyUser?: User | null
  buddyName?: string | null
  role: BuddyRole
}

export type TeamTerminology = 'BUDDY' | 'TEAM'

export type DiveLeader = {
  // UNSET means nobody has ever made an explicit choice for this dive - must not be displayed as
  // if the owner (SELF) confirmed leading it.
  type: 'SELF' | 'NAMED' | 'LINKED' | 'UNSET'
  namedBuddyId?: number | null
  linkedDiveId?: number | null
}

/** Mirrors the backend `DiveBackfillField` enum - one per checklist field the backfill guide
 * nudges the user to fill in. Extend this whenever the backend enum grows. */
export type DiveBackfillMissingField =
  | 'VISIBILITY'
  | 'GAS_CONSUMPTION'
  | 'WATER_TYPE'
  | 'LEADER'
  | 'NOTES'

export type DiveBackfillStatus = {
  diveId: number
  number: number
  diveIdentifier: string
  diveStart?: number | null
  siteId: number
  siteName: string
  /** Every checklist field this dive is still missing. */
  missingFields: DiveBackfillMissingField[]
  /** The subset the user has explicitly marked "no more info to add" (a per-(dive, reason) row). */
  dismissedFields: DiveBackfillMissingField[]
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
  cylinderConsumption?: CylinderConsumption | null
  configuration: DiveConfiguration
  site: DiveSite
  profiles: DiveProfile[]
  buddiesDives: {
    buddy: User
    diveId: number
    role?: BuddyRole | null
  }[]
  namedBuddies: NamedBuddy[]
  summary: DiveSummary
  tags: TagDefinition[]
  waterType?: WaterType | null
  current?: Current | null
  leader: DiveLeader
  teamTerminology?: TeamTerminology | null
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
    role?: BuddyRole | null
  }[]
  namedBuddies: string[]
  summary: DiveSummary
  tags: TagDefinition[]
}
export type UploadDiveResult = { dives: DiveWithoutProfiles[]; errors: string[] }

export type PendingImportSource =
  | 'DIVESOFT'
  | 'FIT_GARMIN'
  | 'FIT_SUUNTO'
  | 'JSON_SUUNTO'
  | 'UDDF_SHEARWATER'
  | 'XML_SUBSURFACE'
  | 'XML_SHEARWATER'
  | 'DL7_SHEARWATER'

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

export type DiveSiteType =
  | 'WRECK'
  | 'REEF'
  | 'WALL'
  | 'CAVE'
  | 'CAVERN'
  | 'DRIFT'
  | 'MUCK'
  | 'SHORE'
  | 'BOAT'
  | 'ARTIFICIAL_REEF'
  | 'OTHER'

export const DIVE_SITE_TYPE_LABELS: Record<DiveSiteType, string> = {
  WRECK: 'Wreck',
  REEF: 'Reef',
  WALL: 'Wall',
  CAVE: 'Cave',
  CAVERN: 'Cavern',
  DRIFT: 'Drift',
  MUCK: 'Muck',
  SHORE: 'Shore',
  BOAT: 'Boat',
  ARTIFICIAL_REEF: 'Artificial Reef',
  OTHER: 'Other',
}

export type DiveSiteLink = {
  id?: number
  url: string
  label?: string
}

export type DiveSite = {
  id?: number
  name: string
  latitude: number
  longitude: number
  description?: string | null
  countryRegion?: string | null
  maxDepth?: number | null
  type?: DiveSiteType | null
  /** The site's water type - a physical property of the place. A dive may override it (Dive.waterType). */
  waterType?: WaterType | null
  links?: DiveSiteLink[]
  canEdit?: boolean
}

export type BasicDiveInfo = {
  id: number
  number: number
  customIdentifier: string
}

export type SiteWithDives = {
  site: DiveSite
  diveCount: number
  // Omitted by the backend (undefined) once the user has too many sites to inline every dive at
  // every site - fetch it lazily via GET /v1/dives/sites/{id}/dives when actually needed (e.g. a
  // map marker's popup opening). diveCount above is always present either way.
  diveInfo?: BasicDiveInfo[]
}

/**
 * Metadata for a dive photo (WS4). Deliberately carries no storage path/URL - photos are
 * proxy-only, fetched (authenticated) through `GET /v1/dives/{diveId}/photos/{id}`, never from a
 * public URL.
 */
export type DivePhoto = {
  id: number
  diveId: number
  contentType: string
  byteSize: number
  uploadedByUserId: number
  caption?: string | null
  takenAt?: number | null
  createdAt: number
  confirmed: boolean
}

export type DivePhotoUploadUrlResponse = {
  photoId: number
  uploadUrl: string
}

export type AlignmentType =
  | 'AUTO_MIN_AVG_DISTANCE'
  | 'AUTO_MIN_AVG_SQ_DISTANCE'
  | 'AUTO_MIN_MAX_DISTANCE'
