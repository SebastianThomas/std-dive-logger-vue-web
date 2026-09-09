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

  it('Ctrl+N / Ctrl+P move the highlight while a list is open, and swallow the key', () => {
    const ac = useAutocomplete<string>({ cacheKey: 't6', fetch: vi.fn() })
    ac.results.value = ['one', 'two', 'three']
    ac.open.value = true

    const down = key({ key: 'n', ctrlKey: true })
    ac.onKeydown(down, {})
    expect(ac.activeIndex.value).toBe(0)
    expect(down.preventDefault).toHaveBeenCalled()
    expect(down.stopPropagation).toHaveBeenCalled()

    ac.onKeydown(key({ key: 'p', ctrlKey: true }), {})
    expect(ac.activeIndex.value).toBe(2) // wraps
  })

  it('leaves Ctrl+P alone when no list is open (so it can open the Command Palette)', () => {
    const ac = useAutocomplete<string>({ cacheKey: 't7', fetch: vi.fn() })
    const e = key({ key: 'p', ctrlKey: true })
    ac.onKeydown(e, {})
    expect(e.preventDefault).not.toHaveBeenCalled()
    expect(e.stopPropagation).not.toHaveBeenCalled()
  })
})

it.each(['reset', 'clear'] as const)('ignores a pending result after %s', async action => {
  let finish!: (rows: string[]) => void
  const ac = useAutocomplete({cacheKey:'race', fetch:() => new Promise<string[]>(resolve => { finish = resolve })})
  ac.query.value = 'old'
  const pending = ac.triggerNow()
  if (action === 'reset') ac.reset()
  else ac.onInput('')
  finish(['stale'])
  await pending
  expect(ac.results.value).toEqual([])
  expect(ac.loading.value).toBe(false)
})

it('does not let an in-flight request replace a cached result', async () => {
  let finish!: (rows: string[]) => void
  const fetch = vi.fn().mockResolvedValueOnce(['cached']).mockImplementationOnce(() => new Promise<string[]>(resolve => { finish = resolve }))
  const ac = useAutocomplete<string>({ cacheKey: 'cache-race', fetch })
  ac.query.value = 'cached'
  await ac.triggerNow()
  ac.query.value = 'slow'
  const pending = ac.triggerNow()
  ac.query.value = 'cached'
  await ac.triggerNow()
  finish(['stale'])
  await pending
  expect(ac.results.value).toEqual(['cached'])
})
