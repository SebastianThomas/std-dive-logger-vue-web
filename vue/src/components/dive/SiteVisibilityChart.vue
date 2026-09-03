<template>
  <div class="w-full">
    <div v-if="!metersPoints.length" class="py-8 text-center text-sm text-gray-400">
      No visibility distances logged for this range yet.
      <span v-if="feelingOnlyCount">
        ({{ feelingOnlyCount }} dive{{ feelingOnlyCount === 1 ? '' : 's' }} logged a feeling only.)
      </span>
    </div>
    <template v-else>
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        class="w-full max-h-[22rem]"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Visibility by time of year"
      >
        <!-- y grid + labels -->
        <g :style="{ color: 'var(--foreground)' }">
          <g v-for="t in yTicks" :key="`y-${t}`">
            <line
              :x1="PAD_L"
              :x2="W - PAD_R"
              :y1="yPos(t)"
              :y2="yPos(t)"
              stroke="currentColor"
              stroke-opacity="0.12"
            />
            <text
              :x="PAD_L - 6"
              :y="yPos(t) + 3"
              text-anchor="end"
              font-size="11"
              fill="currentColor"
              fill-opacity="0.6"
            >
              {{ t }}
            </text>
          </g>
          <text
            :x="12"
            :y="H / 2"
            font-size="11"
            fill="currentColor"
            fill-opacity="0.6"
            text-anchor="middle"
            :transform="`rotate(-90 12 ${H / 2})`"
          >
            Visibility (m)
          </text>

          <!-- month grid + labels -->
          <g v-for="(m, i) in MONTHS" :key="`m-${i}`">
            <line
              :x1="xPos(i / 12)"
              :x2="xPos(i / 12)"
              :y1="PAD_T"
              :y2="H - PAD_B"
              stroke="currentColor"
              stroke-opacity="0.12"
            />
            <text
              :x="xPos((i + 0.5) / 12)"
              :y="H - PAD_B + 14"
              text-anchor="middle"
              font-size="11"
              fill="currentColor"
              fill-opacity="0.6"
            >
              {{ m }}
            </text>
          </g>
          <line
            :x1="xPos(1)"
            :x2="xPos(1)"
            :y1="PAD_T"
            :y2="H - PAD_B"
            stroke="currentColor"
            stroke-opacity="0.12"
          />
          <line
            :x1="PAD_L"
            :x2="W - PAD_R"
            :y1="H - PAD_B"
            :y2="H - PAD_B"
            stroke="currentColor"
            stroke-opacity="0.35"
          />
        </g>

        <!-- points (no connecting lines - iterate later) -->
        <g>
          <circle
            v-for="p in metersPoints"
            :key="p.diveId"
            :cx="xPos(p.xFraction)"
            :cy="yPos(p.meters)"
            r="4"
            :fill="feelingColor(p.feeling)"
            fill-opacity="0.75"
            stroke="var(--card-bg, #fff)"
            stroke-width="1"
          >
            <title>
              #{{ p.diveNumber }} {{ p.diveIdentifier }} — {{ formatDate(p.date) }}: {{ p.meters }} m{{
                p.feeling ? ` (${FEELING_LABEL[p.feeling]})` : ''
              }}
            </title>
          </circle>
        </g>
      </svg>

      <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span class="flex items-center gap-1">
          <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: C_HIGH }" />
          Good
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: C_AVG }" />
          Average
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: C_LOW }" />
          Poor
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: C_NONE }" />
          No feeling
        </span>
        <span v-if="feelingOnlyCount">
          · {{ feelingOnlyCount }} more logged a feeling only (not plotted)
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '@/lib/utils/timeUtils'
import type { SiteVisibilityLog, VisibilityFeeling } from '@/lib/types/dive'

const props = defineProps<{ logs: SiteVisibilityLog[] }>()

const W = 560
const H = 300
const PAD_L = 42
const PAD_R = 12
const PAD_T = 14
const PAD_B = 26

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const C_HIGH = '#22c55e'
const C_AVG = '#f59e0b'
const C_LOW = '#ef4444'
const C_NONE = '#0ea5e9'
const FEELING_LABEL: Record<VisibilityFeeling, string> = {
  HIGH: 'Good',
  AVERAGE: 'Average',
  LOW: 'Poor',
}

const feelingColor = (f?: VisibilityFeeling | null) =>
  f === 'HIGH' ? C_HIGH : f === 'AVERAGE' ? C_AVG : f === 'LOW' ? C_LOW : C_NONE

// Fraction (0-1) of the way through the calendar year, from the log's local month + day - so dives
// from different years stack by season on one Jan-Dec axis.
const yearFraction = (ms: number): number => {
  const d = new Date(ms)
  const month = d.getMonth()
  const dayFrac = (d.getDate() - 1) / DAYS_IN_MONTH[month]!
  return (month + dayFrac) / 12
}

const metersPoints = computed(() =>
  props.logs
    .filter((l) => l.meters != null)
    .map((l) => ({ ...l, meters: l.meters as number, xFraction: yearFraction(l.date) })),
)

const feelingOnlyCount = computed(
  () => props.logs.filter((l) => l.meters == null && l.feeling != null).length,
)

const maxMeters = computed(() => Math.max(10, ...metersPoints.value.map((p) => p.meters)))

const yTicks = computed(() => {
  const max = maxMeters.value
  const step = max <= 20 ? 5 : max <= 50 ? 10 : 20
  const ticks: number[] = []
  for (let t = 0; t <= max; t += step) ticks.push(t)
  return ticks
})

const xPos = (fraction: number) => PAD_L + fraction * (W - PAD_L - PAD_R)
const yPos = (meters: number) =>
  H - PAD_B - (meters / maxMeters.value) * (H - PAD_T - PAD_B)
</script>
