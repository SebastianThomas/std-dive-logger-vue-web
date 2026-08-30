<script lang="ts">
import { defineComponent, h, type PropType, type VNode } from 'vue'

/**
 * A tiny typeset-math renderer - real stacked fractions (numerator over a rule over denominator),
 * consistent operators, one visual style for every formula. Pure CSS, no dependency: we only need
 * fractions / parentheses / a few operators, so a full LaTeX engine (KaTeX etc.) isn't worth the
 * bundle.
 *
 * `parts` are joined by `=`. A part is a string/number, a `{ frac: [num, den] }`, a `{ paren: … }`,
 * or a `{ row: [...] }` of sub-nodes laid out left to right.
 */
export type MathNode =
  | string
  | number
  | { frac: [MathNode, MathNode] }
  | { paren: MathNode }
  | { row: MathNode[] }

function node(n: MathNode): VNode | string {
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if ('frac' in n) {
    return h('span', { class: 'mf-frac' }, [
      h('span', { class: 'mf-num' }, [node(n.frac[0])]),
      h('span', { class: 'mf-den' }, [node(n.frac[1])]),
    ])
  }
  if ('paren' in n) {
    return h('span', { class: 'mf-paren' }, ['(', node(n.paren), ')'])
  }
  return h('span', { class: 'mf-row' }, n.row.map(node))
}

export default defineComponent({
  name: 'MathFormula',
  props: {
    parts: { type: Array as PropType<MathNode[]>, required: true },
    /** Optional label rendered before the first `=` (e.g. `RMV`). */
    lead: { type: String, default: '' },
  },
  render() {
    const children: (VNode | string)[] = []
    if (this.lead) children.push(h('span', { class: 'mf-lead' }, this.lead))
    this.parts.forEach((part, i) => {
      if (i > 0 || this.lead) children.push(h('span', { class: 'mf-eq' }, '='))
      children.push(node(part))
    })
    return h('span', { class: 'mf' }, children)
  },
})
</script>

<style scoped>
.mf {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.15rem 0.3rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.mf-lead {
  font-style: italic;
}

.mf-eq {
  opacity: 0.7;
}

.mf-row,
.mf-paren {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.mf-frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  vertical-align: middle;
}

.mf-frac > .mf-num {
  padding: 0 0.3em 0.05em;
  border-bottom: 1px solid currentColor;
}

.mf-frac > .mf-den {
  padding: 0.05em 0.3em 0;
}
</style>
