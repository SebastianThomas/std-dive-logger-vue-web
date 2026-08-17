import { describe, it, expect } from 'vitest'
import { clampedCycleIndex } from '@/lib/utils/cycle'

describe('clampedCycleIndex', () => {
  it('steps forward within bounds', () => {
    expect(clampedCycleIndex(1, 5, 1)).toBe(2)
  })

  it('steps backward within bounds', () => {
    expect(clampedCycleIndex(3, 5, -1)).toBe(2)
  })

  it('clamps at the last index instead of wrapping', () => {
    expect(clampedCycleIndex(4, 5, 1)).toBe(4)
  })

  it('clamps at the first index instead of wrapping', () => {
    expect(clampedCycleIndex(0, 5, -1)).toBe(0)
  })

  it('handles a single-item list', () => {
    expect(clampedCycleIndex(0, 1, 1)).toBe(0)
    expect(clampedCycleIndex(0, 1, -1)).toBe(0)
  })

  it('handles an empty list without throwing', () => {
    expect(clampedCycleIndex(0, 0, 1)).toBe(0)
  })

  it('clamps an out-of-range starting index back into bounds', () => {
    expect(clampedCycleIndex(-1, 5, 1)).toBe(0)
    expect(clampedCycleIndex(10, 5, -1)).toBe(4)
  })
})
