import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { extractErrorDetail } from '@/lib/utils/apiErrors'

/**
 * Opt-in web push for reminders (anniversaries + the "dive again" nudge). SW handlers live in
 * `public/sw-custom.js`. `enable()` degrades gracefully with a toast if the server has no VAPID
 * key configured yet.
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

  const getRegistration = async () =>
    supported ? await navigator.serviceWorker.ready : null

  const refresh = async () => {
    if (!supported) return
    permission.value = Notification.permission
    const reg = await getRegistration()
    subscribed.value = !!(await reg?.pushManager.getSubscription())
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

      const json = subscription.toJSON()
      await postWithToken('/v1/push/subscriptions', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      })
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

  const disable = async () => {
    if (!supported) return
    busy.value = true
    try {
      const reg = await getRegistration()
      const subscription = await reg?.pushManager.getSubscription()
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

  return { supported, permission, subscribed, busy, refresh, enable, disable }
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
