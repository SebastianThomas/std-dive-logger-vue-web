import type { DiveProfileSegmentWithId } from '@/lib/types/dive'

/**
 * Returns the color for a given dive segment type.
 * @param type The segment type (e.g., 'DESCENT', 'HOLD_LEVEL', 'ASCENT', 'SURFACE')
 * @returns Hex color code for the segment type
 */
export function getSegmentColor(type: string): string {
  switch (type) {
    case 'DESCENT':
      return '#f59e0b' // amber
    case 'HOLD_LEVEL':
      return '#10b981' // emerald
    case 'ASCENT':
      return '#3b82f6' // blue
    case 'SURFACE':
      return '#6b7280' // gray
    default:
      return '#9ca3af' // gray-400
  }
}

/**
 * Returns the human-readable name for a given dive segment type.
 * @param type The segment type code
 * @returns Display name for the segment type
 */
export function getSegmentTypeName(type: string): string {
  switch (type) {
    case 'DESCENT':
      return 'Descent'
    case 'HOLD_LEVEL':
      return 'Hold Level'
    case 'ASCENT':
      return 'Ascent'
    case 'SURFACE':
      return 'Surface'
    default:
      return type
  }
}

/**
 * Finds the segment type at a specific measurement index within a profile.
 * @param segmentsData All dive segments data
 * @param profileId The ID of the profile to search in
 * @param measurementIdx The measurement index to check
 * @param totalMeasurements Total number of measurements in the profile
 * @returns The segment type name, or undefined if not found
 */
export function findSegmentTypeAtIndex(
  segmentsData: DiveProfileSegmentWithId[] | null,
  profileId: number,
  measurementIdx: number,
  totalMeasurements: number,
): string | undefined {
  if (!segmentsData) return undefined

  // Get segments for this profile
  const profileSegments = segmentsData.filter(
    (s) => s?.segment && s.segment.profile.id === profileId,
  )
  if (!profileSegments.length) return undefined

  // Find which segment contains this measurement index
  const segment = profileSegments.find((s, i, arr) => {
    if (!s?.segment || typeof s.segment.firstMeasurementIdx !== 'number') return false
    const start = s.segment.firstMeasurementIdx
    const next = arr[i + 1]
    const end =
      next?.segment && typeof next.segment.firstMeasurementIdx === 'number'
        ? next.segment.firstMeasurementIdx
        : totalMeasurements
    return measurementIdx >= start && measurementIdx < end
  })

  return segment?.segment?.type ? getSegmentTypeName(segment.segment.type) : undefined
}
