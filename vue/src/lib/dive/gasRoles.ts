import type { DiveProfile, Gas } from '@/lib/types/dive'

export type GasListEntry = { gas: Gas; roleLabel: string | null }

type GasRole = 'diluent' | 'bailout'

/**
 * Extracts every unique gas mix breathed across a dive's profiles, tagging each with its role
 * (Diluent/Bailout) when the dive is on a CCR rig. On an OC dive every gas is trivially OC, so a
 * role label would add no information there and is left off; only on a CCR dive does it tell you
 * something the raw O2/He composition alone doesn't.
 */
export function computeGasList(profiles: DiveProfile[], isCcr: boolean): GasListEntry[] {
  // Deduplicate by composition only (not description) - the same gas breathed via different
  // profiles/computers can have differently-worded descriptions, but it's still one gas.
  const seen = new Map<string, { gas: Gas; roles: Set<GasRole> }>()
  for (const profile of profiles) {
    for (const { measurement } of profile.measurements) {
      const gas = measurement.gas
      if (!gas) continue
      const key = `${gas.o2}-${gas.n2}-${gas.he}`
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
