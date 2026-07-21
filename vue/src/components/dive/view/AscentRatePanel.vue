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
      class="w-full flex flex-wrap items-center gap-2 px-3 py-2 text-sm font-semibold cursor-pointer"
      @click="expanded = !expanded"
    >
      <i :class="expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"></i>
      <span>Ascent / Descent Rate</span>
      <span
        v-if="peakDescent"
        class="px-2 py-0.5 rounded-full text-xs font-medium"
        :style="tierBadgeStyle(peakDescent.rate)"
      >
        ▼ peak descent {{ peakDescent.rate.toFixed(0) }} m/min
      </span>
      <span
        v-if="peakAscent"
        class="px-2 py-0.5 rounded-full text-xs font-medium"
        :style="tierBadgeStyle(peakAscent.rate)"
      >
        ▲ peak ascent {{ Math.abs(peakAscent.rate).toFixed(0) }} m/min
      </span>
      <span v-if="!peakDescent && !peakAscent" class="text-xs opacity-60">no data</span>
    </button>

    <div v-show="expanded" class="px-3 pb-3">
      <div ref="container" class="w-full relative" style="height: 110px">
        <div
          v-if="tooltip"
          class="absolute z-10 pointer-events-none bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 shadow rounded px-2 py-1"
          :style="{ left: tooltip.left + 'px', top: '4px', width: '10rem', maxWidth: '10rem' }"
        >
          <div class="font-semibold mb-1">{{ formatElapsedTime(tooltip.time, earliestStart) }}</div>
          <div>
            {{ Math.abs(tooltip.rate).toFixed(1) }} m/min
            {{ tooltip.rate >= 0 ? 'descending' : 'ascending' }}
          </div>
          <div>{{ RATE_TIER_LABELS[rateTier(tooltip.rate)] }}</div>
        </div>
      </div>
      <p class="text-xs opacity-60 mt-1">
        Ascent is plotted above the line, descent below. Color shows how fast depth is changing,
        in either direction: under {{ SLOW_RATE_M_PER_MIN }} m/min is slow, up to
        {{ NORMAL_RATE_M_PER_MIN }} m/min is normal, up to {{ QUICK_RATE_M_PER_MIN }} m/min is
        quick, and beyond that is very fast — dangerous on an ascent, unusually fast on a
        descent.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { select, scaleLinear, area, axisLeft, curveMonotoneX, bisector } from 'd3'
import type { Area } from 'd3'
import type { DiveProfile } from '@/lib/types/dive'
import {
  computeAscentRates,
  rateTier,
  SLOW_RATE_M_PER_MIN,
  NORMAL_RATE_M_PER_MIN,
  QUICK_RATE_M_PER_MIN,
  RATE_TIER_COLORS,
  RATE_TIER_LABELS,
  type RatePoint,
} from '@/lib/graph/ascentRate'
import { formatElapsedTime } from '@/lib/utils/timeUtils'

const props = defineProps<{
  profiles: DiveProfile[]
  visibleProfiles?: boolean[]
  selectedProfiles?: number[]
  /** Time (ms) hovered on another synced chart (e.g. the main dive profile) — draws a crosshair
   * and tooltip here too, matched by position rather than local pointer input. */
  externalHoverTimeMs?: number | null
}>()

const emit = defineEmits<{
  /** Fired on local hover so a sibling chart can sync its own crosshair to this time. */
  hoverTimeChange: [value: number | null]
}>()

const expanded = ref(false)
const container = ref<HTMLElement | null>(null)
const width = ref(600)
const height = ref(110)
// Left/right match DiveGraph.vue's margin exactly so this panel's plot area lines up on the
// same time axis as the main chart stacked above it.
const margin = { top: 6, right: 36, bottom: 4, left: 40 }
// Matches the tooltip's fixed 10rem width below (at the standard 16px root font size) — known
// up front, so the flip-to-the-left check can run synchronously instead of measuring the DOM a
// frame late, which used to let an overflowing position flash onto the page (and, since the
// panel sits directly in the page's flow, briefly trigger a horizontal scrollbar) before the
// correction landed.
const TOOLTIP_WIDTH_PX = 160
const innerWidth = computed(() => Math.max(10, width.value - margin.left - margin.right))
const innerHeight = computed(() => Math.max(10, height.value - margin.top - margin.bottom))

const visibleMask = computed<boolean[]>(() => {
  const n = props.profiles.length
  if (!props.visibleProfiles || props.visibleProfiles.length !== n) {
    return Array.from({ length: n }, () => true)
  }
  return props.visibleProfiles
})

const earliestStart = computed(() =>
  props.profiles.length ? Math.min(...props.profiles.map((p) => p.start)) : 0,
)

// Precompute once per profile set change — the adaptive window search is the expensive part,
// no need to redo it on every render/resize.
const ratesByProfile = computed<RatePoint[][]>(() => props.profiles.map(computeAscentRates))

// Ascent and descent are separate, unrelated concerns (one is exertion/comfort, the other can be
// a real decompression-injury risk), so they get their own peak rather than a single "worst of
// either direction" figure that muddles the two together.
const peakDescent = computed<RatePoint | null>(() => {
  let best: RatePoint | null = null
  ratesByProfile.value.forEach((rates, idx) => {
    if (!visibleMask.value[idx]) return
    rates.forEach((r) => {
      if (r.rate > 0 && (!best || r.rate > best.rate)) best = r
    })
  })
  return best
})

const peakAscent = computed<RatePoint | null>(() => {
  let best: RatePoint | null = null
  ratesByProfile.value.forEach((rates, idx) => {
    if (!visibleMask.value[idx]) return
    rates.forEach((r) => {
      if (r.rate < 0 && (!best || r.rate < best.rate)) best = r
    })
  })
  return best
})

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function tierBadgeStyle(rate: number): { backgroundColor: string; color: string } {
  const color = RATE_TIER_COLORS[rateTier(rate)]
  return { backgroundColor: hexToRgba(color, 0.15), color }
}

const tooltip = ref<{ time: number; rate: number; left: number } | null>(null)

let ro: ResizeObserver | null = null
// True while the pointer is actually over this panel — while so, this panel's own hover input
// is the source of truth and external sync updates are ignored to avoid fighting itself.
let isLocalHover = false
let showAtTime: ((tVal: number, screenLeftPx: number | null) => void) | null = null
let clearHoverDisplay: (() => void) | null = null

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
  const maxAbsRate = Math.max(QUICK_RATE_M_PER_MIN * 1.2, ...allRates.map(Math.abs), 0)

  const xScale = scaleLinear().domain([tmin, tmax]).range([0, innerWidth.value])
  // Ascent (negative) plots into the top half, descent (positive) into the bottom half — the
  // reverse of a normal depth axis, matching "up" on screen to actually going up in the water.
  const yScale = scaleLinear().domain([-maxAbsRate, maxAbsRate]).range([0, innerHeight.value])

  const svg = select(container.value)
    .append('svg')
    .attr('width', width.value)
    .attr('height', height.value)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  g.append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'var(--card-bg, #ffffff)')

  const zeroY = yScale(0)
  g.append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth.value)
    .attr('y1', zeroY)
    .attr('y2', zeroY)
    .attr('stroke', 'currentColor')
    .attr('stroke-opacity', 0.4)

  // Single reference line at the "quick"/"extreme" boundary — the most safety-relevant one
  // (very fast for a descent, dangerous for an ascent) — mirrored above and below the baseline.
  ;[QUICK_RATE_M_PER_MIN, -QUICK_RATE_M_PER_MIN].forEach((v) => {
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth.value)
      .attr('y1', yScale(v))
      .attr('y2', yScale(v))
      .attr('stroke', RATE_TIER_COLORS.extreme)
      .attr('stroke-opacity', 0.45)
      .attr('stroke-dasharray', '3,2')
  })

  g.append('text')
    .attr('x', 4)
    .attr('y', 10)
    .attr('font-size', 9)
    .attr('fill', 'currentColor')
    .attr('opacity', 0.5)
    .text('▲ Ascent')
  g.append('text')
    .attr('x', 4)
    .attr('y', innerHeight.value - 4)
    .attr('font-size', 9)
    .attr('fill', 'currentColor')
    .attr('opacity', 0.5)
    .text('▼ Descent')

  // Four stacked areas per profile, each collapsing to the zero line wherever the rate doesn't
  // reach that tier's threshold (the same trick used for the backend deco-zone shading and the
  // DiveGraph PO2 warning band): the "slow" area covers the whole curve as a base layer, and
  // each faster tier is drawn on top of it, so a glance at the color already says "how fast" at
  // every point without needing to read the axis.
  const areaFor = (threshold: number): Area<RatePoint> =>
    area<RatePoint>()
      .x((d) => xScale(d.time))
      .y0(zeroY)
      .y1((d) => (Math.abs(d.rate) > threshold ? yScale(d.rate) : zeroY))
      .curve(curveMonotoneX)

  // The "slow" tier has no lower threshold to collapse against — it's the full-range base layer
  // every other tier draws over.
  const slowArea = area<RatePoint>()
    .x((d) => xScale(d.time))
    .y0(zeroY)
    .y1((d) => yScale(d.rate))
    .curve(curveMonotoneX)
  const normalArea = areaFor(SLOW_RATE_M_PER_MIN)
  const quickArea = areaFor(NORMAL_RATE_M_PER_MIN)
  const extremeArea = areaFor(QUICK_RATE_M_PER_MIN)

  props.profiles.forEach((profile, idx) => {
    if (!visibleMask.value[idx]) return
    const rates = ratesByProfile.value[idx]
    if (!rates?.length) return

    const drawTier = (gen: Area<RatePoint>, color: string, opacity: number, outline: boolean) => {
      const path = g
        .append('path')
        .datum(rates)
        .attr('d', gen(rates) ?? '')
        .attr('fill', color)
        .attr('fill-opacity', opacity)
        .style('pointer-events', 'none')
      if (outline) {
        path.attr('stroke', color).attr('stroke-width', 1).attr('stroke-opacity', 0.8)
      }
    }

    drawTier(slowArea, RATE_TIER_COLORS.slow, 0.35, true)
    drawTier(normalArea, RATE_TIER_COLORS.normal, 0.6, false)
    drawTier(quickArea, RATE_TIER_COLORS.quick, 0.6, false)
    drawTier(extremeArea, RATE_TIER_COLORS.extreme, 0.6, false)
  })

  g.append('g').call(
    axisLeft(yScale)
      .tickValues(
        [
          -QUICK_RATE_M_PER_MIN,
          -NORMAL_RATE_M_PER_MIN,
          -SLOW_RATE_M_PER_MIN,
          0,
          SLOW_RATE_M_PER_MIN,
          NORMAL_RATE_M_PER_MIN,
          QUICK_RATE_M_PER_MIN,
        ].filter((v) => Math.abs(v) <= maxAbsRate),
      )
      .tickFormat((d) => `${Number(d)}`),
  )

  const crosshair = g
    .append('line')
    .attr('class', 'crosshair')
    .attr('y1', 0)
    .attr('y2', innerHeight.value)
    .attr('stroke', '#ef4444')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,2')
    .style('display', 'none')

  // Which profile to read at a given hovered time: prefer the profile selected in the main
  // chart, but only if it actually has data there — otherwise fall back to whichever visible
  // profile does. Mirrors DiveGraph's own tooltip-profile resolution so both panels agree on
  // the same profile (and therefore the same time) instead of one clamping to a stale profile's
  // edge when profiles don't share the same time range (e.g. multiple dive computers/mergers).
  const resolveProfileIdxForTime = (tVal: number): number => {
    const inRange = (idx: number): boolean => {
      const p = props.profiles[idx]
      return !!p && visibleMask.value[idx] === true && tVal >= p.start && tVal <= p.end
    }
    const preferredProfileIdx = props.selectedProfiles?.[0]
    if (preferredProfileIdx !== undefined && inRange(preferredProfileIdx)) return preferredProfileIdx
    return props.profiles.findIndex((_, idx) => inRange(idx))
  }

  showAtTime = (tVal: number, screenLeftPx: number | null) => {
    const hoverProfileIdx = resolveProfileIdxForTime(tVal)
    if (hoverProfileIdx < 0) return
    const rates = ratesByProfile.value[hoverProfileIdx]
    if (!rates?.length) return
    const b = bisector((d: RatePoint) => d.time).center
    const idx = Math.min(rates.length - 1, Math.max(0, b(rates, tVal)))
    const point = rates[idx]
    if (!point) return
    const cx = xScale(point.time)
    crosshair.attr('x1', cx).attr('x2', cx).style('display', null)
    const anchorX = screenLeftPx ?? cx

    // Flip to the left of the anchor when it would overflow the right edge — same idea as
    // DiveGraphTooltip, but computed synchronously against the fixed tooltip width instead of
    // measuring the DOM a frame late (see TOOLTIP_WIDTH_PX above).
    let xPos = anchorX + 8
    if (xPos + TOOLTIP_WIDTH_PX > width.value) {
      xPos = anchorX - TOOLTIP_WIDTH_PX - 8
      if (xPos < 0) xPos = Math.max(0, width.value - TOOLTIP_WIDTH_PX)
    }
    tooltip.value = { time: point.time, rate: point.rate, left: xPos }
  }

  clearHoverDisplay = () => {
    crosshair.style('display', 'none')
    tooltip.value = null
  }

  const hoverRect = g
    .append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'transparent')

  const clientXOf = (event: MouseEvent | TouchEvent): number | null =>
    'touches' in event ? (event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX ?? null) : event.clientX

  hoverRect
    .on('mousemove touchmove', (event: MouseEvent | TouchEvent) => {
      isLocalHover = true
      const clientX = clientXOf(event)
      if (clientX === null || !container.value) return
      const rect = container.value.getBoundingClientRect()
      const mx = clientX - rect.left - margin.left
      const tVal = xScale.invert(mx)
      showAtTime?.(tVal, clientX - rect.left)
      emit('hoverTimeChange', tVal)
    })
    .on('mouseleave touchend', () => {
      isLocalHover = false
      clearHoverDisplay?.()
      emit('hoverTimeChange', null)
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

// Mirrors a hover happening on a sibling chart (e.g. the main dive profile) by showing this
// panel's own crosshair/tooltip at the same time — but only while this panel isn't itself the
// active hover source, so the two don't fight over the display.
watch(
  () => props.externalHoverTimeMs,
  (t) => {
    if (isLocalHover || !expanded.value) return
    if (t === null || t === undefined) {
      clearHoverDisplay?.()
      return
    }
    showAtTime?.(t, null)
  },
)
</script>
