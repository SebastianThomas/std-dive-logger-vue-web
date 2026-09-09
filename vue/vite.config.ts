import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(() => {
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
            dest: 'webfonts',
          },
        ],
      }),
      // Progressive Web App: installable, offline app shell and cached map tiles.
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
                'leaflet/diver-trim.svg',
                'pwa/apple-touch-icon-180x180.png',
                'images/logo_with_name.webp',
              ],
              manifest: {
                name: 'STD Dive Log',
                short_name: 'STD Dive Log',
                description: 'Your scuba dive logbook - profiles, trends, buddies and dive sites.',
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
                    // Raster map tiles - CARTO (dark) and OpenStreetMap (light).
                    urlPattern:
                      /^https:\/\/([a-d]\.basemaps\.cartocdn\.com|[a-c]\.tile\.openstreetmap\.org)\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'dtl-map-tiles-v2',
                      expiration: {
                        maxEntries: 200,
                        maxAgeSeconds: 60 * 60 * 24 * 7,
                        purgeOnQuotaError: true,
                      },
                      // Opaque responses consume ~7 MB each in browser quota accounting.
                      cacheableResponse: { statuses: [200] },
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
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      https: {},
    },
  }
})
