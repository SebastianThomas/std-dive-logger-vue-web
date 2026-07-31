import { describe, it, expect } from 'vitest'
import { LruCache } from '@/lib/utils/lruCache'

describe('LruCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = new LruCache<number, string>(3)
    expect(cache.get(1)).toBeUndefined()
    expect(cache.has(1)).toBe(false)
  })

  it('stores and retrieves values', () => {
    const cache = new LruCache<number, string>(3)
    cache.set(1, 'a')
    expect(cache.get(1)).toBe('a')
    expect(cache.has(1)).toBe(true)
  })

  it('evicts the least-recently-used entry once capacity is exceeded', () => {
    const cache = new LruCache<number, string>(2)
    cache.set(1, 'a')
    cache.set(2, 'b')
    cache.set(3, 'c') // evicts 1, since 2 was set more recently
    expect(cache.has(1)).toBe(false)
    expect(cache.has(2)).toBe(true)
    expect(cache.has(3)).toBe(true)
  })

  it('reading an entry counts as use, protecting it from eviction', () => {
    const cache = new LruCache<number, string>(2)
    cache.set(1, 'a')
    cache.set(2, 'b')
    cache.get(1) // 1 is now more recently used than 2
    cache.set(3, 'c') // should evict 2, not 1
    expect(cache.has(1)).toBe(true)
    expect(cache.has(2)).toBe(false)
    expect(cache.has(3)).toBe(true)
  })

  it('never exceeds its configured capacity', () => {
    const cache = new LruCache<number, number>(4)
    for (let i = 0; i < 100; i++) cache.set(i, i)
    let size = 0
    for (let i = 0; i < 100; i++) if (cache.has(i)) size++
    expect(size).toBe(4)
  })
})
