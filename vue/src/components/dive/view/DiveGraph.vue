<template>
  <div ref="container" class="w-full h-full relative">
    <button
      v-if="isZoomed"
      class="absolute bottom-2 right-2 z-10 px-2 py-1 text-xs bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow"
      @click="resetZoom"
    >
      Reset Zoom
    </button>
    <DiveGraphAxisSelector v-model="leftAxisMetric" label="Left" position="left" />
    <DiveGraphAxisSelector v-model="rightAxisMetric" label="Right" position="right" />
    <DiveGraphTooltip :data="tooltip" :left="tooltipLeft" :top="tooltipTop" />
    <div
      v-if="showZoomHint"
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/75 text-white px-4 py-2 rounded-lg text-sm font-medium pointer-events-none z-20"
    >
      Ctrl+Scroll to zoom in the graph
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  select,
  line,
  scaleLinear,
  axisLeft,
  axisRight,
  axisBottom,
  bisector,
  zoom,
  zoomIdentity,
  type Selection,
  type ScaleLinear,
  type Line,
  type ZoomBehavior,
  type ZoomTransform,
} from 'd3'
import DiveGraphTooltip, {
  type TooltipData,
  type TooltipProfileData,
} from '@/components/dive/view/DiveGraphTooltip.vue'
import DiveGraphAxisSelector, {
  type AxisMetric,
} from '@/components/dive/view/DiveGraphAxisSelector.vue'
import type { DiveProfile, DiveMeasurementWithId, DiveProfileSegmentWithId } from '@/lib/types/dive'
import { useApi } from '@/composables/useApi'
import { formatISoDurationToMinutes } from '@/lib/utils/timeUtils'
import { generateId } from '@/lib/utils/cryptoUtils'

type Props = {
  profiles: DiveProfile[]
  diveId: number
  visibleProfiles?: boolean[]
  showTemp?: boolean
  showSegments?: boolean
  showGrid?: boolean
  showNdl?: boolean
  showOtu?: boolean
  showCns?: boolean
  showGf?: boolean
  showPo2Measured?: boolean
  showPo2Calculated?: boolean
  showPo2Setpoint?: boolean
  showRmv?: boolean
  showGasO2?: boolean
  showGasN2?: boolean
  showGasHe?: boolean
}

const props = defineProps<Props>()

// Visibility mask with safe defaults (all visible)
const visibleMask = computed<boolean[]>(() => {
  const n = props.profiles.length
  if (!props.visibleProfiles || props.visibleProfiles.length !== n) {
    return Array.from({ length: n }, () => true)
  }
  return props.visibleProfiles
})

const container = ref<HTMLElement | null>(null)
const width = ref(600)
const height = ref(300)
const margin = { top: 10, right: 36, bottom: 24, left: 40 }
const innerWidth = computed(() => Math.max(10, width.value - margin.left - margin.right))
const innerHeight = computed(() => Math.max(10, height.value - margin.top - margin.bottom))

const tooltip = ref<TooltipData | null>(null)
const tooltipLeft = ref(0)
const tooltipTop = ref(0)
const showZoomHint = ref(false)
let zoomHintTimer: ReturnType<typeof setTimeout> | null = null

const svgSel = ref<Selection<SVGSVGElement, unknown, null, undefined> | null>(null)
const gSel = ref<Selection<SVGGElement, unknown, null, undefined> | null>(null)
const axes = {
  x: ref<Selection<SVGGElement, unknown, null, undefined> | null>(null),
  yDepth: ref<Selection<SVGGElement, unknown, null, undefined> | null>(null),
  yAux: ref<Selection<SVGGElement, unknown, null, undefined> | null>(null),
}
const grid = {
  x: ref<Selection<SVGGElement, unknown, null, undefined> | null>(null),
  y: ref<Selection<SVGGElement, unknown, null, undefined> | null>(null),
}
const clipRect = ref<Selection<SVGRectElement, unknown, null, undefined> | null>(null)
const clipPathId = `graph-clip-${generateId()}`
const depthScale = ref<ScaleLinear<number, number> | null>(null)
const timeScale = ref<ScaleLinear<number, number> | null>(null)
const tempScale = ref<ScaleLinear<number, number> | null>(null)
const ndlScale = ref<ScaleLinear<number, number> | null>(null)
const otuScale = ref<ScaleLinear<number, number> | null>(null)
const cnsScale = ref<ScaleLinear<number, number> | null>(null)
const gfScale = ref<ScaleLinear<number, number> | null>(null)
const po2Scale = ref<ScaleLinear<number, number> | null>(null)
const rmvScale = ref<ScaleLinear<number, number> | null>(null)
const gasScale = ref<ScaleLinear<number, number> | null>(null)
const timeScaleBase = ref<ScaleLinear<number, number> | null>(null)
const depthScaleBase = ref<ScaleLinear<number, number> | null>(null)
const depthLine = ref<Line<[number, number]> | null>(null)
const tempLine = ref<Line<[number, number]> | null>(null)
const ndlLine = ref<Line<[number, number]> | null>(null)
const otuLine = ref<Line<[number, number]> | null>(null)
const cnsLine = ref<Line<[number, number]> | null>(null)
const gfLine = ref<Line<[number, number]> | null>(null)
const po2MeasuredLine = ref<Line<[number, number]> | null>(null)
const po2CalculatedLine = ref<Line<[number, number]> | null>(null)
const po2SetpointLine = ref<Line<[number, number]> | null>(null)
const rmvLine = ref<Line<[number, number]> | null>(null)
const gasO2Line = ref<Line<[number, number]> | null>(null)
const gasN2Line = ref<Line<[number, number]> | null>(null)
const gasHeLine = ref<Line<[number, number]> | null>(null)
const hoverOverlay = ref<Selection<SVGRectElement, unknown, null, undefined> | null>(null)
const focusCircle = ref<Selection<SVGCircleElement, unknown, null, undefined> | null>(null)
const crosshairLine = ref<Selection<SVGLineElement, unknown, null, undefined> | null>(null)
const segmentsData = ref<DiveProfileSegmentWithId[] | null>(null)
const segmentsLayer = ref<Selection<SVGGElement, unknown, null, undefined> | null>(null)
const segmentsCache = new Map<number, DiveProfileSegmentWithId[]>()
const zoomBehavior = ref<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
const isZoomed = ref(false)
const { getWithToken } = useApi()
const leftAxisMetric = ref<AxisMetric>('depth')
const rightAxisMetric = ref<AxisMetric>('temp')

let ro: ResizeObserver | null = null

function updateSize() {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  width.value = Math.max(300, Math.floor(rect.width))
  height.value = Math.max(200, Math.floor(rect.height))
}

function setupScales() {
  // Collect all measurements from all profiles
  const allMeasurements = props.profiles.flatMap((p) => p.measurements)
  if (!allMeasurements.length) return

  const tValues = allMeasurements.map((m) => m.measurement.time)
  const dValues = allMeasurements.map((m) => m.measurement.depth)

  const tmin = Math.min(...tValues)
  const tmax = Math.max(...tValues)
  const dmin = Math.min(...dValues)
  const dmax = Math.max(...dValues)

  timeScaleBase.value = scaleLinear().domain([tmin, tmax]).range([0, innerWidth.value])
  timeScale.value = timeScaleBase.value.copy()
  // Depth increases downwards (invert range so 0 is at top, max depth at bottom)
  depthScaleBase.value = scaleLinear().domain([dmin, dmax]).range([0, innerHeight.value])
  depthScale.value = depthScaleBase.value.copy()

  // Keep clip rect in sync with current inner dimensions
  if (clipRect.value) {
    clipRect.value.attr('width', innerWidth.value).attr('height', innerHeight.value)
  }

  // Independent domains per metric to keep lines static regardless of toggle state
  const temperatureValues = allMeasurements
    .map((m) => m.measurement.temperature?.value)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))

  let tempExtent: [number, number]
  if (temperatureValues.length > 0) {
    const minTemp = Math.min(...temperatureValues)
    const maxTemp = Math.max(...temperatureValues)

    // Round down to nearest multiple of 5
    let tempMin = Math.floor(minTemp / 5) * 5
    // Round up to nearest multiple of 5
    let tempMax = Math.ceil(maxTemp / 5) * 5

    // Ensure minimum range of 10 degrees
    const range = tempMax - tempMin
    if (range < 10) {
      const center = (tempMin + tempMax) / 2
      tempMin = Math.floor((center - 5) / 5) * 5
      tempMax = Math.ceil((center + 5) / 5) * 5
    }

    tempExtent = [tempMin, tempMax]
  } else {
    tempExtent = [10, 20]
  }

  const otuValues = allMeasurements
    .map((m) => m.measurement.o2Tox)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const otuMax = Math.max(100, otuValues.length ? Math.max(...otuValues) : 0)

  const cnsValues = allMeasurements
    .map((m) => m.measurement.cns)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const cnsMax = Math.max(100, cnsValues.length ? Math.max(...cnsValues) : 0)

  const gfValues = allMeasurements
    .map((m) => m.measurement.n2)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const gfMax = Math.max(100, gfValues.length ? Math.max(...gfValues) : 0)

  const rmvValues = allMeasurements
    .map((m) => m.measurement.rmvLiters)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const rmvMax = Math.max(80, rmvValues.length ? Math.max(...rmvValues) : 0)

  const po2Values = allMeasurements
    .map((m) => m.measurement.po2)
    .filter((p): p is { measured?: number; calculated?: number; maxSetPoint?: number } => !!p)
    .flatMap((p) => [p.measured, p.calculated, p.maxSetPoint])
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const po2Max = Math.max(1.6, po2Values.length ? Math.max(...po2Values) : 0)

  const gasValues = allMeasurements
    .map((m) => m.measurement.gas)
    .filter((g): g is { o2: number; n2: number; he: number } => !!g)
    .flatMap((g) => [g.o2 * 100, g.n2 * 100, g.he * 100])
  const gasMax = Math.max(100, gasValues.length ? Math.max(...gasValues) : 0)

  depthLine.value = line()
    .x((d: [number, number]) => (timeScale.value ? timeScale.value(d[0]) : 0))
    .y((d: [number, number]) => (depthScale.value ? depthScale.value(d[1]) : 0))

  const makeMetricLine = (scale: ScaleLinear<number, number> | null): Line<[number, number]> =>
    line()
      .x((d: [number, number]) => (timeScale.value ? timeScale.value(d[0]) : 0))
      .y((d: [number, number]) => (scale ? scale(d[1]) : 0))

  tempScale.value = scaleLinear().domain(tempExtent).range([innerHeight.value, 0])
  ndlScale.value = scaleLinear().domain([0, 100]).range([innerHeight.value, 0])
  otuScale.value = scaleLinear()
    .domain([0, otuMax * 1.05])
    .range([innerHeight.value, 0])
  cnsScale.value = scaleLinear()
    .domain([0, cnsMax * 1.05])
    .range([innerHeight.value, 0])
  gfScale.value = scaleLinear()
    .domain([0, gfMax * 1.05])
    .range([innerHeight.value, 0])
  po2Scale.value = scaleLinear()
    .domain([0, po2Max * 1.05])
    .range([innerHeight.value, 0])
  rmvScale.value = scaleLinear()
    .domain([0, rmvMax * 1.05])
    .range([innerHeight.value, 0])
  gasScale.value = scaleLinear().domain([0, gasMax]).range([innerHeight.value, 0])

  tempLine.value = makeMetricLine(tempScale.value)
  ndlLine.value = makeMetricLine(ndlScale.value)
  otuLine.value = makeMetricLine(otuScale.value)
  cnsLine.value = makeMetricLine(cnsScale.value)
  gfLine.value = makeMetricLine(gfScale.value)
  po2MeasuredLine.value = makeMetricLine(po2Scale.value)
  po2CalculatedLine.value = makeMetricLine(po2Scale.value)
  po2SetpointLine.value = makeMetricLine(po2Scale.value)
  rmvLine.value = makeMetricLine(rmvScale.value)
  gasO2Line.value = makeMetricLine(gasScale.value)
  gasN2Line.value = makeMetricLine(gasScale.value)
  gasHeLine.value = makeMetricLine(gasScale.value)
}

onMounted(async () => {
  updateSize()
  initSvg()
  setupScales()
  renderAll()
  await maybeFetchSegments()
  renderSegments()
  ro = new ResizeObserver(() => {
    updateSize()
    initSvg()
    setupScales()
    renderAll()
    renderSegments()
  })
  if (container.value) ro.observe(container.value)
})

onBeforeUnmount(() => {
  if (ro && container.value) ro.unobserve(container.value)
  if (zoomHintTimer) clearTimeout(zoomHintTimer)
})

watch(
  () => [
    props.profiles,
    props.visibleProfiles,
    props.showTemp,
    props.showSegments,
    props.showGrid,
    props.showNdl,
    props.showOtu,
    props.showCns,
    props.showGf,
    props.showPo2Measured,
    props.showPo2Calculated,
    props.showPo2Setpoint,
    props.showRmv,
    props.showGasO2,
    props.showGasN2,
    props.showGasHe,
  ],
  async () => {
    setupScales()
    renderAll()
    await maybeFetchSegments()
    renderSegments()
  },
  { deep: true },
)

function initSvg() {
  if (!container.value) return
  select(container.value).selectAll('*').remove()
  const svg = select(container.value)
    .append('svg')
    .attr('width', width.value)
    .attr('height', height.value)
  svgSel.value = svg

  const defs = svg.append('defs')
  clipRect.value = defs
    .append('clipPath')
    .attr('id', clipPathId)
    .append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  gSel.value = g

  // Background rect (for contrast)
  g.append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'var(--card-bg, #ffffff)')

  // Layers: segments above background, lines over segments
  const clipPathUrl = `url(#${clipPathId})`
  segmentsLayer.value = g.append('g').attr('class', 'segments').attr('clip-path', clipPathUrl)

  // Gridlines
  grid.y.value = g.append('g').attr('class', 'grid-y').attr('clip-path', clipPathUrl)
  grid.x.value = g
    .append('g')
    .attr('class', 'grid-x')
    .attr('transform', `translate(0,${innerHeight.value})`)
    .attr('clip-path', clipPathUrl)

  // Axes
  axes.yDepth.value = g.append('g').attr('transform', `translate(0,0)`).attr('class', 'y-depth')
  axes.yAux.value = g
    .append('g')
    .attr('transform', `translate(${innerWidth.value},0)`) // right side
    .attr('class', 'y-aux')
  axes.x.value = g
    .append('g')
    .attr('transform', `translate(0,${innerHeight.value})`)
    .attr('class', 'x-axis')

  // Lines layer - will contain multiple paths per profile
  g.append('g').attr('class', 'lines-depth').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-temp').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-ndl').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-otu').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-cns').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-gf').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-po2-measured').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-po2-calculated').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-po2-setpoint').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-rmv').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-gas-o2').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-gas-n2').attr('clip-path', clipPathUrl)
  g.append('g').attr('class', 'lines-gas-he').attr('clip-path', clipPathUrl)

  // Hover overlay
  // Vertical crosshair line
  crosshairLine.value = g
    .append('line')
    .attr('class', 'crosshair-line')
    .attr('stroke', '#ef4444')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,2')
    .attr('y1', 0)
    .attr('y2', innerHeight.value)
    .attr('clip-path', clipPathUrl)
    .style('display', 'none')

  focusCircle.value = g
    .append('circle')
    .attr('r', 5)
    .attr('fill', '#ef4444')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .attr('clip-path', clipPathUrl)
    .style('display', 'none')
  hoverOverlay.value = g
    .append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'transparent')
    .on('mousemove', onMouseMoveD3)
    .on('mouseleave', onMouseLeave)

  // Zoom & pan on the SVG (X-axis only, requires Ctrl)
  const z = zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 20])
    .translateExtent([
      [0, 0],
      [width.value, height.value],
    ])
    .filter((event): boolean => {
      // Only allow zoom/pan with Ctrl key pressed
      if (event.type === 'wheel' && !event.ctrlKey) {
        // Show hint when user tries to zoom without Ctrl
        if (!showZoomHint.value) {
          showZoomHint.value = true
          if (zoomHintTimer) clearTimeout(zoomHintTimer)
          zoomHintTimer = setTimeout(() => {
            showZoomHint.value = false
          }, 2000)
        }
        return false
      }
      return !event.button && event.type !== 'dblclick'
    })
    .on('zoom', (event): void => {
      if (!timeScaleBase.value || !depthScaleBase.value) return
      const t: ZoomTransform = event.transform
      // Track if zoomed in (scale > 1 indicates zoom)
      isZoomed.value = t.k > 1
      // Only rescale X (time), keep Y (depth) unchanged
      timeScale.value = t.rescaleX(timeScaleBase.value)
      depthScale.value = depthScaleBase.value.copy()

      // Constrain the view to not extend beyond the data bounds
      const domain = timeScale.value.domain() as [number, number]
      const allMeasurements = props.profiles.flatMap((p) => p.measurements)
      if (allMeasurements.length > 0) {
        const tmin = Math.min(...allMeasurements.map((m) => m.measurement.time))
        const tmax = Math.max(...allMeasurements.map((m) => m.measurement.time))
        const viewWidth = domain[1] - domain[0]

        const newDomain = [...domain] as [number, number]
        if (domain[0] < tmin) {
          newDomain[0] = tmin
          newDomain[1] = Math.min(tmin + viewWidth, tmax)
        }
        if (domain[1] > tmax) {
          newDomain[1] = tmax
          newDomain[0] = Math.max(tmax - viewWidth, tmin)
        }

        timeScale.value.domain(newDomain)
      }

      renderAll()
      renderSegments()
    })
  svgSel.value.call(z)
  // Store zoom behavior for reset
  zoomBehavior.value = z
}

function renderAll() {
  if (!gSel.value || !timeScale.value || !depthScale.value || !depthLine.value) return

  // Axes

  // Generate smart time axis ticks with 4-10 labels based on graph width and duration
  const timeRange = timeScale.value.domain() as [number, number]
  const timeDuration = timeRange[1] - timeRange[0]
  const timeDurationSeconds = timeDuration / 1000

  // Sensible time intervals in seconds (in order of preference)
  const intervals = [30, 60, 120, 300, 600, 1200, 1800, 3600]

  // Target 4-10 labels; bias towards 6-7 labels for best readability
  const targetLabelCount = Math.max(4, Math.min(10, Math.ceil(innerWidth.value / 100)))

  // Find the best interval that gives us close to targetLabelCount labels
  let bestInterval = 60
  let bestDiff = Math.abs(Math.ceil(timeDurationSeconds / 60) - targetLabelCount)

  for (const interval of intervals) {
    const labelCount = Math.ceil(timeDurationSeconds / interval)
    const diff = Math.abs(labelCount - targetLabelCount)

    // Prefer intervals that give us 4-10 labels and are closest to target
    if (labelCount >= 4 && labelCount <= 10 && diff < bestDiff) {
      bestInterval = interval
      bestDiff = diff
    }
  }

  // Generate tick values starting from a clean interval boundary
  const tickValues: number[] = []
  const intervalMs = bestInterval * 1000
  const diveStart = props.profiles[0]?.start ?? 0
  // Align ticks to the dive start time, not to epoch 0
  const offsetFromDiveStart = timeRange[0] - diveStart
  let firstTickOffset = Math.floor(offsetFromDiveStart / intervalMs) * intervalMs
  if (firstTickOffset < offsetFromDiveStart) {
    firstTickOffset += intervalMs
  }
  const firstTickTime = diveStart + firstTickOffset
  for (let t = firstTickTime; t <= timeRange[1]; t += intervalMs) {
    tickValues.push(t)
  }

  axes.x.value?.call(
    axisBottom(timeScale.value)
      .tickValues(tickValues)
      .tickFormat((t): string => formatTimeDisplay(Number(t), props.profiles[0]?.start ?? 0)),
  )
  const leftScale = getScaleFor(leftAxisMetric.value)
  const rightScale = getScaleFor(rightAxisMetric.value)
  if (leftScale) {
    const leftAxis = axisLeft(leftScale).tickFormat((d): string =>
      formatAxisTick(leftAxisMetric.value, Number(d)),
    )
    // For temperature, show ticks every 5 degrees
    if (leftAxisMetric.value === 'temp') {
      const domain = leftScale.domain() as [number, number]
      const tempTicks: number[] = []
      for (let t = Math.ceil(domain[0] / 5) * 5; t <= domain[1]; t += 5) {
        tempTicks.push(t)
      }
      leftAxis.tickValues(tempTicks)
    }
    axes.yDepth.value?.call(leftAxis)
  }
  if (rightScale) {
    const rightAxis = axisRight(rightScale).tickFormat((d): string =>
      formatAxisTick(rightAxisMetric.value, Number(d)),
    )
    // For temperature, show ticks every 5 degrees
    if (rightAxisMetric.value === 'temp') {
      const domain = rightScale.domain() as [number, number]
      const tempTicks: number[] = []
      for (let t = Math.ceil(domain[0] / 5) * 5; t <= domain[1]; t += 5) {
        tempTicks.push(t)
      }
      rightAxis.tickValues(tempTicks)
    }
    axes.yAux.value?.call(rightAxis)
  }
  // Gridlines (optional)
  if (props.showGrid ?? true) {
    grid.x.value?.call(
      axisBottom(timeScale.value)
        .tickSize(-innerHeight.value)
        .tickFormat(() => ''),
    )
    grid.y.value?.call(
      axisLeft(depthScale.value)
        .tickSize(-innerWidth.value)
        .tickFormat(() => ''),
    )
    grid.x.value?.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-opacity', 0.25)
    grid.y.value?.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-opacity', 0.25)
    grid.x.value?.select('.domain').remove()
    grid.y.value?.select('.domain').remove()
  } else {
    grid.x.value?.selectAll('*').remove()
    grid.y.value?.selectAll('*').remove()
  }

  // Render depth lines for each profile
  const depthLinesGroup = gSel.value.select('.lines-depth')
  depthLinesGroup.selectAll('path').remove()
  props.profiles.forEach((profile, idx) => {
    if (!visibleMask.value[idx]) return
    const depthPts: [number, number][] = profile.measurements.map((m) => [
      m.measurement.time,
      m.measurement.depth,
    ])
    depthLinesGroup
      .append('path')
      .datum(depthPts)
      .attr('d', depthLine.value?.(depthPts) ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
  })

  // Helper to draw multiple lines (one per profile) for a metric
  const drawMetricLines = (
    groupSelector: string,
    extractor: (m: DiveMeasurementWithId) => [number, number] | null,
    lineGen: Line<[number, number]> | null,
    show: boolean,
    color: string,
    width: number = 1.5,
  ): void => {
    const group = gSel.value?.select(groupSelector)
    if (!group) return
    group.selectAll('path').remove()
    if (!show || !lineGen) return

    props.profiles.forEach((profile, idx) => {
      if (!visibleMask.value[idx]) return
      const points: [number, number][] = profile.measurements
        .map(extractor)
        .filter((p): p is [number, number] => p !== null)
      if (points.length) {
        group
          .append('path')
          .datum(points)
          .attr('d', lineGen(points) ?? '')
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', width)
          .attr('opacity', 0.7)
      }
    })
  }

  drawMetricLines(
    '.lines-temp',
    (m) =>
      m.measurement.temperature?.value !== undefined
        ? [m.measurement.time, m.measurement.temperature.value]
        : null,
    tempLine.value,
    props.showTemp ?? false,
    '#ef4444',
  )

  drawMetricLines(
    '.lines-ndl',
    (m) => (m.measurement.ndl ? [m.measurement.time, parseIsoMinutes(m.measurement.ndl)] : null),
    ndlLine.value,
    props.showNdl ?? false,
    '#7c3aed',
    1.2,
  )

  drawMetricLines(
    '.lines-otu',
    (m) => (m.measurement.o2Tox !== undefined ? [m.measurement.time, m.measurement.o2Tox] : null),
    otuLine.value,
    props.showOtu ?? false,
    '#ec4899',
    1.2,
  )

  drawMetricLines(
    '.lines-cns',
    (m) => (m.measurement.cns !== undefined ? [m.measurement.time, m.measurement.cns] : null),
    cnsLine.value,
    props.showCns ?? false,
    '#fbbf24',
    1.2,
  )

  drawMetricLines(
    '.lines-gf',
    (m) => (m.measurement.n2 !== undefined ? [m.measurement.time, m.measurement.n2] : null),
    gfLine.value,
    props.showGf ?? false,
    '#8b5cf6',
    1.2,
  )

  drawMetricLines(
    '.lines-po2-measured',
    (m) =>
      m.measurement.po2?.measured !== undefined
        ? [m.measurement.time, m.measurement.po2.measured]
        : null,
    po2MeasuredLine.value,
    props.showPo2Measured ?? false,
    '#1d4ed8',
    1.2,
  )

  drawMetricLines(
    '.lines-po2-calculated',
    (m) =>
      m.measurement.po2?.calculated !== undefined
        ? [m.measurement.time, m.measurement.po2.calculated]
        : null,
    po2CalculatedLine.value,
    props.showPo2Calculated ?? false,
    '#d946ef',
    1.2,
  )

  drawMetricLines(
    '.lines-po2-setpoint',
    (m) =>
      m.measurement.po2?.maxSetPoint !== undefined
        ? [m.measurement.time, m.measurement.po2.maxSetPoint]
        : null,
    po2SetpointLine.value,
    props.showPo2Setpoint ?? false,
    '#22c55e',
    1.2,
  )

  drawMetricLines(
    '.lines-rmv',
    (m) =>
      m.measurement.rmvLiters !== undefined ? [m.measurement.time, m.measurement.rmvLiters] : null,
    rmvLine.value,
    props.showRmv ?? false,
    '#14b8a6',
    1.2,
  )

  drawMetricLines(
    '.lines-gas-o2',
    (m) =>
      m.measurement.gas?.o2 !== undefined ? [m.measurement.time, m.measurement.gas.o2 * 100] : null,
    gasO2Line.value,
    props.showGasO2 ?? false,
    '#06b6d4',
    1.2,
  )

  drawMetricLines(
    '.lines-gas-n2',
    (m) =>
      m.measurement.gas?.n2 !== undefined ? [m.measurement.time, m.measurement.gas.n2 * 100] : null,
    gasN2Line.value,
    props.showGasN2 ?? false,
    '#84cc16',
    1.2,
  )

  drawMetricLines(
    '.lines-gas-he',
    (m) =>
      m.measurement.gas?.he !== undefined ? [m.measurement.time, m.measurement.gas.he * 100] : null,
    gasHeLine.value,
    props.showGasHe ?? false,
    '#f97316',
    1.2,
  )
}

function getScaleFor(metric: string): ScaleLinear<number, number> | null {
  switch (metric) {
    case 'depth':
      return depthScale.value
    case 'temp':
      return tempScale.value
    case 'ndl':
      return ndlScale.value
    case 'otu':
      return otuScale.value
    case 'cns':
      return cnsScale.value
    case 'gf':
      return gfScale.value
    case 'po2Measured':
    case 'po2Calculated':
    case 'po2Setpoint':
      return po2Scale.value
    case 'rmv':
      return rmvScale.value
    case 'gasO2':
    case 'gasN2':
    case 'gasHe':
      return gasScale.value
    default:
      return null
  }
}

function formatAxisTick(metric: string, v: number): string {
  switch (metric) {
    case 'depth':
      return `${v} m`
    case 'temp':
      return `${v.toFixed(0)}°C`
    case 'ndl':
      return `${v}`
    case 'otu':
      return `${v}`
    case 'cns':
      return `${v}%`
    case 'gf':
      return `${v}%`
    case 'po2Measured':
    case 'po2Calculated':
    case 'po2Setpoint':
      return `${v.toFixed(2)} bar`
    case 'rmv':
      return `${v.toFixed(1)}`
    case 'gasO2':
    case 'gasN2':
    case 'gasHe':
      return `${v}%`
    default:
      return `${v}`
  }
}

async function maybeFetchSegments() {
  if (!props.showSegments) {
    segmentsData.value = null
    return
  }
  const diveId = props.diveId
  if (!diveId) {
    segmentsData.value = null
    return
  }
  if (segmentsCache.has(diveId)) {
    segmentsData.value = segmentsCache.get(diveId) ?? null
    return
  }
  try {
    const res = await getWithToken<DiveProfileSegmentWithId[]>(
      `/v1/dives/analytics/segments?id=${diveId}`,
    )
    segmentsCache.set(diveId, res.data)
    segmentsData.value = res.data
  } catch (err) {
    console.error('Failed to fetch segments:', err)
    segmentsData.value = null
  }
}

function renderSegments() {
  if (!segmentsLayer.value || !timeScale.value) return

  // Clear segments if not showing or no data
  if (!props.showSegments || !segmentsData.value) {
    segmentsLayer.value.selectAll('rect').remove()
    return
  }

  // Collect all measurements from all profiles to get time range
  const allMeasurements = props.profiles.flatMap((p) => p.measurements)
  if (!allMeasurements.length) return

  // Filter out undefined or malformed segments
  const validSegments = segmentsData.value.filter(
    (s) => s && s.segment && typeof s.segment.firstMeasurementIdx === 'number',
  )

  const h = innerHeight.value

  // Clear old rectangles first
  segmentsLayer.value.selectAll('rect').remove()

  // Create new rectangles for each segment with proper width
  validSegments.forEach((s, i) => {
    if (!s?.segment || typeof s.segment.firstMeasurementIdx !== 'number') return

    // Find the profile this segment belongs to
    const segmentProfile = props.profiles.find((p) => p.id === s.segment.profile.id)
    if (!segmentProfile) return
    // Respect profile visibility
    const segIdx = props.profiles.findIndex((p) => p.id === s.segment.profile.id)
    if (segIdx >= 0 && !visibleMask.value[segIdx]) return

    const profileMeasurements = segmentProfile.measurements
    if (!profileMeasurements || profileMeasurements.length === 0) return

    // Get start time from the segment's first measurement index
    const startMeasurement =
      profileMeasurements[Math.min(s.segment.firstMeasurementIdx, profileMeasurements.length - 1)]
    if (!startMeasurement) return

    const startTime = startMeasurement.measurement.time
    const startX = timeScale.value!(startTime)

    // Calculate end time: either from next segment (if same profile) or end of this profile's measurements
    let endTime: number
    const nextSegment = validSegments[i + 1]
    if (
      nextSegment?.segment &&
      typeof nextSegment.segment.firstMeasurementIdx === 'number' &&
      nextSegment.segment.profile.id === s.segment.profile.id
    ) {
      // Next segment is in the same profile
      const nextMeasurement =
        profileMeasurements[
          Math.min(nextSegment.segment.firstMeasurementIdx, profileMeasurements.length - 1)
        ]
      endTime = nextMeasurement?.measurement.time ?? startTime
    } else {
      // Last segment in this profile or next segment is in a different profile
      endTime = profileMeasurements[profileMeasurements.length - 1]?.measurement.time ?? startTime
    }

    const endX = timeScale.value!(endTime)
    const width = Math.max(0, endX - startX)

    if (segmentsLayer.value !== null) {
      segmentsLayer.value
        .append('rect')
        .attr('x', startX)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', h)
        .attr('fill', segmentColor(s.segment.type || ''))
        .attr('opacity', 0.3)
        .attr('stroke', segmentColor(s.segment.type || ''))
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.5)
        .style('pointer-events', 'none')
    }
  })
}

function segmentColor(type: string) {
  switch (type) {
    case 'DESCENT':
      return '#f59e0b' // amber
    case 'HOLD_LEVEL':
      return '#10b981' // emerald
    case 'ASCENT':
      return '#3b82f6' // blue
    case 'SURFACE':
      return '#6b7280' // gray
    default:
      return '#9ca3af'
  }
}

function segmentTypeName(type: string) {
  switch (type) {
    case 'DESCENT':
      return 'Descent'
    case 'HOLD_LEVEL':
      return 'Hold Level'
    case 'ASCENT':
      return 'Ascent'
    case 'SURFACE':
      return 'Surface'
    default:
      return type
  }
}

function findSegmentAtIndex(profileIdx: number, measurementIdx: number): string | undefined {
  if (!props.showSegments || !segmentsData.value) return undefined

  // Get segments for this profile
  const profileSegments = segmentsData.value.filter(
    (s) => s?.segment && s.segment.profile.id === props.profiles[profileIdx]?.id,
  )
  if (!profileSegments.length) return undefined

  // Find which segment contains this measurement index
  const segment = profileSegments.find((s, i, arr) => {
    if (!s?.segment || typeof s.segment.firstMeasurementIdx !== 'number') return false
    const start = s.segment.firstMeasurementIdx
    const profileMeasurements = props.profiles[profileIdx]?.measurements
    const next = arr[i + 1]
    const end =
      next?.segment && typeof next.segment.firstMeasurementIdx === 'number'
        ? next.segment.firstMeasurementIdx
        : (profileMeasurements?.length ?? 0)
    return measurementIdx >= start && measurementIdx < end
  })

  return segment?.segment?.type ? segmentTypeName(segment.segment.type) : undefined
}

function onMouseMoveD3(event: MouseEvent) {
  if (!timeScale.value || !depthScale.value || !gSel.value) return
  const [mx, my] = pointerInG(event)
  if (mx < 0 || mx > innerWidth.value || my < 0 || my > innerHeight.value) {
    onMouseLeave()
    return
  }

  // Find closest measurement across visible profiles only to determine time
  const allMeasurements = props.profiles.flatMap((p, pIdx) =>
    visibleMask.value[pIdx]
      ? p.measurements.map((m, mIdx) => ({
          ...m,
          profileIdx: pIdx,
          profileStart: p.start,
          measurementIndex: mIdx,
        }))
      : [],
  )
  if (!allMeasurements.length) return

  const b = bisector((m: DiveMeasurementWithId) => m.measurement.time).center
  const tVal = timeScale.value.invert(mx)
  const idx = Math.min(allMeasurements.length - 1, Math.max(0, b(allMeasurements, tVal)))
  const closestMeasurement = allMeasurements[idx]!

  // Collect data from all visible profiles at this time
  const profileDataList: TooltipProfileData[] = []

  props.profiles.forEach((profile, profileIdx) => {
    if (!visibleMask.value[profileIdx]) return

    // Find the closest measurement in this profile to the current time
    const profileMeasurements = profile.measurements.map((m, mIdx) => ({
      ...m,
      profileIdx,
      profileStart: profile.start,
      measurementIndex: mIdx,
    }))

    if (profileMeasurements.length === 0) return

    const bProfile = bisector((m: DiveMeasurementWithId) => m.measurement.time).center
    const mIdx = Math.min(
      profileMeasurements.length - 1,
      Math.max(0, bProfile(profileMeasurements, tVal)),
    )
    const m = profileMeasurements[mIdx]!

    profileDataList.push({
      profileIdx,
      profileNum: profileIdx + 1,
      timeDisplay: formatTimeDisplay(m.measurement.time, m.profileStart),
      depth: m.measurement.depth,
      temp: m.measurement.temperature?.value,
      ndl: formatISoDurationToMinutes(m.measurement.ndl),
      otu: m.measurement.o2Tox,
      cns: m.measurement.cns,
      gf: m.measurement.n2,
      po2Measured: m.measurement.po2?.measured,
      po2Calculated: m.measurement.po2?.calculated,
      po2Setpoint: m.measurement.po2?.maxSetPoint,
      rmv: m.measurement.rmvLiters,
      gasO2: m.measurement.gas?.o2 !== undefined ? m.measurement.gas.o2 * 100 : undefined,
      gasN2: m.measurement.gas?.n2 !== undefined ? m.measurement.gas.n2 * 100 : undefined,
      gasHe: m.measurement.gas?.he !== undefined ? m.measurement.gas.he * 100 : undefined,
      segmentType:
        m.measurementIndex !== undefined && m.profileIdx !== undefined
          ? findSegmentAtIndex(m.profileIdx, m.measurementIndex)
          : undefined,
    })
  })

  if (profileDataList.length === 0) return

  const cx = timeScale.value(closestMeasurement.measurement.time)
  const cy = depthScale.value(closestMeasurement.measurement.depth)

  // Show crosshair line at cursor x position
  crosshairLine.value?.attr('x1', cx).attr('x2', cx).style('display', null)

  // Show focus circle at data point
  focusCircle.value?.attr('cx', cx).attr('cy', cy).style('display', null)

  tooltip.value = {
    time: closestMeasurement.measurement.time,
    profiles: profileDataList,
  }

  // Position tooltip: use mouse Y position instead of data point Y position
  const tipX = cx + margin.left + 8
  const mouseY = event.clientY - container.value!.getBoundingClientRect().top
  const bounds = container.value!.getBoundingClientRect()
  tooltipLeft.value = Math.min(bounds.width - 200, Math.max(0, tipX))
  tooltipTop.value = Math.min(bounds.height - 100, Math.max(0, mouseY - 40))
}

function pointerInG(event: MouseEvent): [number, number] {
  const rect = container.value!.getBoundingClientRect()
  const x = event.clientX - rect.left - margin.left
  const y = event.clientY - rect.top - margin.top
  return [x, y]
}

function onMouseLeave() {
  if (!container.value) return
  focusCircle.value?.style('display', 'none')
  crosshairLine.value?.style('display', 'none')
  tooltip.value = null
}

function resetZoom() {
  if (!timeScaleBase.value || !depthScaleBase.value) return
  timeScale.value = timeScaleBase.value.copy()
  depthScale.value = depthScaleBase.value.copy()
  if (zoomBehavior.value && svgSel.value) {
    svgSel.value.call(zoomBehavior.value.transform, zoomIdentity)
  }
  isZoomed.value = false
  renderAll()
  renderSegments()
}

function formatTimeDisplay(t: number, start: number) {
  // Display as s, mm:ss, or hh:mm(:ss) relative to profile start
  const dtMs = Math.max(0, Math.abs(t - start))
  const totalSeconds = Math.round(dtMs / 1000)
  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) {
    const mm = String(totalMinutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    return `${mm}:${ss}`
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  if (seconds > 0) {
    const ss = String(seconds).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return `${hh}:${mm}`
}

function parseIsoMinutes(ndl: string) {
  if (!ndl) return 0
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/u
  const match = regex.exec(ndl)
  if (!match) return 0
  const hours = Number.parseInt(match[1] ?? '0', 10)
  const minutes = Number.parseInt(match[2] ?? '0', 10)
  const seconds = Number.parseInt(match[3] ?? '0', 10)
  return hours * 60 + minutes + seconds / 60
}
</script>

<style scoped>
div {
  touch-action: manipulation;
  overscroll-behavior-x: contain;
}
</style>
