import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadingProgress from '@/components/ui/LoadingProgress.vue'

afterEach(() => {
  vi.useRealTimers()
})

describe('LoadingProgress', () => {
  it('renders the first message and a spinner using the default icon', () => {
    const w = mount(LoadingProgress, { props: { messages: ['One', 'Two'] } })
    expect(w.text()).toContain('One')
    expect(w.find('.fa-circle-notch.fa-spin').exists()).toBe(true)
  })

  it('uses a custom icon when given', () => {
    const w = mount(LoadingProgress, { props: { messages: ['One'], icon: 'compass' } })
    expect(w.find('.fa-compass.fa-spin').exists()).toBe(true)
  })

  it('rotates through the messages on an interval', async () => {
    vi.useFakeTimers()
    const w = mount(LoadingProgress, {
      props: { messages: ['First', 'Second', 'Third'], intervalMs: 1000 },
    })
    expect(w.text()).toContain('First')

    await vi.advanceTimersByTimeAsync(1000)
    expect(w.text()).toContain('Second')

    await vi.advanceTimersByTimeAsync(1000)
    expect(w.text()).toContain('Third')

    await vi.advanceTimersByTimeAsync(1000)
    expect(w.text()).toContain('First')
  })

  it('does not schedule a timer with only one message', () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(global, 'setInterval')
    mount(LoadingProgress, { props: { messages: ['Only one'] } })
    expect(spy).not.toHaveBeenCalled()
  })

  it('falls back to a sensible default when no messages are given', () => {
    const w = mount(LoadingProgress)
    expect(w.text()).toContain('Crunching the numbers')
  })

  it('clears its interval on unmount', () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(global, 'clearInterval')
    const w = mount(LoadingProgress, { props: { messages: ['A', 'B'] } })
    w.unmount()
    expect(clearSpy).toHaveBeenCalled()
  })
})
