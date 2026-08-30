/**
 * Display copy for the in-field vim normal mode - the single source of truth for `VimFieldHelp.vue`
 * (the local `?` popover) and the `HelpMenu.vue` section, so the two never drift. The behaviour
 * itself lives in `composables/useVimFieldNavigation.ts`.
 */
export type VimHelpRow = { keys: string; label: string }

export const NORMAL_HELP_ROWS: VimHelpRow[] = [
  { keys: 'h j k l', label: 'Move caret (h/l left/right · j/k across lines)' },
  { keys: 'w b e', label: 'Word forward / back / end' },
  { keys: '0 ^ $', label: 'Line start / first non-blank / end' },
  { keys: 'i a I A', label: 'Insert: here / after / line start / line end' },
  { keys: 'n }  ·  p {', label: 'Next / previous input field' },
  { keys: 'Ctrl+N / Ctrl+P', label: 'Move within an open suggestion list' },
  { keys: 'Tab / Shift+Tab', label: 'Next / previous field (native)' },
  { keys: 'Esc', label: 'Leave the field' },
  { keys: '?', label: 'This help' },
]
