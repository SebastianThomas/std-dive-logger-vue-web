import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

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
})
