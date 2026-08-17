/**
 * True when a keydown's target is somewhere a plain letter/number keystroke should be typed, not
 * intercepted as a shortcut - shared by every page's own keydown handler (App.vue, DiveView,
 * DiveList, Stats, StatsTimeline, ...) so they all draw the same line around "typing" rather than
 * each re-deciding it slightly differently.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
}
