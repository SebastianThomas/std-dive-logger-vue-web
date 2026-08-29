<template>
  <div
    class="rounded-lg border px-4 py-3 text-sm"
    :class="
      view.mismatch
        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300'
    "
  >
    <p v-if="view.mismatch" class="font-medium">
      <i class="fa fa-triangle-exclamation mr-1.5 text-amber-600 dark:text-amber-400" />
      Gas consumption figures disagree
    </p>
    <p class="mt-1" :class="view.mismatch ? 'text-amber-800 dark:text-amber-200' : ''">
      <template v-if="view.reason === 'rmv-vs-total'">
        The entered RMV ({{ fmt(view.insertedRmvLiters, 1) }} l/min) and the RMV implied by the
        entered total gas, average depth and duration ({{ fmt(view.impliedRmvFromTotalLiters, 1) }}
        l/min) differ by more than 15%.
      </template>
      <template v-else-if="view.reason === 'total-vs-cylinders'">
        The entered total gas ({{ fmt(view.insertedTotalLiters, 0) }} l) and the litres your tracked
        cylinders gave up ({{ fmt(view.calculatedTotalLiters, 0) }} l) differ by more than 15%.
      </template>
      <template v-else-if="view.reason === 'rmv-vs-cylinders'">
        The entered RMV ({{ fmt(view.insertedRmvLiters, 1) }} l/min) and the RMV computed from your
        tracked cylinders ({{ fmt(view.calculatedRmvLiters, 1) }} l/min) differ by more than 15%.
      </template>
      <template v-else> How these figures were computed: </template>
    </p>

    <button
      type="button"
      class="mt-2 text-xs underline decoration-dotted hover:no-underline"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Hide calculation' : 'Show calculation' }}
    </button>

    <div v-if="expanded" class="mt-3 space-y-3 text-xs">
      <!-- Per-cylinder table -->
      <div v-if="view.contributions.length" class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="text-left text-gray-500 dark:text-gray-400">
              <th class="pr-3 font-medium">Cylinder</th>
              <th class="pr-3 font-medium">Pressure</th>
              <th class="pr-3 font-medium text-right">Δ bar</th>
              <th class="pr-3 font-medium text-right">Litres</th>
              <th class="font-medium">Windows</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(c, i) in view.contributions"
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
              <td class="pr-3 py-1 text-right">{{ deltaBar(c) }}</td>
              <td class="pr-3 py-1 text-right">
                {{ c.consumedLiters != null ? fmt(c.consumedLiters, 0) : '—' }}
              </td>
              <td class="py-1 text-gray-500">{{ windowsLabel(c.usageWindows) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Formulas -->
      <dl class="space-y-1">
        <div v-if="view.calculatedTotalLiters != null" class="flex flex-wrap gap-x-2">
          <dt class="text-gray-500">Total from cylinders</dt>
          <dd>
            Σ litres = <strong>{{ fmt(view.calculatedTotalLiters, 0) }} l</strong>
            <span v-if="view.insertedTotalLiters != null" class="text-gray-500">
              · entered {{ fmt(view.insertedTotalLiters, 0) }} l</span
            >
          </dd>
        </div>
        <div
          v-if="view.calculatedRmvLiters != null && view.ocPressureMinutes != null"
          class="flex flex-wrap gap-x-2"
        >
          <dt class="text-gray-500">RMV from cylinders</dt>
          <dd>
            {{ fmt(view.calculatedTotalLiters, 0) }} l ÷ {{ fmt(view.ocPressureMinutes, 1) }}
            pressure-minutes = <strong>{{ fmt(view.calculatedRmvLiters, 1) }} l/min</strong>
          </dd>
        </div>
        <div v-if="enteredRmv != null" class="flex flex-wrap gap-x-2">
          <dt class="text-gray-500">RMV entered</dt>
          <dd>
            <strong>{{ fmt(enteredRmv, 1) }} l/min</strong>
          </dd>
        </div>
        <div
          v-if="view.impliedRmvFromTotalLiters != null"
          class="flex flex-wrap gap-x-2"
        >
          <dt class="text-gray-500">RMV implied by entered total</dt>
          <dd>
            {{ fmt(view.insertedTotalLiters, 0) }} l ÷ ((1 + {{ fmt(view.avgDepthMeters, 1) }}/10) ata
            × {{ fmt(view.durationMinutes, 0) }} min) =
            <strong>{{ fmt(view.impliedRmvFromTotalLiters, 1) }} l/min</strong>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CYLINDER_MATERIAL_LABELS, CYLINDER_ROLE_LABELS } from '@/lib/types/dive'
import type { CylinderContribution, CylinderUsageWindow } from '@/lib/types/dive'
import type { GasConsumptionComparisonView } from '@/lib/dive/gasConsumption'
import { elapsedMinutesSeconds } from '@/lib/utils/timeUtils'

const props = defineProps<{
  view: GasConsumptionComparisonView
  /** Epoch millis - to render usage windows as mm:ss elapsed. */
  diveStartMs?: number | null
  /** Start expanded (e.g. the edit form, where the user is actively debugging). */
  defaultExpanded?: boolean
}>()

const expanded = ref(props.defaultExpanded ?? false)

const enteredRmv = computed(() =>
  props.view.insertedRmvLiters != null &&
  props.view.insertedRmvLiters !== props.view.impliedRmvFromTotalLiters
    ? props.view.insertedRmvLiters
    : null,
)

const fmt = (n: number | null | undefined, digits: number): string =>
  n == null ? '?' : n.toFixed(digits)

const deltaBar = (c: CylinderContribution): string =>
  c.startBar != null && c.endBar != null ? String(Math.round(c.startBar - c.endBar)) : '—'

const windowsLabel = (windows: CylinderUsageWindow[]): string => {
  if (!windows.length) return 'whole dive'
  const start = props.diveStartMs
  const pad = (n: number) => String(n).padStart(2, '0')
  const one = (ms: number | null): string => {
    if (ms == null || start == null) return '?'
    const t = elapsedMinutesSeconds(ms, start)
    return t ? `${pad(t.minutes)}:${pad(t.seconds)}` : '?'
  }
  return windows.map((w) => `${one(w.start)}–${one(w.end)}`).join(', ')
}
</script>
