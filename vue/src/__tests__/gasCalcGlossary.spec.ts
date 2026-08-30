import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GasCalcGlossary from '@/components/dive/GasCalcGlossary.vue'

describe('GasCalcGlossary', () => {
  it('hides the definitions until the trigger is clicked, then toggles them', async () => {
    const w = mount(GasCalcGlossary)
    expect(w.text()).toContain('Terms')
    expect(w.text()).not.toContain('pressure-minutes')

    await w.get('button').trigger('click')
    expect(w.text()).toContain('pressure-minutes') // PM definition
    expect(w.text()).toContain('ambient pressure') // ATA definition
    expect(w.text()).toContain('[l/min]') // unit shown after RMV

    await w.get('button').trigger('click')
    expect(w.text()).not.toContain('pressure-minutes')
  })

  it('closes on Escape', async () => {
    const w = mount(GasCalcGlossary, { attachTo: document.body })
    await w.get('button').trigger('click')
    expect(w.text()).toContain('pressure-minutes')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(w.text()).not.toContain('pressure-minutes')
    w.unmount()
  })

  it('only shows the rebreather-specific terms when ccr is set', async () => {
    const oc = mount(GasCalcGlossary)
    await oc.get('button').trigger('click')
    expect(oc.text()).not.toContain('Bailout RMV')

    const ccr = mount(GasCalcGlossary, { props: { ccr: true } })
    await ccr.get('button').trigger('click')
    expect(ccr.text()).toContain('Bailout RMV')
    expect(ccr.text()).toContain('Open-circuit portion')
  })
})
