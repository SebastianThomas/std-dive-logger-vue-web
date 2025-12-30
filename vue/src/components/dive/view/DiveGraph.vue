<template>
  <div ref="container" class="w-full h-full relative">
    <button
      class="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-white/80 hover:bg-white border border-gray-300 rounded shadow"
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
      class="absolute bg-white text-xs text-gray-700 shadow rounded px-2 py-1 pointer-events-none"
      :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }"
    >
      <div class="font-semibold">Time: {{ tooltip.timeDisplay }}</div>
      <div>Depth: {{ tooltip.depth.toFixed(1) }} m</div>
      <div v-if="tooltip.temp !== undefined">Temp: {{ tooltip.temp.toFixed(1) }} °C</div>
      <div v-if="tooltip.ndl">NDL: {{ tooltip.ndl }}</div>
      <div v-if="tooltip.otu !== undefined">OTUs: {{ tooltip.otu.toFixed(1) }}</div>
      <div v-if="tooltip.cns !== undefined">CNS: {{ tooltip.cns.toFixed(1) }}%</div>
      <div v-if="tooltip.gf !== undefined">GF99: {{ tooltip.gf.toFixed(1) }}%</div>
      <div v-if="tooltip.rmv !== undefined">RMV: {{ tooltip.rmv.toFixed(1) }} L/min</div>
      <div v-if="tooltip.gasO2 !== undefined && tooltip.gasHe !== undefined" class="group relative">
        <div>Gas: {{ tooltip.gasO2.toFixed(0) }}/{{ tooltip.gasHe.toFixed(0) }}</div>
        <div
          class="absolute left-full ml-2 top-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        >
          O₂: {{ tooltip.gasO2.toFixed(1) }}%, N₂: {{ tooltip.gasN2?.toFixed(1) }}%, He:
          {{ tooltip.gasHe.toFixed(1) }}%
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

type Props = {
  profile: DiveProfile
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
  const ms = props.profile.measurements
  if (!ms.length) return
  const tValues = ms.map((m) => m.measurement.time)
  const dValues = ms.map((m) => m.measurement.depth)

  const tmin = Math.min(...tValues)
  const tmax = Math.max(...tValues)
  const dmin = Math.min(...dValues)
  const dmax = Math.max(...dValues)

  timeScaleBase.value = scaleLinear().domain([tmin, tmax]).range([0, innerWidth.value])
  timeScale.value = timeScaleBase.value.copy()
  // Depth increases downwards (invert range so 0 is at top, max depth at bottom)
  depthScaleBase.value = scaleLinear().domain([dmin, dmax]).range([0, innerHeight.value])
  depthScale.value = depthScaleBase.value.copy()

  // Independent domains per metric to keep lines static regardless of toggle state
  const temperatureValues = ms
    .map((m) => m.measurement.temperature?.value)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const tempExtent =
    temperatureValues.length && Math.max(...temperatureValues) !== Math.min(...temperatureValues)
      ? [Math.min(...temperatureValues), Math.max(...temperatureValues)]
      : [0, 40]

  const otuValues = ms
    .map((m) => m.measurement.o2Tox)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const otuMax = Math.max(100, otuValues.length ? Math.max(...otuValues) : 0)

  const cnsValues = ms
    .map((m) => m.measurement.cns)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const cnsMax = Math.max(100, cnsValues.length ? Math.max(...cnsValues) : 0)

  const gfValues = ms
    .map((m) => m.measurement.n2)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const gfMax = Math.max(100, gfValues.length ? Math.max(...gfValues) : 0)

  const rmvValues = ms
    .map((m) => m.measurement.rmvLiters)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const rmvMax = Math.max(80, rmvValues.length ? Math.max(...rmvValues) : 0)

  const gasValues = ms
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
    props.profile,
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

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  gSel.value = g

  // Background rect (for contrast)
  g.append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'var(--card-bg, #ffffff)')

  // Layers: segments above background, lines over segments
  segmentsLayer.value = g.append('g').attr('class', 'segments')

  // Gridlines
  grid.y.value = g.append('g').attr('class', 'grid-y')
  grid.x.value = g
    .append('g')
    .attr('class', 'grid-x')
    .attr('transform', `translate(0,${innerHeight.value})`)

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

  // Lines
  g.append('path')
    .attr('class', 'line-depth')
    .attr('fill', 'none')
    .attr('stroke', '#2563eb')
    .attr('stroke-width', 2)
  g.append('path')
    .attr('class', 'line-temp')
    .attr('fill', 'none')
    .attr('stroke', '#ef4444')
    .attr('stroke-width', 1.5)
    .attr('opacity', props.showTemp ? 1 : 0)
  g.append('path')
    .attr('class', 'line-ndl')
    .attr('fill', 'none')
    .attr('stroke', '#7c3aed')
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.7)
  g.append('path')
    .attr('class', 'line-otu')
    .attr('fill', 'none')
    .attr('stroke', '#ec4899')
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.7)
  g.append('path')
    .attr('class', 'line-cns')
    .attr('fill', 'none')
    .attr('stroke', '#fbbf24')
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.7)
  g.append('path')
    .attr('class', 'line-gf')
    .attr('fill', 'none')
    .attr('stroke', '#8b5cf6')
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.7)
  g.append('path')
    .attr('class', 'line-rmv')
    .attr('fill', 'none')
    .attr('stroke', '#14b8a6')
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.7)
  g.append('path')
    .attr('class', 'line-gas-o2')
    .attr('fill', 'none')
    .attr('stroke', '#06b6d4')
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.7)
  g.append('path')
    .attr('class', 'line-gas-n2')
    .attr('fill', 'none')
    .attr('stroke', '#84cc16')
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.7)
  g.append('path')
    .attr('class', 'line-gas-he')
    .attr('fill', 'none')
    .attr('stroke', '#f97316')
    .attr('stroke-width', 1.2)
    .attr('opacity', 0.7)

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
    .style('display', 'none')

  focusCircle.value = g
    .append('circle')
    .attr('r', 5)
    .attr('fill', '#ef4444')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
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
  const ms = props.profile.measurements
  // Axes
  axes.x.value?.call(
    axisBottom(timeScale.value).tickFormat((t: any) =>
      formatTimeDisplay(Number(t), props.profile.start),
    ),
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
  const depthPts: [number, number][] = ms.map((m) => [m.measurement.time, m.measurement.depth])
  gSel.value
    .select('.line-depth')
    .datum(depthPts)
    .attr('d', depthLine.value(depthPts) ?? '')

  const drawMetric = (
    selector: string,
    points: [number, number][],
    lineGen: any,
    show: boolean,
  ) => {
    const path = gSel.value?.select(selector)
    if (!path) return
    if (show && points.length && lineGen) {
      path
        .datum(points)
        .attr('d', lineGen(points) ?? '')
        .attr('opacity', 1)
    } else {
      path.attr('opacity', 0).attr('d', '')
    }
  }

  const tempPts: [number, number][] = ms
    .filter((m) => m.measurement.temperature?.value !== undefined)
    .map((m) => [m.measurement.time, m.measurement.temperature!.value])
  drawMetric('.line-temp', tempPts, tempLine.value, props.showTemp)

  const ndlPts: [number, number][] = ms
    .filter((m) => m.measurement.ndl)
    .map((m) => [m.measurement.time, parseIsoMinutes(m.measurement.ndl)])
  drawMetric('.line-ndl', ndlPts, ndlLine.value, props.showNdl)

  const otuPts: [number, number][] = ms
    .filter((m) => m.measurement.o2Tox !== undefined)
    .map((m) => [m.measurement.time, m.measurement.o2Tox!])
  drawMetric('.line-otu', otuPts, otuLine.value, props.showOtu)

  const cnsPts: [number, number][] = ms
    .filter((m) => m.measurement.cns !== undefined)
    .map((m) => [m.measurement.time, m.measurement.cns!])
  drawMetric('.line-cns', cnsPts, cnsLine.value, props.showCns)

  const gfPts: [number, number][] = ms
    .filter((m) => m.measurement.n2 !== undefined)
    .map((m) => [m.measurement.time, m.measurement.n2!])
  drawMetric('.line-gf', gfPts, gfLine.value, props.showGf)

  const rmvPts: [number, number][] = ms
    .filter((m) => m.measurement.rmvLiters !== undefined)
    .map((m) => [m.measurement.time, m.measurement.rmvLiters!])
  drawMetric('.line-rmv', rmvPts, rmvLine.value, props.showRmv)

  const gasO2Pts: [number, number][] = ms
    .filter((m) => m.measurement.gas?.o2 !== undefined)
    .map((m) => [m.measurement.time, m.measurement.gas!.o2 * 100])
  drawMetric('.line-gas-o2', gasO2Pts, gasO2Line.value, props.showGasO2)

  const gasN2Pts: [number, number][] = ms
    .filter((m) => m.measurement.gas?.n2 !== undefined)
    .map((m) => [m.measurement.time, m.measurement.gas!.n2 * 100])
  drawMetric('.line-gas-n2', gasN2Pts, gasN2Line.value, props.showGasN2)

  const gasHePts: [number, number][] = ms
    .filter((m) => m.measurement.gas?.he !== undefined)
    .map((m) => [m.measurement.time, m.measurement.gas!.he * 100])
  drawMetric('.line-gas-he', gasHePts, gasHeLine.value, props.showGasHe)
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
  if (!props.showSegments) {
    segmentsData.value = null
    return
  }

  // Check cache first
  if (segmentsCache.has(props.diveId)) {
    segmentsData.value = segmentsCache.get(props.diveId) ?? null
    return
  }

  // Fetch from API
  try {
    const res = await getWithToken<DiveProfileSegmentWithId[]>(
      `/v1/dives/analytics/segments?id=${props.diveId}`,
    )
    segmentsCache.set(props.diveId, res.data)
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

  const ms = props.profile.measurements
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
        : props.profile.measurements.length
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
  const ms = props.profile.measurements
  const b = bisector((m: DiveMeasurementWithId) => m.measurement.time).center
  const tVal = timeScale.value.invert(mx)
  const idx = Math.min(ms.length - 1, Math.max(0, b(ms, tVal)))
  const m = ms[idx]!

  const cx = timeScale.value(m.measurement.time)
  const cy = depthScale.value(m.measurement.depth)

  // Show crosshair line at cursor x position
  crosshairLine.value?.attr('x1', cx).attr('x2', cx).style('display', null)

  // Show focus circle at data point
  focusCircle.value?.attr('cx', cx).attr('cy', cy).style('display', null)

  tooltip.value = {
    timeDisplay: formatTimeDisplay(m.measurement.time, props.profile.start),
    depth: m.measurement.depth,
    temp: m.measurement.temperature?.value,
    ndl: m.measurement.ndl,
    otu: m.measurement.o2Tox,
    cns: m.measurement.cns,
    gf: m.measurement.n2,
    rmv: m.measurement.rmvLiters,
    gasO2: m.measurement.gas?.o2 !== undefined ? m.measurement.gas.o2 * 100 : undefined,
    gasN2: m.measurement.gas?.n2 !== undefined ? m.measurement.gas.n2 * 100 : undefined,
    gasHe: m.measurement.gas?.he !== undefined ? m.measurement.gas.he * 100 : undefined,
    segmentType: findSegmentAtIndex(idx),
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
