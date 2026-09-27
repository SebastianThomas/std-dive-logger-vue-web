import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { consumptionPhases, phasesAddInformation } from '@/lib/dive/consumptionPhases'
import ConsumptionPhaseList from '@/components/dive/ConsumptionPhaseList.vue'
import type { CylinderContribution, CylinderUsageWindow } from '@/lib/types/dive'

const MIN = 60_000

const cylinder = (over: Partial<CylinderContribution>): CylinderContribution => ({
  waterVolumeLiters: 12,
  material: null,
  role: 'OC',
  startBar: 200,
  endBar: 100,
  consumedLiters: 1200,
  usageWindows: [],
  pressureMinutes: 100,
  rmvLiters: 12,
  effectiveWindows: [],
  coversWholeDive: true,
  ...over,
})

const decoWindow: CylinderUsageWindow = { start: 40 * MIN, end: 50 * MIN }

describe('consumptionPhases', () => {
  it('sums a sidemount pair breathed over the same stretch', () => {
    // Each bottle alone reads 12 l/min over the whole dive; together the diver breathed 24.
    const phases = consumptionPhases([cylinder({}), cylinder({})])

    expect(phases).toHaveLength(1)
    expect(phases[0]).toMatchObject({
      cylinderIndexes: [0, 1],
      coversWholeDive: true,
      consumedLiters: 2400,
      rmvLiters: 24,
      missingLiters: 0,
    })
    expect(phasesAddInformation(phases)).toBe(true)
  })

  it('splits back gas from a deco stage by window, back gas first', () => {
    const complement = [
      { start: 0, end: 40 * MIN },
      { start: 50 * MIN, end: 55 * MIN },
    ]
    const phases = consumptionPhases([
      cylinder({
        usageWindows: [decoWindow],
        effectiveWindows: [decoWindow],
        coversWholeDive: false,
        consumedLiters: 350,
        pressureMinutes: 20,
      }),
      cylinder({ effectiveWindows: complement, coversWholeDive: false, pressureMinutes: 80 }),
      cylinder({ effectiveWindows: complement, coversWholeDive: false, pressureMinutes: 80 }),
    ])

    expect(phases.map((p) => p.cylinderIndexes)).toEqual([[1, 2], [0]])
    expect(phases[0]!.rmvLiters).toBe(30)
    expect(phases[1]!.rmvLiters).toBeCloseTo(17.5)
  })

  it('gives no RMV rather than an understated one when a cylinder has no pressures', () => {
    const phases = consumptionPhases([
      cylinder({}),
      cylinder({ startBar: null, consumedLiters: null, pressureMinutes: null, rmvLiters: null }),
    ])

    expect(phases[0]).toMatchObject({ cylinderIndexes: [0, 1], rmvLiters: null, missingLiters: 1 })
  })

  it('leaves out roles that were not breathed (O2 / diluent)', () => {
    const phases = consumptionPhases([
      cylinder({ role: 'O2', pressureMinutes: null, rmvLiters: null }),
      cylinder({ role: 'DILUENT', pressureMinutes: null, rmvLiters: null }),
      cylinder({ role: 'BAILOUT' }),
    ])

    expect(phases.map((p) => p.role)).toEqual(['BAILOUT'])
    // A single bailout cylinder is just the dive's own bailout RMV - nothing new to show.
    expect(phasesAddInformation(phases)).toBe(false)
  })
})

describe('ConsumptionPhaseList', () => {
  it('renders one line per window with the summed RMV', () => {
    const w = mount(ConsumptionPhaseList, {
      props: {
        contributions: [
          cylinder({}),
          cylinder({}),
          cylinder({
            usageWindows: [decoWindow],
            effectiveWindows: [decoWindow],
            coversWholeDive: false,
            consumedLiters: 350,
            pressureMinutes: 20,
          }),
        ],
      },
    })
    const rows = w.findAll('.consumption-phase').map((r) => r.text().replace(/\s+/g, ' '))

    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('Whole dive')
    expect(rows[0]).toContain('#1 + #2')
    expect(rows[0]).toContain('24.0 l/min')
    expect(rows[1]).toContain('40:00–50:00')
    expect(rows[1]).toContain('17.5 l/min')
  })

  it('renders nothing for a single cylinder', () => {
    const w = mount(ConsumptionPhaseList, { props: { contributions: [cylinder({})] } })
    expect(w.find('.consumption-phase').exists()).toBe(false)
  })
})
