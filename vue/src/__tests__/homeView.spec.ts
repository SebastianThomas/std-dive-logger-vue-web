import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'
import { useOfflineStore } from '@/stores/offline'

const mountHome = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/auth/login', name: 'AuthLogin', component: { template: '<div />' } },
      { path: '/auth/signup', name: 'AuthSignup', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(HomeView, {
    global: {
      plugins: [router],
      stubs: {
        HomeSkeleton: { template: '<div class="stub-skeleton" />' },
        HomeMarketing: { template: '<div class="stub-marketing" />' },
        HomeDashboard: { template: '<div class="stub-dashboard" />' },
        HomeOfflineNotice: { template: '<div class="stub-offline" />' },
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('HomeView auth branching', () => {
  it('shows the skeleton before the initial auth check resolves', async () => {
    setActivePinia(createPinia())
    const w = await mountHome()
    expect(w.find('.stub-skeleton').exists()).toBe(true)
    expect(w.find('.stub-marketing').exists()).toBe(false)
    expect(w.find('.stub-dashboard').exists()).toBe(false)
  })

  it('shows the dashboard once logged in', async () => {
    setActivePinia(createPinia())
    useAuthStore().login('token')
    const w = await mountHome()
    expect(w.find('.stub-dashboard').exists()).toBe(true)
    expect(w.find('.stub-skeleton').exists()).toBe(false)
  })

  it('shows the marketing page once the check resolves to logged-out', async () => {
    setActivePinia(createPinia())
    useAuthStore().logout()
    const w = await mountHome()
    expect(w.find('.stub-marketing').exists()).toBe(true)
    expect(w.find('.stub-dashboard').exists()).toBe(false)
  })

  it('shows the dashboard from the cached account while the check is still running', async () => {
    setActivePinia(createPinia())
    useOfflineStore().owner = { userId: 7, name: 'Sam', lastOnlineAt: Date.now() }
    const w = await mountHome()
    expect(w.find('.stub-dashboard').exists()).toBe(true)
    expect(w.find('.stub-skeleton').exists()).toBe(false)
  })

  it('keeps the dashboard when offline with a cached account', async () => {
    setActivePinia(createPinia())
    useOfflineStore().owner = { userId: 7, name: 'Sam', lastOnlineAt: Date.now() }
    useAuthStore().markUnreachable()
    const w = await mountHome()
    expect(w.find('.stub-dashboard').exists()).toBe(true)
    expect(w.find('.stub-marketing').exists()).toBe(false)
  })

  it('says "offline", not "logged out", without a cached account', async () => {
    setActivePinia(createPinia())
    useAuthStore().markUnreachable()
    const w = await mountHome()
    expect(w.find('.stub-offline').exists()).toBe(true)
    expect(w.find('.stub-marketing').exists()).toBe(false)
  })
})
