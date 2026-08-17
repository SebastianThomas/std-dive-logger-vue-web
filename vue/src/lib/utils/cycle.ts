/**
 * Steps an index by `direction`, clamped to `[0, length - 1]` rather than wrapping around - used
 * by every "next/previous" keyboard shortcut in the app (dive list pages, stats tabs, timeline
 * metrics) so they all share the same at-the-end behavior: pressing past the last item just stays
 * there instead of looping back to the first.
 */
export function clampedCycleIndex(currentIndex: number, length: number, direction: 1 | -1): number {
  if (length <= 0) return 0
  return Math.min(length - 1, Math.max(0, currentIndex + direction))
}
