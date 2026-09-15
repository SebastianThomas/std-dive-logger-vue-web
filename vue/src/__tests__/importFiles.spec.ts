import { describe, expect, it } from 'vitest'
import { fileDisplayName, formatBytes, scopeLabel, usedForLabel } from '@/lib/dive/importFiles'
import type { ImportFileInfo } from '@/lib/types/importFiles'

const file = (overrides: Partial<ImportFileInfo> = {}): ImportFileInfo => ({
  id: 7,
  source: 'UDDF_SHEARWATER',
  originalFilename: 'Harissenbucht.uddf',
  contentType: 'application/xml',
  sizeBytes: 250_000,
  diveCount: 1,
  profileCount: 1,
  scope: 'SINGLE_PROFILE',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

describe('formatBytes', () => {
  it('keeps bytes below a kilobyte as bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('shows one decimal below ten units and whole numbers above', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(250_000)).toBe('244 KB')
    expect(formatBytes(1_400_000)).toBe('1.3 MB')
  })
})

describe('scopeLabel', () => {
  it('names profiles for a single dive and dives for a logbook', () => {
    expect(scopeLabel(file())).toBe('1 profile')
    expect(scopeLabel(file({ profileCount: 2 }))).toBe('1 dive, 2 profiles')
    expect(scopeLabel(file({ diveCount: 95, profileCount: 95 }))).toBe('95 dives')
  })
})

describe('fileDisplayName', () => {
  it('falls back to the format and id without a filename', () => {
    expect(fileDisplayName(file())).toBe('Harissenbucht.uddf')
    expect(fileDisplayName(file({ source: 'DIVESOFT', originalFilename: null }))).toBe(
      'Divesoft dive data #7',
    )
  })
})

describe('usedForLabel', () => {
  it('lists the profiles by computer and the dive values taken', () => {
    const label = usedForLabel({ file: file(), profileIds: [3], fields: ['NOTES', 'BUDDIES'] }, (id) =>
      id === 3 ? 'Perdix 2' : undefined,
    )
    expect(label).toBe('Profile: Perdix 2 · notes, buddies')
  })

  it('names unknown profiles by id and leaves out empty parts', () => {
    expect(usedForLabel({ file: file(), profileIds: [4, 5], fields: [] }, () => undefined)).toBe(
      'Profiles: profile 4, profile 5',
    )
  })
})
