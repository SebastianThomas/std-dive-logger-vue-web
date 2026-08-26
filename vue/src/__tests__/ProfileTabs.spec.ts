import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import ProfileTabs from '../components/ProfileTabs.vue'

const makeRouter = (): Router =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', name: 'Profile', component: { template: '<div />' } },
      { path: '/profile/equipment', name: 'ProfileEquipment', component: { template: '<div />' } },
      { path: '/profile/buddies', name: 'ProfileBuddies', component: { template: '<div />' } },
      {
        path: '/profile/certifications',
        name: 'ProfileCertifications',
        component: { template: '<div />' },
      },
    ],
  })

const mountAt = async (routeName: string) => {
  const router = makeRouter()
  await router.push({ name: routeName })
  await router.isReady()
  const wrapper = mount(ProfileTabs, {
    props: { user: null },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  return { wrapper, router }
}

describe('ProfileTabs keyboard navigation', () => {
  it('ArrowRight moves to the next tab', async () => {
    const { router } = await mountAt('Profile')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ProfileEquipment')
  })

  it('ArrowLeft moves to the previous tab', async () => {
    const { router } = await mountAt('ProfileBuddies')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ProfileEquipment')
  })

  it('vim l/h move next/previous just like the arrow keys', async () => {
    const { router } = await mountAt('ProfileEquipment')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ProfileBuddies')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ProfileEquipment')
  })

  it('clamps at the last tab instead of wrapping around', async () => {
    const { router } = await mountAt('ProfileCertifications')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ProfileCertifications')
  })

  it('clamps at the first tab instead of wrapping around', async () => {
    const { router } = await mountAt('Profile')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('Profile')
  })

  it('is ignored while typing in an input', async () => {
    const { router } = await mountAt('Profile')
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('Profile')
    input.remove()
  })

  it('is ignored when a modifier key is held (e.g. Cmd+Right for browser history)', async () => {
    const { router } = await mountAt('Profile')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', metaKey: true }))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('Profile')
  })
})
