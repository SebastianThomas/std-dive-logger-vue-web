import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './styles/global.css'

// Configure Leaflet defaults and provide library globally, add custom icons
import '@/lib/map/leafletIcon'
import * as L from 'leaflet'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.provide('leaflet', L)

app.mount('#app')
