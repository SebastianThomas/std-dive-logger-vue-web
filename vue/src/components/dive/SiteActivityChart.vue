<template>
  <p v-if="!periods.length" class="py-6 text-center text-sm text-gray-500">
    No community dive activity has been aggregated for this site yet.
  </p>
  <div v-else>
    <div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
      <span><span class="inline-block h-2.5 w-2.5 rounded-sm bg-blue-300"></span> Dives</span>
      <span><span class="inline-block h-0.5 w-4 align-middle bg-cyan-600"></span> Avg max depth</span>
      <span><span class="inline-block h-0.5 w-4 align-middle bg-amber-500"></span> Deepest dive</span>
    </div>
    <div class="overflow-x-auto pb-1">
      <svg
        :viewBox="`0 0 ${chartWidth} ${HEIGHT}`"
        :style="{ minWidth: `${chartWidth}px` }"
        class="block h-64"
        role="img"
        aria-label="Monthly dive count, average maximum depth and deepest logged dive"
      >
        <line :x1="LEFT" :x2="chartWidth - RIGHT" :y1="BOTTOM" :y2="BOTTOM" stroke="currentColor" opacity="0.25" />
        <line :x1="LEFT" :x2="LEFT" :y1="TOP" :y2="BOTTOM" stroke="currentColor" opacity="0.25" />

        <g v-for="tick in depthTicks" :key="tick">
          <line :x1="LEFT" :x2="chartWidth - RIGHT" :y1="depthY(tick)" :y2="depthY(tick)" stroke="currentColor" opacity="0.08" />
          <text :x="LEFT - 7" :y="depthY(tick) + 4" text-anchor="end" class="fill-current text-[10px]">
            {{ tick }}m
          </text>
        </g>

        <g v-for="(period, index) in periods" :key="period.start">
          <rect
            :x="x(index) - BAR_WIDTH / 2"
            :y="countY(period.diveCount)"
            :width="BAR_WIDTH"
            :height="BOTTOM - countY(period.diveCount)"
            rx="3"
            fill="#93c5fd"
            opacity="0.55"
          >
            <title>{{ periodLabel(period.start) }}: {{ period.diveCount }} dives</title>
          </rect>
          <text :x="x(index)" :y="BOTTOM + 16" text-anchor="middle" class="fill-current text-[10px]">
            {{ shortPeriodLabel(period.start) }}
          </text>
          <circle
            v-if="period.averageMaxDepth != null"
            :cx="x(index)"
            :cy="depthY(period.averageMaxDepth)"
            r="3.5"
            fill="#0891b2"
          >
            <title>Average max depth: {{ period.averageMaxDepth.toFixed(1) }} m</title>
          </circle>
          <circle
            v-if="period.deepestMaxDepth != null"
            :cx="x(index)"
            :cy="depthY(period.deepestMaxDepth)"
            r="3.5"
            fill="#f59e0b"
          >
            <title>Deepest dive: {{ period.deepestMaxDepth.toFixed(1) }} m</title>
          </circle>
        </g>

        <polyline
          v-if="averagePoints"
          :points="averagePoints"
          fill="none"
          stroke="#0891b2"
          stroke-width="2"
        />
        <polyline
          v-if="deepestPoints"
          :points="deepestPoints"
          fill="none"
          stroke="#f59e0b"
          stroke-width="2"
        />
      </svg>
    </div>
    <p class="mt-1 text-xs text-gray-500">
      Monthly aggregates across all logged dives at this site. Scroll sideways to see the full history.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DiveSiteStatsPeriod } from '@/lib/types/dive'

const props = defineProps<{ periods: DiveSiteStatsPeriod[] }>()

const HEIGHT = 256
const LEFT = 42
const RIGHT = 16
const TOP = 14
const BOTTOM = 220
const STEP = 56
const BAR_WIDTH = 28

const chartWidth = computed(() => Math.max(640, LEFT + RIGHT + props.periods.length * STEP))
const maxDepth = computed(() =>
  Math.max(10, ...props.periods.map((p) => p.deepestMaxDepth ?? p.averageMaxDepth ?? 0)),
)
const maxCount = computed(() => Math.max(1, ...props.periods.map((p) => p.diveCount)))
const depthTicks = computed(() => {
  const ceiling = Math.ceil(maxDepth.value / 10) * 10
  return [0, ceiling / 2, ceiling].map((v) => Math.round(v))
})

const x = (index: number) => LEFT + STEP / 2 + index * STEP
const depthY = (depth: number) => BOTTOM - (depth / maxDepth.value) * (BOTTOM - TOP)
const countY = (count: number) => BOTTOM - (count / maxCount.value) * (BOTTOM - TOP) * 0.72

const pointsFor = (pick: (period: DiveSiteStatsPeriod) => number | null | undefined) => {
  const points = props.periods
    .map((period, index) => ({ value: pick(period), x: x(index) }))
    .filter((point): point is { value: number; x: number } => point.value != null)
  return points.length > 1 ? points.map((point) => `${point.x},${depthY(point.value)}`).join(' ') : ''
}

const averagePoints = computed(() => pointsFor((period) => period.averageMaxDepth))
const deepestPoints = computed(() => pointsFor((period) => period.deepestMaxDepth))

const periodLabel = (start: number) =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start)
const shortPeriodLabel = (start: number) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(start)
</script>
