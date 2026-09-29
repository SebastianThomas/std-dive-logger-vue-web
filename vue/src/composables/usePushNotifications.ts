import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'
import { safeLocalStorage } from '@/lib/utils/safeLocalStorage'

export const LOGBOOK_SYNC_KEY = 'push-logbook-sync'

/** Apple's push service only accepts pushes that show a notification (see backend PushPlatform). */
export const isApplePushEndpoint = (endpoint: string | null | undefined): boolean => {
  try {
    return !!endpoint && new URL(endpoint).hostname.endsWith('push.apple.com')
  } catch {
    return false
  }
}

/**
 * Opt-in web push on this device: reminders (anniversaries + the "dive again" nudge) and the
 * logbook sync that keeps the offline copy current. SW handlers live in `public/sw-custom.js`.
 * `enable()` degrades gracefully with a toast if the server has no VAPID key configured yet.
 */
export function usePushNotifications() {
  const { getWithToken, postWithToken, deleteWithToken } = useApi()

  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  const permission = ref<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  )
  const subscribed = ref(false)
  const busy = ref(false)
  const logbookSync = ref(safeLocalStorage.getItem(LOGBOOK_SYNC_KEY) !== 'false')
  const apple = ref(false)

  const getRegistration = async () =>
    supported ? await navigator.serviceWorker.ready : null

  // Unlike `.ready`, never waits for a service worker that may not exist (dev, first load).
  const currentSubscription = async (): Promise<PushSubscription | null> => {
    if (!supported) return null
    const reg = await navigator.serviceWorker.getRegistration()
    return (await reg?.pushManager.getSubscription()) ?? null
  }

  /** Idempotent server upsert; the response is the stored sync choice. */
  const register = async (subscription: PushSubscription) => {
    const json = subscription.toJSON()
    const { data } = await postWithToken<{ logbookSync: boolean }>('/v1/push/subscriptions', {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      logbookSync: logbookSync.value,
    })
    if (typeof data?.logbookSync === 'boolean') logbookSync.value = data.logbookSync
    apple.value = isApplePushEndpoint(json.endpoint)
  }

  const refresh = async () => {
    if (!supported) return
    permission.value = Notification.permission
    const subscription = await currentSubscription()
    subscribed.value = !!subscription
    apple.value = isApplePushEndpoint(subscription?.endpoint)
  }

  const enable = async (): Promise<boolean> => {
    if (!supported) {
      toast.error('This browser does not support notifications.')
      return false
    }
    busy.value = true
    try {
      permission.value = await Notification.requestPermission()
      if (permission.value !== 'granted') {
        return false
      }

      const { data } = await getWithToken<{ publicKey: string; enabled: boolean }>(
        '/v1/push/public-key',
      )
      if (!data?.publicKey) {
        toast.info("Reminders are on for this device, but push isn't switched on server-side yet.")
        return false
      }

      const reg = await getRegistration()
      if (!reg) return false
      const existing = await reg.pushManager.getSubscription()
      const subscription =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        }))

      await register(subscription)
      subscribed.value = true
      toast.success('Dive reminders will now reach this device.')
      return true
    } catch (err) {
      toast.error(`Couldn't enable notifications: ${extractErrorDetail(err)}`)
      return false
    } finally {
      busy.value = false
    }
  }

  const setLogbookSync = async (value: boolean) => {
    logbookSync.value = value
    safeLocalStorage.setItem(LOGBOOK_SYNC_KEY, String(value))
    const subscription = await currentSubscription()
    if (!subscription) return
    busy.value = true
    try {
      await register(subscription)
    } catch (err) {
      toast.error(`Couldn't save the sync setting: ${extractErrorDetail(err)}`)
    } finally {
      busy.value = false
    }
  }

  /**
   * Once per signed-in start: re-sends this browser's subscription. Heals a rotated endpoint, a
   * row removed by "log out everywhere" / a password change, and the owner after an account switch.
   */
  const resync = async () => {
    if (!supported || Notification.permission !== 'granted') return
    const subscription = await currentSubscription()
    if (!subscription) return
    try {
      await register(subscription)
    } catch {
      // Best effort - the next start tries again.
    }
  }

  const disable = async () => {
    if (!supported) return
    busy.value = true
    try {
      const subscription = await currentSubscription()
      if (subscription) {
        await deleteWithToken('/v1/push/subscriptions', { endpoint: subscription.endpoint }).catch(
          () => {},
        )
        await subscription.unsubscribe()
      }
      subscribed.value = false
    } finally {
      busy.value = false
    }
  }

  /** After the server ended the session: no API call possible, just stop receiving here. */
  const unsubscribeLocally = async () => {
    try {
      await (await currentSubscription())?.unsubscribe()
    } catch {
      // Nothing subscribed.
    }
    subscribed.value = false
  }

  return {
    supported,
    permission,
    subscribed,
    busy,
    logbookSync,
    apple,
    refresh,
    enable,
    disable,
    resync,
    setLogbookSync,
    unsubscribeLocally,
  }
}

/** VAPID keys come as URL-safe base64; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalised)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}
