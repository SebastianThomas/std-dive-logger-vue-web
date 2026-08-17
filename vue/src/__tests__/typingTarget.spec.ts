import { describe, it, expect } from 'vitest'
import { isTypingTarget } from '@/lib/shortcuts/typingTarget'

describe('isTypingTarget', () => {
  it('is true for an input element', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
  })

  it('is true for a textarea element', () => {
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
  })

  it('is false for a button element', () => {
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
  })

  it('is false for a div element', () => {
    expect(isTypingTarget(document.createElement('div'))).toBe(false)
  })

  it('is false for null', () => {
    expect(isTypingTarget(null)).toBe(false)
  })
})
