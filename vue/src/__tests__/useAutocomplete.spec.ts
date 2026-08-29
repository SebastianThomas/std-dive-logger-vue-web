import { describe, it, expect, vi } from 'vitest'
import { useAutocomplete } from '@/composables/useAutocomplete'

const key = (over: Partial<KeyboardEvent> = {}) =>
  ({ preventDefault: vi.fn(), stopPropagation: vi.fn(), ...over }) as unknown as KeyboardEvent

describe('useAutocomplete', () => {
  it('does not fetch as-you-type below minChars and debounces above it', async () => {
    const fetch = vi.fn().mockResolvedValue(['a'])
    const ac = useAutocomplete<string>({ cacheKey: 't', fetch, debounceMs: 10 })

    ac.onInput('')
    expect(fetch).not.toHaveBeenCalled()

    ac.onInput('ab')
    expect(fetch).not.toHaveBeenCalled() // still in the debounce window
    await new Promise((r) => setTimeout(r, 20))
    expect(fetch).toHaveBeenCalledWith('ab')
  })

  it('Ctrl+Space on an empty field calls fetchRelevant and opens the list', async () => {
    const fetch = vi.fn()
    const fetchRelevant = vi.fn().mockResolvedValue(['recent-1', 'recent-2'])
    const ac = useAutocomplete<string>({ cacheKey: 't2', fetch, fetchRelevant })

    ac.onKeydown(key({ ctrlKey: true, code: 'Space' }), {})
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchRelevant).toHaveBeenCalledOnce()
    expect(fetch).not.toHaveBeenCalled()
    expect(ac.results.value).toEqual(['recent-1', 'recent-2'])
    expect(ac.open.value).toBe(true)
  })

  it('ArrowDown on an empty field also triggers the relevant fetch', async () => {
    const fetchRelevant = vi.fn().mockResolvedValue(['x'])
    const ac = useAutocomplete<string>({ cacheKey: 't3', fetch: vi.fn(), fetchRelevant })
    ac.onKeydown(key({ key: 'ArrowDown' }), {})
    await Promise.resolve()
    await Promise.resolve()
    expect(fetchRelevant).toHaveBeenCalledOnce()
  })

  it('serves a repeat query from the cache without a second fetch', async () => {
    const fetch = vi.fn().mockResolvedValue(['hit'])
    const ac = useAutocomplete<string>({ cacheKey: 't4', fetch, debounceMs: 1 })
    ac.onInput('abc')
    await new Promise((r) => setTimeout(r, 10))
    ac.reset()
    ac.onInput('abc')
    await new Promise((r) => setTimeout(r, 10))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(ac.results.value).toEqual(['hit'])
  })

  it('navigates results with the arrow keys and selects with Enter', async () => {
    const ac = useAutocomplete<string>({ cacheKey: 't5', fetch: vi.fn().mockResolvedValue([]) })
    ac.results.value = ['one', 'two']
    ac.open.value = true
    ac.query.value = 'o'
    const onEnter = vi.fn()

    ac.onKeydown(key({ key: 'ArrowDown' }), { onEnter })
    expect(ac.activeIndex.value).toBe(0)
    ac.onKeydown(key({ key: 'ArrowDown' }), { onEnter })
    expect(ac.activeIndex.value).toBe(1)
    ac.onKeydown(key({ key: 'Enter' }), { onEnter })
    expect(onEnter).toHaveBeenCalledWith('two')
  })
})
