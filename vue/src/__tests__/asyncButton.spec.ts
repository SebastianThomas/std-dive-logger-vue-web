import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AsyncButton from '@/components/ui/AsyncButton.vue'
import { useAsyncAction, useAsyncActionSet } from '@/composables/useAsyncAction'

describe('AsyncButton', () => {
  it('disables and shows a spinner while loading', () => {
    const w = mount(AsyncButton, { props: { loading: true, label: 'Save' } })
    expect((w.element as HTMLButtonElement).disabled).toBe(true)
    expect(w.attributes('aria-busy')).toBe('true')
    expect(w.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
    expect(w.text()).toContain('Save…')
  })

  it('is enabled and shows the plain label when idle', () => {
    const w = mount(AsyncButton, { props: { loading: false, label: 'Save' } })
    expect((w.element as HTMLButtonElement).disabled).toBe(false)
    expect(w.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(false)
    expect(w.text()).toBe('Save')
  })

  it('honours a disabled prop independent of loading', () => {
    const w = mount(AsyncButton, { props: { disabled: true, label: 'Go' } })
    expect((w.element as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('useAsyncAction', () => {
  it('flips busy for the duration and no-ops a re-entrant call', async () => {
    const { busy, run } = useAsyncAction()
    let resolve!: () => void
    const gate = new Promise<void>((r) => (resolve = r))
    let calls = 0

    const p1 = run(async () => {
      calls++
      await gate
    })
    expect(busy.value).toBe(true)

    const p2 = run(async () => {
      calls++
    })
    expect(await p2).toBeUndefined()
    expect(calls).toBe(1)

    resolve()
    await p1
    await nextTick()
    expect(busy.value).toBe(false)
  })

  it('re-throws so callers keep their own catch', async () => {
    const { run } = useAsyncAction()
    await expect(run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
  })
})

describe('useAsyncActionSet', () => {
  it('tracks busy state per key', async () => {
    const { isBusy, anyBusy, run } = useAsyncActionSet<number>()
    let resolve!: () => void
    const gate = new Promise<void>((r) => (resolve = r))

    const p = run(1, async () => {
      await gate
    })
    expect(isBusy(1)).toBe(true)
    expect(isBusy(2)).toBe(false)
    expect(anyBusy.value).toBe(true)
    expect(await run(1, async () => 'again')).toBeUndefined()

    resolve()
    await p
    expect(isBusy(1)).toBe(false)
    expect(anyBusy.value).toBe(false)
  })
})
