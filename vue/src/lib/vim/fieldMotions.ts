/**
 * Pure caret math for the in-field vim normal mode (see `composables/useVimFieldNavigation.ts`).
 * No DOM: every function takes the field's string value + a caret index (0..text.length) and
 * returns a new caret index. `\n`-aware, so the same helpers are correct for a single-line
 * `<input>` (one line) and a `<textarea>`.
 */

type CharClass = 'space' | 'word' | 'punct'

const classOf = (ch: string): CharClass => {
  if (ch === '' || /\s/.test(ch)) return 'space'
  if (/[\p{L}\p{N}_]/u.test(ch)) return 'word'
  return 'punct'
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

/** Index just after the previous `\n` (start of the caret's line). */
export function lineStart(text: string, caret: number): number {
  const nl = text.lastIndexOf('\n', Math.max(0, caret - 1))
  return nl === -1 ? 0 : nl + 1
}

/** Index of the next `\n` (end of the caret's line), or `text.length`. */
export function lineEnd(text: string, caret: number): number {
  const nl = text.indexOf('\n', caret)
  return nl === -1 ? text.length : nl
}

/** First non-blank column of the caret's line (vim `^` / target of `I`). */
export function firstNonBlank(text: string, caret: number): number {
  const start = lineStart(text, caret)
  const end = lineEnd(text, caret)
  let i = start
  while (i < end && (text.charAt(i) === ' ' || text.charAt(i) === '\t')) i++
  return i
}

/** `h` / `l` - one column left / right, staying on the current line. */
export function horizontal(text: string, caret: number, dir: -1 | 1): number {
  return clamp(caret + dir, lineStart(text, caret), lineEnd(text, caret))
}

/** `w` - start of the next word (keyword run or punctuation run; whitespace separates). */
export function nextWordStart(text: string, caret: number): number {
  const n = text.length
  let i = caret
  if (i >= n) return n
  const cls = classOf(text.charAt(i))
  if (cls !== 'space') {
    while (i < n && classOf(text.charAt(i)) === cls) i++
  }
  while (i < n && classOf(text.charAt(i)) === 'space') i++
  return i
}

/** `b` - start of the current word, or of the previous one if already at a word start. */
export function prevWordStart(text: string, caret: number): number {
  let i = caret
  if (i <= 0) return 0
  i--
  while (i > 0 && classOf(text.charAt(i)) === 'space') i--
  if (i <= 0) return 0
  const cls = classOf(text.charAt(i))
  while (i > 0 && classOf(text.charAt(i - 1)) === cls) i--
  return i
}

/** `e` - end of the current word (position after its last char), or of the next one. */
export function wordEnd(text: string, caret: number): number {
  const n = text.length
  let i = caret
  while (i < n && classOf(text.charAt(i)) === 'space') i++
  if (i >= n) return n
  const cls = classOf(text.charAt(i))
  while (i < n && classOf(text.charAt(i)) === cls) i++
  return i
}

/**
 * `j` / `k` in a textarea. Moves the caret one visual row, keeping a sticky "goal column" so a
 * run of j/k past a short line lands back at the original column on the next long-enough line.
 * Returns the new caret plus the goal column to remember.
 */
export function verticalTextarea(
  text: string,
  caret: number,
  dir: -1 | 1,
  goalCol: number | null,
): { caret: number; goalColumn: number } {
  const lines = text.split('\n')
  let idx = 0
  let row = 0
  for (; row < lines.length - 1; row++) {
    const len = lines[row]?.length ?? 0
    if (caret <= idx + len) break
    idx += len + 1
  }
  const col = caret - idx
  const targetCol = goalCol ?? col
  const newRow = clamp(row + dir, 0, lines.length - 1)
  if (newRow === row) return { caret, goalColumn: targetCol }
  let newIdx = 0
  for (let r = 0; r < newRow; r++) newIdx += (lines[r]?.length ?? 0) + 1
  return {
    caret: newIdx + Math.min(targetCol, lines[newRow]?.length ?? 0),
    goalColumn: targetCol,
  }
}

/** Caret position to place before switching to insert for each of `i` / `a` / `I` / `A`. */
export function insertCaretFor(mode: 'i' | 'a' | 'I' | 'A', text: string, caret: number): number {
  switch (mode) {
    case 'i':
      return caret
    case 'a':
      return Math.min(caret + 1, lineEnd(text, caret))
    case 'I':
      return firstNonBlank(text, caret)
    case 'A':
      return lineEnd(text, caret)
  }
}
