import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OWNER_MAX_AGE_MS,
  clearOffline,
  readEntry,
  readOwner,
  writeEntry,
  writeOwner,
} from '@/lib/offline/offlineCache'
import { mergeSyncSnapshot } from '@/lib/offline/syncSnapshot'
import type { HomeDashboard, LogbookSnapshot } from '@/lib/types/home'
import { createPinia, setActivePinia } from 'pinia'
import { useOfflineStore } from '@/stores/offline'
import { installFakeCaches } from './helpers/fakeCacheStorage'

beforeEach(() => {
  installFakeCaches()
})
afterEach(() => vi.unstubAllGlobals())

describe('offline cache', () => {
  it('only hands an entry to the account that stored it', async () => {
    await writeOwner({ userId: 1, name: 'A', lastOnlineAt: Date.now() })
    await writeEntry('home', { userId: 1, savedAt: 5, data: { diveCount: 3 } })

    expect((await readEntry('home', 1))?.data).toEqual({ diveCount: 3 })
    expect(await readEntry('home', 2)).toBeNull()
  })

  it('wipes the previous account when another one signs in on the device', async () => {
    await writeOwner({ userId: 1, name: 'A', lastOnlineAt: Date.now() })
    await writeEntry('dives-p0', { userId: 1, savedAt: 5, data: { result: [] } })

    await writeOwner({ userId: 2, name: 'B', lastOnlineAt: Date.now() })

    expect(await readEntry('dives-p0', 1)).toBeNull()
    expect((await readOwner())?.userId).toBe(2)
  })

  it('forgets an account not seen online for longer than a refresh token lives', async () => {
    const now = Date.now()
    await writeOwner({ userId: 1, name: 'A', lastOnlineAt: now - OWNER_MAX_AGE_MS - 1 })
    await writeEntry('home', { userId: 1, savedAt: now, data: {} })

    expect(await readOwner(now)).toBeNull()
    expect(await readEntry('home', 1)).toBeNull()
  })

  it('clears everything', async () => {
    await writeOwner({ userId: 1, name: 'A', lastOnlineAt: Date.now() })
    await clearOffline()
    expect(await readOwner()).toBeNull()
  })

  it('degrades to "no offline copy" without the Cache API', async () => {
    vi.stubGlobal('caches', undefined)
    await writeOwner({ userId: 1, name: 'A', lastOnlineAt: Date.now() })
    expect(await readOwner()).toBeNull()
  })
})

describe('mergeSyncSnapshot', () => {
  const home = {
    userId: 1,
    savedAt: 1_000,
    data: { userName: 'Sam', diveCount: 10, topBuddies: [{ name: 'Alex', diveCount: 3 }] },
  } as unknown as { userId: number; savedAt: number; data: HomeDashboard }
  const snapshot = (userId: number, savedAt: number) => ({
    userId,
    savedAt,
    data: { diveCount: 12, maxDiveNumber: 12, recentDives: [] } as unknown as LogbookSnapshot,
  })

  it('overlays a newer snapshot of the same account, keeping the rest', () => {
    const merged = mergeSyncSnapshot(home, snapshot(1, 2_000))
    expect(merged.savedAt).toBe(2_000)
    expect(merged.data.diveCount).toBe(12)
    expect(merged.data.userName).toBe('Sam')
    expect(merged.data.topBuddies).toHaveLength(1)
  })

  it('ignores an older snapshot or another account', () => {
    expect(mergeSyncSnapshot(home, snapshot(1, 500))).toBe(home)
    expect(mergeSyncSnapshot(home, snapshot(2, 2_000))).toBe(home)
    expect(mergeSyncSnapshot(home, null)).toBe(home)
  })
})

describe('offline store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('holds a save until the session account is confirmed, then writes it for that account', async () => {
    const offline = useOfflineStore()
    await offline.saveHome({ userName: 'Sam' } as unknown as HomeDashboard)
    expect(await readEntry('home', 7)).toBeNull()

    await offline.rememberOwner({ id: 7, name: 'Sam' })

    expect((await readEntry('home', 7))?.data).toEqual({ userName: 'Sam' })
    expect(offline.home?.userId).toBe(7)
  })

  it('never tags a new account’s data with the previously cached owner', async () => {
    await writeOwner({ userId: 1, name: 'Old', lastOnlineAt: Date.now() })
    const offline = useOfflineStore()
    await offline.hydrate()
    await offline.saveHome({ userName: 'New' } as unknown as HomeDashboard)
    expect(await readEntry('home', 1)).toBeNull()

    await offline.rememberOwner({ id: 2, name: 'New' })

    expect((await readEntry('home', 2))?.data).toEqual({ userName: 'New' })
    expect(await readEntry('home', 1)).toBeNull()
  })

  it('drops held saves on logout', async () => {
    const offline = useOfflineStore()
    await offline.saveHome({ userName: 'Sam' } as unknown as HomeDashboard)
    await offline.clear()
    await offline.rememberOwner({ id: 7, name: 'Sam' })
    expect(await readEntry('home', 7)).toBeNull()
  })
})
