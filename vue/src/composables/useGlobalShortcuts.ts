import { onMounted, onUnmounted, ref } from 'vue'
import { useNavigation } from '@/composables/useNavigation'
import { useReadOnlyMode } from '@/composables/useReadOnlyMode'
import { isTypingTarget } from '@/lib/shortcuts/typingTarget'

const LEADER_TIMEOUT_MS = 1500
const FEEDBACK_DURATION_MS = 1500

// The app-content scroll container is <main>, not window/body (it has its own overflow-y-auto) -
// window.scrollTo would silently do nothing.
const scrollContentToTop = () => {
  document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * App-wide keyboard shortcuts: the Command Palette/Help Menu toggles, back/forward, and the
 * vim-style `<leader>` key (remapped from Space - see its own doc comment below). Mounted once
 * from App.vue; every other page's own shortcuts (DiveView, DiveList, Stats, ...) are local to
 * that page instead, since they depend on page-specific state this composable has no business
 * knowing about.
 */
export function useGlobalShortcuts() {
  const { safeBack, safeForward, router } = useNavigation()
  const { readOnly, toggleReadOnly } = useReadOnlyMode()

  const showCommandPalette = ref(false)
  const showHelpMenu = ref(false)

  // vim-style <leader> key, remapped from Space across the whole page (not just the Command
  // Palette) - Space only ever does something on its own (page-down scroll) when nothing in
  // particular is focused, which is exactly the condition `isNothingFocused` below checks, so a
  // focused button/checkbox/link/input keeps its own native Space behavior completely untouched;
  // only the "otherwise wasted" case is remapped. Pressing Space arms a ~1.5s window during which
  // the next key completes a <leader>-prefixed shortcut (see LEADER_ACTIONS); Escape or a timeout
  // cancels it with no effect, same as vim's own leader.
  const leaderPending = ref(false)
  let leaderTimeoutId: ReturnType<typeof setTimeout> | null = null

  const clearLeader = () => {
    leaderPending.value = false
    if (leaderTimeoutId) {
      clearTimeout(leaderTimeoutId)
      leaderTimeoutId = null
    }
  }

  const armLeader = () => {
    leaderPending.value = true
    if (leaderTimeoutId) clearTimeout(leaderTimeoutId)
    leaderTimeoutId = setTimeout(clearLeader, LEADER_TIMEOUT_MS)
  }

  const isNothingFocused = (): boolean =>
    document.activeElement === null || document.activeElement === document.body

  // The leader indicator ("␣ leader…") disappears the instant a sequence completes, which is too
  // fast to actually read what just happened - this keeps the same indicator showing what fired,
  // for a moment, before fading. label mirrors leaderShortcuts in lib/shortcuts/shortcutDocs.ts.
  const lastActionLabel = ref<string | null>(null)
  let feedbackTimeoutId: ReturnType<typeof setTimeout> | null = null

  const flashFeedback = (label: string) => {
    lastActionLabel.value = label
    if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId)
    feedbackTimeoutId = setTimeout(() => {
      lastActionLabel.value = null
      feedbackTimeoutId = null
    }, FEEDBACK_DURATION_MS)
  }

  type LeaderAction = { label: string; run: () => void }

  const LEADER_ACTIONS: Record<string, LeaderAction> = {
    // No <leader>p for the Command Palette - Ctrl/Cmd+P and Ctrl/Cmd+K already open it, and 'p'
    // means "previous" on every page that has next/previous shortcuts (DiveView, DiveList,
    // Stats, StatsTimeline), so reusing it here would just be confusing, not useful.
    '?': {
      label: 'Help',
      run: () => {
        showHelpMenu.value = !showHelpMenu.value
      },
    },
    b: { label: 'Back', run: () => safeBack() },
    f: { label: 'Forward', run: () => safeForward() },
    h: { label: 'Home', run: () => router.push({ name: 'Home' }) },
    d: { label: 'Dive List', run: () => router.push({ name: 'DiveList' }) },
    s: { label: 'Statistics', run: () => router.push({ name: 'Stats' }) },
    t: { label: 'Trends', run: () => router.push({ name: 'StatsTimeline' }) },
    // Guarded the same as every other editing entry point - locked mode has no way to reach Upload.
    u: {
      label: 'Upload',
      run: () => {
        if (!readOnly.value) router.push({ name: 'DiveCreate' })
      },
    },
    l: { label: 'Toggle Lock', run: () => toggleReadOnly() },
    // Space Space (leader, tapped twice) - vim's `gg` equivalent for "scroll to top", since
    // there's no single physical key that reads naturally as "top" the way it does in vim.
    ' ': { label: 'Scroll to Top', run: () => scrollContentToTop() },
  }

  const handleGlobalKeydown = (event: KeyboardEvent) => {
    // Ctrl+P/Cmd+P or Ctrl+K/Cmd+K for command palette - always works, even while typing, same as
    // any browser's own omnibox shortcut. Two keys because different apps train different muscle
    // memory (P for "palette", K a VS Code/Linear-style convention) - metaKey covers Cmd on Mac.
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key.toLowerCase() === 'p' || event.key.toLowerCase() === 'k')
    ) {
      event.preventDefault()
      showCommandPalette.value = !showCommandPalette.value
      return
    }

    // Escape closes the Command Palette/Help Menu regardless of what currently has focus - each
    // also has its own local Escape handling for the common case (typing in the palette's search
    // box), but this is the fallback for whenever focus has ended up somewhere neither is
    // listening (e.g. after a Tab press moved focus outside the modal).
    if (event.key === 'Escape') {
      if (showCommandPalette.value) {
        showCommandPalette.value = false
        return
      }
      if (showHelpMenu.value) {
        showHelpMenu.value = false
        return
      }
    }

    // A leader sequence is already armed - this keypress completes it (or Escape cancels it).
    // Only reachable while nothing was focused when Space armed it, so there's no typing target
    // to protect here.
    if (leaderPending.value) {
      if (event.key === 'Escape') {
        clearLeader()
        return
      }
      const action = LEADER_ACTIONS[event.key]
      clearLeader()
      if (action) {
        event.preventDefault()
        action.run()
        flashFeedback(action.label)
      }
      return
    }

    if (
      event.key === ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      isNothingFocused()
    ) {
      event.preventDefault()
      armLeader()
      return
    }

    if (isTypingTarget(event.target)) {
      return
    }

    // 'b' for back
    if (event.key.toLowerCase() === 'b' && !event.ctrlKey && !event.metaKey) {
      safeBack()
    }
    // 'f' for forward
    if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey) {
      safeForward()
    }
    // Ctrl+O / Cmd+O and Ctrl+I / Cmd+I - vim's jumplist back/forward, a more vim-idiomatic alias
    // for 'b'/'f' above. Ctrl/Cmd+I is matched via event.code, not event.key: browsers report it
    // with the same event.key as a plain Tab press (a decades-old terminal convention carried
    // into the DOM), so event.key alone can't tell the two apart - event.code (the physical key)
    // can.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
      event.preventDefault()
      safeBack()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyI') {
      event.preventDefault()
      safeForward()
      return
    }
    // '?' to show help/shortcuts
    if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      showHelpMenu.value = !showHelpMenu.value
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleGlobalKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalKeydown)
    clearLeader()
    if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId)
  })

  return { showCommandPalette, showHelpMenu, leaderPending, lastActionLabel }
}
