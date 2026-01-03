<template>
  <div ref="container" class="w-full h-full relative">
    <button
      class="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow"
      @click="resetZoom"
    >
      Reset Zoom
    </button>
    <!-- Axis selectors and labels -->
    <div
      class="absolute top-2 left-2 z-10 flex items-center gap-2 text-xs"
      :style="{ color: 'var(--foreground)' }"
    >
      <span>Left:</span>
      <select
        v-model="leftAxisMetric"
        class="border rounded px-1 py-0.5"
        :style="{
          backgroundColor: 'var(--card-bg)',
          color: 'var(--foreground)',
          borderColor: 'rgba(209,213,219,0.8)',
        }"
      >
        <option value="depth">Depth</option>
        <option value="temp">Temp</option>
        <option value="ndl">NDL</option>
        <option value="otu">OTUs</option>
        <option value="cns">CNS</option>
        <option value="gf">GF99</option>
        <option value="rmv">RMV</option>
        <option value="gasO2">Gas O₂</option>
        <option value="gasN2">Gas N₂</option>
        <option value="gasHe">Gas He</option>
      </select>
    </div>
    <div
      class="absolute top-2 right-24 z-10 flex items-center gap-2 text-xs"
      :style="{ color: 'var(--foreground)' }"
    >
      <span>Right:</span>
      <select
        v-model="rightAxisMetric"
        class="border rounded px-1 py-0.5"
        :style="{
          backgroundColor: 'var(--card-bg)',
          color: 'var(--foreground)',
          borderColor: 'rgba(209,213,219,0.8)',
        }"
      >
        <option value="temp">Temp</option>
        <option value="ndl">NDL</option>
        <option value="otu">OTUs</option>
        <option value="cns">CNS</option>
        <option value="gf">GF99</option>
        <option value="rmv">RMV</option>
        <option value="gasO2">Gas O₂</option>
        <option value="gasN2">Gas N₂</option>
        <option value="gasHe">Gas He</option>
      </select>
    </div>
    <!-- Tooltip -->
    <div
      v-if="tooltip"
      class="absolute bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 shadow rounded px-2 py-1 pointer-events-none"
      :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }"
    >
      <div class="font-semibold">Time: {{ tooltip.timeDisplay }}</div>
      <div>Depth: {{ tooltip.depth.toFixed(1) }} m</div>
      <div v-if="tooltip.temp !== undefined">Temp: {{ tooltip.temp.toFixed(1) }} °C</div>
      <div v-if="tooltip.ndl">NDL: {{ tooltip.ndl }}</div>
      <div v-if="tooltip.otu !== undefined">OTUs: {{ tooltip.otu.toFixed(0) }}</div>
      <div v-if="tooltip.cns !== undefined">CNS: {{ tooltip.cns.toFixed(0) }}%</div>
      <div v-if="tooltip.gf !== undefined">GF99: {{ tooltip.gf.toFixed(0) }}%</div>
      <div v-if="tooltip.rmv !== undefined">RMV: {{ tooltip.rmv.toFixed(0) }} L/min</div>
      <div v-if="tooltip.gasO2 !== undefined && tooltip.gasHe !== undefined" class="group relative">
        <div>Gas: {{ tooltip.gasO2.toFixed(0) }}/{{ tooltip.gasHe.toFixed(0) }}</div>
        <div
          class="absolute left-full ml-2 top-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        >
          O₂: {{ tooltip.gasO2.toFixed(0) }}%, N₂: {{ tooltip.gasN2?.toFixed(0) }}%, He:
          {{ tooltip.gasHe.toFixed(0) }}%
        </div>
      </div>
      <div v-if="tooltip.segmentType" class="mt-1 pt-1 border-t border-gray-300">
        Segment: {{ tooltip.segmentType }}
      </div>
    </div>
    <!-- Zoom hint overlay -->
    <div
      v-if="showZoomHint"
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/75 text-white px-4 py-2 rounded-lg text-sm font-medium pointer-events-none z-20"
    >
      Ctrl+Scroll to zoom in the graph
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
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
} from 'd3'
import type { DiveProfile, DiveMeasurementWithId, DiveProfileSegmentWithId } from '@/lib/types/dive'
import { useApi } from '@/composables/useApi'
import { formatISoDurationToMinutes } from '@/lib/utils/timeUtils'
import { generateId } from '@/lib/utils/cryptoUtils'

type Props = {
  profiles: DiveProfile[]
  diveId: number
  showTemp?: boolean
  showSegments?: boolean
  showGrid?: boolean
  showNdl?: boolean
  showOtu?: boolean
  showCns?: boolean
  showGf?: boolean
  showRmv?: boolean
  showGasO2?: boolean
  showGasN2?: boolean
  showGasHe?: boolean
}

const props = defineProps<Props>()

const container = ref<HTMLElement | null>(null)
const width = ref(600)
const height = ref(300)
const margin = { top: 10, right: 36, bottom: 24, left: 40 }
const innerWidth = computed(() => Math.max(10, width.value - margin.left - margin.right))
const innerHeight = computed(() => Math.max(10, height.value - margin.top - margin.bottom))

const tooltip = ref<{
  timeDisplay: string
  depth: number
  temp?: number
  ndl?: string
  otu?: number
  cns?: number
  gf?: number
  rmv?: number
  gasO2?: number
  gasN2?: number
  gasHe?: number
  segmentType?: string
} | null>(null)
const tooltipLeft = ref(0)
const tooltipTop = ref(0)
const showZoomHint = ref(false)
let zoomHintTimer: ReturnType<typeof setTimeout> | null = null

const svgSel = ref<any | null>(null)
const gSel = ref<any | null>(null)
const axes = {
  x: ref<any | null>(null),
  yDepth: ref<any | null>(null),
  yAux: ref<any | null>(null),
}
const grid = {
  x: ref<any | null>(null),
  y: ref<any | null>(null),
}
const clipRect = ref<any | null>(null)
const clipPathId = `graph-clip-${generateId()}`
const depthScale = ref<any | null>(null)
const timeScale = ref<any | null>(null)
const tempScale = ref<any | null>(null)
const ndlScale = ref<any | null>(null)
const otuScale = ref<any | null>(null)
const cnsScale = ref<any | null>(null)
const gfScale = ref<any | null>(null)
const rmvScale = ref<any | null>(null)
const gasScale = ref<any | null>(null)
const timeScaleBase = ref<any | null>(null)
const depthScaleBase = ref<any | null>(null)
const depthLine = ref<any | null>(null)
const tempLine = ref<any | null>(null)
const ndlLine = ref<any | null>(null)
const otuLine = ref<any | null>(null)
const cnsLine = ref<any | null>(null)
const gfLine = ref<any | null>(null)
const rmvLine = ref<any | null>(null)
const gasO2Line = ref<any | null>(null)
const gasN2Line = ref<any | null>(null)
const gasHeLine = ref<any | null>(null)
const hoverOverlay = ref<any | null>(null)
const focusCircle = ref<any | null>(null)
const crosshairLine = ref<any | null>(null)
const segmentsData = ref<DiveProfileSegmentWithId[] | null>(null)
const segmentsLayer = ref<any | null>(null)
const segmentsCache = new Map<number, DiveProfileSegmentWithId[]>()
const zoomBehavior = ref<any | null>(null)
const { getWithToken } = useApi()
const leftAxisMetric = ref<
  'depth' | 'temp' | 'ndl' | 'otu' | 'cns' | 'gf' | 'rmv' | 'gasO2' | 'gasN2' | 'gasHe'
>('depth')
const rightAxisMetric = ref<
  'temp' | 'ndl' | 'otu' | 'cns' | 'gf' | 'rmv' | 'gasO2' | 'gasN2' | 'gasHe'
>('temp')

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
  const tempExtent =
    temperatureValues.length && Math.max(...temperatureValues) !== Math.min(...temperatureValues)
      ? [Math.max(0, Math.min(...temperatureValues) - 2), Math.max(...temperatureValues) + 2]
      : [0, 40]

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

  const gasValues = allMeasurements
    .map((m) => m.measurement.gas)
    .filter((g): g is { o2: number; n2: number; he: number } => !!g)
    .flatMap((g) => [g.o2 * 100, g.n2 * 100, g.he * 100])
  const gasMax = Math.max(100, gasValues.length ? Math.max(...gasValues) : 0)

  depthLine.value = line()
    .x((d: [number, number]) => (timeScale.value ? timeScale.value(d[0]) : 0))
    .y((d: [number, number]) => (depthScale.value ? depthScale.value(d[1]) : 0))

  const makeMetricLine = (scale: any) =>
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
  rmvScale.value = scaleLinear()
    .domain([0, rmvMax * 1.05])
    .range([innerHeight.value, 0])
  gasScale.value = scaleLinear().domain([0, gasMax]).range([innerHeight.value, 0])

  tempLine.value = makeMetricLine(tempScale.value)
  ndlLine.value = makeMetricLine(ndlScale.value)
  otuLine.value = makeMetricLine(otuScale.value)
  cnsLine.value = makeMetricLine(cnsScale.value)
  gfLine.value = makeMetricLine(gfScale.value)
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
    props.showTemp,
    props.showSegments,
    props.showGrid,
    props.showNdl,
    props.showOtu,
    props.showCns,
    props.showGf,
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
  const z = zoom()
    .scaleExtent([1, 20])
    .translateExtent([
      [0, 0],
      [width.value, height.value],
    ])
    .filter((event: any) => {
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
    .on('zoom', (event: any) => {
      if (!timeScaleBase.value || !depthScaleBase.value) return
      const t = event.transform
      // Only rescale X (time), keep Y (depth) unchanged
      timeScale.value = t.rescaleX(timeScaleBase.value)
      depthScale.value = depthScaleBase.value.copy()
      renderAll()
      renderSegments()
    })
  svgSel.value.call(z as any)
  // Store zoom behavior for reset
  zoomBehavior.value = z
}

function renderAll() {
  if (!gSel.value || !timeScale.value || !depthScale.value || !depthLine.value) return

  // Axes

  // Generate fixed interval ticks for time axis (in seconds)
  const timeRange = timeScale.value.domain() as [number, number]
  const timeDuration = timeRange[1] - timeRange[0]
  const timeDurationSeconds = timeDuration / 1000

  // Determine appropriate tick interval based on duration
  let tickInterval = 60 // 1 minute default
  if (timeDurationSeconds > 20 * 60) {
    // > 20 minutes
    tickInterval = 20 * 60
  } else if (timeDurationSeconds > 10 * 60) {
    // > 10 minutes
    tickInterval = 10 * 60
  } else if (timeDurationSeconds > 5 * 60) {
    // > 5 minutes
    tickInterval = 5 * 60
  }

  // Generate tick values starting from the beginning
  const tickValues: number[] = []
  for (let t = timeRange[0]; t <= timeRange[1]; t += tickInterval * 1000) {
    tickValues.push(t)
  }

  axes.x.value?.call(
    axisBottom(timeScale.value)
      .tickValues(tickValues)
      .tickFormat((t: any) => formatTimeDisplay(Number(t), props.profiles[0]?.start ?? 0)),
  )
  const leftScale = getScaleFor(leftAxisMetric.value)
  const rightScale = getScaleFor(rightAxisMetric.value)
  if (leftScale) {
    axes.yDepth.value?.call(
      axisLeft(leftScale).tickFormat((d: any) => formatAxisTick(leftAxisMetric.value, Number(d))),
    )
  }
  if (rightScale) {
    axes.yAux.value?.call(
      axisRight(rightScale).tickFormat((d: any) =>
        formatAxisTick(rightAxisMetric.value, Number(d)),
      ),
    )
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
  props.profiles.forEach((profile) => {
    const depthPts: [number, number][] = profile.measurements.map((m) => [
      m.measurement.time,
      m.measurement.depth,
    ])
    depthLinesGroup
      .append('path')
      .datum(depthPts)
      .attr('d', depthLine.value(depthPts) ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
  })

  // Helper to draw multiple lines (one per profile) for a metric
  const drawMetricLines = (
    groupSelector: string,
    extractor: (m: DiveMeasurementWithId) => [number, number] | null,
    lineGen: any,
    show: boolean,
    color: string,
    width: number = 1.5,
  ) => {
    const group = gSel.value?.select(groupSelector)
    if (!group) return
    group.selectAll('path').remove()
    if (!show || !lineGen) return

    props.profiles.forEach((profile) => {
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

function getScaleFor(metric: string) {
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
      return `${v.toFixed(1)} °C`
    case 'ndl':
      return `${v}`
    case 'otu':
      return `${v}`
    case 'cns':
      return `${v}%`
    case 'gf':
      return `${v}%`
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
  // Disable segments for multiple profiles (too complex to show)
  if (!props.showSegments || props.profiles.length > 1) {
    segmentsData.value = null
    return
  }

  const diveId = props.diveId
  if (!diveId) {
    segmentsData.value = null
    return
  }

  // Check cache first
  if (segmentsCache.has(diveId)) {
    segmentsData.value = segmentsCache.get(diveId) ?? null
    return
  }

  // Fetch from API
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

  // Clear segments if not showing or no data or multiple profiles
  if (!props.showSegments || !segmentsData.value || props.profiles.length > 1) {
    segmentsLayer.value.selectAll('rect').remove()
    return
  }

  const ms = props.profiles[0]?.measurements ?? []
  if (!ms.length) return

  const getTimeAtIdx = (idx: number) =>
    ms[Math.min(Math.max(idx, 0), ms.length - 1)]!.measurement.time

  // Filter out any undefined or malformed segments
  const validSegments = segmentsData.value.filter(
    (s) => s && s.segment && typeof s.segment.firstMeasurementIdx === 'number',
  )

  const h = innerHeight.value

  // Clear old rectangles first
  segmentsLayer.value.selectAll('rect').remove()

  // Create new rectangles for each segment with proper width
  validSegments.forEach((s, i) => {
    if (!s?.segment || typeof s.segment.firstMeasurementIdx !== 'number') return

    const startTime = getTimeAtIdx(s.segment.firstMeasurementIdx)
    const startX = timeScale.value!(startTime)

    // Calculate end time for this segment
    let endTime: number
    if (i < validSegments.length - 1) {
      const nextSegment = validSegments[i + 1]
      if (nextSegment?.segment && typeof nextSegment.segment.firstMeasurementIdx === 'number') {
        endTime = getTimeAtIdx(nextSegment.segment.firstMeasurementIdx)
      } else {
        endTime = ms[ms.length - 1]?.measurement.time ?? startTime
      }
    } else {
      // Last segment extends to end of measurements
      endTime = ms[ms.length - 1]?.measurement.time ?? startTime
    }

    const endX = timeScale.value!(endTime)
    const width = Math.max(0, endX - startX)

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

function findSegmentAtIndex(idx: number): string | undefined {
  if (!props.showSegments || !segmentsData.value) return undefined

  const segment = segmentsData.value.find((s, i, arr) => {
    if (!s?.segment || typeof s.segment.firstMeasurementIdx !== 'number') return false
    const start = s.segment.firstMeasurementIdx
    const next = arr[i + 1]
    const end =
      next?.segment && typeof next.segment.firstMeasurementIdx === 'number'
        ? next.segment.firstMeasurementIdx
        : (props.profiles[0]?.measurements.length ?? 0)
    return idx >= start && idx < end
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

  // Find closest measurement across all profiles
  const allMeasurements = props.profiles.flatMap((p, pIdx) =>
    p.measurements.map((m, mIdx) => ({
      ...m,
      profileIdx: pIdx,
      profileStart: p.start,
      measurementIndex: mIdx,
    })),
  )
  if (!allMeasurements.length) return

  const b = bisector((m: any) => m.measurement.time).center
  const tVal = timeScale.value.invert(mx)
  const idx = Math.min(allMeasurements.length - 1, Math.max(0, b(allMeasurements, tVal)))
  const m = allMeasurements[idx]!

  const cx = timeScale.value(m.measurement.time)
  const cy = depthScale.value(m.measurement.depth)

  // Show crosshair line at cursor x position
  crosshairLine.value?.attr('x1', cx).attr('x2', cx).style('display', null)

  // Show focus circle at data point
  focusCircle.value?.attr('cx', cx).attr('cy', cy).style('display', null)

  tooltip.value = {
    timeDisplay: formatTimeDisplay(m.measurement.time, (m as any).profileStart),
    depth: m.measurement.depth,
    temp: m.measurement.temperature?.value,
    ndl: formatISoDurationToMinutes(m.measurement.ndl),
    otu: m.measurement.o2Tox,
    cns: m.measurement.cns,
    gf: m.measurement.n2,
    rmv: m.measurement.rmvLiters,
    gasO2: m.measurement.gas?.o2 !== undefined ? m.measurement.gas.o2 * 100 : undefined,
    gasN2: m.measurement.gas?.n2 !== undefined ? m.measurement.gas.n2 * 100 : undefined,
    gasHe: m.measurement.gas?.he !== undefined ? m.measurement.gas.he * 100 : undefined,
    segmentType:
      props.profiles.length === 1 && (m as any).measurementIndex !== undefined
        ? findSegmentAtIndex((m as any).measurementIndex)
        : undefined,
  }

  // Position tooltip: use mouse Y position instead of data point Y position
  const tipX = cx + margin.left + 8
  const mouseY = event.clientY - container.value!.getBoundingClientRect().top
  const bounds = container.value!.getBoundingClientRect()
  tooltipLeft.value = Math.min(bounds.width - 160, Math.max(0, tipX))
  tooltipTop.value = Math.min(bounds.height - 80, Math.max(0, mouseY - 40))
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

<style scoped></style>
