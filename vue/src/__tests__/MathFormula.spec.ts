import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MathFormula from '@/components/ui/MathFormula.vue'

describe('MathFormula', () => {
  it('joins parts with = and renders a stacked fraction', () => {
    const w = mount(MathFormula, {
      props: { lead: 'RMV', parts: [{ frac: ['L', 'PM'] }, { frac: ['1200', '80'] }, '15 l/min'] },
    })
    expect(w.text()).toContain('RMV')
    expect(w.text()).toContain('15 l/min')
    // three "=" : lead=first, then between the two remaining parts.
    expect(w.findAll('.mf-eq')).toHaveLength(3)
    const fracs = w.findAll('.mf-frac')
    expect(fracs).toHaveLength(2)
    expect(fracs[0]!.find('.mf-num').text()).toBe('L')
    expect(fracs[0]!.find('.mf-den').text()).toBe('PM')
  })

  it('renders nested rows and parentheses', () => {
    const w = mount(MathFormula, {
      props: {
        parts: [{ frac: ['L', { paren: { row: ['1 + ', { frac: ['d', '10'] }] } }] }],
      },
    })
    expect(w.find('.mf-paren').exists()).toBe(true)
    expect(w.text()).toContain('(')
    expect(w.text()).toContain(')')
    expect(w.findAll('.mf-frac')).toHaveLength(2) // outer L/(...) and inner d/10
  })
})
