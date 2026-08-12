<template>
  <div
    class="mb-4 p-3 md:p-4 border rounded-lg shadow-sm w-full max-w-250 mx-auto"
    :style="{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--foreground)',
      borderColor: 'rgba(209,213,219,0.8)',
    }"
  >
    <div class="flex flex-col gap-2">
      <!-- Metrics toggles (collapsible) -->
      <div>
        <button
          class="text-sm font-semibold flex items-center gap-2"
          @click="showMetrics = !showMetrics"
        >
          <span :style="{ color: 'var(--foreground)' }">Metrics</span>
          <span class="fa-sm"
            ><i :class="showMetrics ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i
          ></span>
        </button>
      </div>
      <div v-show="showMetrics" class="flex flex-col gap-2">
        <!-- Whole-profile on/off - turns off depth, every metric, and the tooltip for that
             profile in one click, same effect as the profile picker above the chart, just
             reachable from here too. -->
        <div v-if="profilesCount > 1" class="flex flex-wrap gap-2 items-center">
          <span class="text-xs opacity-70" :style="{ color: 'var(--foreground)' }">Profiles:</span>
          <StyledCheckbox
            v-for="idx in profilesCount"
            :key="idx"
            :model-value="!props.visibleProfiles || !!props.visibleProfiles[idx - 1]"
            color="#10b981"
            @update:model-value="$emit('toggleProfile', idx - 1)"
          >
            <span class="text-sm">{{ idx }}</span>
          </StyledCheckbox>
        </div>
        <!-- One flat row in a fixed order (see METRIC_DEFS) - a metric with no data for this dive
             is left out entirely rather than shown grayed out, so the row only ever contains
             things you can actually toggle. -->
        <div class="flex flex-wrap gap-3 items-center">
          <StyledCheckbox
            v-if="showSegmentsToggle !== false"
            :model-value="showSegments"
            color="var(--foreground)"
            @update:model-value="$emit('update:showSegments', $event)"
          >
            <span class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }"
              >Segments</span
            >
          </StyledCheckbox>
          <StyledCheckbox
            v-for="item in primaryMetricItems"
            :key="item.key"
            :model-value="item.modelValue"
            :color="item.color"
            @update:model-value="emitToggle(item.key, $event)"
          >
            <span class="font-bold text-sm" :style="{ color: item.color }">{{ item.label }}</span>
          </StyledCheckbox>
        </div>
      </div>
    </div>
    <!-- Display options - kept separate from the metric toggles above (not measurements, just
         chart display settings), so they don't get shuffled in among them by flex-wrap at
         narrower widths. -->
    <div v-show="showMetrics" class="flex flex-wrap gap-3 items-center mt-2">
      <StyledCheckbox
        :model-value="showGrid"
        color="var(--foreground)"
        @update:model-value="$emit('update:showGrid', $event)"
      >
        <span class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }">Grid</span>
      </StyledCheckbox>
      <StyledCheckbox
        :model-value="showDecoZone"
        color="#dc2626"
        :disabled="disableDecoZone"
        :title="disableDecoZone ? 'No mandatory decompression stops' : ''"
        @update:model-value="$emit('update:showDecoZone', $event)"
      >
        <span class="font-bold text-sm" style="color: #dc2626">Deco Ceiling</span>
      </StyledCheckbox>
    </div>
    <!-- Tooltip profile selector placed between Metrics and Axis sections -->
    <div
      v-if="profilesCount > 1"
      class="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t"
      :style="{ borderColor: 'rgba(209,213,219,0.5)' }"
    >
      <span class="text-sm font-semibold" :style="{ color: 'var(--foreground)' }"
        >Tooltip Profile:</span
      >
      <button
        v-for="idx in profilesCount"
        :key="idx"
        @click="
          (!props.visibleProfiles || props.visibleProfiles[idx - 1]) &&
          $emit('update:selectedProfiles', [idx - 1])
        "
        :disabled="props.visibleProfiles && !props.visibleProfiles[idx - 1]"
        :class="[
          'px-2 py-0.5 text-xs rounded border transition-colors',
          props.visibleProfiles && !props.visibleProfiles[idx - 1]
            ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700'
            : selectedProfiles.includes(idx - 1)
              ? 'bg-blue-500 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600',
        ]"
      >
        {{ idx }}
      </button>
      <button
        @click="
          $emit(
            'update:selectedProfiles',
            selectedProfiles.length === profilesCount
              ? [selectedProfiles[0] ?? 0]
              : Array.from({ length: profilesCount }, (_, i) => i),
          )
        "
        :class="[
          'px-2 py-0.5 text-xs rounded border transition-colors ml-2',
          selectedProfiles.length === profilesCount
            ? 'bg-green-500 text-white border-green-600'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600',
        ]"
      >
        All
      </button>
    </div>
    <!-- Extra metrics for secondary profiles - depth and the checkboxes above always apply to the
         first/primary profile; this lets a backup computer's profile opt into specific metrics
         instead of inheriting the primary's set (or none, by default). -->
    <div
      v-if="profilesCount > 1"
      class="mt-3 pt-3 border-t"
      :style="{ borderColor: 'rgba(209,213,219,0.5)' }"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm font-semibold" :style="{ color: 'var(--foreground)' }"
          >Extra metrics for profile:</span
        >
        <button
          v-for="idx in profilesCount - 1"
          :key="idx"
          type="button"
          @click="editingExtraProfile = idx"
          :class="[
            'px-2 py-0.5 text-xs rounded border transition-colors',
            editingExtraProfile === idx
              ? 'bg-blue-500 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600',
          ]"
        >
          {{ idx + 1 }}
        </button>
      </div>
      <div class="flex flex-wrap gap-3 items-center mt-2">
        <StyledCheckbox
          v-for="item in extraMetricItems"
          :key="item.key"
          :model-value="extraProfileMetrics?.[editingExtraProfile]?.[item.key] ?? false"
          :color="item.color"
          @update:model-value="setExtraProfileMetric(item.key, $event)"
        >
          <span class="font-bold text-sm" :style="{ color: item.color }">{{ item.label }}</span>
        </StyledCheckbox>
      </div>
    </div>
    <!-- Axis Selectors Row -->
    <div class="mt-3 pt-3 border-t" :style="{ borderColor: 'rgba(209,213,219,0.5)' }">
      <div class="flex items-center justify-between">
        <button class="text-sm font-semibold flex items-center gap-2" @click="showAxes = !showAxes">
          <span :style="{ color: 'var(--foreground)' }">Axis Selectors</span>
          <span class="fa-sm"
            ><i :class="showAxes ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i
          ></span>
        </button>
      </div>
      <div v-show="showAxes" class="flex flex-wrap gap-4 items-center mt-2">
        <div class="flex flex-wrap w-full items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs opacity-70" :style="{ color: 'var(--foreground)' }">Left:</span>
            <select
              :value="props.leftAxisMetric"
              @input="handleLeftAxisChange"
              title="Metrics sharing a unit share this axis's scale"
              class="border rounded px-2 py-1 text-sm"
              :style="{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--foreground)',
                borderColor: 'rgba(209,213,219,0.8)',
              }"
            >
              <option
                v-for="[group, config] in Object.entries(AXIS_UNIT_GROUPS)"
                :key="group"
                :value="group"
              >
                {{ config.label }}
              </option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs opacity-70" :style="{ color: 'var(--foreground)' }">Right:</span>
            <select
              :value="props.rightAxisMetric"
              @input="handleRightAxisChange"
              title="Metrics sharing a unit share this axis's scale"
              class="border rounded px-2 py-1 text-sm"
              :style="{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--foreground)',
                borderColor: 'rgba(209,213,219,0.8)',
              }"
            >
              <option
                v-for="[group, config] in Object.entries(AXIS_UNIT_GROUPS)"
                :key="group"
                :value="group"
              >
                {{ config.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AXIS_UNIT_GROUPS,
  DEFAULT_METRIC_CONFIGS,
  metricDisplayNames,
  type AxisUnitGroup,
  type MetricType,
  type ProfileMetricVisibility,
} from '@/lib/types/graph'
import type { ProfileMetricAvailability } from '@/composables/useDiveGraphMetrics'
import { computed, ref, watch } from 'vue'
import StyledCheckbox from '@/components/ui/StyledCheckbox.vue'

const props = defineProps<{
  selectedProfiles: number[]
  profilesCount: number
  visibleProfiles?: boolean[]
  extraProfileMetrics?: ProfileMetricVisibility
  /** One entry per profile - lets the "Extra metrics for profile" picker below disable a
   * checkbox based on whether *that* profile has the data, instead of the disableXxx props
   * (which reflect availability across all *visible* profiles, for the primary Metrics row). */
  perProfileAvailability?: ProfileMetricAvailability[]
  showTemp: boolean
  showSegments: boolean
  showGrid: boolean
  showNdl: boolean
  showOtu: boolean
  showCns: boolean
  showGf: boolean
  showPo2Measured: boolean
  showPo2Calculated: boolean
  showPo2Setpoint: boolean
  showRmv: boolean
  showGasO2: boolean
  showGasN2: boolean
  showGasHe: boolean
  showDecoZone: boolean
  disableTemp?: boolean
  disableNdl?: boolean
  disableOtu?: boolean
  disableCns?: boolean
  disableGf?: boolean
  disablePo2Measured?: boolean
  disablePo2Calculated?: boolean
  disablePo2Setpoint?: boolean
  disableRmv?: boolean
  disableGasO2?: boolean
  disableGasN2?: boolean
  disableGasHe?: boolean
  disableDecoZone?: boolean
  showSegmentsToggle?: boolean
  leftAxisMetric?: AxisUnitGroup
  rightAxisMetric?: AxisUnitGroup
}>()

const emit = defineEmits<{
  toggleProfile: [index: number]
  'update:selectedProfiles': [value: number[]]
  'update:showTemp': [value: boolean]
  'update:showSegments': [value: boolean]
  'update:showGrid': [value: boolean]
  'update:showNdl': [value: boolean]
  'update:showOtu': [value: boolean]
  'update:showCns': [value: boolean]
  'update:showGf': [value: boolean]
  'update:showPo2Measured': [value: boolean]
  'update:showPo2Calculated': [value: boolean]
  'update:showPo2Setpoint': [value: boolean]
  'update:showRmv': [value: boolean]
  'update:showGasO2': [value: boolean]
  'update:showGasN2': [value: boolean]
  'update:showGasHe': [value: boolean]
  'update:showDecoZone': [value: boolean]
  'update:extraProfileMetrics': [value: ProfileMetricVisibility]
  'update:leftAxisMetric': [value: AxisUnitGroup]
  'update:rightAxisMetric': [value: AxisUnitGroup]
}>()

const showMetrics = ref(true)
const showAxes = ref(true)

type ToggleKey = Exclude<MetricType, 'depth'>

function emitToggle(key: ToggleKey, value: boolean): void {
  switch (key) {
    case 'temp':
      emit('update:showTemp', value)
      break
    case 'ndl':
      emit('update:showNdl', value)
      break
    case 'otu':
      emit('update:showOtu', value)
      break
    case 'cns':
      emit('update:showCns', value)
      break
    case 'gf':
      emit('update:showGf', value)
      break
    case 'po2Measured':
      emit('update:showPo2Measured', value)
      break
    case 'po2Calculated':
      emit('update:showPo2Calculated', value)
      break
    case 'po2Setpoint':
      emit('update:showPo2Setpoint', value)
      break
    case 'rmv':
      emit('update:showRmv', value)
      break
    case 'gasO2':
      emit('update:showGasO2', value)
      break
    case 'gasN2':
      emit('update:showGasN2', value)
      break
    case 'gasHe':
      emit('update:showGasHe', value)
      break
  }
}

// One fixed order, shared by the primary row and the "Extra metrics for profile" picker below -
// so a metric always sits in the same place regardless of which profile you're looking at.
// Availability only ever decides whether an item appears at all, never where. Labels come from
// metricDisplayNames (lib/types/graph.ts) rather than being repeated here.
const METRIC_ORDER: ToggleKey[] = [
  'temp',
  'ndl',
  'gf',
  'cns',
  'otu',
  'po2Measured',
  'po2Calculated',
  'po2Setpoint',
  'rmv',
  'gasO2',
  'gasN2',
  'gasHe',
]
const METRIC_DEFS: { key: ToggleKey; label: string }[] = METRIC_ORDER.map((key) => ({
  key,
  label: metricDisplayNames[key],
}))

const AVAILABILITY_KEY: Record<ToggleKey, keyof ProfileMetricAvailability> = {
  temp: 'hasTemp',
  ndl: 'hasNdl',
  gf: 'hasGf',
  cns: 'hasCns',
  otu: 'hasOtu',
  po2Measured: 'hasPo2Measured',
  po2Calculated: 'hasPo2Calculated',
  po2Setpoint: 'hasPo2Setpoint',
  rmv: 'hasRmv',
  gasO2: 'hasGasO2',
  gasN2: 'hasGasN2',
  gasHe: 'hasGasHe',
}

type PrimaryRuntime = { modelValue: boolean; disabled: boolean; title: string }

// The primary row's model-value/disabled/title per metric, keyed for O(1) lookup by both
// primaryMetricItems (below) and, as a fallback, the "Extra metrics" picker's own availability
// check when no per-profile data was passed in.
const primaryRuntimeByKey = computed<Record<ToggleKey, PrimaryRuntime>>(() => ({
  temp: {
    modelValue: props.showTemp,
    disabled: !!props.disableTemp,
    title: props.disableTemp ? 'No temperature data' : '',
  },
  ndl: {
    modelValue: props.showNdl,
    disabled: !!props.disableNdl,
    title: props.disableNdl ? 'No NDL data' : '',
  },
  gf: {
    modelValue: props.showGf,
    disabled: !!props.disableGf,
    title: props.disableGf ? 'No GF99 data' : '',
  },
  cns: {
    modelValue: props.showCns,
    disabled: !!props.disableCns,
    title: props.disableCns ? 'No CNS data' : '',
  },
  otu: {
    modelValue: props.showOtu,
    disabled: !!props.disableOtu,
    title: props.disableOtu ? 'No OTU data' : '',
  },
  po2Measured: {
    modelValue: props.showPo2Measured,
    disabled: !!props.disablePo2Measured,
    title: props.disablePo2Measured ? 'No PO2 measured data' : '',
  },
  po2Calculated: {
    modelValue: props.showPo2Calculated,
    disabled: !!props.disablePo2Calculated,
    title: props.disablePo2Calculated ? 'No PO2 calculated data' : '',
  },
  po2Setpoint: {
    modelValue: props.showPo2Setpoint,
    disabled: !!props.disablePo2Setpoint,
    title: props.disablePo2Setpoint ? 'No PO2 setpoint data' : '',
  },
  rmv: {
    modelValue: props.showRmv,
    disabled: !!props.disableRmv,
    title: props.disableRmv ? 'No RMV data' : '',
  },
  gasO2: {
    modelValue: props.showGasO2,
    disabled: !!props.disableGasO2,
    title: props.disableGasO2 ? 'No Gas O2 data' : '',
  },
  gasN2: {
    modelValue: props.showGasN2,
    disabled: !!props.disableGasN2,
    title: props.disableGasN2 ? 'No Gas N2 data' : '',
  },
  gasHe: {
    modelValue: props.showGasHe,
    disabled: !!props.disableGasHe,
    title: props.disableGasHe ? 'No Gas He data' : '',
  },
}))

// The primary row: fixed METRIC_DEFS order, with anything unavailable for the currently visible
// profile(s) left out entirely rather than shown disabled.
const primaryMetricItems = computed(() =>
  METRIC_DEFS.filter((def) => !primaryRuntimeByKey.value[def.key].disabled).map((def) => ({
    ...def,
    color: DEFAULT_METRIC_CONFIGS[def.key].color,
    ...primaryRuntimeByKey.value[def.key],
  })),
)

// Which secondary profile (array index, 1-based numbering in the UI matches the "Tooltip
// Profile" buttons above) the checkbox row below is currently editing overrides for.
const editingExtraProfile = ref(1)

// The "Extra metrics" picker is only shown while profilesCount > 1 (v-if above masks a stale
// value from being visible), but a stale out-of-range index would still be read by
// extraMetricItems/setExtraProfileMetric if profilesCount later grows back - clamp it back into
// range whenever the profile count shrinks, so it can't stay pointed at a profile that no longer
// exists.
watch(
  () => props.profilesCount,
  (count) => {
    if (editingExtraProfile.value > count - 1) {
      editingExtraProfile.value = Math.max(1, count - 1)
    }
  },
)

// Same fixed order as the primary row, but availability is checked against the profile currently
// selected above (falling back to the primary row's own disabled flag if the caller didn't pass
// per-profile data, so this degrades gracefully rather than showing nothing).
const extraMetricItems = computed(() => {
  const availability = props.perProfileAvailability?.[editingExtraProfile.value]
  return METRIC_DEFS.filter((def) => {
    const unavailable = availability
      ? !availability[AVAILABILITY_KEY[def.key]]
      : primaryRuntimeByKey.value[def.key].disabled
    return !unavailable
  }).map((def) => ({ ...def, color: DEFAULT_METRIC_CONFIGS[def.key].color }))
})

function setExtraProfileMetric(key: Exclude<MetricType, 'depth'>, value: boolean): void {
  emit('update:extraProfileMetrics', {
    ...props.extraProfileMetrics,
    [editingExtraProfile.value]: {
      ...props.extraProfileMetrics?.[editingExtraProfile.value],
      [key]: value,
    },
  })
}

function handleLeftAxisChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as AxisUnitGroup
  emit('update:leftAxisMetric', value)
}

function handleRightAxisChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as AxisUnitGroup
  emit('update:rightAxisMetric', value)
}
</script>
