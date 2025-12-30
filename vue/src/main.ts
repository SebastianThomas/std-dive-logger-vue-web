import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './styles/global.css'
// Ensure Leaflet markers use diver icons globally
import '@/lib/map/leafletIcon'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
