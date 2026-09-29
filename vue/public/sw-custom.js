// Retire oversized tiles and the API cache that was shared across accounts.
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all(['dtl-map-tiles', 'dtl-api'].map((name) => caches.delete(name))))
})

// Handles incoming web pushes and notification clicks. Two payloads (backend model/push):
// - WebPushMessage { title, body, url, tag }: a reminder, always shown.
// - LogbookSyncPush { type: 'LOGBOOK_SYNC', userId, generatedAt, showNotification, snapshot, ... }:
//   stored for the app's offline copy (src/lib/offline/offlineCache.ts, same cache + keys); a
//   notification only when `showNotification` (Apple requires one per push, others don't).

const OFFLINE_CACHE = 'dtl-offline-v1'
const ICON = '/pwa/pwa-192x192.png'
const BADGE = '/pwa/pwa-64x64.png'

async function readJson(cache, key) {
  const response = await cache.match(key)
  return response ? response.json() : null
}

// True when the snapshot belongs to this device's signed-in account (stored or already newer).
async function storeSyncSnapshot(data) {
  const cache = await caches.open(OFFLINE_CACHE)
  const owner = await readJson(cache, '/__offline/owner')
  if (!owner || owner.userId !== data.userId) return false
  const previous = await readJson(cache, '/__offline/sync')
  if (previous && previous.savedAt >= data.generatedAt) return true
  await cache.put(
    '/__offline/sync',
    new Response(
      JSON.stringify({ userId: data.userId, savedAt: data.generatedAt, data: data.snapshot }),
      { headers: { 'Content-Type': 'application/json' } },
    ),
  )
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  windows.forEach((client) => client.postMessage({ type: 'dtl-sync' }))
  return true
}

async function handleLogbookSync(data) {
  let mine = true
  try {
    mine = await storeSyncSnapshot(data)
  } catch {
    // Storage unavailable: still honour the notification requirement below.
  }
  if (!mine) {
    // Logged out (or another account) on this device: stop receiving. The push service then
    // answers 410 and the backend prunes the subscription.
    const subscription = await self.registration.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()
    return
  }
  if (data.showNotification) {
    await self.registration.showNotification(data.title || 'Logbook synced', {
      body: data.body || '',
      icon: ICON,
      badge: BADGE,
      tag: data.tag || 'dtl-sync',
      silent: true,
      renotify: false,
      data: { url: data.url || '/' },
    })
  }
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'STD Dive Log', body: event.data ? event.data.text() : '' }
  }
  if (data.type === 'LOGBOOK_SYNC') {
    event.waitUntil(handleLogbookSync(data))
    return
  }
  const title = data.title || 'STD Dive Log'
  const options = {
    body: data.body || '',
    icon: ICON,
    badge: BADGE,
    tag: data.tag || 'dtl-reminder',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {})
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
