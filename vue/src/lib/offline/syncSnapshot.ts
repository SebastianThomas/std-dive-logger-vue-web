import type { HomeDashboard, LogbookSnapshot } from '@/lib/types/home'
import type { OfflineEntry } from './offlineCache'

const SNAPSHOT_FIELDS = [
  'diveCount',
  'maxDiveNumber',
  'totalBottomTime',
  'maxDepth',
  'firstDiveStart',
  'lastDiveStart',
  'divesThisYear',
  'windows',
  'recentDives',
] as const satisfies readonly (keyof LogbookSnapshot)[]

/**
 * Overlays a pushed snapshot (see `public/sw-custom.js`) onto the cached dashboard - only when it
 * is newer and for the same account, and only its headline fields: records, buddies and activity
 * stats keep their last-fetched values until the next online load.
 */
export function mergeSyncSnapshot(
  home: OfflineEntry<HomeDashboard>,
  sync: OfflineEntry<LogbookSnapshot> | null,
): OfflineEntry<HomeDashboard> {
  if (!sync || sync.userId !== home.userId || sync.savedAt <= home.savedAt) return home
  const overlay: Partial<HomeDashboard> = {}
  for (const field of SNAPSHOT_FIELDS) {
    if (field in sync.data) Object.assign(overlay, { [field]: sync.data[field] })
  }
  return { userId: home.userId, savedAt: sync.savedAt, data: { ...home.data, ...overlay } }
}
