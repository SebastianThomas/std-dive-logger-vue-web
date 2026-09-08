import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AutocompleteInput from '@/components/AutocompleteInput.vue'

const { getWithToken } = vi.hoisted(() => ({ getWithToken: vi.fn() }))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ getWithToken }) }))

afterEach(() => {
  vi.useRealTimers()
  getWithToken.mockReset()
})

it('aborts superseded searches and ignores their late responses', async () => {
  vi.useFakeTimers()
  let resolveOld!: (value: unknown) => void
  getWithToken.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    .mockResolvedValueOnce({ data: [{ id: 2, name: 'New result' }] })
  const wrapper = mount(AutocompleteInput, { props: { suburl: 'site', label: 'Site' } })
  const input = wrapper.get('input')
  await input.trigger('focus')
  await input.setValue('old')
  await vi.advanceTimersByTimeAsync(300)
  const signal = getWithToken.mock.calls[0]![1].signal as AbortSignal
  await input.setValue('new')
  expect(signal.aborted).toBe(true)
  await vi.advanceTimersByTimeAsync(300)
  resolveOld({ data: [{ id: 1, name: 'Old result' }] })
  await flushPromises()
  expect(wrapper.text()).toContain('New result')
  expect(wrapper.text()).not.toContain('Old result')
  wrapper.unmount()
})

it('cancels pending debounce work when unmounted', async () => {
  vi.useFakeTimers()
  const wrapper = mount(AutocompleteInput, { props: { suburl: 'site', label: 'Site' } })
  await wrapper.get('input').setValue('query')
  wrapper.unmount()
  await vi.advanceTimersByTimeAsync(300)
  expect(getWithToken).not.toHaveBeenCalled()
})
