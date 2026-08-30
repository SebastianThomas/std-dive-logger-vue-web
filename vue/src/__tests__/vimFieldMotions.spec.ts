import { describe, it, expect } from 'vitest'
import {
  horizontal,
  lineStart,
  lineEnd,
  firstNonBlank,
  nextWordStart,
  prevWordStart,
  wordEnd,
  verticalTextarea,
  insertCaretFor,
} from '@/lib/vim/fieldMotions'

describe('fieldMotions - horizontal / line ops', () => {
  it('h/l clamp at the ends of the current line', () => {
    expect(horizontal('hello', 0, -1)).toBe(0)
    expect(horizontal('hello', 0, 1)).toBe(1)
    expect(horizontal('hello', 5, 1)).toBe(5)
  })

  it('h/l do not cross a newline', () => {
    expect(horizontal('ab\ncd', 2, 1)).toBe(2) // end of line 0
    expect(horizontal('ab\ncd', 3, -1)).toBe(3) // start of line 1
  })

  it('lineStart / lineEnd find the caret line bounds', () => {
    expect(lineStart('ab\ncd', 4)).toBe(3)
    expect(lineStart('ab\ncd', 1)).toBe(0)
    expect(lineEnd('ab\ncd', 1)).toBe(2)
    expect(lineEnd('ab\ncd', 4)).toBe(5)
  })

  it('firstNonBlank skips leading whitespace on the caret line', () => {
    expect(firstNonBlank('  hi', 4)).toBe(2)
    expect(firstNonBlank('  hi\n  yo', 6)).toBe(7)
    expect(firstNonBlank('nolead', 3)).toBe(0)
  })
})

describe('fieldMotions - word motions', () => {
  it('nextWordStart (w) crosses whitespace and stops at class changes', () => {
    expect(nextWordStart('hello world', 0)).toBe(6)
    expect(nextWordStart('hello world', 6)).toBe(11)
    expect(nextWordStart('hello world', 11)).toBe(11)
    expect(nextWordStart('foo.bar', 0)).toBe(3) // stops at punctuation
    expect(nextWordStart('foo, bar', 3)).toBe(5)
    expect(nextWordStart('  hi', 0)).toBe(2) // from whitespace
  })

  it('prevWordStart (b) lands on the start of the current or previous word', () => {
    expect(prevWordStart('hello world', 11)).toBe(6)
    expect(prevWordStart('hello world', 6)).toBe(0)
    expect(prevWordStart('hello', 0)).toBe(0)
    expect(prevWordStart('foo.bar', 7)).toBe(4)
  })

  it('wordEnd (e) lands just past the last char of the word', () => {
    expect(wordEnd('hello world', 0)).toBe(5)
    expect(wordEnd('hello world', 5)).toBe(11)
    expect(wordEnd('hello', 2)).toBe(5)
    expect(wordEnd('', 0)).toBe(0)
  })
})

describe('fieldMotions - verticalTextarea (j/k)', () => {
  it('moves one row and keeps the column when the target line is long enough', () => {
    const r = verticalTextarea('abc\ndefgh\ni', 1, 1, null)
    expect(r).toEqual({ caret: 5, goalColumn: 1 })
  })

  it('is a no-op (but reports the goal column) at the top/bottom edge', () => {
    expect(verticalTextarea('only one line', 5, 1, null)).toEqual({ caret: 5, goalColumn: 5 })
    expect(verticalTextarea('a\nb', 0, -1, null)).toEqual({ caret: 0, goalColumn: 0 })
  })

  it('remembers the goal column past a short line and restores it on a long one', () => {
    const text = 'abcdef\nxy\nabcdef'
    const down1 = verticalTextarea(text, 4, 1, null) // col 4 -> "xy" clamps to 2
    expect(down1.caret).toBe(9)
    expect(down1.goalColumn).toBe(4)
    const down2 = verticalTextarea(text, down1.caret, 1, down1.goalColumn)
    expect(down2.caret).toBe(14) // col 4 on the third line
    expect(down2.goalColumn).toBe(4)
  })
})

describe('fieldMotions - insertCaretFor', () => {
  it('places the caret for each of i / a / I / A', () => {
    expect(insertCaretFor('i', 'hello', 2)).toBe(2)
    expect(insertCaretFor('a', 'hello', 2)).toBe(3)
    expect(insertCaretFor('a', 'ab\ncd', 2)).toBe(2) // clamped to line end
    expect(insertCaretFor('I', '  hi', 3)).toBe(2)
    expect(insertCaretFor('A', 'ab\ncd', 1)).toBe(2)
  })
})
