import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const postWithToken = vi.fn()
const deleteWithToken = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ getWithToken: vi.fn(), postWithToken, deleteWithToken }),
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

import {
  LOGBOOK_SYNC_KEY,
  isApplePushEndpoint,
  usePushNotifications,
} from '@/composables/usePushNotifications'

const unsubscribe = vi.fn(async () => true)
const subscription = (endpoint: string) => ({
  endpoint,
  unsubscribe,
  toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } }),
})

const install = (permission: NotificationPermission, sub: ReturnType<typeof subscription> | null) => {
  vi.stubGlobal('Notification', { permission, requestPermission: vi.fn() })
  vi.stubGlobal('PushManager', class {})
  const registration = { pushManager: { getSubscription: async () => sub } }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: async () => registration, ready: Promise.resolve(registration) },
  })
}

beforeEach(() => {
  localStorage.clear()
  postWithToken.mockReset().mockResolvedValue({ data: { logbookSync: true } })
  deleteWithToken.mockReset().mockResolvedValue({})
  unsubscribe.mockClear()
})
afterEach(() => vi.unstubAllGlobals())

describe('usePushNotifications', () => {
  it('re-registers this browser on start, with the device sync preference', async () => {
    install('granted', subscription('https://fcm.googleapis.com/fcm/send/x'))
    localStorage.setItem(LOGBOOK_SYNC_KEY, 'false')
    postWithToken.mockResolvedValue({ data: { logbookSync: false } })
    const push = usePushNotifications()

    await push.resync()

    expect(postWithToken).toHaveBeenCalledWith('/v1/push/subscriptions', {
      endpoint: 'https://fcm.googleapis.com/fcm/send/x',
      keys: { p256dh: 'p', auth: 'a' },
      logbookSync: false,
    })
    expect(push.logbookSync.value).toBe(false)
  })

  it('does nothing on start without permission or a subscription', async () => {
    install('default', subscription('https://fcm.googleapis.com/fcm/send/x'))
    await usePushNotifications().resync()
    install('granted', null)
    await usePushNotifications().resync()
    expect(postWithToken).not.toHaveBeenCalled()
  })

  it('stores the sync choice per device and sends it to the server', async () => {
    install('granted', subscription('https://web.push.apple.com/abc'))
    postWithToken.mockResolvedValue({ data: { logbookSync: false } })
    const push = usePushNotifications()

    await push.setLogbookSync(false)

    expect(localStorage.getItem(LOGBOOK_SYNC_KEY)).toBe('false')
    expect(postWithToken).toHaveBeenCalledWith(
      '/v1/push/subscriptions',
      expect.objectContaining({ logbookSync: false }),
    )
    expect(push.apple.value).toBe(true)
  })

  it('a signed-out device unsubscribes without calling the API', async () => {
    install('granted', subscription('https://fcm.googleapis.com/fcm/send/x'))
    await usePushNotifications().unsubscribeLocally()
    expect(unsubscribe).toHaveBeenCalled()
    expect(deleteWithToken).not.toHaveBeenCalled()
  })

  it('recognises Apple push endpoints only by host', () => {
    expect(isApplePushEndpoint('https://web.push.apple.com/x')).toBe(true)
    expect(isApplePushEndpoint('https://push.apple.com.evil.example/x')).toBe(false)
    expect(isApplePushEndpoint(null)).toBe(false)
  })
})
