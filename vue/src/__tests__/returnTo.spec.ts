import { describe, expect, it } from 'vitest'
import { safeReturnTo } from '@/lib/utils/returnTo'

const allowed = 'https://gas.example, https://localhost:5193'

describe('safeReturnTo', () => {
  it('keeps the whole address on a listed origin', () => {
    const address = 'https://gas.example/login?from=/join/abc'
    expect(safeReturnTo(address, allowed)).toBe(address)
    expect(safeReturnTo('https://localhost:5193/login', allowed)).toBe(
      'https://localhost:5193/login',
    )
  })

  it.each([
    'https://evil.example/login',
    'https://gas.example@evil.example/',
    'https://gas.example.evil.example/',
    'http://gas.example/login',
    '//gas.example/login',
    '/login',
    'javascript:alert(1)',
    'null',
    '',
  ])('refuses %s', (address) => {
    expect(safeReturnTo(address, allowed)).toBeNull()
  })

  it('refuses anything without a list or a single address', () => {
    expect(safeReturnTo('https://gas.example/', undefined)).toBeNull()
    expect(safeReturnTo('https://gas.example/', '')).toBeNull()
    expect(safeReturnTo(['https://gas.example/'], allowed)).toBeNull()
    expect(safeReturnTo(undefined, allowed)).toBeNull()
  })
})
