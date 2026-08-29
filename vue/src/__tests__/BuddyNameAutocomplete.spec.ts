import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BuddyNameAutocomplete from '@/components/dive/BuddyNameAutocomplete.vue'

const getWithToken = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ getWithToken }),
}))

beforeEach(() => {
  getWithToken.mockReset()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BuddyNameAutocomplete', () => {
  it('debounces the autocomplete request while typing', async () => {
    getWithToken.mockResolvedValue({ data: ['Alice', 'Alan'] })
    const wrapper = mount(BuddyNameAutocomplete, { props: { modelValue: '' } })
    const input = wrapper.find('input')

    await input.setValue('Al')
    // Not yet - still inside the debounce window.
    expect(getWithToken).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(200)
    expect(getWithToken).toHaveBeenCalledTimes(1)
    expect(getWithToken).toHaveBeenCalledWith('/v1/dives/buddies/autocomplete?query=Al')
  })

  it('emits update:modelValue as the user types (independent of the debounced fetch)', async () => {
    getWithToken.mockResolvedValue({ data: [] })
    const wrapper = mount(BuddyNameAutocomplete, { props: { modelValue: '' } })
    await wrapper.find('input').setValue('Bob')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Bob'])
  })

  it('filters out names already excluded from the suggestion list', async () => {
    getWithToken.mockResolvedValue({ data: ['Alice', 'Alan'] })
    const wrapper = mount(BuddyNameAutocomplete, {
      props: { modelValue: '', excludeNames: ['Alan'] },
    })
    await wrapper.find('input').trigger('focus')
    await wrapper.find('input').setValue('Al')
    await vi.advanceTimersByTimeAsync(200)

    const items = wrapper.findAll('[class*="cursor-pointer"]')
    expect(items).toHaveLength(1)
    expect(items[0]!.text()).toBe('Alice')
  })

  it('clicking a suggestion emits both update:modelValue and select with the picked name', async () => {
    getWithToken.mockResolvedValue({ data: ['Alice'] })
    const wrapper = mount(BuddyNameAutocomplete, { props: { modelValue: '' } })
    await wrapper.find('input').trigger('focus')
    await wrapper.find('input').setValue('Al')
    await vi.advanceTimersByTimeAsync(200)

    await wrapper.find('[class*="cursor-pointer"]').trigger('mousedown')

    expect(wrapper.emitted('select')?.[0]).toEqual(['Alice'])
    // The last update:modelValue emitted is the picked name (typing emits intermediate ones too).
    const modelUpdates = wrapper.emitted('update:modelValue') as string[][]
    expect(modelUpdates[modelUpdates.length - 1]).toEqual(['Alice'])
  })

  it('emits enter on Enter, without adding a newline or submitting a form', async () => {
    const wrapper = mount(BuddyNameAutocomplete, { props: { modelValue: 'Alice' } })
    await wrapper.find('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('enter')).toHaveLength(1)
  })

  it('emits blur when the input loses focus', async () => {
    const wrapper = mount(BuddyNameAutocomplete, { props: { modelValue: 'Alice' } })
    await wrapper.find('input').trigger('blur')
    expect(wrapper.emitted('blur')).toHaveLength(1)
  })

  it('does not fetch at all for a blank query', async () => {
    const wrapper = mount(BuddyNameAutocomplete, { props: { modelValue: '' } })
    await wrapper.find('input').setValue('   ')
    await vi.advanceTimersByTimeAsync(200)
    expect(getWithToken).not.toHaveBeenCalled()
  })
})
