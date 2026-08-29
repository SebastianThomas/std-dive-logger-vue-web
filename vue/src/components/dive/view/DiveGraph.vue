<template>
  <div ref="container" class="w-full h-full relative">
    <button
      v-if="isZoomed"
      class="absolute bottom-2 right-2 z-10 px-2 py-1 text-xs bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow"
      @click="resetZoom"
    >
      Reset Zoom
    </button>

    <DiveGraphTooltip
      ref="tooltipRef"
      :data="tooltip"
      :time="tooltipTime"
      :left="tooltipLeft"
      :top="tooltipTop"
      :selected-profiles="props.selectedProfiles"
      :hovered-metric="hoveredMetric"
    />
    <div
      v-if="showZoomHint"
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/75 text-white px-4 py-2 rounded-lg text-sm font-medium pointer-events-none z-20"
    >
      Ctrl+Scroll • 2-finger pinch to zoom
    </div>

    <!-- Trim mode: drag the two handles on the chart, then confirm or cancel. -->
    <div
      v-if="trimRange"
      class="absolute top-2 left-2 z-20 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 text-xs w-56 border border-gray-300 dark:border-gray-600"
    >
      <div class="font-semibold mb-2 flex items-center gap-1.5 flex-wrap">
        <span>Trimming profile {{ trimProfileIndex + 1 }}</span>
        <span v-if="props.profiles.length > 1" class="flex items-center gap-1 ml-auto">
          <button
            v-for="(p, idx) in props.profiles"
            :key="p.id"
            type="button"
            :disabled="!visibleMask[idx]"
            :title="`Trim profile ${idx + 1}`"
            @click="$emit('trimProfileChanged', p.id)"
            :class="[
              'w-5 h-5 rounded text-[10px] font-normal leading-none flex items-center justify-center border transition-colors',
              !visibleMask[idx]
                ? 'opacity-40 cursor-not-allowed border-gray-300 dark:border-gray-600'
                : idx === trimProfileIndex
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600',
            ]"
          >
            {{ idx + 1 }}
          </button>
        </span>
      </div>
      <template v-if="trimStats">
        <div class="flex justify-between">
          <span class="opacity-70">Max depth</span>
          <span>{{ trimStats.maxDepth.toFixed(1) }} m</span>
        </div>
        <div class="flex justify-between">
          <span class="opacity-70">Avg depth</span>
          <span>{{ trimStats.averageDepth.toFixed(1) }} m</span>
        </div>
        <div class="flex justify-between">
          <span class="opacity-70">Bottom time</span>
          <span>{{ Math.round(trimStats.bottomTimeSeconds / 60) }} min</span>
        </div>
        <div class="flex justify-between">
          <span class="opacity-70">Points kept</span>
          <span>{{ trimStats.measurementCount }} / {{ trimProfileTotalCount }}</span>
        </div>
      </template>
      <p v-else class="text-red-600 dark:text-red-400 my-1">
        This range has no data - drag the handles apart.
      </p>
      <div class="flex justify-end gap-2 mt-3">
        <button
          type="button"
          class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="cancelTrim"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="!trimStats || trimBusy"
          :aria-busy="trimBusy || undefined"
          class="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          @click="confirmTrim"
        >
          <LoadingSpinner v-if="trimBusy" size="xs" />
          {{ trimBusy ? 'Trimming…' : 'Trim' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
div {
  touch-action: manipulation;
  overscroll-behavior-x: contain;
}
</style>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick, toRef } from 'vue'
import {
  select,
  line,
  area,
  curveStepAfter,
  scaleLinear,
  axisLeft,
  axisRight,
  axisBottom,
  bisector,
  zoom,
  zoomIdentity,
  drag,
  type Selection,
  type ScaleLinear,
  type Line,
  type Area,
  type ZoomBehavior,
  type ZoomTransform,
  type CurveFactory,
} from 'd3'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import DiveGraphTooltip, {
  type TooltipData,
  type TooltipProfileData,
} from '@/components/dive/view/DiveGraphTooltip.vue'
import type { DiveProfile, DiveMeasurementWithId, DiveProfileSegmentWithId } from '@/lib/types/dive'
import { useApi } from '@/composables/useApi'
import { useDiveGraphMetrics } from '@/composables/useDiveGraphMetrics'
import { formatISoDurationToMinutes, formatElapsedTime } from '@/lib/utils/timeUtils'
import { generateId } from '@/lib/utils/cryptoUtils'
import type { AxisUnitGroup, MetricType, ProfileMetricVisibility } from '@/lib/types/graph'
import { DEFAULT_METRIC_CONFIGS } from '@/lib/types/graph'
import { toKebabCase } from '@/lib/utils/stringUtils'
import { getSegmentColor, findSegmentTypeAtIndex } from '@/lib/utils/diveSegmentUtils'
import {
  generateTimeAxisTicks,
  formatAxisGroupTick,
  generateTemperatureTicks,
  generatePo2AxisTicks,
  calculateTemperatureExtent,
  getScaleForAxisGroup,
} from '@/lib/utils/graphUtils'
import {
  createMetricConfigs,
  EXTRACTORS,
  METRICS_TO_RENDER,
  type MetricConfigMap,
} from '@/lib/graph/metricExtractors'
import {
  detectTimeGaps,
  buildVirtualTimeMapper,
  getActiveSegments,
  type TimeMapper,
} from '@/lib/graph/timeGaps'
import { detectModeTransitions, hasBothModes } from '@/lib/graph/modeTransitions'
import { extendPo2CalculatedToBoundary } from '@/lib/graph/po2CalculatedExtension'
import { synthesizePo2Calculated } from '@/lib/graph/po2Synthesis'
import { interpolateAt, stepAfterValueAt, valueAtForMetric } from '@/lib/graph/valueInterpolation'
import { LruCache } from '@/lib/utils/lruCache'
import { detectTrimSuggestion } from '@/lib/graph/trimSuggestion'
import { computeRangeStats } from '@/lib/graph/rangeStats'
import { nearestSampleTime } from '@/lib/graph/snapToSample'
import { splitByTimeGap, medianSampleIntervalMs } from '@/lib/graph/lineSegments'

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
  showDecoZone?: boolean
  // Per-profile metric overrides for every profile except the first (see ProfileMetricVisibility)
  // - the first profile's visibility comes from the show* props above, unchanged from before this
  // existed. Absent/undefined means no secondary profile has any extra metric turned on, which is
  // the default for every dive until the user opts one in.
  extraProfileMetrics?: ProfileMetricVisibility
  leftAxisMetric?: AxisUnitGroup
  rightAxisMetric?: AxisUnitGroup
  hasTemp?: boolean
  hasNdl?: boolean
  hasOtu?: boolean
  hasCns?: boolean
  hasGf?: boolean
  hasPo2Measured?: boolean
  hasPo2Calculated?: boolean
  hasPo2Setpoint?: boolean
  hasRmv?: boolean
  hasGasO2?: boolean
  hasGasN2?: boolean
  hasGasHe?: boolean
  hasDeco?: boolean
  selectedProfiles?: number[]
  /** Time (ms) hovered on another synced chart (e.g. the ascent-rate panel) — draws this
   * chart's crosshair/tooltip at that time too, matched by position rather than local input. */
  externalHoverTimeMs?: number | null
  /** Id of the profile currently being trimmed, if any — draws the drag handles/shaded cut
   * regions and the live-stats panel for that profile. Null/undefined when not trimming. */
  trimProfileId?: number | null
  /** The trim request is in flight — disables the Trim button and shows a spinner. */
  trimBusy?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:leftAxisMetric': [value: AxisUnitGroup]
  'update:rightAxisMetric': [value: AxisUnitGroup]
  /** Fired on local hover so a sibling chart can sync its own crosshair to this time. */
  hoverTimeChange: [value: number | null]
  /** The user confirmed a trim - parent is responsible for calling the API and clearing
   * trimProfileId once it resolves. */
  trimConfirmed: [{ profileId: number; start: number; end: number }]
  /** The user cancelled - parent should clear trimProfileId. */
  trimCancelled: []
  /** The user picked a different profile to trim from within the trim panel itself - parent
   * should update trimProfileId to this one instead of requiring Cancel + re-opening trim mode. */
  trimProfileChanged: [profileId: number]
}>()

// Visibility mask with safe defaults (all visible)
const visibleMask = computed<boolean[]>(() => {
  const n = props.profiles.length
  if (!props.visibleProfiles || props.visibleProfiles.length !== n) {
    return Array.from({ length: n }, () => true)
  }
  return props.visibleProfiles
})

const profilesRef = toRef(props, 'profiles')
const { getProfileMetricAvailability, getCombinedMetricAvailability } =
  useDiveGraphMetrics(profilesRef)

const container = ref<HTMLElement | null>(null)
const tooltipRef = ref<InstanceType<typeof DiveGraphTooltip> | null>(null)
const width = ref(600)
const height = ref(300)
// Right margin needs to fit the widest axis-group tick label ("1.80 bar"-style PO2 values,
// ~46px at default axis font size) without clipping against the SVG's edge.
const margin = { top: 10, right: 50, bottom: 24, left: 40 }
const innerWidth = computed(() => Math.max(10, width.value - margin.left - margin.right))
const innerHeight = computed(() => Math.max(10, height.value - margin.top - margin.bottom))

const tooltip = ref<TooltipData | null>(null)
const tooltipTime = ref(0)
const tooltipLeft = ref(0)
const tooltipTop = ref(0)
// Which line the cursor is currently closest to (by pixel distance at the hovered time), so the
// red focus indicator and tooltip row can follow whichever metric the user is actually pointing
// at instead of always the depth line. Only set from real local pointer input — an externally
// synced hover (no actual cursor position) has no Y to test against, so it stays on depth.
const hoveredMetric = ref<MetricType | null>(null)
const selectedProfile = computed(() => props.selectedProfiles?.[0] ?? 0)
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
// CNS and OTU share one scale (see AXIS_UNIT_GROUPS.o2Exposure) so the two lines and the axis
// they're plotted against always agree.
const o2ExposureScale = ref<ScaleLinear<number, number> | null>(null)
const gfScale = ref<ScaleLinear<number, number> | null>(null)
const po2Scale = ref<ScaleLinear<number, number> | null>(null)
// The common 1.6 bar PO2 guideline. Shown directly on the axis (as a highlighted tick) whenever
// PO2 is the selected axis unit, rather than as a floating label independent of axis selection.
const PO2_SAFE_LIMIT_BAR = 1.6
// Whether any PO2 sample actually exceeds the guideline — drives the warning band in
// renderPo2OverageBand(), so it only appears for genuine edge cases.
const po2ExceedsSafeLimit = ref(false)
const rmvScale = ref<ScaleLinear<number, number> | null>(null)
// Gas fractions are physically bounded to [0, 100]; the scale is pinned there rather than
// scaled to data (see setupScales()).
const gasFractionScale = ref<ScaleLinear<number, number> | null>(null)
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
// Capped: this component instance persists across dive-to-dive navigation within a session
// (DiveView reuses it rather than remounting on diveId change), so an uncapped cache here would
// retain every dive's segments ever viewed for the tab's whole lifetime.
const segmentsCache = new LruCache<number, DiveProfileSegmentWithId[]>(8)
const decoZoneLayer = ref<Selection<SVGGElement, unknown, null, undefined> | null>(null)
const decoZoneArea = ref<Area<[number, number]> | null>(null)
const po2ReferenceLayer = ref<Selection<SVGGElement, unknown, null, undefined> | null>(null)
// Maps real measurement time to a "virtual" time with any large gaps between/within profiles
// compressed to a small fixed width (see lib/graph/timeGaps.ts) - identity when there are none,
// which is the overwhelming majority of dives.
const timeMapper = ref<TimeMapper>({ toVirtual: (t) => t, toReal: (v) => v, breakPositions: [] })
// Recomputed only in setupScales() (not on every zoom/pan tick, which calls renderAll() far more
// often) - axis-tick generation below reuses this rather than re-running gap detection itself.
const timeGaps = ref<ReturnType<typeof detectTimeGaps>>([])
const dataTimeRange = ref<[number, number]>([0, 0])
const gapBreaksLayer = ref<Selection<SVGGElement, unknown, null, undefined> | null>(null)
const modeTransitionsLayer = ref<Selection<SVGGElement, unknown, null, undefined> | null>(null)
const zoomBehavior = ref<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
const isZoomed = ref(false)
const currentZoomLevel = ref(1)
const { getWithToken } = useApi()

// Trim mode - null while not trimming. Real (not virtual) times, always start <= end.
const trimRange = ref<{ start: number; end: number } | null>(null)
const trimOverlayLayer = ref<Selection<SVGGElement, unknown, null, undefined> | null>(null)

const trimProfileIndex = computed(() =>
  props.trimProfileId != null ? props.profiles.findIndex((p) => p.id === props.trimProfileId) : -1,
)
const trimProfile = computed<DiveProfile | null>(() => {
  const idx = trimProfileIndex.value
  return idx >= 0 ? (props.profiles[idx] ?? null) : null
})
const trimProfileTotalCount = computed(() => trimProfile.value?.measurements.length ?? 0)
const trimStats = computed(() =>
  trimProfile.value && trimRange.value
    ? computeRangeStats(trimProfile.value, trimRange.value.start, trimRange.value.end)
    : null,
)

// Enter/exit trim mode when the parent sets/clears trimProfileId - pre-fills the handles from
// the auto-detected suggestion (a trailing/leading near-surface stretch) when there is one,
// otherwise starts at the profile's own full range (i.e. nothing pre-selected to cut).
watch(
  () => props.trimProfileId,
  (id) => {
    if (id == null || !trimProfile.value) {
      trimRange.value = null
      renderTrimOverlay()
      return
    }
    const profile = trimProfile.value
    const suggestion = detectTrimSuggestion(profile)
    trimRange.value = {
      start: suggestion.suggestedStart ?? profile.start,
      end: suggestion.suggestedEnd ?? profile.end,
    }
    renderTrimOverlay()
  },
)

function cancelTrim() {
  emit('trimCancelled')
}

function confirmTrim() {
  if (!trimRange.value || props.trimProfileId == null || props.trimBusy) return
  emit('trimConfirmed', {
    profileId: props.trimProfileId,
    start: trimRange.value.start,
    end: trimRange.value.end,
  })
}

const leftAxisMetric = computed({
  get: () => props.leftAxisMetric ?? 'depth',
  set: (value: AxisUnitGroup) => emit('update:leftAxisMetric', value),
})

const rightAxisMetric = computed({
  get: () => props.rightAxisMetric ?? 'temp',
  set: (value: AxisUnitGroup) => emit('update:rightAxisMetric', value),
})

let ro: ResizeObserver | null = null

function updateSize() {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  // Floor is just a guard against a degenerate 0-width SVG, not a design minimum — forcing the
  // SVG wider than its actual container (as a higher floor like 300 would on narrow phones)
  // causes the whole page to overflow horizontally.
  width.value = Math.max(200, Math.floor(rect.width))
  height.value = Math.max(150, Math.floor(rect.height))
}

function setupScales() {
  // Collect all measurements from all profiles
  const allMeasurements = props.profiles.flatMap((p) => p.measurements)
  if (!allMeasurements.length) return

  // Guard against a single bad sample (e.g. a NaN/undefined time or depth from a malformed
  // source file) taking down the whole chart - Math.min/max propagate NaN from just one bad
  // input, which would otherwise break these domains (and therefore every series) entirely.
  const isFiniteNumber = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v)
  const tValues = allMeasurements.map((m) => m.measurement.time).filter(isFiniteNumber)
  const dValues = allMeasurements.map((m) => m.measurement.depth).filter(isFiniteNumber)
  if (!tValues.length || !dValues.length) return

  const tmin = Math.min(...tValues)
  const tmax = Math.max(...tValues)
  const dmin = Math.min(...dValues)
  const dmax = Math.max(...dValues)

  timeGaps.value = detectTimeGaps(props.profiles)
  timeMapper.value = buildVirtualTimeMapper(timeGaps.value, tValues)
  dataTimeRange.value = [tmin, tmax]
  const { toVirtual } = timeMapper.value
  timeScaleBase.value = scaleLinear().domain([toVirtual(tmin), toVirtual(tmax)]).range([0, innerWidth.value])
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

  const tempExtent = calculateTemperatureExtent(temperatureValues)

  const otuValues = allMeasurements
    .map((m) => m.measurement.o2Tox)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  const cnsValues = allMeasurements
    .map((m) => m.measurement.cns)
    .filter((v): v is number => v !== undefined && v !== null && !Number.isNaN(v))
  // Shared scale for both: legitimately exceeds 100 on an aggressive O2-exposure profile, so
  // the domain tracks the real max across both series rather than being capped at 100.
  const o2ExposureMax = Math.max(100, otuValues.length ? Math.max(...otuValues) : 0, cnsValues.length ? Math.max(...cnsValues) : 0)

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
  // Only true when real data crosses the guideline — gates the warning band in
  // renderPo2Reference() so it doesn't fire on the default 1.6 floor alone.
  po2ExceedsSafeLimit.value = po2Max > 1.6

  depthLine.value = line()
    .x((d: [number, number]) => (timeScale.value ? timeScale.value(toVirtual(d[0])) : 0))
    .y((d: [number, number]) => (depthScale.value ? depthScale.value(d[1]) : 0))

  decoZoneArea.value = area<[number, number]>()
    .x((d) => (timeScale.value ? timeScale.value(toVirtual(d[0])) : 0))
    .y0(() => (depthScale.value ? depthScale.value(0) : 0))
    .y1((d) => (depthScale.value ? depthScale.value(d[1]) : 0))
    .curve(curveStepAfter)

  // A plain line() defaults to linear interpolation, which implies a gradual change between two
  // samples. That's correct for continuously-sampled metrics (temperature, NDL, ...), but wrong
  // for a held/discrete value like the calculated PO2 during CC mode: a Shearwater-style computer
  // only logs a new sample when the setpoint loop changes it, so the real value stayed flat at
  // the old sample until the moment it stepped to the new one - curveStepAfter draws that
  // correctly instead of implying a ramp that never happened.
  const makeMetricLine = (
    scale: ScaleLinear<number, number> | null,
    curve?: CurveFactory,
  ): Line<[number, number]> => {
    const generator = line()
      .x((d: [number, number]) => (timeScale.value ? timeScale.value(toVirtual(d[0])) : 0))
      .y((d: [number, number]) => (scale ? scale(d[1]) : 0))
    if (curve) generator.curve(curve)
    return generator
  }

  tempScale.value = scaleLinear().domain(tempExtent).range([innerHeight.value, 0])
  ndlScale.value = scaleLinear().domain([0, 100]).range([innerHeight.value, 0])
  o2ExposureScale.value = scaleLinear()
    .domain([0, o2ExposureMax * 1.05])
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
  // Gas fractions can't physically exceed 100% — pinned rather than data-driven so one bad
  // sample can't stretch the whole axis.
  gasFractionScale.value = scaleLinear().domain([0, 100]).range([innerHeight.value, 0])

  tempLine.value = makeMetricLine(tempScale.value)
  ndlLine.value = makeMetricLine(ndlScale.value)
  otuLine.value = makeMetricLine(o2ExposureScale.value)
  cnsLine.value = makeMetricLine(o2ExposureScale.value)
  gfLine.value = makeMetricLine(gfScale.value)
  po2MeasuredLine.value = makeMetricLine(po2Scale.value)
  po2CalculatedLine.value = makeMetricLine(po2Scale.value, curveStepAfter)
  po2SetpointLine.value = makeMetricLine(po2Scale.value)
  rmvLine.value = makeMetricLine(rmvScale.value)
  gasO2Line.value = makeMetricLine(gasFractionScale.value)
  gasN2Line.value = makeMetricLine(gasFractionScale.value)
  gasHeLine.value = makeMetricLine(gasFractionScale.value)
}

let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  updateSize()
  initSvg()
  setupScales()
  renderAll()
  await maybeFetchSegments()
  renderSegments()
  ro = new ResizeObserver(() => {
    // ResizeObserver can fire many times in quick succession (a dragged window edge, mobile
    // orientation change, elastic overscroll) - each tick here is a full SVG rebuild plus a
    // rescan of every measurement for scale domains, so coalescing bursts into one trailing call
    // avoids doing that work several times over for a single visual resize.
    if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer)
    resizeDebounceTimer = setTimeout(() => {
      resizeDebounceTimer = null
      updateSize()
      initSvg()
      setupScales()
      renderAll()
      renderSegments()
    }, 100)
  })
  if (container.value) ro.observe(container.value)
})

onBeforeUnmount(() => {
  if (ro && container.value) ro.unobserve(container.value)
  if (zoomHintTimer) clearTimeout(zoomHintTimer)
  if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)
})

const redraw = async () => {
  setupScales()
  renderAll()
  await maybeFetchSegments()
  renderSegments()
}

// props.profiles is always replaced wholesale on update (DiveView reassigns the whole `dive`
// object rather than mutating profiles/measurements in place), so this only needs a reference
// check - deep-watching it was forcing Vue to recursively proxy and diff every measurement of
// every profile (thousands of nested objects on a real dive) on every single reactive check,
// which is what made the view laggy.
watch(() => props.profiles, redraw)

// visibleProfiles IS mutated in place (toggling a single index) rather than reassigned, so it -
// along with the cheap primitive toggles/axis metrics - still needs deep tracking to notice.
//
// None of these ever change a scale's domain (see the "Independent domains per metric" comment
// in setupScales()) - only which already-computed lines/axes are visible - so re-running
// setupScales() here would just repeat the same full rescan of every measurement for no visual
// difference. Re-rendering with the existing scales is sufficient and far cheaper.
watch(
  () => [
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
    props.showDecoZone,
    props.extraProfileMetrics,
    leftAxisMetric.value,
    rightAxisMetric.value,
  ],
  async () => {
    renderAll()
    await maybeFetchSegments()
    renderSegments()
  },
  { deep: true },
)

// Mirrors a hover happening on a sibling chart (e.g. the ascent-rate panel) by showing this
// chart's own crosshair/tooltip at the same time — but only while this chart isn't itself the
// active hover source, so the two don't fight over the display.
watch(
  () => props.externalHoverTimeMs,
  (t) => {
    if (isLocalHover) return
    if (t === null || t === undefined) {
      focusCircle.value?.style('display', 'none')
      crosshairLine.value?.style('display', 'none')
      tooltip.value = null
      return
    }
    renderTooltipAtTime(t, null)
  },
)

function initSvg() {
  if (!container.value) return
  select(container.value).selectAll('svg').remove()
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

  // Layers: segments above background, deco keep-out zone above segments, lines over both
  const clipPathUrl = `url(#${clipPathId})`
  segmentsLayer.value = g.append('g').attr('class', 'segments').attr('clip-path', clipPathUrl)
  decoZoneLayer.value = g.append('g').attr('class', 'deco-zone').attr('clip-path', clipPathUrl)

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

  // PO2 1.6 bar reference: drawn above the metric lines so the guideline stays legible
  // regardless of how much data is plotted underneath it.
  po2ReferenceLayer.value = g.append('g').attr('class', 'po2-reference').attr('clip-path', clipPathUrl)

  // Break markers for any compressed time gaps - above the lines, same as the PO2 guideline.
  gapBreaksLayer.value = g.append('g').attr('class', 'gap-breaks').attr('clip-path', clipPathUrl)

  // OC/CC (bailout/closed-circuit) mode-change markers - only ever populated for a dive that
  // genuinely contains both, see renderModeTransitions().
  modeTransitionsLayer.value = g
    .append('g')
    .attr('class', 'mode-transitions')
    .attr('clip-path', clipPathUrl)

  // Trim-mode shaded cut regions + drag handles - above everything else so the handles are
  // always grabbable regardless of what's drawn underneath.
  trimOverlayLayer.value = g.append('g').attr('class', 'trim-overlay').attr('clip-path', clipPathUrl)

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
    .on('touchmove', onMouseMoveD3)
    .on('mouseleave', onMouseLeave)
    .on('touchend', onMouseLeave)

  // Zoom & pan on the SVG (X-axis only, requires Ctrl on desktop, or 2-finger pinch on touch)
  let touchDistance = 0
  let lastZoomLevel = 1

  const z = zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 20])
    .translateExtent([
      [0, 0],
      [width.value, height.value],
    ])
    .filter((event): boolean => {
      // Allow wheel zoom only with Ctrl key pressed
      if (event.type === 'wheel') {
        if (!event.ctrlKey) {
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
        return true
      }
      // Allow touch zoom (will be handled by touchstart/touchmove)
      if (event.type.startsWith('touch')) {
        return true
      }
      // Block double-click zoom and allow regular pan
      return !event.button && event.type !== 'dblclick'
    })
    .on('zoom', (event): void => {
      if (!timeScaleBase.value || !depthScaleBase.value) return
      const t: ZoomTransform = event.transform
      // Track if zoomed in (scale > 1 indicates zoom)
      isZoomed.value = t.k > 1
      currentZoomLevel.value = t.k
      // Only rescale X (time), keep Y (depth) unchanged
      timeScale.value = t.rescaleX(timeScaleBase.value)
      depthScale.value = depthScaleBase.value.copy()

      // Constrain the view to not extend beyond the data bounds
      const domain = timeScale.value.domain() as [number, number]
      const allMeasurements = props.profiles.flatMap((p) => p.measurements)
      const zoomTimes = allMeasurements
        .map((m) => m.measurement.time)
        .filter((v): v is number => Number.isFinite(v))
      if (zoomTimes.length > 0) {
        const tmin = timeMapper.value.toVirtual(Math.min(...zoomTimes))
        const tmax = timeMapper.value.toVirtual(Math.max(...zoomTimes))
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

  // Add touch event handlers for two-finger pinch zoom
  if (svgSel.value) {
    svgSel.value.on('touchstart', (event: TouchEvent) => {
      if (event.touches.length === 2) {
        // Calculate initial distance between two fingers
        const touch1 = event.touches[0]!
        const touch2 = event.touches[1]!
        const dx = touch2.clientX - touch1.clientX
        const dy = touch2.clientY - touch1.clientY
        touchDistance = Math.sqrt(dx * dx + dy * dy)
        lastZoomLevel = currentZoomLevel.value
      }
    })

    svgSel.value.on('touchmove', (event: TouchEvent) => {
      if (event.touches.length === 2 && zoomBehavior.value) {
        // Calculate current distance between two fingers
        const touch1 = event.touches[0]!
        const touch2 = event.touches[1]!
        const dx = touch2.clientX - touch1.clientX
        const dy = touch2.clientY - touch1.clientY
        const currentDistance = Math.sqrt(dx * dx + dy * dy)

        // Calculate zoom scale based on finger distance change
        if (touchDistance > 0) {
          const scale = currentDistance / touchDistance
          const newZoomLevel = Math.max(1, Math.min(20, lastZoomLevel * scale))

          // Get center point between two fingers for zoom origin
          const centerX = (touch1.clientX + touch2.clientX) / 2
          // const centerY = (touch1.clientY + touch2.clientY) / 2

          // Apply zoom transformation
          const rect = container.value?.getBoundingClientRect()
          if (rect && svgSel.value) {
            const x = centerX - rect.left - margin.left
            // const y = centerY - rect.top - margin.top

            svgSel.value.call(
              zoomBehavior.value.transform,
              zoomIdentity.translate(x, 0).scale(newZoomLevel).translate(-x, 0),
            )
            lastZoomLevel = newZoomLevel
          }
        }
      }
    })
  }

  svgSel.value.call(z)
  // Store zoom behavior for reset
  zoomBehavior.value = z
}

function renderAll() {
  if (!gSel.value || !timeScale.value || !depthScale.value || !depthLine.value) return

  // Axes

  // Generate smart time axis ticks with 4-10 labels based on graph width and duration. When the
  // dive has a compressed gap, ticks are generated per active (real-time) segment rather than
  // once over the whole virtual range - a single pass would otherwise treat the gap as if it
  // were real elapsed time and produce non-round, meaningless intervals.
  const timeRange = timeScale.value.domain() as [number, number]
  // The earliest start across every profile, not just profiles[0] - matches the tooltip's own
  // graphStartTime below. Profiles aren't guaranteed to be ordered by start time (e.g. a second
  // computer attached to an already-created dive can sort after the first despite starting
  // earlier), so anchoring to profiles[0] specifically could show axis tick labels offset from
  // what the tooltip displays for the exact same point in time.
  const diveStart = props.profiles.length
    ? Math.min(...props.profiles.map((p) => p.start))
    : 0
  const { toVirtual, toReal } = timeMapper.value
  const tickValues = !timeGaps.value.length
    ? generateTimeAxisTicks(timeRange, diveStart, innerWidth.value)
    : getActiveSegments(timeGaps.value, dataTimeRange.value[0], dataTimeRange.value[1]).flatMap(
        (segment) => {
          const segStart = Math.max(segment.start, toReal(timeRange[0]))
          const segEnd = Math.min(segment.end, toReal(timeRange[1]))
          if (segEnd <= segStart || !timeScale.value) return []
          const pixelWidth = timeScale.value(toVirtual(segEnd)) - timeScale.value(toVirtual(segStart))
          if (pixelWidth <= 0) return []
          return generateTimeAxisTicks([segStart, segEnd], diveStart, pixelWidth)
        },
      )

  axes.x.value?.call(
    axisBottom(timeScale.value)
      .tickValues(tickValues.map(toVirtual))
      .tickFormat((t): string => formatElapsedTime(toReal(Number(t)), diveStart)),
  )
  const scales = {
    depth: depthScale.value,
    temp: tempScale.value,
    ndl: ndlScale.value,
    gf: gfScale.value,
    o2Exposure: o2ExposureScale.value,
    po2: po2Scale.value,
    rmv: rmvScale.value,
    gasFraction: gasFractionScale.value,
  }
  const leftScale = getScaleForAxisGroup(leftAxisMetric.value, scales)
  const rightScale = getScaleForAxisGroup(rightAxisMetric.value, scales)
  if (leftScale) {
    const leftAxis = axisLeft(leftScale).tickFormat((d): string =>
      formatAxisGroupTick(leftAxisMetric.value, Number(d)),
    )
    // Temperature uses dynamic tick steps to keep label count reasonable
    if (leftAxisMetric.value === 'temp') {
      const domain = leftScale.domain() as [number, number]
      leftAxis.tickValues(generateTemperatureTicks(domain))
    } else if (leftAxisMetric.value === 'po2') {
      // Always include the 1.6 bar guideline exactly, so it's legible directly on the axis.
      const domain = leftScale.domain() as [number, number]
      leftAxis.tickValues(generatePo2AxisTicks(domain, PO2_SAFE_LIMIT_BAR))
    }
    axes.yDepth.value?.call(leftAxis)
    if (leftAxisMetric.value === 'po2') highlightPo2AxisTick(axes.yDepth.value)
  }
  if (rightScale) {
    const rightAxis = axisRight(rightScale).tickFormat((d): string =>
      formatAxisGroupTick(rightAxisMetric.value, Number(d)),
    )
    // Temperature uses dynamic tick steps to keep label count reasonable
    if (rightAxisMetric.value === 'temp') {
      const domain = rightScale.domain() as [number, number]
      rightAxis.tickValues(generateTemperatureTicks(domain))
    } else if (rightAxisMetric.value === 'po2') {
      const domain = rightScale.domain() as [number, number]
      rightAxis.tickValues(generatePo2AxisTicks(domain, PO2_SAFE_LIMIT_BAR))
    }
    axes.yAux.value?.call(rightAxis)
    if (rightAxisMetric.value === 'po2') highlightPo2AxisTick(axes.yAux.value)
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
    const depthPts: [number, number][] = profile.measurements
      .map((m): [number, number] => [m.measurement.time, m.measurement.depth])
      .filter(([t, d]) => Number.isFinite(t) && Number.isFinite(d))
    depthLinesGroup
      .append('path')
      .datum(depthPts)
      .attr('d', depthLine.value?.(depthPts) ?? '')
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
  })

  // Metric configuration: maps metric type to its data extractor and line generator
  const metricConfigs = buildMetricConfigs()

  // Helper to draw multiple lines (one per profile) for a metric
  const drawMetricLines = (metric: Exclude<MetricType, 'depth'>): void => {
    const config = metricConfigs[metric]
    const className = `.lines-${toKebabCase(metric)}`
    const group = gSel.value?.select(className)
    if (!group) return
    group.selectAll('path').remove()
    if (!config.lineRef.value) return

    const color = DEFAULT_METRIC_CONFIGS[metric].color
    const width = config.width ?? 1.5

    const appendPath = (points: [number, number][]): void => {
      if (points.length < 2) return
      group
        .append('path')
        .datum(points)
        .attr('d', config.lineRef.value?.(points) ?? '')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', width)
        .attr('opacity', 0.7)
    }

    props.profiles.forEach((profile, idx) => {
      if (!visibleMask.value[idx]) return
      // Profile 0's visibility is the metric's global show* toggle, unchanged from before
      // per-profile overrides existed. Every other profile defaults to off - opting one in is
      // what extraProfileMetrics is for - so a dive with only one profile never differs from the
      // old behavior.
      const visible = idx === 0 ? config.showProp : (props.extraProfileMetrics?.[idx]?.[metric] ?? false)
      if (!visible) return
      const points = metricPointsCache.value[idx]?.[metric] ?? []
      if (!points.length) return

      // NDL is excluded entirely while in mandatory deco (see EXTRACTORS.ndl), which can leave a
      // real multi-minute gap between the last pre-deco point and the first post-deco one - drawn
      // as one continuous line, that reads as a smooth ramp from ~0 to a large resumed value that
      // never actually happened. Splitting wherever the gap is unusually large (vs. this profile's
      // own typical sampling interval) draws it as two separate segments instead, matching what
      // was actually recorded.
      if (metric === 'ndl') {
        const times = profile.measurements.map((m) => m.measurement.time)
        const maxGapMs = Math.max(60_000, 3 * medianSampleIntervalMs(times))
        splitByTimeGap(points, maxGapMs).forEach(appendPath)
        return
      }

      appendPath(points)
    })
  }

  // Draw all metric lines
  METRICS_TO_RENDER.forEach(drawMetricLines)

  renderDecoZone()
  renderPo2OverageBand()
  renderGapBreaks()
  renderModeTransitions()
  renderTrimOverlay()
}

// A dashed vertical line at each compressed gap, spanning the full plot height, marking a jump
// in time that isn't drawn to scale (see lib/graph/timeGaps.ts). No-op (clears any stale ones)
// when the dive has no large gaps, which is the overwhelming majority of dives.
function renderGapBreaks() {
  if (!gapBreaksLayer.value) return
  gapBreaksLayer.value.selectAll('*').remove()
  if (!timeScale.value) return

  gapBreaksLayer.value
    .selectAll('line')
    .data(timeMapper.value.breakPositions)
    .enter()
    .append('line')
    .attr('x1', (v) => timeScale.value!(v))
    .attr('x2', (v) => timeScale.value!(v))
    .attr('y1', 0)
    .attr('y2', innerHeight.value)
    .attr('stroke', '#9ca3af')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3,3')
    .style('pointer-events', 'none')
}

// A dashed tick + short label ("BO"/"CC") at every point a rebreather diver's mode actually
// changed - bail-out to open circuit, or back onto the closed loop. No-op (clears any stale ones)
// unless the dive genuinely contains both modes somewhere across its visible profiles; a pure-OC
// or pure-CC dive (almost every dive) never renders anything here. Deliberately not a background
// band: it needs to coexist with the segments/deco-zone backgrounds without competing for the
// same visual channel, so it's drawn as discrete markers instead.
function renderModeTransitions() {
  if (!modeTransitionsLayer.value) return
  modeTransitionsLayer.value.selectAll('*').remove()
  if (!timeScale.value) return

  const visibleProfiles = props.profiles.filter((_, idx) => visibleMask.value[idx])
  if (!hasBothModes(visibleProfiles)) return

  const transitions = visibleProfiles.flatMap((profile) => detectModeTransitions(profile))
  if (!transitions.length) return

  const groups = modeTransitionsLayer.value
    .selectAll('g')
    .data(transitions)
    .enter()
    .append('g')
    .attr(
      'transform',
      (t) => `translate(${timeScale.value!(timeMapper.value.toVirtual(t.time))}, 0)`,
    )
    .style('pointer-events', 'none')

  groups
    .append('line')
    .attr('y1', 0)
    .attr('y2', innerHeight.value)
    .attr('stroke', (t) => (t.mode === 'OC' ? '#f97316' : '#0ea5e9'))
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '2,3')

  groups
    .append('text')
    .attr('y', 12)
    .attr('x', 3)
    .attr('font-size', 10)
    .attr('font-weight', 600)
    .attr('fill', (t) => (t.mode === 'OC' ? '#f97316' : '#0ea5e9'))
    .text((t) => (t.mode === 'OC' ? 'BO' : 'CC'))
}

// Shaded regions for whatever's currently outside the trim selection, plus two draggable handles
// at its start/end. No-op (clears any stale ones) when not in trim mode. Only ever tears down and
// rebuilds the DOM - call updateTrimOverlayPositions() instead for a per-tick reposition (see its
// own doc comment for why the distinction matters).
function renderTrimOverlay() {
  if (!trimOverlayLayer.value) return
  trimOverlayLayer.value.selectAll('*').remove()
  const profile = trimProfile.value
  const range = trimRange.value
  if (!profile || !range || !timeScale.value) return

  const h = innerHeight.value

  trimOverlayLayer.value
    .append('rect')
    .attr('class', 'trim-shade-lead')
    .attr('y', 0)
    .attr('height', h)
    .attr('fill', '#000')
    .attr('fill-opacity', 0.35)
    .style('pointer-events', 'none')
  trimOverlayLayer.value
    .append('rect')
    .attr('class', 'trim-shade-tail')
    .attr('y', 0)
    .attr('height', h)
    .attr('fill', '#000')
    .attr('fill-opacity', 0.35)
    .style('pointer-events', 'none')

  // A visible thin line plus a wider, invisible grab area (easier to hit than the line itself,
  // especially on touch) - both move together since they're in the same handle group.
  const makeHandle = (key: 'start' | 'end') => {
    const group = trimOverlayLayer.value!.append('g').attr('class', `trim-handle-${key}`)
    group
      .append('line')
      .attr('y1', 0)
      .attr('y2', h)
      .attr('stroke', '#0ea5e9')
      .attr('stroke-width', 2)
      .style('pointer-events', 'none')
    const GRAB_WIDTH = 16
    group
      .append('rect')
      .attr('y', 0)
      .attr('width', GRAB_WIDTH)
      .attr('height', h)
      .attr('fill', 'transparent')
      .style('cursor', 'ew-resize')
      .call(
        drag<SVGRectElement, unknown>()
          // Stops the chart's own pan/zoom drag (bound higher up on the svg) from also firing
          // for the same gesture.
          .on('start', (event: { sourceEvent?: Event }) => event.sourceEvent?.stopPropagation())
          .on('drag', (event: { x: number }) => {
            if (!trimRange.value || !timeScale.value) return
            const { toReal } = timeMapper.value
            const tVal = toReal(timeScale.value.invert(event.x))
            const clamped = Math.min(Math.max(tVal, profile.start), profile.end)
            const snapped = nearestSampleTime(profile, clamped)
            const MIN_GAP_MS = 1000
            if (key === 'start') {
              trimRange.value.start = Math.min(snapped, trimRange.value.end - MIN_GAP_MS)
            } else {
              trimRange.value.end = Math.max(snapped, trimRange.value.start + MIN_GAP_MS)
            }
            updateTrimOverlayPositions()
          }),
      )
  }
  makeHandle('start')
  makeHandle('end')

  updateTrimOverlayPositions()
}

// Repositions the already-built overlay (shading + both handles) to match the current trimRange,
// by updating attributes on the existing DOM nodes rather than removing/re-appending them.
//
// This used to just be another call to renderTrimOverlay() - which works fine to enter trim mode,
// but calling it on every 'drag' tick was the actual bug behind "the trim handle won't move":
// d3-drag computes each drag tick's pointer position relative to the *specific* DOM node the
// gesture started on (captured once, in a closure, at mousedown). renderTrimOverlay() deletes and
// recreates that exact node on every tick (selectAll('*').remove(), then re-append) - so by the
// second tick, the node backing the in-progress gesture is already detached from the document,
// and d3 can no longer resolve real screen coordinates against it. The handle would silently stop
// tracking the cursor after the very first pixel of movement. Reusing the same nodes across ticks
// keeps the gesture's reference node alive for its whole duration.
function updateTrimOverlayPositions() {
  if (!trimOverlayLayer.value) return
  const profile = trimProfile.value
  const range = trimRange.value
  if (!profile || !range || !timeScale.value) return

  const { toVirtual } = timeMapper.value
  const x = (t: number): number => timeScale.value!(toVirtual(t))

  const positionShade = (
    fromT: number,
    toT: number,
    sel: Selection<SVGRectElement, unknown, null, undefined>,
  ) => {
    const left = Math.min(x(fromT), x(toT))
    const width = Math.abs(x(toT) - x(fromT))
    sel.attr('x', left).attr('width', width).style('display', width <= 0 ? 'none' : '')
  }
  positionShade(
    profile.start,
    range.start,
    trimOverlayLayer.value.select<SVGRectElement>('rect.trim-shade-lead'),
  )
  positionShade(
    range.end,
    profile.end,
    trimOverlayLayer.value.select<SVGRectElement>('rect.trim-shade-tail'),
  )

  const positionHandle = (key: 'start' | 'end') => {
    const handleX = x(range[key])
    const group = trimOverlayLayer.value!.select(`g.trim-handle-${key}`)
    group.select('line').attr('x1', handleX).attr('x2', handleX)
    const GRAB_WIDTH = 16
    group.select('rect').attr('x', handleX - GRAB_WIDTH / 2)
  }
  positionHandle('start')
  positionHandle('end')
}

// Recolors the axis tick sitting exactly at the 1.6 bar guideline (added via
// generatePo2AxisTicks) so it reads as the safety threshold rather than just another tick.
function highlightPo2AxisTick(axisGroup: Selection<SVGGElement, unknown, null, undefined> | null) {
  axisGroup
    ?.selectAll('.tick')
    .filter((d) => Math.abs(Number(d) - PO2_SAFE_LIMIT_BAR) < 0.001)
    .call((tick) => {
      tick.select('text').attr('fill', '#dc2626').attr('font-weight', 'bold')
      tick.select('line').attr('stroke', '#dc2626')
    })
}

// A translucent band above the 1.6 bar guideline, shown only once real PO2 data actually
// crosses it (so a normal dive stays visually uncluttered) and only while PO2 is the selected
// axis unit on one side — the guideline itself now lives on that axis as a highlighted tick
// (see the axis-rendering block above), so this band is purely the "how far over" indicator.
function renderPo2OverageBand() {
  if (!po2ReferenceLayer.value) return
  po2ReferenceLayer.value.selectAll('*').remove()

  const po2OnAxis = leftAxisMetric.value === 'po2' || rightAxisMetric.value === 'po2'
  if (!po2OnAxis || !po2ExceedsSafeLimit.value || !po2Scale.value) return

  const y16 = po2Scale.value(PO2_SAFE_LIMIT_BAR)
  const domainMax = po2Scale.value.domain()[1] as number
  const yTop = po2Scale.value(domainMax)

  po2ReferenceLayer.value
    .append('rect')
    .attr('x', 0)
    .attr('y', yTop)
    .attr('width', innerWidth.value)
    .attr('height', Math.max(0, y16 - yTop))
    .attr('fill', '#dc2626')
    .attr('fill-opacity', 0.12)
    .style('pointer-events', 'none')
}

// Renders the mandatory decompression "keep-out zone": a red shaded area from the
// surface down to the current ceiling depth (the deepest active mandatory deco stop).
//
// Two profiles of the same dive (e.g. a primary computer and a backup/bailout computer) can
// disagree on the ceiling at a given moment - each has its own gas loading model and sometimes
// its own gas mix. Both zones are drawn (one per visible profile with any deco data), each
// independently accurate, but an unstyled overlap of two identical fills would read as a single,
// oddly-dark zone rather than "two profiles disagree here". Only the first (primary) profile's
// zone gets a solid outline; every other visible profile's gets a dashed one and a lighter fill,
// so an overlap still shows as two distinguishable, individually-attributable regions rather than
// one flat blob.
function renderDecoZone() {
  if (!decoZoneLayer.value) return
  decoZoneLayer.value.selectAll('path').remove()
  if (!props.showDecoZone || !decoZoneArea.value) return

  props.profiles.forEach((profile, idx) => {
    if (!visibleMask.value[idx]) return
    const points: [number, number][] = profile.measurements
      .map((m): [number, number] => {
        const stops = m.measurement.deco
        const ceiling = stops?.length ? Math.max(...stops.map((s) => s.depth)) : 0
        return [m.measurement.time, ceiling]
      })
      .filter(([t, d]) => Number.isFinite(t) && Number.isFinite(d))
    if (!points.some((p) => p[1] > 0)) return

    const path = decoZoneLayer.value
      ?.append('path')
      .datum(points)
      .attr('d', decoZoneArea.value?.(points) ?? '')
      .attr('fill', '#dc2626')
      .attr('fill-opacity', idx === 0 ? 0.28 : 0.16)
      .attr('stroke', '#dc2626')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5)
      .style('pointer-events', 'none')
    if (idx > 0) path?.attr('stroke-dasharray', '3,2')
  })
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
    const startX = timeScale.value!(timeMapper.value.toVirtual(startTime))

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

    const endX = timeScale.value!(timeMapper.value.toVirtual(endTime))
    const width = Math.max(0, endX - startX)

    if (segmentsLayer.value !== null) {
      const color = getSegmentColor(s.segment.type || '')
      segmentsLayer.value
        .append('rect')
        .attr('x', startX)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', h)
        .attr('fill', color)
        .attr('opacity', 0.3)
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.5)
        .style('pointer-events', 'none')
    }
  })
}

// Rebuilds the metric config map (extractors + current visibility) fresh each call, since
// showProp is a snapshot of props at build time rather than a live binding — cheap object
// construction, no data-sized work.
function buildMetricConfigs(): MetricConfigMap {
  return createMetricConfigs(props, {
    temp: tempLine,
    ndl: ndlLine,
    otu: otuLine,
    cns: cnsLine,
    gf: gfLine,
    po2Measured: po2MeasuredLine,
    po2Calculated: po2CalculatedLine,
    po2Setpoint: po2SetpointLine,
    rmv: rmvLine,
    gasO2: gasO2Line,
    gasN2: gasN2Line,
    gasHe: gasHeLine,
  })
}

// Per-profile, per-metric list of actually-logged [time, value] points (nulls filtered out) —
// the same points the line itself is drawn through, independent of whether that line is
// currently toggled visible (matching the tooltip's existing behavior of showing a metric's
// value even while its line is hidden). Many metrics (PO2 calculated/setpoint, gas mix changes,
// etc.) log far less often than depth, so reading straight off the nearest measurement makes
// hovering "shaky": most nearby samples simply don't carry that field, so the hit test and the
// tooltip value keep dropping out between real readings. Interpolating along this cached point
// list instead makes hover behavior match what's actually drawn — a continuous line — rather
// than the sparse underlying sample rate. Recomputed only when the profiles themselves change,
// not on every mousemove.
// Depends only on props.profiles (via EXTRACTORS, which reads no props at all) - deliberately
// decoupled from show-flag props so toggling a metric's visibility doesn't force a full rescan
// of every profile's measurements just to rebuild this cache.
const metricPointsCache = computed<Array<Partial<Record<Exclude<MetricType, 'depth'>, [number, number][]>>>>(
  () => {
    return props.profiles.map((profile) => {
      const perMetric: Partial<Record<Exclude<MetricType, 'depth'>, [number, number][]>> = {}
      for (const key of METRICS_TO_RENDER) {
        const points = profile.measurements.map(EXTRACTORS[key]).filter(isFinitePoint)
        if (key !== 'po2Calculated') {
          perMetric[key] = points
          continue
        }
        // No real calculated-PO2 samples on this profile (e.g. a fixed-setpoint CCR handset) -
        // fall back to a synthesized line (FO2 × ambient pressure), same source used to decide
        // PO2 availability in useDiveGraphMetrics.
        const po2CalculatedPoints = points.length > 1 ? points : synthesizePo2Calculated(profile)
        perMetric[key] = extendPo2CalculatedToBoundary(po2CalculatedPoints, profile)
      }
      return perMetric
    })
  },
)

// Drops both a missing extractor result (null) and a non-finite one (a NaN value from a bad
// sample, e.g. via a corrupted/partial import) - either would otherwise reach the line generator
// and produce an invalid "NaN" path, so this is the single point where these get excluded.
const isFinitePoint = (p: [number, number] | null): p is [number, number] =>
  p !== null && Number.isFinite(p[0]) && Number.isFinite(p[1])


// Maps a plotted (non-depth) metric to the scale it's drawn against, for the line-hover hit
// test below. Depth is handled separately since it always uses depthScale.
function metricScaleFor(metric: Exclude<MetricType, 'depth'>): ScaleLinear<number, number> | null {
  switch (metric) {
    case 'temp':
      return tempScale.value
    case 'ndl':
      return ndlScale.value
    case 'otu':
    case 'cns':
      return o2ExposureScale.value
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
      return gasFractionScale.value
    default:
      return null
  }
}

// Restores every plotted line to its normal stroke width, then thickens whichever one the
// cursor is currently closest to — cheap DOM attribute updates only, no re-render.
function highlightHoveredLine(metric: MetricType | null, metricConfigs: MetricConfigMap): void {
  if (!gSel.value) return
  const DEPTH_BASE_WIDTH = 2
  const HOVER_EXTRA_WIDTH = 1.6
  gSel.value
    .select('.lines-depth')
    .selectAll('path')
    .attr('stroke-width', metric === 'depth' ? DEPTH_BASE_WIDTH + HOVER_EXTRA_WIDTH : DEPTH_BASE_WIDTH)
  METRICS_TO_RENDER.forEach((key) => {
    const baseWidth = metricConfigs[key].width ?? 1.5
    const width = key === metric ? baseWidth + HOVER_EXTRA_WIDTH : baseWidth
    gSel.value?.select(`.lines-${toKebabCase(key)}`).selectAll('path').attr('stroke-width', width)
  })
}

// True while the pointer is actually over this chart — while so, this chart's own hover input
// is the source of truth and an externally-driven hover update is ignored (avoids the two
// fighting over the display when the mouse is legitimately here).
let isLocalHover = false

// Shared by both real pointer input (onMouseMoveD3) and a sibling chart's synced hover
// (the externalHoverTimeMs watcher below) — everything here depends only on a time value, not
// on where a real cursor happens to be.
function renderTooltipAtTime(
  tVal: number,
  screenPos: { clientX: number; clientY: number } | null,
  hoverY: number | null = null,
): void {
  if (!timeScale.value || !depthScale.value || !gSel.value) return

  // Collect data from all visible profiles at this time. Bisects directly on each profile's own
  // `measurements` array (no per-mousemove copying/spreading of every measurement) - this runs on
  // every pointer move, so allocating a fresh, decorated array of the whole dataset each time
  // would mean real GC pressure on longer dives.
  const profileDataList: TooltipProfileData[] = []
  const graphStartTime = Math.min(...props.profiles.map((p) => p.start))
  const bProfile = bisector((m: DiveMeasurementWithId) => m.measurement.time).center

  // Fallback anchor depth for when the selected profile (below) has no data at this time -
  // the depth of whichever visible profile's own nearest sample is closest in time to the cursor.
  // Always overwritten before use once profileDataList is non-empty (checked just below).
  let anchorDepth = 0
  let anchorTimeDist = Infinity

  props.profiles.forEach((profile, profileIdx) => {
    if (!visibleMask.value[profileIdx]) return

    // Check if this profile has data at the current time point
    // Only show tooltip for profiles where current time is within their time range
    if (tVal < profile.start || tVal > profile.end) return
    if (profile.measurements.length === 0) return

    const mIdx = Math.min(
      profile.measurements.length - 1,
      Math.max(0, bProfile(profile.measurements, tVal)),
    )
    const m = profile.measurements[mIdx]!

    const dist = Math.abs(m.measurement.time - tVal)
    if (dist < anchorTimeDist) {
      anchorTimeDist = dist
      anchorDepth = m.measurement.depth
    }

    // Current mandatory stop, if any: the deepest active deco stop (the same "ceiling"
    // depth the red deco zone on the chart is shaded to) and its remaining stop time.
    const decoStops = m.measurement.deco
    const decoDepth = decoStops?.length ? Math.max(...decoStops.map((s) => s.depth)) : undefined
    const decoSeconds =
      decoDepth !== undefined ? decoStops!.find((s) => s.depth === decoDepth)?.seconds : undefined

    // Interpolated at the hovered time rather than read off the nearest sample — several of
    // these (PO2 calculated/setpoint especially) log far less often than depth, so the nearest
    // sample frequently just doesn't carry them even though the line is drawn continuously.
    const profilePoints = metricPointsCache.value[profileIdx]
    profileDataList.push({
      profileIdx,
      profileNum: profileIdx + 1,
      timeDisplay: formatElapsedTime(m.measurement.time, profile.start),
      absoluteTime: formatElapsedTime(m.measurement.time, graphStartTime),
      depth: m.measurement.depth,
      temp: interpolateAt(profilePoints?.temp, tVal) ?? m.measurement.temperature?.value,
      ndl: formatISoDurationToMinutes(m.measurement.ndl),
      decoDepth,
      decoSeconds,
      otu: interpolateAt(profilePoints?.otu, tVal),
      cns: interpolateAt(profilePoints?.cns, tVal),
      gf: interpolateAt(profilePoints?.gf, tVal),
      po2Measured: interpolateAt(profilePoints?.po2Measured, tVal),
      po2Calculated: stepAfterValueAt(profilePoints?.po2Calculated, tVal),
      po2Setpoint: interpolateAt(profilePoints?.po2Setpoint, tVal),
      rmv: interpolateAt(profilePoints?.rmv, tVal),
      gasO2: interpolateAt(profilePoints?.gasO2, tVal),
      gasN2: interpolateAt(profilePoints?.gasN2, tVal),
      gasHe: interpolateAt(profilePoints?.gasHe, tVal),
      segmentType: findSegmentTypeAtIndex(
        segmentsData.value,
        profile.id,
        mIdx,
        profile.measurements.length,
      ),
    })
  })

  if (profileDataList.length === 0) return

  // profileDataList is non-empty, so the loop above always set anchorDepth at least once.
  let selM: DiveMeasurementWithId | undefined

  // Find the depth at the current time for the selected profile
  const selIdx = selectedProfile.value
  if (selIdx >= 0 && selIdx < props.profiles.length && visibleMask.value[selIdx]) {
    const selProfile = props.profiles[selIdx]
    if (selProfile && tVal >= selProfile.start && tVal <= selProfile.end) {
      const selMeasurements = selProfile.measurements
      if (selMeasurements && selMeasurements.length) {
        const bSel = bisector((m: DiveMeasurementWithId) => m.measurement.time).center
        const selMIdx = Math.min(
          selMeasurements.length - 1,
          Math.max(0, bSel(selMeasurements, tVal)),
        )
        selM = selMeasurements[selMIdx]!
        anchorDepth = selM.measurement.depth
      }
    }
  }

  const cx = timeScale.value(timeMapper.value.toVirtual(tVal))

  // Which line is the cursor actually closest to? Only real local pointer input carries a Y to
  // test against — a handful of scale lookups (one per visible metric), not path geometry, so
  // this stays cheap on every mousemove.
  const hoverMetricConfigs = buildMetricConfigs()
  let bestMetric: MetricType = 'depth'
  let bestY = depthScale.value(anchorDepth)
  if (hoverY !== null && selM) {
    let bestDist = Math.abs(bestY - hoverY)
    const HOVER_PIXEL_THRESHOLD = 18
    const selProfilePoints = metricPointsCache.value[selIdx]
    for (const key of METRICS_TO_RENDER) {
      const config = hoverMetricConfigs[key]
      const visible =
        selIdx === 0 ? config.showProp : (props.extraProfileMetrics?.[selIdx]?.[key] ?? false)
      if (!visible) continue
      const scale = metricScaleFor(key)
      if (!scale) continue
      // Interpolated, not read straight off selM — some metrics (PO2 calculated/setpoint, gas
      // changes, ...) log far less often than depth, so the nearest sample often just doesn't
      // carry this field. Interpolating along the actually-drawn points keeps the hit test
      // continuous instead of dropping in and out between real readings. po2Calculated uses
      // stepAfterValueAt instead so the hit test's Y position agrees with the drawn step line.
      const value = valueAtForMetric(selProfilePoints?.[key], tVal, key)
      if (value === undefined) continue
      const y = scale(value)
      const dist = Math.abs(y - hoverY)
      if (dist < bestDist) {
        bestDist = dist
        bestMetric = key
        bestY = y
      }
    }
    if (bestDist > HOVER_PIXEL_THRESHOLD) {
      bestMetric = 'depth'
      bestY = depthScale.value(anchorDepth)
    }
  }
  hoveredMetric.value = bestMetric
  highlightHoveredLine(bestMetric, hoverMetricConfigs)
  const cy = bestY

  // Show crosshair line at cursor x position
  crosshairLine.value?.attr('x1', cx).attr('x2', cx).style('display', null)

  // Show focus circle at data point
  focusCircle.value?.attr('cx', cx).attr('cy', cy).style('display', null)

  // Calculate metric availability based on which profiles are visible in the graph
  const visibleProfileIndices = visibleMask.value
    .map((visible, idx) => (visible ? idx : -1))
    .filter((idx) => idx >= 0)

  let metricAvailability
  if (visibleProfileIndices.length > 1) {
    // Use combined availability of all visible profiles
    metricAvailability = getCombinedMetricAvailability(visibleProfileIndices)
  } else if (visibleProfileIndices.length === 1) {
    // Use only the single visible profile's availability
    metricAvailability = getProfileMetricAvailability(visibleProfileIndices[0]!)
  } else {
    // Fallback if no profiles are visible
    metricAvailability = getProfileMetricAvailability(0)
  }

  tooltip.value = {
    profiles: profileDataList,
    metricAvailability,
  }
  tooltipTime.value = tVal // Use the actual time at mouse position

  // Position tooltip to follow the mouse - measure on next tick to get actual rendered size
  nextTick(() => {
    const containerEl = container.value
    if (!containerEl) return

    const rect = containerEl.getBoundingClientRect()
    let mouseX: number
    let mouseY: number

    if (screenPos) {
      mouseX = screenPos.clientX - rect.left
      mouseY = screenPos.clientY - rect.top
    } else {
      // Externally driven (no real cursor) — anchor near the crosshair instead.
      mouseX = cx
      mouseY = cy
    }

    // Measure the actual tooltip element (via its own template ref) if it's currently rendered,
    // otherwise fall back to estimates - it's absent right after tooltip.value first becomes
    // non-null, before Vue has mounted its v-if'd root on this same tick.
    const tooltipEl = tooltipRef.value?.$el as HTMLElement | undefined
    const tooltipWidth = tooltipEl?.offsetWidth || 280
    const tooltipHeight = tooltipEl?.offsetHeight || 120

    const containerWidth = containerEl.offsetWidth
    const containerHeight = containerEl.offsetHeight

    // Try to position to the right of the mouse first
    let xPos = mouseX + 8

    // If tooltip would overflow on the right, move it to the left of the mouse cursor
    if (xPos + tooltipWidth > containerWidth) {
      xPos = mouseX - tooltipWidth - 8
      // If it would go off the left edge, position at the far right
      if (xPos < 0) {
        xPos = Math.max(0, containerWidth - tooltipWidth)
      }
    }

    // Position Y slightly above the mouse
    const yPos = Math.min(containerHeight - tooltipHeight, Math.max(0, mouseY - 40))

    tooltipLeft.value = xPos
    tooltipTop.value = yPos
  })
}

function onMouseMoveD3(event: MouseEvent | TouchEvent) {
  if (!timeScale.value || !depthScale.value || !gSel.value) return
  const [mx, my] = pointerInG(event)
  if (mx < 0 || mx > innerWidth.value || my < 0 || my > innerHeight.value) {
    onMouseLeave()
    return
  }

  isLocalHover = true
  const tVal = timeMapper.value.toReal(timeScale.value.invert(mx))

  let clientX: number
  let clientY: number
  if (event instanceof TouchEvent) {
    const touch = event.touches[0] || event.changedTouches[0]
    if (!touch) return
    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    clientX = event.clientX
    clientY = event.clientY
  }

  renderTooltipAtTime(tVal, { clientX, clientY }, my)
  emit('hoverTimeChange', tVal)
}

function pointerInG(event: MouseEvent | TouchEvent): [number, number] {
  const rect = container.value!.getBoundingClientRect()
  let clientX: number
  let clientY: number

  if (event instanceof TouchEvent) {
    const touch = event.touches[0] || event.changedTouches[0]
    if (!touch) return [0, 0]
    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    clientX = event.clientX
    clientY = event.clientY
  }

  const x = clientX - rect.left - margin.left
  const y = clientY - rect.top - margin.top
  return [x, y]
}

function onMouseLeave() {
  if (!container.value) return
  isLocalHover = false
  focusCircle.value?.style('display', 'none')
  crosshairLine.value?.style('display', 'none')
  tooltip.value = null
  hoveredMetric.value = null
  highlightHoveredLine(null, buildMetricConfigs())
  emit('hoverTimeChange', null)
}

// selection controlled by parent via selectedProfile prop

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
</script>
