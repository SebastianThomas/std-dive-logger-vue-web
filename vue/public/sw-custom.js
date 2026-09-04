// Handles incoming web pushes and notification clicks. Payload matches the backend
// WebPushMessage: { title, body, url, tag }.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Dive Together Log', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Dive Together Log'
  const options = {
    body: data.body || '',
    icon: '/pwa/pwa-192x192.png',
    badge: '/pwa/pwa-64x64.png',
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
