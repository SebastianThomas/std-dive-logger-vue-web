import { describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'

vi.mock('@/stores/auth', () => {
  return {
    useAuthStore: () => ({
      tryInitialLogin: vi.fn(),
      logout: vi.fn(),
      restoreUser: vi.fn(),
      isLoggedIn: false,
    }),
  }
})

describe('App', () => {
  it('mounts renders properly', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'Home', component: { template: '<div />' } },
        { path: '/auth/login', name: 'AuthLogin', component: { template: '<div />' } },
        { path: '/auth/signup', name: 'AuthSignup', component: { template: '<div />' } },
      ],
    })
    router.push('/')
    router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
        stubs: {
          'router-view': true,
          AppSidebar: true,
          Toaster: true,
        },
      },
    })
    expect(wrapper.get('header').get('div').get('a').get('h1').text()).toContain(
      'Dive Together Log',
    )
  })
})
