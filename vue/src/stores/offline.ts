import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  clearOffline,
  readEntry,
  readOwner,
  writeEntry,
  writeOwner,
  type OfflineEntry,
  type OfflineOwner,
} from '@/lib/offline/offlineCache'
import { mergeSyncSnapshot } from '@/lib/offline/syncSnapshot'
import type { HomeDashboard, LogbookSnapshot } from '@/lib/types/home'
import type { DiveWithoutProfiles, PagedResult } from '@/lib/types/dive'

export type CachedDivePage = PagedResult<DiveWithoutProfiles>

/**
 * In-memory view of the offline copy (see `lib/offline/offlineCache.ts`): hydrated once at boot,
 * written after each successful online load, wiped on logout / a rejected session.
 */
export const useOfflineStore = defineStore('offline', () => {
  const owner = ref<OfflineOwner | null>(null)
  const home = ref<OfflineEntry<HomeDashboard> | null>(null)
  const divesPage = ref<OfflineEntry<CachedDivePage> | null>(null)
  const sync = ref<OfflineEntry<LogbookSnapshot> | null>(null)
  const hydrated = ref(false)
  /** Bumped when the service worker stored a pushed snapshot (`dtl-sync` message). */
  const syncTick = ref(0)
  let hydrating: Promise<void> | null = null

  const mergedHome = computed(() => (home.value ? mergeSyncSnapshot(home.value, sync.value) : null))

  async function loadEntries(userId: number) {
    const [h, d, s] = await Promise.all([
      readEntry<HomeDashboard>('home', userId),
      readEntry<CachedDivePage>('dives-p0', userId),
      readEntry<LogbookSnapshot>('sync', userId),
    ])
    home.value = h
    divesPage.value = d
    sync.value = s
  }

  function hydrate(): Promise<void> {
    hydrating ??= (async () => {
      const stored = await readOwner()
      owner.value = stored
      if (stored) await loadEntries(stored.userId)
      hydrated.value = true
    })()
    return hydrating
  }

  async function reloadSync() {
    if (!owner.value) return
    sync.value = await readEntry<LogbookSnapshot>('sync', owner.value.userId)
    syncTick.value++
  }

  // Saves wait until this session's account is confirmed (`rememberOwner`, after /v1/users/):
  // /v1/home can answer first, and a cached owner may be a previous account on this device.
  let ownerConfirmed = false
  const pending = new Map<'home' | 'dives-p0', unknown>()

  /** The signed-in account, confirmed online: switching accounts drops the previous one's data. */
  async function rememberOwner(user: { id: number; name: string }) {
    if (owner.value && owner.value.userId !== user.id) {
      home.value = null
      divesPage.value = null
      sync.value = null
    }
    owner.value = { userId: user.id, name: user.name, lastOnlineAt: Date.now() }
    ownerConfirmed = true
    await writeOwner(owner.value)
    const waiting = [...pending]
    pending.clear()
    for (const [key, data] of waiting) {
      if (key === 'home') await saveHome(data as HomeDashboard)
      else await saveDivesPage(data as CachedDivePage)
    }
  }

  async function save<T>(key: 'home' | 'dives-p0', data: T): Promise<OfflineEntry<T> | null> {
    if (!owner.value || !ownerConfirmed) {
      pending.set(key, data)
      return null
    }
    const entry = { userId: owner.value.userId, savedAt: Date.now(), data }
    await writeEntry(key, entry)
    // Logged out while writing: don't leave this account's data behind.
    if (!owner.value) {
      await clearOffline()
      return null
    }
    return entry
  }

  async function saveHome(data: HomeDashboard) {
    const entry = await save('home', data)
    if (entry) home.value = entry
  }

  async function saveDivesPage(data: CachedDivePage) {
    const entry = await save('dives-p0', data)
    if (entry) divesPage.value = entry
  }

  async function clear() {
    ownerConfirmed = false
    pending.clear()
    owner.value = null
    home.value = null
    divesPage.value = null
    sync.value = null
    await clearOffline()
  }

  return {
    owner,
    home,
    divesPage,
    sync,
    hydrated,
    syncTick,
    mergedHome,
    hydrate,
    reloadSync,
    rememberOwner,
    saveHome,
    saveDivesPage,
    clear,
  }
})
