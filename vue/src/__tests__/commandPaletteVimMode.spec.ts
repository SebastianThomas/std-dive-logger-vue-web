import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import CommandPalette from '@/components/CommandPalette.vue'
import VimModeBadge from '@/components/vim/VimModeBadge.vue'
import { useVimModeStore } from '@/stores/vimMode'

vi.mock('@/composables/useNavigation', () => ({
  useNavigation: () => ({ safeBack: vi.fn(), safeForward: vi.fn(), router: { push: vi.fn() } }),
}))

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', name: 'Home', component: { render: () => null } }],
})

const mountPalette = () =>
  mount(CommandPalette, {
    props: { modelValue: true },
    global: { plugins: [router], stubs: { teleport: true } },
    attachTo: document.body,
  })

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  await router.push('/')
  await router.isReady()
})

describe('CommandPalette vim mode (shared vimMode store)', () => {
  it('shows the standard arrow-key footer and no badge when vim mode is off', () => {
    const w = mountPalette()
    expect(w.text()).toContain('↑↓')
    expect(w.findComponent(VimModeBadge).exists()).toBe(false)
    w.unmount()
  })

  it('shows the INSERT/NORMAL badge and vim footer hints when vim mode is on', async () => {
    useVimModeStore().set(true)
    const w = mountPalette()
    await nextTick()
    expect(w.findComponent(VimModeBadge).exists()).toBe(true)
    expect(w.text()).toContain('Normal mode') // the vim-mode footer hint (insert sub-mode)
    expect(w.text()).not.toContain('↑↓')
    w.unmount()
  })

  it('the search input opts out of in-field vim via data-vim-exempt', () => {
    const w = mountPalette()
    expect(w.find('input').attributes('data-vim-exempt')).toBeDefined()
    w.unmount()
  })

  it('running the toggle command flips the shared store', async () => {
    const w = mountPalette()
    const store = useVimModeStore()
    expect(store.enabled).toBe(false)

    await w.find('input').setValue('Switch to Vim')
    await nextTick()
    const row = w.findAll('.cursor-pointer').find((r) => r.text().includes('Vim Mode'))
    expect(row).toBeTruthy()
    await row!.trigger('click')

    expect(store.enabled).toBe(true)
    w.unmount()
  })
})
