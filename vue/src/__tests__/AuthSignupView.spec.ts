import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import axios from 'axios'
import AuthSignupView from '@/views/AuthSignupView.vue'
import { useAuthStore } from '@/stores/auth'

vi.mock('axios')
vi.mock('vue-sonner', () => ({ toast: { warning: vi.fn(), error: vi.fn() } }))

const assign = vi.fn()
const returnTo = 'https://gas.example/login?from=/join/abc'

async function mountSignup(query: string) {
  const page = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: page },
      { path: '/auth/login', name: 'AuthLogin', component: page },
      { path: '/auth/signup', name: 'AuthSignup', component: AuthSignupView },
    ],
  })
  await router.push(`/auth/signup${query}`)
  const wrapper = mount(AuthSignupView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

async function signUp(wrapper: Awaited<ReturnType<typeof mountSignup>>['wrapper']) {
  vi.mocked(axios.post).mockResolvedValue({ data: { id: 1 } })
  await wrapper.find('#username').setValue('dana')
  await wrapper.find('#email').setValue('dana@example.test')
  await wrapper.find('#password').setValue('secret')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('AuthSignupView: coming from another app', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubEnv('VITE_SIGNUP_RETURN_ORIGINS', 'https://gas.example')
    vi.stubGlobal('location', { ...window.location, assign })
    assign.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns there after signing up', async () => {
    const { wrapper } = await mountSignup(`?returnTo=${encodeURIComponent(returnTo)}`)
    await signUp(wrapper)
    expect(assign).toHaveBeenCalledWith(returnTo)
  })

  it('stays here for an address that is not listed', async () => {
    const { router, wrapper } = await mountSignup(
      `?returnTo=${encodeURIComponent('https://evil.example/')}`,
    )
    await signUp(wrapper)
    await flushPromises()
    expect(assign).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('AuthLogin')
  })

  it('goes to the login here without an address', async () => {
    const { router, wrapper } = await mountSignup('')
    await signUp(wrapper)
    await flushPromises()
    expect(assign).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('AuthLogin')
  })

  it('returns right away when already signed in', async () => {
    useAuthStore().login('token')
    await mountSignup(`?returnTo=${encodeURIComponent(returnTo)}`)
    expect(assign).toHaveBeenCalledWith(returnTo)
  })
})
