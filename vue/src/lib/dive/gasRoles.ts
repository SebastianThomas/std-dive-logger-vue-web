import type { DiveProfile, Gas } from '@/lib/types/dive'

export type GasListEntry = { gas: Gas; roleLabel: string | null }

type GasRole = 'diluent' | 'bailout'

/**
 * Extracts every unique gas mix breathed across a dive's profiles, tagging each with its role
 * (Diluent/Bailout) when the dive is on a CCR rig. On an OC dive every gas is trivially OC, so a
 * role label would add no information there and is left off; only on a CCR dive does it tell you
 * something the raw O2/He composition alone doesn't.
 */
// Composition is rounded to the nearest percentage point before dedup - two measurements of the
// "same" gas can report fractions that differ by sensor/parsing noise (e.g. a wireless transmitter
// re-reporting 0.319 vs 0.32 for the same cylinder), which would otherwise dedupe as two distinct
// "used" gases and show a phantom entry the diver never actually breathed a different mix of.
const roundToPercent = (fraction: number): number => Math.round(fraction * 100) / 100

export function computeGasList(profiles: DiveProfile[], isCcr: boolean): GasListEntry[] {
  // Deduplicate by composition only (not description) - the same gas breathed via different
  // profiles/computers can have differently-worded descriptions, but it's still one gas.
  const seen = new Map<string, { gas: Gas; roles: Set<GasRole> }>()
  for (const profile of profiles) {
    for (const { measurement } of profile.measurements) {
      const gas = measurement.gas
      // A surface reading (not yet/no longer submerged) can reflect whatever gas the computer
      // has selected by default rather than one actually breathed underwater - depth 0 samples
      // are excluded so a pre-dive default doesn't show up as a "used" gas on its own.
      if (!gas || measurement.depth <= 0) continue
      const key = `${roundToPercent(gas.o2)}-${roundToPercent(gas.n2)}-${roundToPercent(gas.he)}`
      let entry = seen.get(key)
      if (!entry) {
        entry = { gas, roles: new Set() }
        seen.set(key, entry)
      }
      if (isCcr) {
        // There's no explicit per-measurement diluent/bailout marker in the data today - PO2
        // telemetry present means the loop was active (diluent breathed), absent means this gas
        // was breathed open-circuit (bailout). The closest signal available, not a hard guarantee.
        const onLoop =
          measurement.po2?.measured !== undefined || measurement.po2?.calculated !== undefined
        entry.roles.add(onLoop ? 'diluent' : 'bailout')
      }
    }
  }

  return Array.from(seen.values()).map(({ gas, roles }) => ({
    gas,
    roleLabel: !isCcr
      ? null
      : roles.size === 2
        ? 'Diluent + Bailout'
        : roles.has('bailout')
          ? 'Bailout'
          : 'Diluent',
  }))
}
