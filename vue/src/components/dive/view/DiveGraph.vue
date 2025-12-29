<template>
  <div ref="container" class="w-full h-full relative">
    <button
      class="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-white/80 hover:bg-white border border-gray-300 rounded shadow"
      @click="resetZoom"
    >
      Reset Zoom
    </button>
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
}

const props = defineProps<Props>()

const container = ref<HTMLElement | null>(null)
const width = ref(600)
const height = ref(300)
const margin = { top: 10, right: 36, bottom: 24, left: 40 }
const innerWidth = computed(() => Math.max(10, width.value - margin.left - margin.right))
const innerHeight = computed(() => Math.max(10, height.value - margin.top - margin.bottom))

const tooltip = ref<{ timeDisplay: string; depth: number; temp?: number; ndl?: string } | null>(
  null,
)
const tooltipLeft = ref(0)
const tooltipTop = ref(0)

const svgSel = ref<any | null>(null)
const gSel = ref<any | null>(null)
const axes = {
  x: ref<any | null>(null),
  yDepth: ref<any | null>(null),
  yTemp: ref<any | null>(null),
}
const grid = {
  x: ref<any | null>(null),
  y: ref<any | null>(null),
}
const depthScale = ref<any | null>(null)
const timeScale = ref<any | null>(null)
const tempScale = ref<any | null>(null)
const timeScaleBase = ref<any | null>(null)
const depthScaleBase = ref<any | null>(null)
const depthLine = ref<any | null>(null)
const tempLine = ref<any | null>(null)
const hoverOverlay = ref<any | null>(null)
const focusCircle = ref<any | null>(null)
const segmentsData = ref<DiveProfileSegmentWithId[] | null>(null)
const segmentsLayer = ref<any | null>(null)
const zoomBehavior = ref<any | null>(null)
const { getWithToken } = useApi()

function setupScales() {
  const ms = props.profile.measurements
  if (!ms.length) return
  const tValues = ms.map((m) => m.measurement.time)
  const dValues = ms.map((m) => m.measurement.depth)
  const tempValues = ms
    .map((m) => m.measurement.temperature?.value)
    .filter((v): v is number => v !== undefined)

  const tmin = Math.min(...tValues)
  const tmax = Math.max(...tValues)
  const dmin = Math.min(...dValues)
  const dmax = Math.max(...dValues)

  timeScaleBase.value = scaleLinear().domain([tmin, tmax]).range([0, innerWidth.value])
  timeScale.value = timeScaleBase.value.copy()
  // Depth increases downwards
  depthScaleBase.value = scaleLinear().domain([dmin, dmax]).range([innerHeight.value, 0])
  depthScale.value = depthScaleBase.value.copy()
  if (props.showTemp && tempValues.length) {
    const tminC = Math.min(...tempValues)
    const tmaxC = Math.max(...tempValues)
    tempScale.value = scaleLinear().domain([tminC, tmaxC]).range([innerHeight.value, 0])
  } else {
    tempScale.value = null
  }
  depthLine.value = line()
    .x((d: [number, number]) => (timeScale.value ? timeScale.value(d[0]) : 0))
    .y((d: [number, number]) => (depthScale.value ? depthScale.value(d[1]) : 0))
  tempLine.value = line()
    .x((d: [number, number]) => (timeScale.value ? timeScale.value(d[0]) : 0))
    .y((d: [number, number]) => (tempScale.value ? tempScale.value(d[1]) : 0))
}

function updateSize() {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  width.value = Math.max(300, Math.floor(rect.width))
  height.value = Math.max(200, Math.floor(rect.height))
}

let ro: ResizeObserver | null = null
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
})

watch(
  () => [props.profile, props.showTemp, props.showSegments],
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

  // Layers: segments under, lines over
  segmentsLayer.value = g.append('g').attr('class', 'segments')
  g.append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', '#fff')

  // Gridlines
  grid.y.value = g.append('g').attr('class', 'grid-y')
  grid.x.value = g
    .append('g')
    .attr('class', 'grid-x')
    .attr('transform', `translate(0,${innerHeight.value})`)

  // Axes
  axes.yDepth.value = g.append('g').attr('transform', `translate(0,0)`).attr('class', 'y-depth')
  axes.yTemp.value = g
    .append('g')
    .attr('transform', `translate(${innerWidth.value},0)`) // right side
    .attr('class', 'y-temp')
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

  // Hover overlay
  focusCircle.value = g
    .append('circle')
    .attr('r', 3)
    .attr('fill', '#ef4444')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .style('display', 'none')
  hoverOverlay.value = g
    .append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'transparent')
    .on('mousemove', onMouseMoveD3)
    .on('mouseleave', onMouseLeave)

  // Zoom & pan on the SVG
  const z = zoom()
    .scaleExtent([1, 20])
    .translateExtent([
      [0, 0],
      [width.value, height.value],
    ])
    .on('zoom', (event: any) => {
      if (!timeScaleBase.value || !depthScaleBase.value) return
      const t = event.transform
      timeScale.value = t.rescaleX(timeScaleBase.value)
      depthScale.value = t.rescaleY(depthScaleBase.value)
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
  axes.yDepth.value?.call(axisLeft(depthScale.value).tickFormat((d: any) => `${Number(d)} m`))
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
  if (props.showTemp && tempScale.value) {
    axes.yTemp.value?.call(axisRight(tempScale.value).tickFormat((d: any) => `${Number(d)} °C`))
    svgSel.value?.select('.line-temp').attr('opacity', 1)
  } else {
    svgSel.value?.select('.line-temp').attr('opacity', 0)
  }

  // Lines
  const depthPts: [number, number][] = ms.map((m) => [m.measurement.time, m.measurement.depth])
  gSel.value
    .select('.line-depth')
    .datum(depthPts)
    .attr('d', depthLine.value(depthPts) ?? '')
  if (props.showTemp && tempScale.value && tempLine.value) {
    const tempPts: [number, number][] = ms
      .filter((m) => m.measurement.temperature?.value !== undefined)
      .map((m) => [m.measurement.time, m.measurement.temperature!.value])
    gSel.value
      .select('.line-temp')
      .datum(tempPts)
      .attr('d', tempLine.value(tempPts) ?? '')
  }
}

async function maybeFetchSegments() {
  if (!props.showSegments) return
  try {
    const res = await getWithToken<DiveProfileSegmentWithId[]>(
      `/v1/dives/${props.diveId}/profiles/${props.profile.id}/segments`,
    )
    segmentsData.value = res.data
  } catch {
    // non-fatal
    segmentsData.value = null
  }
}

function renderSegments() {
  if (!segmentsLayer.value || !segmentsData.value || !timeScale.value) return
  const ms = props.profile.measurements
  const getTimeAtIdx = (idx: number) =>
    ms[Math.min(Math.max(idx, 0), ms.length - 1)]!.measurement.time
  const rects = segmentsLayer.value.selectAll('rect').data(segmentsData.value)
  rects
    .join('rect')
    .attr('x', (s: DiveProfileSegmentWithId) =>
      timeScale.value!(getTimeAtIdx(s.segment.firstMeasurementIdx)),
    )
    .attr('y', 0)
    .attr('width', (s: DiveProfileSegmentWithId, i: number, arr: DiveProfileSegmentWithId[]) => {
      const next = arr[i + 1]
      const endTime = next
        ? getTimeAtIdx(next.segment.firstMeasurementIdx)
        : ms[ms.length - 1]?.measurement.time
      const startTime = getTimeAtIdx(s.segment.firstMeasurementIdx)
      const w = timeScale.value!(endTime) - timeScale.value!(startTime)
      return Math.max(0, w)
    })
    .attr('height', innerHeight.value)
    .attr('fill', (s: DiveProfileSegmentWithId) => segmentColor(s.segment.type))
    .attr('opacity', 0.08)
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
  focusCircle.value?.attr('cx', cx).attr('cy', cy).style('display', null)

  tooltip.value = {
    timeDisplay: formatTimeDisplay(m.measurement.time, props.profile.start),
    depth: m.measurement.depth,
    temp: m.measurement.temperature?.value,
    ndl: m.measurement.ndl,
  }
  const tipX = cx + margin.left + 8
  const tipY = cy + margin.top - 8
  const bounds = container.value!.getBoundingClientRect()
  tooltipLeft.value = Math.min(bounds.width - 160, Math.max(0, tipX))
  tooltipTop.value = Math.min(bounds.height - 80, Math.max(0, tipY))
}

function pointerInG(event: MouseEvent): [number, number] {
  const rect = container.value!.getBoundingClientRect()
  const x = event.clientX - rect.left - margin.left
  const y = event.clientY - rect.top - margin.top
  return [x, y]
}

function onMouseLeave() {
  focusCircle.value?.style('display', 'none')
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
  // If t looks like an epoch ms, show relative seconds; otherwise show as-is
  const dt = Math.abs(t - start)
  if (dt > 1000) {
    const secs = Math.round(dt / 1000)
    return `+${secs}s`
  }
  return `${t}`
}
</script>

<style scoped></style>
