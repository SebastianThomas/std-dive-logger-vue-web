import { afterEach, describe, expect, it } from 'vitest'
import { findScrollContainer, vimScrollDirection } from '@/composables/useVimPageScroll'

const key = (k: string, target: EventTarget, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key: k, bubbles: true, ...init })
  Object.defineProperty(event, 'target', { value: target })
  return event
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('vimScrollDirection', () => {
  it('scrolls down on j and up on k outside fields, only with vim mode on', () => {
    expect(vimScrollDirection(key('j', document.body), true)).toBe(1)
    expect(vimScrollDirection(key('k', document.body), true)).toBe(-1)
    expect(vimScrollDirection(key('j', document.body), false)).toBeNull()
  })

  it('leaves typing, selects and modified keys alone', () => {
    const input = document.createElement('input')
    const select = document.createElement('select')
    expect(vimScrollDirection(key('j', input), true)).toBeNull()
    expect(vimScrollDirection(key('j', select), true)).toBeNull()
    expect(vimScrollDirection(key('j', document.body, { ctrlKey: true }), true)).toBeNull()
    expect(vimScrollDirection(key('x', document.body), true)).toBeNull()
  })
})

describe('findScrollContainer', () => {
  it('picks the nearest scrolling ancestor, e.g. a view panel, over the document', () => {
    const panel = document.createElement('div')
    panel.style.overflowY = 'auto'
    Object.defineProperty(panel, 'scrollHeight', { value: 2000 })
    Object.defineProperty(panel, 'clientHeight', { value: 500 })
    const inner = document.createElement('p')
    panel.appendChild(inner)
    document.body.appendChild(panel)

    expect(findScrollContainer(inner)).toBe(panel)
  })

  it('skips an overflow container with nothing to scroll', () => {
    const panel = document.createElement('div')
    panel.style.overflowY = 'auto'
    const inner = document.createElement('p')
    panel.appendChild(inner)
    document.body.appendChild(panel)

    expect(findScrollContainer(inner)).toBe(document.scrollingElement)
  })
})
