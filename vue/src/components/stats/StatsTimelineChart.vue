<template>
  <div ref="container" class="w-full h-full relative">
    <div
      v-if="!hasAnySelection"
      class="absolute inset-0 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500"
    >
      Select at least one metric below to see a chart.
    </div>
    <div
      v-if="tooltip"
      class="absolute bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 shadow rounded px-3 py-2 pointer-events-none z-10 max-w-xs"
      :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }"
    >
      <div class="font-semibold mb-1">{{ tooltip.label }}</div>
      <div v-for="row in tooltip.rows" :key="row.label" class="flex items-center gap-1.5">
        <span class="inline-block w-2 h-2 rounded-full" :style="{ backgroundColor: row.color }" />
        <span>{{ row.label }}: {{ row.value }}</span>
      </div>
      <div
        v-if="tooltip.clickable"
        class="mt-1 text-blue-500 dark:text-blue-400 font-medium pointer-events-none"
      >
        Click to view dive
      </div>
    </div>

    <!-- Legend for categorical metrics -->
    <div
      v-if="categoricalLegend.length"
      class="absolute top-1 right-1 flex flex-col gap-0.5 bg-white/80 dark:bg-gray-800/80 rounded px-2 py-1 text-[11px] z-10"
    >
      <div v-for="item in categoricalLegend" :key="item.label" class="flex items-center gap-1.5">
        <span class="inline-block w-2 h-2 rounded-full" :style="{ backgroundColor: item.color }" />
        <span>{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
div {
  touch-action: manipulation;
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  select,
  line,
  scaleLinear,
  scaleTime,
  scaleOrdinal,
  schemeCategory10,
  axisLeft,
  axisRight,
  axisBottom,
  bisector,
  type Selection,
  type ScaleLinear,
  type ScaleTime,
  type Line,
} from 'd3'
import type {
  StatsTimeSeries,
  StatsTimeSeriesPoint,
  StatsCategoryPoint,
  TimelineMetric,
  TimelineCategoricalMetric,
  TimelineGranularity,
} from '@/lib/types/statsTimeline'
import {
  DEFAULT_TIMELINE_METRIC_CONFIGS,
  timelineMetricDisplayNames,
  timelineCategoricalDisplayNames,
  timelineMetricUnits,
} from '@/lib/types/statsTimeline'

type Props = {
  series: StatsTimeSeries
  granularity: TimelineGranularity
  selectedMetrics: TimelineMetric[]
  selectedCategorical: TimelineCategoricalMetric[]
  leftAxisMetric?: TimelineMetric
  rightAxisMetric?: TimelineMetric
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:leftAxisMetric': [value: TimelineMetric]
  'update:rightAxisMetric': [value: TimelineMetric]
}>()

const router = useRouter()

const container = ref<HTMLElement | null>(null)
const width = ref(600)
const height = ref(320)
const margin = { top: 10, right: 46, bottom: 28, left: 46 }
const innerWidth = computed(() => Math.max(10, width.value - margin.left - margin.right))
const innerHeight = computed(() => Math.max(10, height.value - margin.top - margin.bottom))

const hasAnySelection = computed(
  () => props.selectedMetrics.length > 0 || props.selectedCategorical.length > 0,
)

type TooltipRow = { label: string; value: string; color: string }
const tooltip = ref<{ label: string; rows: TooltipRow[]; clickable: boolean } | null>(null)
const tooltipLeft = ref(0)
const tooltipTop = ref(0)

const categoricalLegend = ref<{ label: string; color: string }[]>([])

let ro: ResizeObserver | null = null
let svgSel: Selection<SVGSVGElement, unknown, null, undefined> | null = null

function metricValue(p: StatsTimeSeriesPoint, metric: TimelineMetric): number | null {
  switch (metric) {
    case 'diveCount':
      return p.diveCount
    case 'avgRmv':
      return p.avgRmvLiters ?? null
    case 'maxDepth':
      return p.maxDepth ?? null
    case 'avgDepth':
      return p.avgDepth ?? null
    case 'totalDiveTime':
      return p.totalDurationSeconds / 60
    case 'maxDiveTime':
      return p.maxDurationSeconds / 60
    case 'avgEndCns':
      return p.avgEndCns ?? null
    case 'avgTemperature':
      return p.avgTemperatureCelsius ?? null
    case 'avgVisibility':
      return p.avgVisibilityMeters ?? null
    case 'avgWeight':
      return p.avgWeightKg ?? null
    default:
      return null
  }
}

function formatBucketLabel(granularity: TimelineGranularity, ts: number): string {
  const date = new Date(ts)
  switch (granularity) {
    case 'PER_DIVE':
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    case 'WEEK':
      return date.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' })
    case 'MONTH':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    case 'QUARTER':
      return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
    case 'YEAR':
      return String(date.getFullYear())
    default:
      return date.toLocaleDateString()
  }
}

function formatMetricValue(metric: TimelineMetric, value: number): string {
  const unit = timelineMetricUnits[metric]
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1)
  return unit ? `${formatted} ${unit}` : formatted
}

function initSvg() {
  if (!container.value) return
  select(container.value).selectAll('svg').remove()
  const svg = select(container.value)
    .append('svg')
    .attr('width', width.value)
    .attr('height', height.value)
  svgSel = svg

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
  g.append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'var(--card-bg, #ffffff)')

  g.append('g').attr('class', 'grid-y')
  g.append('g').attr('class', 'grid-x').attr('transform', `translate(0,${innerHeight.value})`)
  g.append('g').attr('class', 'y-left')
  g.append('g').attr('class', 'y-right').attr('transform', `translate(${innerWidth.value},0)`)
  g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${innerHeight.value})`)
  g.append('g').attr('class', 'lines')
  g.append('g').attr('class', 'points')

  const crosshair = g
    .append('line')
    .attr('class', 'crosshair')
    .attr('stroke', '#9ca3af')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,2')
    .attr('y1', 0)
    .attr('y2', innerHeight.value)
    .style('display', 'none')

  g.append('rect')
    .attr('width', innerWidth.value)
    .attr('height', innerHeight.value)
    .attr('fill', 'transparent')
    .on('mousemove', onMouseMove)
    .on('mouseleave', onMouseLeave)
    .on('click', onClick)

  crosshairRef = crosshair
}

let crosshairRef: Selection<SVGLineElement, unknown, null, undefined> | null = null
let xScaleRef: ScaleTime<number, number> | null = null
let sortedPointsRef: StatsTimeSeriesPoint[] = []

function updateSize() {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  width.value = Math.max(300, Math.floor(rect.width))
  height.value = Math.max(220, Math.floor(rect.height))
}

function buildScale(values: number[]): ScaleLinear<number, number> {
  if (!values.length) {
    return scaleLinear().domain([0, 1]).range([innerHeight.value, 0])
  }
  const min = Math.min(0, ...values)
  const max = Math.max(...values)
  const domain: [number, number] = min === max ? [min - 1, max + 1] : [min, max]
  return scaleLinear()
    .domain(domain)
    .nice()
    .range([innerHeight.value, 0])
}

function renderAll() {
  if (!svgSel || !container.value) return
  const g = svgSel.select<SVGGElement>('g')
  const points = [...props.series.points].sort((a, b) => a.bucketStart - b.bucketStart)
  sortedPointsRef = points

  g.select('rect').attr('width', innerWidth.value).attr('height', innerHeight.value)

  if (!points.length) {
    g.select('.lines').selectAll('*').remove()
    g.select('.points').selectAll('*').remove()
    g.select('.x-axis').selectAll('*').remove()
    g.select('.y-left').selectAll('*').remove()
    g.select('.y-right').selectAll('*').remove()
    categoricalLegend.value = []
    return
  }

  const times = points.map((p) => p.bucketStart)
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  const xScale = scaleTime()
    .domain([new Date(tMin), new Date(tMax === tMin ? tMax + 1 : tMax)])
    .range([0, innerWidth.value])
    .nice()
  xScaleRef = xScale

  g.select<SVGGElement>('.x-axis').call(
    axisBottom(xScale).tickFormat((d) => formatBucketLabel(props.granularity, (d as Date).getTime())),
  )

  g.select<SVGGElement>('.grid-x')
    .attr('transform', `translate(0,${innerHeight.value})`)
    .call(axisBottom(xScale).tickSize(-innerHeight.value).tickFormat(() => ''))
  g.selectAll('.grid-x line').attr('stroke', '#e5e7eb').attr('stroke-opacity', 0.25)
  g.select('.grid-x .domain').remove()

  // Build a scale per selected numeric metric
  const scales = new Map<TimelineMetric, ScaleLinear<number, number>>()
  for (const metric of props.selectedMetrics) {
    const values = points
      .map((p) => metricValue(p, metric))
      .filter((v): v is number => v !== null && !Number.isNaN(v))
    scales.set(metric, buildScale(values))
  }

  const leftMetric =
    props.leftAxisMetric && scales.has(props.leftAxisMetric)
      ? props.leftAxisMetric
      : props.selectedMetrics[0]
  const rightMetric =
    props.rightAxisMetric && scales.has(props.rightAxisMetric) && props.rightAxisMetric !== leftMetric
      ? props.rightAxisMetric
      : props.selectedMetrics.find((m) => m !== leftMetric)

  const leftScale = leftMetric ? scales.get(leftMetric) : undefined
  g.select<SVGGElement>('.y-left')
    .selectAll('*')
    .remove()
  if (leftScale) {
    g.select<SVGGElement>('.y-left').call(axisLeft(leftScale))
    g.select<SVGGElement>('.grid-y')
      .call(axisLeft(leftScale).tickSize(-innerWidth.value).tickFormat(() => ''))
    g.selectAll('.grid-y line').attr('stroke', '#e5e7eb').attr('stroke-opacity', 0.25)
    g.select('.grid-y .domain').remove()
  } else {
    g.select('.grid-y').selectAll('*').remove()
  }

  const rightScale = rightMetric ? scales.get(rightMetric) : undefined
  g.select<SVGGElement>('.y-right').selectAll('*').remove()
  if (rightScale) {
    g.select<SVGGElement>('.y-right').call(axisRight(rightScale))
  }

  // Draw numeric metric lines + points
  const linesGroup = g.select('.lines')
  const pointsGroup = g.select('.points')
  linesGroup.selectAll('*').remove()
  pointsGroup.selectAll('*').remove()

  const lineGen = (scale: ScaleLinear<number, number>): Line<[number, number]> =>
    line<[number, number]>()
      .x((d) => xScale(new Date(d[0])))
      .y((d) => scale(d[1]))

  for (const metric of props.selectedMetrics) {
    const scale = scales.get(metric)
    if (!scale) continue
    const color = DEFAULT_TIMELINE_METRIC_CONFIGS[metric].color
    const seriesPoints: [number, number | null][] = points.map((p) => [
      p.bucketStart,
      metricValue(p, metric),
    ])
    const definedPoints = seriesPoints.filter((d): d is [number, number] => d[1] !== null)
    const gen = lineGen(scale)
    linesGroup
      .append('path')
      .datum(definedPoints)
      .attr('d', gen(definedPoints) ?? '')
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('opacity', 0.85)

    seriesPoints.forEach(([t, v]) => {
      if (v === null) return
      pointsGroup
        .append('circle')
        .attr('cx', xScale(new Date(t)))
        .attr('cy', scale(v))
        .attr('r', 3.5)
        .attr('fill', color)
        .style('pointer-events', 'none')
    })
  }

  // Categorical metrics
  const legend: { label: string; color: string }[] = []
  for (const catMetric of props.selectedCategorical) {
    const data: StatsCategoryPoint[] =
      catMetric === 'suitUsage' ? props.series.suitUsage : props.series.baseConfigurationUsage
    if (!data.length) continue

    const categories = [...new Set(data.map((d) => d.category))]
    const colorScale = scaleOrdinal<string, string>().domain(categories).range(schemeCategory10)
    const maxCount = Math.max(1, ...data.map((d) => d.diveCount))
    const countScale = scaleLinear().domain([0, maxCount]).nice().range([innerHeight.value, 0])

    for (const category of categories) {
      const catPoints = data
        .filter((d) => d.category === category)
        .sort((a, b) => a.bucketStart - b.bucketStart)
      const color = colorScale(category)
      legend.push({ label: `${timelineCategoricalDisplayNames[catMetric]}: ${category}`, color })

      const gen = line<StatsCategoryPoint>()
        .x((d) => xScale(new Date(d.bucketStart)))
        .y((d) => countScale(d.diveCount))
      linesGroup
        .append('path')
        .datum(catPoints)
        .attr('d', gen(catPoints) ?? '')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,2')
        .attr('opacity', 0.8)

      catPoints.forEach((p) => {
        pointsGroup
          .append('circle')
          .attr('cx', xScale(new Date(p.bucketStart)))
          .attr('cy', countScale(p.diveCount))
          .attr('r', 3)
          .attr('fill', color)
          .style('pointer-events', 'none')
      })
    }
  }
  categoricalLegend.value = legend

  emitAxisDefaults(leftMetric, rightMetric)
}

function emitAxisDefaults(leftMetric?: TimelineMetric, rightMetric?: TimelineMetric) {
  if (leftMetric && leftMetric !== props.leftAxisMetric) {
    emit('update:leftAxisMetric', leftMetric)
  }
  if (rightMetric && rightMetric !== props.rightAxisMetric) {
    emit('update:rightAxisMetric', rightMetric)
  }
}

function onMouseMove(event: MouseEvent) {
  if (!xScaleRef || !container.value || !sortedPointsRef.length) return
  const rect = container.value.getBoundingClientRect()
  const mx = event.clientX - rect.left - margin.left
  const my = event.clientY - rect.top - margin.top
  if (mx < 0 || mx > innerWidth.value || my < 0 || my > innerHeight.value) {
    onMouseLeave()
    return
  }

  const targetTime = xScaleRef.invert(mx).getTime()
  const bisect = bisector((p: StatsTimeSeriesPoint) => p.bucketStart).center
  const idx = Math.min(sortedPointsRef.length - 1, Math.max(0, bisect(sortedPointsRef, targetTime)))
  const point = sortedPointsRef[idx]
  if (!point) return

  const rows: TooltipRow[] = props.selectedMetrics
    .map((metric) => {
      const value = metricValue(point, metric)
      if (value === null) return null
      return {
        label: timelineMetricDisplayNames[metric],
        value: formatMetricValue(metric, value),
        color: DEFAULT_TIMELINE_METRIC_CONFIGS[metric].color,
      }
    })
    .filter((r): r is TooltipRow => r !== null)

  for (const catMetric of props.selectedCategorical) {
    const data =
      catMetric === 'suitUsage' ? props.series.suitUsage : props.series.baseConfigurationUsage
    const atBucket = data.filter((d) => d.bucketStart === point.bucketStart)
    for (const entry of atBucket) {
      rows.push({
        label: entry.category,
        value: String(entry.diveCount),
        color:
          categoricalLegend.value.find((l) => l.label.endsWith(entry.category))?.color ?? '#999',
      })
    }
  }

  const px = xScaleRef(new Date(point.bucketStart))
  crosshairRef?.attr('x1', px).attr('x2', px).style('display', null)

  tooltip.value = {
    label: formatBucketLabel(props.granularity, point.bucketStart),
    rows,
    clickable: props.granularity === 'PER_DIVE' && point.diveId !== undefined,
  }

  nextTick(() => {
    tooltipLeft.value = Math.min(width.value - 180, event.clientX - rect.left + 12)
    tooltipTop.value = Math.max(0, event.clientY - rect.top - 40)
  })
}

function onMouseLeave() {
  tooltip.value = null
  crosshairRef?.style('display', 'none')
}

function onClick(event: MouseEvent) {
  if (!xScaleRef || !container.value || !sortedPointsRef.length) return
  if (props.granularity !== 'PER_DIVE') return
  const rect = container.value.getBoundingClientRect()
  const mx = event.clientX - rect.left - margin.left
  const targetTime = xScaleRef.invert(mx).getTime()
  const bisect = bisector((p: StatsTimeSeriesPoint) => p.bucketStart).center
  const idx = Math.min(sortedPointsRef.length - 1, Math.max(0, bisect(sortedPointsRef, targetTime)))
  const point = sortedPointsRef[idx]
  if (point?.diveId !== undefined) {
    router.push({ name: 'DiveView', params: { diveId: point.diveId } })
  }
}

onMounted(() => {
  updateSize()
  initSvg()
  renderAll()
  ro = new ResizeObserver(() => {
    updateSize()
    initSvg()
    renderAll()
  })
  if (container.value) ro.observe(container.value)
})

onBeforeUnmount(() => {
  if (ro && container.value) ro.unobserve(container.value)
})

watch(
  () => [props.series, props.granularity, props.selectedMetrics, props.selectedCategorical],
  () => renderAll(),
  { deep: true },
)
</script>
