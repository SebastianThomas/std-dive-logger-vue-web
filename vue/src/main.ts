import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './styles/global.css'

// Configure Leaflet defaults and provide library globally, add custom icons
import '@/lib/map/leafletIcon'
import * as L from 'leaflet'

import { registerServiceWorker } from '@/lib/pwa/registerServiceWorker'
import { useOfflineStore } from '@/stores/offline'
import { useThemeStore } from '@/stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.provide('leaflet', L)

// data-theme must be set before anything renders: the `dark:` variant keys on it alone
// (see styles/global.css).
useThemeStore(pinia).initializeTheme()

// Load this device's cached account before the first navigation, so an installed app opened
// offline starts signed in (see stores/offline.ts). Capped: never hold the first paint for long.
void Promise.race([
  useOfflineStore(pinia).hydrate(),
  new Promise((resolve) => setTimeout(resolve, 300)),
]).finally(() => {
  app.use(router)
  app.mount('#app')
  registerServiceWorker()
})
