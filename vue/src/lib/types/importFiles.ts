// Mirrors ch.sthomas.stddivelogger.model.importfile.* - keep field names in step with the records.
import type { PendingImportSource } from '@/lib/types/dive'

export type ImportFileSource = PendingImportSource

export type ImportFileScope = 'SINGLE_PROFILE' | 'SINGLE_DIVE_MULTI_PROFILE' | 'MULTI_DIVE'

export type ImportedDiveField =
  | 'NOTES'
  | 'VISIBILITY'
  | 'BUDDIES'
  | 'GAS_CONSUMPTION'
  | 'CONFIGURATION'
  | 'SITE'
  | 'DIVE_NUMBER'
  | 'DIVE_IDENTIFIER'

export type ImportFileInfo = {
  id: number
  source: ImportFileSource
  originalFilename: string | null
  contentType: string
  sizeBytes: number
  diveCount: number
  profileCount: number
  scope: ImportFileScope
  createdAt: number
  updatedAt: number
}

export type ImportFileSettings = {
  keepImportFiles: boolean
  fileCount: number
  totalBytes: number
}

export type DiveSourceFile = {
  file: ImportFileInfo
  profileIds: number[]
  fields: ImportedDiveField[]
}

export type ReprocessConflictKind = 'PROFILE' | 'DIVE_FIELD'

export type ReprocessConflict = {
  id: number
  diveId: number
  diveNumber: number
  diveIdentifier: string | null
  profileId: number | null
  kind: ReprocessConflictKind
  field: ImportedDiveField | null
  summary: string
  currentValue: unknown
  proposedValue: unknown
  createdAt: number
}
