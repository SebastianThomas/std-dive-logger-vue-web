import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import NotFoundView from '@/views/NotFoundView.vue'
import appRouter from '@/router'

const mountAt = async (path: string) => {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div />' } },
      { path: '/dives/list', name: 'DiveList', component: { template: '<div />' } },
      { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundView },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(NotFoundView, { global: { plugins: [router] } })
}

describe('NotFoundView', () => {
  it('shows the path that was actually requested', async () => {
    const w = await mountAt('/definitely-not-a-route?from=nav')
    expect(w.text()).toContain('Page not found')
    expect(w.text()).toContain('/definitely-not-a-route?from=nav')
  })

  it('offers a way back to both the home page and the dive list', async () => {
    const w = await mountAt('/nope')
    const hrefs = w.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/dives/list')
  })
})

describe('router catch-all', () => {
  it('resolves an unmatched path to NotFound', () => {
    expect(appRouter.resolve('/no/such/page').name).toBe('NotFound')
  })

  it('does not require auth, so a logged-out typo is not redirected to login', () => {
    const resolved = appRouter.resolve('/no/such/page')
    expect(resolved.matched.some((r) => r.meta?.requiresAuth)).toBe(false)
  })

  it('still resolves real routes ahead of the catch-all', () => {
    expect(appRouter.resolve('/dives/list').name).toBe('DiveList')
    expect(appRouter.resolve('/backfill').name).toBe('Backfill')
  })
})
