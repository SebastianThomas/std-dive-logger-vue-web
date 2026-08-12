import { describe, it, expect, afterEach, vi } from 'vitest'
import { safeLocalStorage } from '@/lib/utils/safeLocalStorage'

// This test environment doesn't provide a global `localStorage` at all (confirmed: `typeof
// localStorage` is `undefined` here), which is itself one of the real-world cases safeLocalStorage
// exists to handle gracefully - so every scenario below stubs in exactly the fake it needs rather
// than relying on a real Storage implementation being present.
function fakeStorage(overrides: Partial<Storage> = {}): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    clear: () => data.clear(),
    key: () => null,
    length: 0,
    ...overrides,
  } as Storage
}

describe('safeLocalStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when localStorage is unavailable (this test environment)', () => {
    expect(safeLocalStorage.getItem('key')).toBeNull()
  })

  it('setItem/removeItem no-op without throwing when localStorage is unavailable', () => {
    expect(() => safeLocalStorage.setItem('key', 'value')).not.toThrow()
    expect(() => safeLocalStorage.removeItem('key')).not.toThrow()
  })

  it('round-trips a value through setItem/getItem when localStorage is available', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    safeLocalStorage.setItem('key', 'value')
    expect(safeLocalStorage.getItem('key')).toBe('value')
  })

  it('removeItem clears a previously set value', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    safeLocalStorage.setItem('key', 'value')
    safeLocalStorage.removeItem('key')
    expect(safeLocalStorage.getItem('key')).toBeNull()
  })

  it('swallows a getItem error instead of throwing', () => {
    vi.stubGlobal(
      'localStorage',
      fakeStorage({
        getItem: () => {
          throw new Error('disabled')
        },
      }),
    )
    expect(safeLocalStorage.getItem('key')).toBeNull()
  })

  it('swallows a setItem error instead of throwing', () => {
    vi.stubGlobal(
      'localStorage',
      fakeStorage({
        setItem: () => {
          throw new Error('quota exceeded')
        },
      }),
    )
    expect(() => safeLocalStorage.setItem('key', 'value')).not.toThrow()
  })
})
