import type { DiveProfile } from '@/lib/types/dive'

export type GasSwitch = { time: number; o2: number; he: number; label: string }

// Two logged mixes closer than half a percentage point are the same gas (float noise in exports).
const FRACTION_TOLERANCE = 0.005

/** A mix's usual diver-facing name: AIR, EANxx, O2, or TX o2/he (both in %). */
export function gasLabel(o2: number, he: number): string {
  const o2Pct = Math.round(o2 * 100)
  const hePct = Math.round(he * 100)
  if (hePct > 0) return `TX ${o2Pct}/${hePct}`
  if (o2Pct >= 99) return 'O2'
  if (o2Pct === 21) return 'AIR'
  return `EAN${o2Pct}`
}

/**
 * Every point in a profile's measurements where the breathing gas actually changed, in
 * chronological order - not the starting gas itself, only the switches after it. A profile with a
 * single gas (or no gas data) yields an empty list.
 */
export function detectGasSwitches(profile: DiveProfile): GasSwitch[] {
  const switches: GasSwitch[] = []
  let last: { o2: number; he: number } | undefined
  for (const { measurement } of profile.measurements) {
    const o2 = measurement.gas?.o2
    if (o2 === undefined) continue
    const he = measurement.gas?.he ?? 0
    if (
      last &&
      Math.abs(last.o2 - o2) <= FRACTION_TOLERANCE &&
      Math.abs(last.he - he) <= FRACTION_TOLERANCE
    ) {
      continue
    }
    if (last) switches.push({ time: measurement.time, o2, he, label: gasLabel(o2, he) })
    last = { o2, he }
  }
  return switches
}

/** Switches to the same gas this close together are one switch, logged by several computers. */
export const SAME_SWITCH_WINDOW_MS = 60_000

export type GasSwitchGroup = { label: string; times: number[] }

/**
 * Groups switches (of any number of profiles) so that same-gas switches within {@link
 * SAME_SWITCH_WINDOW_MS} of each other share one label - several computers recording the same
 * switch a few seconds apart (each is switched by hand) are one event to the diver. Every switch
 * keeps its own time, so each computer still gets its own line. Groups are in time order.
 */
export function groupGasSwitches(
  switches: GasSwitch[],
  windowMs: number = SAME_SWITCH_WINDOW_MS,
): GasSwitchGroup[] {
  const groups: GasSwitchGroup[] = []
  for (const s of [...switches].sort((a, b) => a.time - b.time)) {
    const group = groups.find(
      (g) => g.label === s.label && s.time - g.times[g.times.length - 1]! <= windowMs,
    )
    if (group) group.times.push(s.time)
    else groups.push({ label: s.label, times: [s.time] })
  }
  return groups
}

/**
 * A row per label so no two labels overlap: each goes to the first row whose previous label ends
 * (plus `gapPx`) before this one starts. Rows are returned in the input's order.
 */
export function assignLabelRows(labels: { x: number; width: number }[], gapPx = 4): number[] {
  const rows = new Array<number>(labels.length).fill(0)
  const rowEnds: number[] = []
  const byX = labels.map((label, index) => ({ ...label, index })).sort((a, b) => a.x - b.x)
  for (const label of byX) {
    let row = rowEnds.findIndex((end) => end + gapPx <= label.x)
    if (row === -1) {
      row = rowEnds.length
      rowEnds.push(0)
    }
    rowEnds[row] = label.x + label.width
    rows[label.index] = row
  }
  return rows
}
