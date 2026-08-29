import type { CylinderMaterial, CylinderSize, CylinderSizeUnit } from '@/lib/types/dive'

/**
 * Frontend mirror of the backend standard-cylinder catalog
 * (`std-dive-logger-model/.../model/dive/gear/StandardCylinder.java` - `CATALOG`, `snap`,
 * `inferMaterial`). Keep both in sync: same 14 entries, same litre values, same inference table.
 *
 * All entries are stored as `LITER` water-volume values - US "cuft" ratings are free-gas capacity,
 * not water volume, and only appear in the label.
 */
export type StandardCylinder = {
  /** Stable key, e.g. `steel-12` / `alu-11.1` - used as the `<select>` option value. */
  key: string
  label: string
  size: CylinderSize
  material: CylinderMaterial
}

const entry = (
  value: number,
  material: CylinderMaterial,
  label: string,
): StandardCylinder => ({
  key: `${material.toLowerCase()}-${value}`,
  label,
  size: { unit: 'LITER', value },
  material,
})

export const STANDARD_CYLINDERS: StandardCylinder[] = [
  entry(3, 'STEEL', '3 L Steel (pony)'),
  entry(5, 'STEEL', '5 L Steel'),
  entry(7, 'STEEL', '7 L Steel'),
  entry(10, 'STEEL', '10 L Steel'),
  entry(12, 'STEEL', '12 L Steel'),
  entry(15, 'STEEL', '15 L Steel'),
  entry(18, 'STEEL', '18 L Steel'),
  entry(20, 'STEEL', '20 L Steel'),
  entry(24, 'STEEL', '24 L Steel (twin 12)'),
  entry(30, 'STEEL', '30 L Steel (twin 15)'),
  entry(5.5, 'ALU', '5.5 L Alu (AL40 / ~40 cuft)'),
  entry(7, 'ALU', '7 L Alu'),
  entry(9, 'ALU', '9 L Alu (AL63 / ~63 cuft)'),
  entry(11.1, 'ALU', '11.1 L Alu (AL80 / ~80 cuft)'),
]

/** The catalog entry a brand-new cylinder row defaults to. */
export const DEFAULT_STANDARD_CYLINDER_KEY = 'steel-12'

const sameValue = (a: number, b: number) => Math.abs(a - b) < 1e-6

/**
 * The catalog key for a cylinder's exact size + material, or `'custom'` when nothing matches.
 * Matches on unit + value; when several entries share a value (7 L exists in both steel and alu)
 * the material must also match, so a value-only hit with an unknown/other material is `'custom'`.
 */
export function matchStandard(
  size: CylinderSize | undefined | null,
  material: CylinderMaterial | null | undefined,
): string {
  if (!size) return 'custom'
  const byValue = STANDARD_CYLINDERS.filter(
    (c) => c.size.unit === size.unit && sameValue(c.size.value, size.value),
  )
  if (byValue.length === 0) return 'custom'
  if (byValue.length === 1) return byValue[0]!.key
  const byMaterial = byValue.find((c) => c.material === material)
  return byMaterial ? byMaterial.key : 'custom'
}

/**
 * Material fallback for rows without an explicit one (legacy data, imports). Mirrors the backend
 * `StandardCylinder.inferMaterial`. Exact 9 / 11.1 L alu tanks are handled by snapping to the
 * catalog before this runs.
 */
export function inferMaterial(liters: number, unit: CylinderSizeUnit): CylinderMaterial {
  if (unit === 'CUFT') return 'ALU'
  if (liters <= 3.5) return 'STEEL'
  if (liters < 8.5) return 'ALU'
  return 'STEEL'
}
