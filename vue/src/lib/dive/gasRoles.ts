import type { DiveComputer, DiveProfile, Gas } from '@/lib/types/dive'

export type GasRole = 'diluent' | 'bailout'

export type GasListEntry = {
  gas: Gas
  role: GasRole | null
  roleLabel: string | null
  /** Which computer(s)/profile(s) this composition+role combination was actually logged by - for
   * a "logged by" hover claim, since a dual-role gas is now split into separate entries rather
   * than merged into one ambiguous "Diluent + Bailout" line. */
  contributingComputers: DiveComputer[]
}

/**
 * Extracts every unique gas mix breathed across a dive's profiles, tagging each with its role
 * (Diluent/Bailout) when the dive is on a CCR rig. On an OC dive every gas is trivially OC, so a
 * role label would add no information there and is left off; only on a CCR dive does it tell you
 * something the raw O2/He composition alone doesn't.
 *
 * A composition genuinely breathed both ways (e.g. a diluent mix later used as bailout after a
 * loop failure) produces two separate entries - one Diluent, one Bailout - each attributed to
 * whichever profile(s) actually logged it that way, rather than one entry combined into the
 * ambiguous "Diluent + Bailout" label. That combined label doesn't exist anymore: with role now
 * determined from the measurement's own logged mode (see {@link measurementRole}) rather than
 * inferred from PO2-telemetry presence, there's no more "this sample's role is unclear" case to
 * hedge with a combined label for - only "this composition was genuinely used both ways, twice."
 */
// Composition is rounded to the nearest percentage point before dedup - two measurements of the
// "same" gas can report fractions that differ by sensor/parsing noise (e.g. a wireless transmitter
// re-reporting 0.319 vs 0.32 for the same cylinder), which would otherwise dedupe as two distinct
// "used" gases and show a phantom entry the diver never actually breathed a different mix of.
const roundToPercent = (fraction: number): number => Math.round(fraction * 100) / 100

const ROLE_LABELS: Record<GasRole, string> = { diluent: 'Diluent', bailout: 'Bailout' }

/**
 * True when a profile is from a computer running in gauge mode (deco calculation switched off).
 * Such a computer reports n2 as exactly 0 for every sample it does report it on - not the same
 * thing as a source that never reports n2 at all (e.g. FIT/Garmin), which must NOT be flagged
 * here since it says nothing about whether deco/gas was actually tracked. Requiring at least one
 * sample to explicitly report n2 (as opposed to it being universally `undefined`) is what tells
 * "explicitly always 0" apart from "this field simply isn't populated."
 *
 * A gauge-mode computer isn't tracking gas either, so it keeps reporting whatever default/
 * last-known gas it happens to hold (usually 21/0 - air), not something actually selected by the
 * diver - this signal is shared by two otherwise-unrelated displays: the dive's GF99 card (a real
 * "always 0%" reading is indistinguishable from "never computed" by looking at a single start/end
 * sample) and the gas list below, which uses it to skip that profile's default gas entirely
 * rather than showing a fabricated "21%" nobody actually selected.
 */
export function isGaugeModeProfile(profile: DiveProfile): boolean {
  const withN2 = profile.measurements.filter((m) => m.measurement.n2 !== undefined)
  return withN2.length > 0 && withN2.every((m) => m.measurement.n2 === 0)
}

/**
 * A measurement's CCR role, or `null` when there's genuinely nothing to go on for this specific
 * sample. `measurement.mode` (when the source device reports it at all) is authoritative - it's
 * the device's own record of which loop it was in, not an inference.
 *
 * A mode-less sample used to fall back to guessing "diluent" whenever any PO2 telemetry
 * (measured or calculated) was present - dropped after a real dive (a CCR unit's own computer
 * alongside a separate mode-less bailout/backup computer) showed why that's unsound: a plain OC
 * computer can report a *calculated* PPO2 (gas% x depth, see ShearwaterXmlReaderService's own
 * measured-vs-calculated fix) on some samples and not others with no bearing on circuit state at
 * all, so the same bailout gas ended up split into a spurious "(Diluent)" entry and a spurious
 * unlabeled one for the exact same composition. A mode-less sample now always resolves to `null`
 * - no role claimed - rather than risk a wrong one.
 */
function measurementRole(measurement: { mode?: 'OC' | 'CC' }): GasRole | null {
  if (measurement.mode === 'CC') return 'diluent'
  if (measurement.mode === 'OC') return 'bailout'
  return null
}

export function computeGasList(profiles: DiveProfile[], isCcr: boolean): GasListEntry[] {
  // Deduplicate by composition + role (not description) - the same gas breathed via different
  // profiles/computers can have differently-worded descriptions, but it's still one gas; a
  // composition breathed as both diluent and bailout is two entries, not a merged/ambiguous one.
  const seen = new Map<
    string,
    { gas: Gas; role: GasRole | null; computers: Map<string, DiveComputer> }
  >()

  for (const profile of profiles) {
    // A gauge-mode computer never tracked a real gas either, only its default/last-known one, so
    // its whole gas contribution is skipped rather than showing that fabricated default alongside
    // genuinely selected gases from other profiles on the same dive.
    if (isGaugeModeProfile(profile)) continue

    for (const { measurement } of profile.measurements) {
      const gas = measurement.gas
      // A surface reading (not yet/no longer submerged) can reflect whatever gas the computer
      // has selected by default rather than one actually breathed underwater - depth 0 samples
      // are excluded so a pre-dive default doesn't show up as a "used" gas on its own.
      if (!gas || measurement.depth <= 0) continue

      const role = isCcr ? measurementRole(measurement) : null
      const compositionKey = `${roundToPercent(gas.o2)}-${roundToPercent(gas.n2)}-${roundToPercent(gas.he)}`
      const key = `${compositionKey}-${role ?? 'none'}`

      let entry = seen.get(key)
      if (!entry) {
        entry = { gas, role, computers: new Map() }
        seen.set(key, entry)
      }
      if (profile.diveComputer) {
        entry.computers.set(
          `${profile.diveComputer.id}-${profile.diveComputer.serialNumber}`,
          profile.diveComputer,
        )
      }
    }
  }

  return Array.from(seen.values()).map(({ gas, role, computers }) => ({
    gas,
    role,
    roleLabel: role ? ROLE_LABELS[role] : null,
    contributingComputers: Array.from(computers.values()),
  }))
}
