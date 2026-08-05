<template>
  <div
    class="mb-4 p-3 md:p-4 border rounded-lg shadow-sm w-full max-w-250 mx-auto"
    :style="{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--foreground)',
      borderColor: 'rgba(209,213,219,0.8)',
    }"
  >
    <div class="flex flex-col gap-3">
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
        <div class="flex flex-wrap gap-3 items-center">
          <span class="flex items-center gap-1.5">
            <span class="font-bold text-sm" style="color: #ffffff">Depth</span>
          </span>
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
        </div>
        <!-- Grouped by what each metric relates to (see DEFAULT_METRIC_CONFIGS' own color
             grouping) rather than one flat wall of checkboxes - each group wraps as its own row,
             and within a group whatever's unavailable for this dive sinks to the end, so the
             available toggles you actually reach for stay clustered together instead of scattered
             among grayed-out ones. -->
        <div
          v-for="group in metricGroups"
          :key="group.name"
          class="flex flex-wrap gap-x-3 gap-y-1.5 items-center"
        >
          <span
            class="text-[10px] uppercase tracking-wide font-semibold opacity-50 w-full sm:w-auto sm:min-w-0"
            :style="{ color: 'var(--foreground)' }"
            >{{ group.name }}</span
          >
          <StyledCheckbox
            v-for="item in group.items"
            :key="item.key"
            :model-value="item.modelValue"
            :color="item.color"
            :disabled="item.disabled"
            :title="item.title"
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
          v-for="def in extraMetricDefs"
          :key="def.key"
          :model-value="extraProfileMetrics?.[editingExtraProfile]?.[def.key] ?? false"
          :color="def.color"
          :disabled="def.disabled"
          @update:model-value="setExtraProfileMetric(def.key, $event)"
        >
          <span class="font-bold text-sm" :style="{ color: def.color }">{{ def.label }}</span>
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
  type AxisUnitGroup,
  type MetricType,
  type ProfileMetricVisibility,
} from '@/lib/types/graph'
import type { ProfileMetricAvailability } from '@/composables/useDiveGraphMetrics'
import { computed, ref } from 'vue'
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

type MetricToggleItem = {
  key: ToggleKey
  label: string
  color: string
  modelValue: boolean
  disabled?: boolean
  title: string
}

// Grouped by what each metric actually relates to (the same families DEFAULT_METRIC_CONFIGS'
// colors are grouped by), then sorted within each group so whatever's unavailable for this dive
// sinks to the end - stable otherwise, so toggling something doesn't reshuffle its neighbors.
const metricGroups = computed<{ name: string; items: MetricToggleItem[] }[]>(() => {
  const groups: { name: string; items: MetricToggleItem[] }[] = [
    {
      name: 'Vitals',
      items: [
        {
          key: 'temp',
          label: 'Temperature',
          color: DEFAULT_METRIC_CONFIGS.temp.color,
          modelValue: props.showTemp,
          disabled: props.disableTemp,
          title: props.disableTemp ? 'No temperature data' : '',
        },
      ],
    },
    {
      name: 'O2 & PO2',
      items: [
        {
          key: 'cns',
          label: 'CNS',
          color: DEFAULT_METRIC_CONFIGS.cns.color,
          modelValue: props.showCns,
          disabled: props.disableCns,
          title: props.disableCns ? 'No CNS data' : '',
        },
        {
          key: 'otu',
          label: 'OTUs',
          color: DEFAULT_METRIC_CONFIGS.otu.color,
          modelValue: props.showOtu,
          disabled: props.disableOtu,
          title: props.disableOtu ? 'No OTU data' : '',
        },
        {
          key: 'gasO2',
          label: 'Gas O2',
          color: DEFAULT_METRIC_CONFIGS.gasO2.color,
          modelValue: props.showGasO2,
          disabled: props.disableGasO2,
          title: props.disableGasO2 ? 'No Gas O2 data' : '',
        },
        {
          key: 'po2Measured',
          label: 'PO2 measured',
          color: DEFAULT_METRIC_CONFIGS.po2Measured.color,
          modelValue: props.showPo2Measured,
          disabled: props.disablePo2Measured,
          title: props.disablePo2Measured ? 'No PO2 measured data' : '',
        },
        {
          key: 'po2Calculated',
          label: 'PO2 calculated',
          color: DEFAULT_METRIC_CONFIGS.po2Calculated.color,
          modelValue: props.showPo2Calculated,
          disabled: props.disablePo2Calculated,
          title: props.disablePo2Calculated ? 'No PO2 calculated data' : '',
        },
        {
          key: 'po2Setpoint',
          label: 'PO2 setpoint',
          color: DEFAULT_METRIC_CONFIGS.po2Setpoint.color,
          modelValue: props.showPo2Setpoint,
          disabled: props.disablePo2Setpoint,
          title: props.disablePo2Setpoint ? 'No PO2 setpoint data' : '',
        },
      ],
    },
    {
      name: 'Deco & Gas Loading',
      items: [
        {
          key: 'gf',
          label: 'GF99',
          color: DEFAULT_METRIC_CONFIGS.gf.color,
          modelValue: props.showGf,
          disabled: props.disableGf,
          title: props.disableGf ? 'No GF99 data' : '',
        },
        {
          key: 'ndl',
          label: 'NDL',
          color: DEFAULT_METRIC_CONFIGS.ndl.color,
          modelValue: props.showNdl,
          disabled: props.disableNdl,
          title: props.disableNdl ? 'No NDL data' : '',
        },
        {
          key: 'gasN2',
          label: 'Gas N2',
          color: DEFAULT_METRIC_CONFIGS.gasN2.color,
          modelValue: props.showGasN2,
          disabled: props.disableGasN2,
          title: props.disableGasN2 ? 'No Gas N2 data' : '',
        },
      ],
    },
    {
      name: 'Other',
      items: [
        {
          key: 'rmv',
          label: 'RMV',
          color: DEFAULT_METRIC_CONFIGS.rmv.color,
          modelValue: props.showRmv,
          disabled: props.disableRmv,
          title: props.disableRmv ? 'No RMV data' : '',
        },
        {
          key: 'gasHe',
          label: 'Gas He',
          color: DEFAULT_METRIC_CONFIGS.gasHe.color,
          modelValue: props.showGasHe,
          disabled: props.disableGasHe,
          title: props.disableGasHe ? 'No Gas He data' : '',
        },
      ],
    },
  ]

  return groups.map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled)),
  }))
})

// Which secondary profile (array index, 1-based numbering in the UI matches the "Tooltip
// Profile" buttons above) the checkbox row below is currently editing overrides for.
const editingExtraProfile = ref(1)

// Availability for the metric currently being edited in the "Extra metrics for profile" picker
// below - falls back to the global (any-visible-profile) disable flag if the caller didn't pass
// per-profile availability, so this degrades gracefully rather than disabling everything.
function isExtraDisabled(
  hasKey: keyof ProfileMetricAvailability,
  fallback: boolean | undefined,
): boolean {
  const availability = props.perProfileAvailability?.[editingExtraProfile.value]
  return availability ? !availability[hasKey] : (fallback ?? false)
}

const extraMetricDefs = computed(() => [
  {
    key: 'temp' as const,
    color: DEFAULT_METRIC_CONFIGS.temp.color,
    label: 'Temperature',
    disabled: isExtraDisabled('hasTemp', props.disableTemp),
  },
  {
    key: 'ndl' as const,
    color: DEFAULT_METRIC_CONFIGS.ndl.color,
    label: 'NDL',
    disabled: isExtraDisabled('hasNdl', props.disableNdl),
  },
  {
    key: 'otu' as const,
    color: DEFAULT_METRIC_CONFIGS.otu.color,
    label: 'OTUs',
    disabled: isExtraDisabled('hasOtu', props.disableOtu),
  },
  {
    key: 'cns' as const,
    color: DEFAULT_METRIC_CONFIGS.cns.color,
    label: 'CNS',
    disabled: isExtraDisabled('hasCns', props.disableCns),
  },
  {
    key: 'gf' as const,
    color: DEFAULT_METRIC_CONFIGS.gf.color,
    label: 'GF99',
    disabled: isExtraDisabled('hasGf', props.disableGf),
  },
  {
    key: 'po2Measured' as const,
    color: DEFAULT_METRIC_CONFIGS.po2Measured.color,
    label: 'PO2 measured',
    disabled: isExtraDisabled('hasPo2Measured', props.disablePo2Measured),
  },
  {
    key: 'po2Calculated' as const,
    color: DEFAULT_METRIC_CONFIGS.po2Calculated.color,
    label: 'PO2 calculated',
    disabled: isExtraDisabled('hasPo2Calculated', props.disablePo2Calculated),
  },
  {
    key: 'po2Setpoint' as const,
    color: DEFAULT_METRIC_CONFIGS.po2Setpoint.color,
    label: 'PO2 setpoint',
    disabled: isExtraDisabled('hasPo2Setpoint', props.disablePo2Setpoint),
  },
  {
    key: 'rmv' as const,
    color: DEFAULT_METRIC_CONFIGS.rmv.color,
    label: 'RMV',
    disabled: isExtraDisabled('hasRmv', props.disableRmv),
  },
  {
    key: 'gasO2' as const,
    color: DEFAULT_METRIC_CONFIGS.gasO2.color,
    label: 'Gas O2',
    disabled: isExtraDisabled('hasGasO2', props.disableGasO2),
  },
  {
    key: 'gasN2' as const,
    color: DEFAULT_METRIC_CONFIGS.gasN2.color,
    label: 'Gas N2',
    disabled: isExtraDisabled('hasGasN2', props.disableGasN2),
  },
  {
    key: 'gasHe' as const,
    color: DEFAULT_METRIC_CONFIGS.gasHe.color,
    label: 'Gas He',
    disabled: isExtraDisabled('hasGasHe', props.disableGasHe),
  },
].sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled)))

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
