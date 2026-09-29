/**
 * The app's small offline copy (home dashboard + first dive-list page + the last sync push), in
 * the Cache API so `public/sw-custom.js` can write the pushed snapshot with the same keys. One
 * account at a time: every entry carries its owner, reads reject a mismatch, and a different owner
 * or a logout wipes everything. Unlike the removed URL-keyed `dtl-api` route cache, only the app
 * writes here, explicitly.
 */

export const OFFLINE_CACHE = 'dtl-offline-v1'
const PREFIX = '/__offline/'
// A refresh token lives 30 days, so no session can outlive this much time without contact.
export const OWNER_MAX_AGE_MS = 30 * 24 * 3600 * 1000

export type OfflineKey = 'home' | 'dives-p0' | 'sync'

export interface OfflineOwner {
  userId: number
  name: string
  lastOnlineAt: number
}

export interface OfflineEntry<T> {
  userId: number
  savedAt: number
  data: T
}

function cacheStorage(): CacheStorage | null {
  try {
    return typeof caches === 'undefined' ? null : caches
  } catch {
    return null
  }
}

async function readJson<T>(key: string): Promise<T | null> {
  const storage = cacheStorage()
  if (!storage) return null
  try {
    const cache = await storage.open(OFFLINE_CACHE)
    const response = await cache.match(PREFIX + key)
    return response ? ((await response.json()) as T) : null
  } catch {
    return null
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const storage = cacheStorage()
  if (!storage) return
  try {
    const cache = await storage.open(OFFLINE_CACHE)
    await cache.put(
      PREFIX + key,
      new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }),
    )
  } catch {
    // Quota / private mode: the app simply has no offline copy then.
  }
}

export async function clearOffline(): Promise<void> {
  try {
    await cacheStorage()?.delete(OFFLINE_CACHE)
  } catch {
    // Nothing to clear.
  }
}

export async function readOwner(now = Date.now()): Promise<OfflineOwner | null> {
  const owner = await readJson<OfflineOwner>('owner')
  if (!owner) return null
  if (now - owner.lastOnlineAt > OWNER_MAX_AGE_MS) {
    await clearOffline()
    return null
  }
  return owner
}

/** Stores the owner; a different account than the stored one wipes that account's data first. */
export async function writeOwner(owner: OfflineOwner): Promise<void> {
  const current = await readJson<OfflineOwner>('owner')
  if (current && current.userId !== owner.userId) await clearOffline()
  await writeJson('owner', owner)
}

export async function readEntry<T>(key: OfflineKey, userId: number): Promise<OfflineEntry<T> | null> {
  const entry = await readJson<OfflineEntry<T>>(key)
  return entry && entry.userId === userId ? entry : null
}

export async function writeEntry<T>(key: OfflineKey, entry: OfflineEntry<T>): Promise<void> {
  await writeJson(key, entry)
}
