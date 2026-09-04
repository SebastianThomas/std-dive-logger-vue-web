import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils'
import type { DiverReminder } from '@/lib/types/home'

const { postWithToken, toastError } = vi.hoisted(() => ({
  postWithToken: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ postWithToken }) }))
vi.mock('vue-sonner', () => ({ toast: { error: toastError } }))

import HomeReminders from '@/components/home/HomeReminders.vue'

const anniversary: DiverReminder = {
  id: 1,
  kind: 'DIVE_ANNIVERSARY',
  title: '5 years ago today',
  body: 'Silfra · 18 m · 41 min',
  diveId: 42,
  yearsAgo: 5,
  relevantOn: '2026-09-03',
  createdAt: Date.now(),
}
const nudge: DiverReminder = {
  id: 2,
  kind: 'DIVE_AGAIN_NUDGE',
  title: 'Time to go diving again',
  body: "It's been 9 weeks since your last dive. Plan the next one?",
  diveId: null,
  yearsAgo: null,
  relevantOn: '2026-09-03',
  createdAt: Date.now(),
}

const mountIt = (reminders: DiverReminder[]) =>
  mount(HomeReminders, {
    props: { reminders },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })

beforeEach(() => {
  postWithToken.mockReset()
  postWithToken.mockResolvedValue({ status: 204 })
  toastError.mockClear()
})

describe('HomeReminders', () => {
  it('renders nothing with no reminders', () => {
    expect(mountIt([]).text()).toBe('')
  })

  it('links an anniversary to its dive and shows the body', () => {
    const w = mountIt([anniversary])
    expect(w.text()).toContain('5 years ago today')
    expect(w.text()).toContain('Silfra')
    const links = w.findAllComponents(RouterLinkStub)
    expect(links.some((l) => JSON.stringify(l.props('to')).includes('"diveId":42'))).toBe(true)
  })

  it('gives the dive-again nudge a "find your next site" link', () => {
    const w = mountIt([nudge])
    const links = w.findAllComponents(RouterLinkStub)
    expect(links.some((l) => JSON.stringify(l.props('to')).includes('MapView'))).toBe(true)
  })

  it('dismisses a reminder through the API and hides it immediately', async () => {
    const w = mountIt([anniversary, nudge])
    expect(w.findAll('button[title="Dismiss"]')).toHaveLength(2)

    await w.get('button[title="Dismiss"]').trigger('click')
    await flushPromises()

    expect(postWithToken).toHaveBeenCalledWith('/v1/reminders/1/dismiss')
    expect(w.text()).not.toContain('5 years ago today')
    expect(w.text()).toContain('Time to go diving again')
  })

  it('keeps the reminder and toasts when the dismiss call fails', async () => {
    postWithToken.mockRejectedValueOnce(new Error('boom'))
    const w = mountIt([nudge])

    await w.find('button[title="Dismiss"]').trigger('click')
    await flushPromises()

    expect(toastError).toHaveBeenCalled()
    expect(w.text()).toContain('Time to go diving again')
  })
})
