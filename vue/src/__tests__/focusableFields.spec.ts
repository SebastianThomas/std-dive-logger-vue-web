import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isVimEditableTarget,
  supportsCaretMotions,
  getVimFocusableFields,
  getAdjacentField,
} from '@/lib/vim/focusableFields'

let root: HTMLElement

const mk = (html: string): HTMLElement => {
  root.innerHTML = html
  return root
}

beforeEach(() => {
  root = document.createElement('div')
  document.body.appendChild(root)
})

afterEach(() => {
  root.remove()
})

describe('isVimEditableTarget', () => {
  it('is true for a text input and a textarea, false for a select', () => {
    mk(
      `<input id="t" type="text"><input id="n" type="number"><textarea id="a"></textarea><select id="s"></select>`,
    )
    expect(isVimEditableTarget(root.querySelector('#t'))).toBe(true)
    expect(isVimEditableTarget(root.querySelector('#n'))).toBe(true)
    expect(isVimEditableTarget(root.querySelector('#a'))).toBe(true)
    expect(isVimEditableTarget(root.querySelector('#s'))).toBe(false)
  })

  it('is false for disabled / readonly / [data-vim-exempt] / non-text inputs', () => {
    mk(
      `<input id="d" type="text" disabled>
       <input id="r" type="text" readonly>
       <input id="c" type="checkbox">
       <input id="dt" type="date">
       <div data-vim-exempt><input id="ex" type="text"></div>`,
    )
    expect(isVimEditableTarget(root.querySelector('#d'))).toBe(false)
    expect(isVimEditableTarget(root.querySelector('#r'))).toBe(false)
    expect(isVimEditableTarget(root.querySelector('#c'))).toBe(false)
    expect(isVimEditableTarget(root.querySelector('#dt'))).toBe(false)
    expect(isVimEditableTarget(root.querySelector('#ex'))).toBe(false)
  })

  it('is false for null / a non-form element', () => {
    expect(isVimEditableTarget(null)).toBe(false)
    expect(isVimEditableTarget(document.createElement('div'))).toBe(false)
  })
})

describe('supportsCaretMotions', () => {
  it('is true for text-like inputs and textarea, false for number / email', () => {
    mk(
      `<input id="t" type="text"><input id="n" type="number"><input id="e" type="email"><textarea id="a"></textarea>`,
    )
    expect(supportsCaretMotions(root.querySelector('#t') as HTMLInputElement)).toBe(true)
    expect(supportsCaretMotions(root.querySelector('#a') as HTMLTextAreaElement)).toBe(true)
    expect(supportsCaretMotions(root.querySelector('#n') as HTMLInputElement)).toBe(false)
    expect(supportsCaretMotions(root.querySelector('#e') as HTMLInputElement)).toBe(false)
  })
})

describe('getVimFocusableFields', () => {
  it('returns visible, enabled fields in document order', () => {
    mk(
      `<input id="a" type="text">
       <input id="b" type="number">
       <textarea id="c"></textarea>
       <select id="d"></select>`,
    )
    expect(getVimFocusableFields(root).map((el) => el.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('excludes disabled, [data-vim-exempt], tabindex=-1, hidden, display:none and button-ish types', () => {
    mk(
      `<input id="ok" type="text">
       <input id="dis" type="text" disabled>
       <input id="ti" type="text" tabindex="-1">
       <input id="hid" type="text" hidden>
       <input id="dn" type="text" style="display:none">
       <input id="submit" type="submit">
       <div data-vim-exempt><input id="ex" type="text"></div>
       <input id="ok2" type="text">`,
    )
    expect(getVimFocusableFields(root).map((el) => el.id)).toEqual(['ok', 'ok2'])
  })
})

describe('getAdjacentField', () => {
  it('steps to the next / previous field and clamps at both ends (no wrap)', () => {
    mk(`<input id="a" type="text"><input id="b" type="text"><input id="c" type="text">`)
    const [a, b, c] = getVimFocusableFields(root)
    expect(getAdjacentField(a!, 1)).toBe(b)
    expect(getAdjacentField(b!, 1)).toBe(c)
    expect(getAdjacentField(c!, 1)).toBeNull()
    expect(getAdjacentField(a!, -1)).toBeNull()
    expect(getAdjacentField(c!, -1)).toBe(b)
  })
})
