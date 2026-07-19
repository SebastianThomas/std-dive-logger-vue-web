<template>
  <div
    class="rounded-lg border"
    :style="{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--foreground)',
      borderColor: 'rgba(209,213,219,0.8)',
    }"
  >
    <button
      class="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold cursor-pointer"
      @click="expanded = !expanded"
    >
      <i :class="expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"></i>
      <span>Ascent / Descent Rate</span>
      <span
        v-if="summary"
        class="ml-1 px-2 py-0.5 rounded-full text-xs font-medium"
        :class="summaryBadgeClass"
      >
        peak {{ Math.abs(summary.rate).toFixed(0) }} m/min
        {{ summary.rate >= 0 ? 'descending' : 'ascending' }}
      </span>
      <span v-else class="text-xs opacity-60">no data</span>
    </button>

    <div v-show="expanded" class="px-3 pb-3">
      <div ref="container" class="w-full relative" style="height: 100px">
        <div
          v-if="tooltip"
          class="absolute z-10 pointer-events-none bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 shadow rounded px-2 py-1 whitespace-nowrap"
          :style="{ left: tooltip.left + 'px', top: '4px' }"
        >
          {{ formatElapsedTime(tooltip.time, earliestStart) }} —
          {{ Math.abs(tooltip.rate).toFixed(1) }} m/min
          {{ tooltip.rate >= 0 ? 'descending' : 'ascending' }}
        </div>
      </div>
      <p class="text-xs opacity-60 mt-1">
        Dashed lines mark a {{ SAFE_RATE_M_PER_MIN }} m/min reference; red highlights exceed
        {{ WARN_RATE_M_PER_MIN }} m/min.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { select, scaleLinear, area, axisLeft, curveMonotoneX, bisector } from 'd3'
import type { DiveProfile } from '@/lib/types/dive'
import {
  computeAscentRates,
  SAFE_RATE_M_PER_MIN,
  WARN_RATE_M_PER_MIN,
  type RatePoint,
} from '@/lib/graph/ascentRate'
import { formatElapsedTime } from '@/lib/utils/timeUtils'

const props = defineProps<{
  profiles: DiveProfile[]
  visibleProfiles?: boolean[]
  selectedProfiles?: number[]
}>()

const expanded = ref(false)
const container = ref<HTMLElement | null>(null)
const width = ref(600)
const height = ref(100)
// Left/right match DiveGraph.vue's margin exactly so this panel's plot area lines up on the
// same time axis as the main chart stacked above it.
const margin = { top: 6, right: 36, bottom: 4, left: 40 }
const innerWidth = computed(() => Math.max(10, width.value - margin.left - margin.right))
const innerHeight = computed(() => Math.max(10, height.value - margin.top - margin.bottom))

const visibleMask = computed<boolean[]>(() => {
  const n = props.profiles.length
  if (!props.visibleProfiles || props.visibleProfiles.length !== n) {
    return Array.from({ length: n }, () => true)
  }
  return props.visibleProfiles
})

const earliestStart = computed(() => Math.min(...props.profiles.map((p) => p.start), 0))

// Precompute once per profile set change — the adaptive window search is the expensive part,
// no need to redo it on every render/resize.
const ratesByProfile = computed<RatePoint[][]>(() => props.profiles.map(computeAscentRates))

const summary = computed<RatePoint | null>(() => {
  let best: RatePoint | null = null
  ratesByProfile.value.forEach((rates, idx) => {
    if (!visibleMask.value[idx]) return
    rates.forEach((r) => {
      if (!best || Math.abs(r.rate) > Math.abs(best.rate)) best = r
    })
  })
  return best
})

const summaryBadgeClass = computed(() => {
  if (!summary.value) return ''
  const abs = Math.abs(summary.value.rate)
  if (abs > WARN_RATE_M_PER_MIN) return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
  if (abs > SAFE_RATE_M_PER_MIN)
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200'
})

const tooltip = ref<{ time: number; rate: number; left: number } | null>(null)

let ro: ResizeObserver | null = null

function updateSize() {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  width.value = Math.max(200, Math.floor(rect.width))
  height.value = Math.max(60, Math.floor(rect.height))
}

function render() {
  if (!container.value) return
  select(container.value).selectAll('svg').remove()

  const allTimes = props.profiles.flatMap((p) => p.measurements.map((m) => m.measurement.time))
  if (!allTimes.length) return
  const tmin = Math.min(...allTimes)
  const tmax = Math.max(...allTimes)

  const allRates = ratesByProfile.value
    .filter((_, idx) => visibleMask.value[idx])
    .flatMap((rates) => rates.map((r) => r.rate))
  const maxAbsRate = Math.max(WARN_RATE_M_PER_MIN * 1.2, ...allRates.map(Math.abs), 0)

  const xScale = scaleLinear().domain([tmin, tmax]).range([0, innerWidth.value])
  const yScale = scaleLinear().domain([-maxAbsRate, maxAbsRate]).range([innerHeight.value, 0])

  const svg = select(container.value)
    .append('svg')
    .attr('width', width.value)
    .attr('height', height.value)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  g.append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'var(--card-bg, #ffffff)')

  // Reference band: the "safe" corridor between ±SAFE_RATE_M_PER_MIN.
  g.append('rect')
    .attr('x', 0)
    .attr('width', innerWidth.value)
    .attr('y', yScale(SAFE_RATE_M_PER_MIN))
    .attr('height', Math.max(0, yScale(-SAFE_RATE_M_PER_MIN) - yScale(SAFE_RATE_M_PER_MIN)))
    .attr('fill', '#10b981')
    .attr('fill-opacity', 0.08)

  const zeroY = yScale(0)
  g.append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth.value)
    .attr('y1', zeroY)
    .attr('y2', zeroY)
    .attr('stroke', 'currentColor')
    .attr('stroke-opacity', 0.35)

  ;[SAFE_RATE_M_PER_MIN, -SAFE_RATE_M_PER_MIN].forEach((v) => {
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth.value)
      .attr('y1', yScale(v))
      .attr('y2', yScale(v))
      .attr('stroke', '#10b981')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-dasharray', '3,2')
  })

  const baseArea = area<RatePoint>()
    .x((d) => xScale(d.time))
    .y0(zeroY)
    .y1((d) => yScale(d.rate))
    .curve(curveMonotoneX)

  // Same "collapses to the baseline where the condition doesn't hold" trick used for the deco
  // zone on the backend preview image: the danger overlay traces the real rate, but snaps back
  // to the zero line wherever |rate| doesn't exceed the warn threshold, so only genuine
  // violations poke out as red spikes rather than shading the whole area.
  const dangerArea = area<RatePoint>()
    .x((d) => xScale(d.time))
    .y0(zeroY)
    .y1((d) => (Math.abs(d.rate) > WARN_RATE_M_PER_MIN ? yScale(d.rate) : zeroY))
    .curve(curveMonotoneX)

  props.profiles.forEach((profile, idx) => {
    if (!visibleMask.value[idx]) return
    const rates = ratesByProfile.value[idx]
    if (!rates?.length) return

    g.append('path')
      .datum(rates)
      .attr('d', baseArea)
      .attr('fill', '#3b82f6')
      .attr('fill-opacity', 0.35)
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.8)

    g.append('path')
      .datum(rates)
      .attr('d', dangerArea)
      .attr('fill', '#dc2626')
      .attr('fill-opacity', 0.55)
      .style('pointer-events', 'none')
  })

  g.append('g').call(
    axisLeft(yScale)
      .ticks(3)
      .tickFormat((d) => `${Number(d)}`),
  )

  const hoverRect = g
    .append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'transparent')

  const findClosest = (event: MouseEvent | TouchEvent, profileIdx: number): RatePoint | null => {
    const rates = ratesByProfile.value[profileIdx]
    if (!rates?.length) return null
    const rect = container.value!.getBoundingClientRect()
    const clientX = 'touches' in event ? (event.touches[0]?.clientX ?? 0) : event.clientX
    const mx = clientX - rect.left - margin.left
    const tVal = xScale.invert(mx)
    const b = bisector((d: RatePoint) => d.time).center
    const idx = Math.min(rates.length - 1, Math.max(0, b(rates, tVal)))
    return rates[idx] ?? null
  }

  // Prefer the profile selected in the main chart (matches its tooltip precedent), falling
  // back to whichever profile is visible first.
  const preferredProfileIdx = props.selectedProfiles?.[0]
  const hoverProfileIdx =
    preferredProfileIdx !== undefined && visibleMask.value[preferredProfileIdx]
      ? preferredProfileIdx
      : props.profiles.findIndex((_, idx) => visibleMask.value[idx])

  hoverRect
    .on('mousemove touchmove', (event: MouseEvent) => {
      if (hoverProfileIdx < 0) return
      const point = findClosest(event, hoverProfileIdx)
      if (!point) return
      const rect = container.value!.getBoundingClientRect()
      const clientX = event.clientX
      tooltip.value = { time: point.time, rate: point.rate, left: clientX - rect.left }
    })
    .on('mouseleave touchend', () => {
      tooltip.value = null
    })
}

onMounted(() => {
  if (!container.value) return
  updateSize()
  if (expanded.value) render()
  ro = new ResizeObserver(() => {
    updateSize()
    if (expanded.value) render()
  })
  ro.observe(container.value)
})

onBeforeUnmount(() => {
  if (ro && container.value) ro.unobserve(container.value)
})

watch(
  () => [props.profiles, props.visibleProfiles, expanded.value],
  () => {
    if (expanded.value) {
      updateSize()
      render()
    }
  },
  { deep: true },
)
</script>
