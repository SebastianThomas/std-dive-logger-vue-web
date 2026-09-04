import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import vueDevTools from 'vite-plugin-vue-devtools'

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The backend lives on its own origin, baked per build mode (.env.production / .env.staging).
  // Resolve its host so the service worker can serve the last-known dashboard / dive list /
  // dive view when the network is flaky - which, for a dive log, is often exactly when you want
  // to look something up (on a boat, in a dive centre with bad wifi). Auth endpoints are never
  // cached (see runtimeCaching below).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const backendHost = (() => {
    try {
      return new URL(env.VITE_BACKEND_URL || 'https://std-dive-logger.sthomas.ch').host
    } catch {
      return 'std-dive-logger.sthomas.ch'
    }
  })()

  return {
    plugins: [
      vue(),
      vueDevTools(),
      // Skip under Vitest: it reuses this config but never serves over HTTPS, and mkcert's
      // startup check calls GitHub's API, which flakes out CI with rate-limit 403s.
      ...(process.env.VITEST ? [] : [mkcert()]),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@fortawesome/fontawesome-free/webfonts/*',
            dest: 'webfonts'
          }
        ]
      }),
      // Progressive Web App: installable, offline app shell, cached map tiles + API reads.
      // Skipped under Vitest - the SW/manifest machinery is irrelevant to unit tests.
      ...(process.env.VITEST
        ? []
        : [
            VitePWA({
              registerType: 'prompt',
              // We register the SW ourselves (src/lib/pwa/registerServiceWorker.ts) so the
              // "new version available" prompt can be a vue-sonner toast.
              injectRegister: false,
              // favicon + the header wordmark: small, part of the app chrome, wanted offline.
              // (The multi-MB marketing photos stay out - see workbox.globIgnores.)
              includeAssets: [
                'favicon.ico',
                'pwa/apple-touch-icon-180x180.png',
                'images/logo_with_name.png',
              ],
              manifest: {
                name: 'Dive Together Log',
                short_name: 'DiveLog',
                description:
                  'Your scuba dive logbook - profiles, trends, buddies and dive sites.',
                lang: 'en',
                theme_color: '#0b1220',
                background_color: '#0b1220',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                categories: ['sports', 'lifestyle', 'utilities'],
                icons: [
                  { src: 'pwa/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
                  { src: 'pwa/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                  {
                    src: 'pwa/pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: 'pwa/maskable-icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,ico,woff,woff2}', 'pwa/*.png'],
                // The marketing photos are multi-MB and pointless to precache; sw-custom.js is
                // pulled in via importScripts, not precached.
                globIgnores: ['**/images/**', 'sw-custom.js'],
                // Custom push / notificationclick handlers layered on the generated SW.
                importScripts: ['sw-custom.js'],
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api\//, /^\/v1\//],
                cleanupOutdatedCaches: true,
                runtimeCaching: [
                  {
                    // Backend GET reads (dashboard, dive list/view, sites...) - never the auth
                    // endpoints. NetworkFirst: fresh when online, last-known when not.
                    urlPattern: new RegExp(
                      `^https://${escapeRe(backendHost)}/(?!api/auth)(v1|api)/.*`,
                    ),
                    method: 'GET',
                    handler: 'NetworkFirst',
                    options: {
                      cacheName: 'dtl-api',
                      networkTimeoutSeconds: 4,
                      expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
                      cacheableResponse: { statuses: [200] },
                    },
                  },
                  {
                    // Raster map tiles - CARTO (dark) and OpenStreetMap (light).
                    urlPattern:
                      /^https:\/\/([a-d]\.basemaps\.cartocdn\.com|[a-c]\.tile\.openstreetmap\.org)\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'dtl-map-tiles',
                      expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
                      cacheableResponse: { statuses: [0, 200] },
                    },
                  },
                ],
              },
              devOptions: {
                enabled: false,
              },
            }),
          ]),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      https: {},
    },
  }
})
