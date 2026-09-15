import type {
  DiveSourceFile,
  ImportedDiveField,
  ImportFileInfo,
  ImportFileSource,
} from '@/lib/types/importFiles'

export const IMPORT_SOURCE_LABELS: Record<ImportFileSource, string> = {
  DIVESOFT: 'Divesoft dive data',
  FIT_GARMIN: 'Garmin FIT',
  FIT_SUUNTO: 'Suunto FIT',
  JSON_SUUNTO: 'Suunto JSON',
  UDDF_SHEARWATER: 'UDDF',
  XML_SUBSURFACE: 'Subsurface XML',
  XML_SHEARWATER: 'Shearwater XML',
  DL7_SHEARWATER: 'Shearwater DL7',
  DB_SHEARWATER: 'Shearwater Cloud database',
}

export const IMPORTED_FIELD_LABELS: Record<ImportedDiveField, string> = {
  NOTES: 'notes',
  VISIBILITY: 'visibility',
  BUDDIES: 'buddies',
  GAS_CONSUMPTION: 'gas consumption',
  CONFIGURATION: 'gear',
  SITE: 'dive site',
  DIVE_NUMBER: 'dive number',
  DIVE_IDENTIFIER: 'dive name',
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

/** "1 profile", "1 dive, 2 profiles", "95 dives". */
export function scopeLabel(file: ImportFileInfo): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (file.diveCount > 1) return plural(file.diveCount, 'dive')
  if (file.profileCount > 1) return `1 dive, ${plural(file.profileCount, 'profile')}`
  return plural(file.profileCount, 'profile')
}

export function fileDisplayName(file: ImportFileInfo): string {
  return file.originalFilename?.trim() || `${IMPORT_SOURCE_LABELS[file.source]} #${file.id}`
}

/** "Profile: Perdix 2 · notes, visibility" - what a stored file provided for this dive. */
export function usedForLabel(
  entry: DiveSourceFile,
  computerNameOfProfile: (profileId: number) => string | undefined,
): string {
  const parts: string[] = []
  const names = entry.profileIds.map((id) => computerNameOfProfile(id) ?? `profile ${id}`)
  if (names.length) parts.push(`${names.length === 1 ? 'Profile' : 'Profiles'}: ${names.join(', ')}`)
  if (entry.fields.length) parts.push(entry.fields.map((f) => IMPORTED_FIELD_LABELS[f]).join(', '))
  return parts.join(' · ')
}
