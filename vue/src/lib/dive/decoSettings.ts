import type { DecoSettings } from '@/lib/types/dive'

/** One-line summary of how a computer calculated deco, e.g. "Bühlmann ZHL-16C · GF 50/85". */
export function formatDecoSettings(settings: DecoSettings | null | undefined): string | null {
  if (!settings) return null
  const parts: string[] = []
  if (settings.algorithm) parts.push(settings.algorithm)
  if (settings.gfLow != null && settings.gfHigh != null) {
    parts.push(`GF ${settings.gfLow}/${settings.gfHigh}`)
  }
  if (settings.conservatism) parts.push(`Conservatism ${settings.conservatism}`)
  return parts.length ? parts.join(' · ') : null
}

const range = (start: number | null | undefined, end: number | null | undefined, digits: number) =>
  start != null && end != null
    ? `${start.toFixed(digits)} → ${end.toFixed(digits)}`
    : end != null
      ? end.toFixed(digits)
      : start != null
        ? start.toFixed(digits)
        : null

/** The rest of what the device reported, one "label: value" line each - for a tooltip. */
export function decoSettingsDetails(settings: DecoSettings | null | undefined): string[] {
  if (!settings) return []
  const lines: string[] = []
  if (settings.implementation) lines.push(`Implementation: ${settings.implementation}`)
  if (settings.firmware) lines.push(`Firmware: ${settings.firmware}`)
  if (settings.surfacePressureMbar != null) {
    lines.push(`Surface pressure: ${settings.surfacePressureMbar.toFixed(0)} mbar`)
  }
  if (settings.waterDensity != null) {
    lines.push(`Water density: ${settings.waterDensity.toFixed(0)} kg/m³`)
  }
  const cns = range(settings.startCns, settings.endCns, 0)
  if (cns) lines.push(`Device CNS: ${cns} %`)
  const otu = range(settings.startOtu, settings.endOtu, 0)
  if (otu) lines.push(`Device OTU: ${otu}`)
  return lines
}
