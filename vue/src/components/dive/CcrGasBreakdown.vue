<template>
  <div
    class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300"
  >
    <p class="font-medium">Gas use on this CCR dive</p>
    <p v-if="ocLabel" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
      Open-circuit portion: {{ ocLabel }}
    </p>

    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        class="text-xs underline decoration-dotted hover:no-underline"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Hide calculation' : 'Show calculation' }}
      </button>
      <GasCalcGlossary ccr />
    </div>

    <div v-if="expanded" class="mt-3 space-y-4 text-xs">
      <div v-if="cc.contributions?.length" class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="text-left text-gray-500 dark:text-gray-400">
              <th class="pr-3 font-medium">Cylinder</th>
              <th class="pr-3 font-medium">Pressure</th>
              <th class="pr-3 font-medium text-right">Δ bar</th>
              <th class="pr-3 font-medium text-right">Litres</th>
              <th class="pr-3 font-medium text-right">RMV</th>
              <th class="font-medium">Breathed</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(c, i) in cc.contributions"
              :key="i"
              class="border-t border-gray-200/60 dark:border-gray-700/60"
            >
              <td class="pr-3 py-1">
                {{ fmt(c.waterVolumeLiters, 1) }} L
                <span v-if="c.material" class="text-gray-500">
                  · {{ CYLINDER_MATERIAL_LABELS[c.material] }}</span
                >
                <span class="text-gray-500"> · {{ CYLINDER_ROLE_LABELS[c.role] }}</span>
              </td>
              <td class="pr-3 py-1">
                <template v-if="c.startBar != null || c.endBar != null">
                  {{ c.startBar ?? '?' }}→{{ c.endBar ?? '?' }} bar
                </template>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="pr-3 py-1 text-right">
                {{
                  c.startBar != null && c.endBar != null ? Math.round(c.startBar - c.endBar) : '—'
                }}
              </td>
              <td class="pr-3 py-1 text-right">
                {{ c.consumedLiters != null ? fmt(c.consumedLiters, 0) : '—' }}
              </td>
              <td class="pr-3 py-1 text-right">
                <span v-if="c.rmvLiters != null">{{ fmt(c.rmvLiters, 1) }} l/min</span>
                <span
                  v-else-if="c.role === 'O2' || c.role === 'DILUENT'"
                  class="text-gray-400"
                  title="Injected into the loop, not breathed open-circuit — no RMV"
                  >n/a</span
                >
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="py-1 text-gray-500">
                <span v-if="c.role === 'O2' || c.role === 'DILUENT'">whole dive (loop)</span>
                <span v-else-if="c.effectiveWindows.length">{{
                  windowsLabel(c.effectiveWindows)
                }}</span>
                <span v-else-if="c.coversWholeDive">open-circuit portion</span>
                <span v-else class="text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <dl class="space-y-2">
        <div
          v-if="cc.bailoutRmvLiters != null && cc.bailoutPressureMinutes != null"
          class="flex flex-wrap items-baseline gap-x-2"
        >
          <dt class="text-gray-500">Bailout RMV</dt>
          <dd>
            <MathFormula
              lead="RMV"
              :parts="[
                { frac: ['Σ L(bailout)', 'PM(open-circuit)'] },
                { frac: [fmt(bailoutLitres, 0), fmt(cc.bailoutPressureMinutes, 1)] },
                `${fmt(cc.bailoutRmvLiters, 1)} l/min`,
              ]"
            />
          </dd>
        </div>
        <div v-if="cc.o2Liters != null" class="flex flex-wrap items-baseline gap-x-2">
          <dt class="text-gray-500">O₂ injected</dt>
          <dd>
            <strong>{{ fmt(cc.o2Liters, 0) }} l</strong>
          </dd>
        </div>
        <div v-if="cc.diluentLiters != null" class="flex flex-wrap items-baseline gap-x-2">
          <dt class="text-gray-500">Diluent injected</dt>
          <dd>
            <strong>{{ fmt(cc.diluentLiters, 0) }} l</strong>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CYLINDER_MATERIAL_LABELS, CYLINDER_ROLE_LABELS } from '@/lib/types/dive'
import type { CylinderConsumption, CylinderUsageWindow } from '@/lib/types/dive'
import { elapsedMinutesSeconds } from '@/lib/utils/timeUtils'
import MathFormula from '@/components/ui/MathFormula.vue'
import GasCalcGlossary from '@/components/dive/GasCalcGlossary.vue'

const props = defineProps<{
  cc: CylinderConsumption
  /** Epoch millis - to render windows as mm:ss elapsed. */
  diveStartMs?: number | null
  defaultExpanded?: boolean
}>()

const expanded = ref(props.defaultExpanded ?? false)

const fmt = (n: number | null | undefined, digits: number): string =>
  n == null ? '?' : n.toFixed(digits)

const bailoutLitres = computed(() =>
  (props.cc.contributions ?? [])
    .filter((c) => c.role === 'BAILOUT' && c.consumedLiters != null)
    .reduce((sum, c) => sum + (c.consumedLiters ?? 0), 0),
)

const windowsLabel = (windows: CylinderUsageWindow[]): string => {
  const start = props.diveStartMs
  const pad = (n: number) => String(n).padStart(2, '0')
  const one = (ms: number | null): string => {
    if (ms == null || start == null) return '?'
    const t = elapsedMinutesSeconds(ms, start)
    return t ? `${pad(t.minutes)}:${pad(t.seconds)}` : '?'
  }
  return windows.map((w) => `${one(w.start)}–${one(w.end)}`).join(', ')
}

const ocLabel = computed(() => {
  const wins = props.cc.openCircuitWindows ?? []
  return wins.length ? windowsLabel(wins) : ''
})
</script>
