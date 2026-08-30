import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CcrGasBreakdown from '@/components/dive/CcrGasBreakdown.vue'
import type { CylinderConsumption } from '@/lib/types/dive'

const START = 1_700_000_000_000

const cc = (over: Partial<CylinderConsumption> = {}): CylinderConsumption => ({
  ocRmvLiters: null,
  bailoutRmvLiters: 22,
  o2Liters: 120,
  diluentLiters: 300,
  ocConsumedLiters: null,
  ocPressureMinutes: null,
  bailoutPressureMinutes: 45,
  openCircuitWindows: [{ start: START + 55 * 60_000, end: START + 65 * 60_000 }],
  contributions: [
    {
      waterVolumeLiters: 12,
      material: 'STEEL',
      role: 'BAILOUT',
      startBar: 200,
      endBar: 110,
      consumedLiters: 990,
      usageWindows: [],
      pressureMinutes: 45,
      rmvLiters: 22,
      effectiveWindows: [{ start: START + 55 * 60_000, end: START + 65 * 60_000 }],
      coversWholeDive: true,
    },
    {
      waterVolumeLiters: 2,
      material: 'STEEL',
      role: 'O2',
      startBar: 180,
      endBar: 120,
      consumedLiters: 120,
      usageWindows: [],
      pressureMinutes: null,
      rmvLiters: null,
      effectiveWindows: [],
      coversWholeDive: false,
    },
  ],
  ...over,
})

describe('CcrGasBreakdown', () => {
  it('shows the open-circuit span and the bailout RMV formula', async () => {
    const w = mount(CcrGasBreakdown, {
      props: { cc: cc(), diveStartMs: START, defaultExpanded: true },
    })
    expect(w.text()).toContain('55:00–65:00') // open-circuit portion
    expect(w.text()).toContain('22.0 l/min') // bailout RMV
    expect(w.findComponent({ name: 'MathFormula' }).exists()).toBe(true)
    // O2 / diluent are injected, not breathed -> "n/a" in the RMV column
    expect(w.text()).toContain('n/a')
    expect(w.text()).toContain('120 l') // O2 injected
  })

  it('is collapsed by default', () => {
    const w = mount(CcrGasBreakdown, { props: { cc: cc(), diveStartMs: START } })
    expect(w.text()).toContain('Show calculation')
    expect(w.findComponent({ name: 'MathFormula' }).exists()).toBe(false)
  })

  it('shows the final bailout RMV, litres used and injected gas without expanding', () => {
    const w = mount(CcrGasBreakdown, { props: { cc: cc(), diveStartMs: START } })
    expect(w.text()).toContain('22.0 l/min') // bailout RMV
    expect(w.text()).toContain('990 l used') // Σ bailout litres
    expect(w.text()).toContain('120 l') // O2 injected
    expect(w.text()).toContain('300 l') // diluent injected
    // ...but not the working
    expect(w.findComponent({ name: 'MathFormula' }).exists()).toBe(false)
  })
})
