import { registerSW } from 'virtual:pwa-register'
import { toast } from 'vue-sonner'

/**
 * Wires up the service worker built by VitePWA (see vite.config.ts).
 *
 * `registerType` is `'prompt'`, so a fresh deploy never swaps itself in under the user's feet
 * mid-session: instead we show a sticky toast with a "Reload" action and only call
 * `updateSW(true)` (skipWaiting + reload) when they ask for it. `onOfflineReady` fires once, the
 * first time the shell has been fully precached.
 */
export function registerServiceWorker(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast('A new version of Dive Together Log is ready.', {
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: 'Reload',
          onClick: () => {
            void updateSW(true)
          },
        },
      })
    },
    onOfflineReady() {
      toast.success('Ready to use offline.')
    },
  })
}
