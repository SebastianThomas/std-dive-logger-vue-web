/** One row in the Help Menu's shortcut list. */
export type ShortcutEntry = { label: string; key: string }

// Mirrors LEADER_ACTIONS in composables/useGlobalShortcuts.ts - kept as a separate display list
// here since that map is keyed by the raw event key (including '?'), not meant for iteration/
// display on its own.
export const leaderShortcuts: ShortcutEntry[] = [
  { label: 'Help', key: '?' },
  { label: 'Back', key: 'b' },
  { label: 'Forward', key: 'f' },
  { label: 'Home', key: 'h' },
  { label: 'Dive List', key: 'd' },
  { label: 'Trends', key: 't' },
  { label: 'Statistics', key: 's' },
  { label: 'Upload', key: 'u' },
  { label: 'Toggle Lock (read-only)', key: 'l' },
  { label: 'Scroll to Top', key: 'Space' },
]

export const pageShortcuts = {
  DiveView: [
    { label: 'Edit Dive', key: 'E' },
    { label: 'Share Dive', key: 'S' },
    { label: 'Delete Dive', key: 'Shift+D' },
    { label: 'Link Dive', key: 'L' },
    { label: 'Next/Previous Dive (own log only)', key: 'N/P or ←/→' },
    { label: 'Open Site in Google Maps', key: 'G' },
    { label: 'Copy Dive Link', key: 'C' },
    { label: 'Reimport Dive Profile', key: 'R' },
    { label: 'Jump to Profile 1-9', key: '1-9' },
  ],
  DiveList: [
    { label: 'Search', key: '/' },
    { label: 'Toggle Shared', key: 'A' },
    { label: 'Bulk Actions', key: 'M' },
    { label: 'Next/Previous Page', key: 'N/P' },
    { label: 'First/Last Page', key: 'Home/End' },
    { label: 'Move Row Focus', key: 'J/K' },
    { label: 'Open Focused Row', key: 'Enter' },
    { label: 'Toggle Focused Row Selection', key: 'X' },
    { label: 'Select All (this page)', key: 'Ctrl/Cmd+A' },
  ],
  Stats: [
    { label: 'Next/Previous Stat Tab', key: 'N/P' },
    { label: 'Jump to Tab 1-6', key: '1-6' },
  ],
  StatsTimeline: [
    { label: 'Next/Previous Metric', key: 'N/P' },
    { label: 'Jump to Metric 1-9, 0', key: '1-9, 0' },
    { label: 'Toggle Combine Mode', key: 'C' },
  ],
} satisfies Record<string, ShortcutEntry[]>

export type KnownShortcutPage = keyof typeof pageShortcuts

export const pageLabels: Record<KnownShortcutPage, string> = {
  DiveView: 'Dive View',
  DiveList: 'Dive List',
  Stats: 'Statistics',
  StatsTimeline: 'Trends',
}

export const isKnownShortcutPage = (name: string): name is KnownShortcutPage =>
  name in pageShortcuts
