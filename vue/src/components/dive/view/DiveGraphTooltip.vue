<template>
  <div
    v-if="data"
    class="absolute bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 shadow rounded px-2 py-1 pointer-events-auto"
    :style="{
      left: left + 'px',
      top: top + 'px',
      width: props.selectedProfiles && props.selectedProfiles.length > 1 ? 'auto' : '10rem',
      maxWidth: props.selectedProfiles && props.selectedProfiles.length > 1 ? '20rem' : '10rem',
    }"
    @mousedown.stop
    @click.stop
  >
    <!-- Header with time -->
    <div class="font-semibold mb-1">
      <div>Time: {{ currentProfile?.absoluteTime ?? data.profiles[0]?.absoluteTime }}</div>
      <div
        v-if="
          (currentProfile?.timeDisplay ?? data.profiles[0]?.timeDisplay) !==
          (currentProfile?.absoluteTime ?? data.profiles[0]?.absoluteTime)
        "
        class="text-xs opacity-70"
      >
        Profile: {{ currentProfile?.timeDisplay ?? data.profiles[0]?.timeDisplay }}
        <span v-if="data.profiles.length > 1" class="ml-1">
          ({{ selectedProfile + 1 }}/{{ data.profiles.length }})
        </span>
      </div>
      <div v-else-if="data.profiles.length > 1" class="text-xs opacity-70">
        ({{ selectedProfile + 1 }}/{{ data.profiles.length }})
      </div>
    </div>

    <!-- Several profiles side by side: one grid row per metric across all columns, so the same
         reading sits at the same height in every column (a stop only one computer has, or a
         wrapped value, can't shift the rows below it). -->
    <div
      v-if="selectedProfilesData.length > 1"
      class="grid gap-x-3"
      :style="{ gridTemplateColumns: `repeat(${selectedProfilesData.length}, auto)` }"
    >
      <template v-for="row in multiRows" :key="row.key">
        <div
          v-for="(cell, idx) in row.cells"
          :key="idx"
          :class="[
            row.cls,
            cell.cls,
            idx > 0 ? 'border-l pl-2 border-gray-300 dark:border-gray-600' : '',
          ]"
        >
          {{ cell.text }}
        </div>
      </template>
    </div>

    <!-- Show selected profile data (original view) -->
    <div v-else-if="currentProfile" class="profile-data">
      <div :class="rowClass('depth')">
        Depth: {{ currentProfile.depth != null ? currentProfile.depth.toFixed(1) : '-' }} m
      </div>
      <div v-if="data.metricAvailability.hasTemp" :class="rowClass('temp')">
        Temperature:
        {{ currentProfile.temp !== undefined ? currentProfile.temp.toFixed(1) : '-' }} °C
      </div>
      <div v-if="data.metricAvailability.hasNdl" :class="rowClass('ndl')">
        NDL: {{ currentProfile.ndl !== undefined ? currentProfile.ndl : '-' }}
      </div>
      <div v-if="data.metricAvailability.hasTts" :class="rowClass('tts')">
        TTS: {{ currentProfile.tts !== undefined ? currentProfile.tts : '-' }}
      </div>
      <div
        v-if="data.metricAvailability.hasDeco && formatDeco(currentProfile)"
        class="text-red-500"
      >
        Stop: {{ formatDeco(currentProfile) }}
      </div>
      <div v-if="data.metricAvailability.hasOtu" :class="rowClass('otu')">
        OTUs: {{ currentProfile.otu !== undefined ? currentProfile.otu.toFixed(0) : '-' }}
      </div>
      <div v-if="data.metricAvailability.hasCns" :class="rowClass('cns')">
        CNS: {{ currentProfile.cns !== undefined ? currentProfile.cns.toFixed(0) : '-' }}%
      </div>
      <div v-if="data.metricAvailability.hasGf" :class="rowClass('gf')">
        GF99: {{ currentProfile.gf !== undefined ? currentProfile.gf.toFixed(0) : '-' }}%
      </div>
      <div v-if="data.metricAvailability.hasRmv" :class="rowClass('rmv')">
        RMV: {{ currentProfile.rmv != null ? currentProfile.rmv.toFixed(0) : '-' }} L/min
      </div>
      <div v-if="data.metricAvailability.hasPo2Measured" :class="rowClass('po2Measured')">
        PO2 (measured):
        {{ currentProfile.po2Measured != null ? currentProfile.po2Measured.toFixed(2) : '-' }} bar
      </div>
      <div v-if="data.metricAvailability.hasPo2Calculated" :class="rowClass('po2Calculated')">
        PO2 (calculated):
        {{ currentProfile.po2Calculated != null ? currentProfile.po2Calculated.toFixed(2) : '-' }} bar
      </div>
      <div v-if="data.metricAvailability.hasPo2Setpoint" :class="rowClass('po2Setpoint')">
        PO2 (setpoint):
        {{ currentProfile.po2Setpoint != null ? currentProfile.po2Setpoint.toFixed(2) : '-' }} bar
      </div>
      <div
        v-if="data.metricAvailability.hasGasO2 || data.metricAvailability.hasGasHe"
        :class="isGasHovered ? 'font-bold' : ''"
      >
        <div
          v-if="
            currentProfile.gasO2 !== undefined ||
            currentProfile.gasN2 !== undefined ||
            currentProfile.gasHe !== undefined
          "
          class="group relative"
        >
          <div v-if="currentProfile.gasO2 !== undefined && currentProfile.gasHe !== undefined">
            Gas: {{ currentProfile.gasO2.toFixed(0) }}/{{ currentProfile.gasHe.toFixed(0) }}
          </div>
          <div v-else>Gas: -</div>
          <div
            class="absolute left-full ml-2 top-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            v-if="currentProfile.gasN2 !== undefined"
          >
            O2: {{ currentProfile.gasO2?.toFixed(0) ?? '-' }}%, N2:
            {{ currentProfile.gasN2.toFixed(0) }}%, He:
            {{ currentProfile.gasHe?.toFixed(0) ?? '-' }}%
          </div>
        </div>
        <div v-else>Gas: -</div>
      </div>
      <div
        v-if="currentProfile.segmentType"
        class="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600"
      >
        Segment: {{ currentProfile.segmentType }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MetricType } from '@/lib/types/graph'

export type TooltipProfileData = {
  profileIdx: number
  profileNum: number
  timeDisplay: string
  absoluteTime: string
  depth: number
  temp?: number
  ndl?: string
  tts?: string
  decoDepth?: number
  decoSeconds?: number
  otu?: number
  cns?: number
  gf?: number
  po2Measured?: number | null
  po2Calculated?: number | null
  po2Setpoint?: number | null
  rmv?: number
  gasO2?: number
  gasN2?: number
  gasHe?: number
  segmentType?: string
}

export type MetricAvailability = {
  hasTemp: boolean
  hasNdl: boolean
  hasTts: boolean
  hasDeco: boolean
  hasOtu: boolean
  hasCns: boolean
  hasGf: boolean
  hasPo2Measured: boolean
  hasPo2Calculated: boolean
  hasPo2Setpoint: boolean
  hasRmv: boolean
  hasGasO2: boolean
  hasGasN2: boolean
  hasGasHe: boolean
}

export type TooltipData = {
  profiles: TooltipProfileData[]
  metricAvailability: MetricAvailability
}

interface Props {
  data: TooltipData | null
  time?: number
  left: number
  top: number
  selectedProfiles?: number[]
  /** Which line the cursor is currently closest to on the chart — bolds the matching row. */
  hoveredMetric?: MetricType | null
}

const props = defineProps<Props>()

const rowClass = (metric: MetricType): string => (props.hoveredMetric === metric ? 'font-bold' : '')
const isGasHovered = computed(
  () =>
    props.hoveredMetric === 'gasO2' ||
    props.hoveredMetric === 'gasN2' ||
    props.hoveredMetric === 'gasHe',
)

// A stop is only "active" once its depth/time are actually set — deco.length > 0 with a
// zero-depth entry means the diver has cleared their last stop, not that one is pending.
// The stop's duration only where the device logs one - a bare ceiling (Suunto, Divesoft) has none,
// and its time-to-surface is TTS (shown in its own row), not stop time.
const formatDeco = (profile: TooltipProfileData): string | null => {
  if (profile.decoDepth === undefined || profile.decoDepth <= 0) return null
  const depth = `${profile.decoDepth.toFixed(0)} m`
  const seconds = profile.decoSeconds ?? 0
  return seconds > 0 ? `${depth} / ${Math.round(seconds / 60)} min` : depth
}

type Cell = { text: string; cls?: string }
type Row = { key: string; cls: string; cells: Cell[] }

const fixed = (value: number | null | undefined, digits: number): string =>
  value != null ? value.toFixed(digits) : '-'

/** The side-by-side view's rows; a metric row is present for every column or for none. */
const multiRows = computed<Row[]>(() => {
  const availability = props.data?.metricAvailability
  const profiles = selectedProfilesData.value
  if (!availability) return []
  const rows: Row[] = []
  const add = (
    key: string,
    show: boolean,
    cls: string,
    text: (p: TooltipProfileData) => string,
  ) => {
    if (show) rows.push({ key, cls, cells: profiles.map((p) => ({ text: text(p) })) })
  }
  add('header', true, 'font-semibold mb-1', (p) => `Profile ${p.profileNum}`)
  add('depth', true, rowClass('depth'), (p) => `Depth: ${fixed(p.depth, 1)} m`)
  add('temp', availability.hasTemp, rowClass('temp'), (p) => `Temp: ${fixed(p.temp, 1)} °C`)
  add('ndl', availability.hasNdl, rowClass('ndl'), (p) => `NDL: ${p.ndl ?? '-'}`)
  add('tts', availability.hasTts, rowClass('tts'), (p) => `TTS: ${p.tts ?? '-'}`)
  // The current ("next") mandatory stop - shown for every column once any of them has one.
  const stops = profiles.map(formatDeco)
  if (availability.hasDeco && stops.some((stop) => stop != null)) {
    rows.push({
      key: 'stop',
      cls: '',
      cells: stops.map((stop) =>
        stop != null ? { text: `Stop: ${stop}`, cls: 'text-red-500' } : { text: 'Stop: -' },
      ),
    })
  }
  add('otu', availability.hasOtu, rowClass('otu'), (p) => `OTU: ${fixed(p.otu, 0)}`)
  add('cns', availability.hasCns, rowClass('cns'), (p) => `CNS: ${fixed(p.cns, 0)}%`)
  add('gf', availability.hasGf, rowClass('gf'), (p) => `GF: ${fixed(p.gf, 0)}%`)
  add('rmv', availability.hasRmv, rowClass('rmv'), (p) => `RMV: ${fixed(p.rmv, 0)} L/m`)
  add(
    'po2Measured',
    availability.hasPo2Measured,
    rowClass('po2Measured'),
    (p) => `PO2(m): ${fixed(p.po2Measured, 2)}`,
  )
  add(
    'po2Calculated',
    availability.hasPo2Calculated,
    rowClass('po2Calculated'),
    (p) => `PO2(c): ${fixed(p.po2Calculated, 2)}`,
  )
  add(
    'po2Setpoint',
    availability.hasPo2Setpoint,
    rowClass('po2Setpoint'),
    (p) => `PO2(s): ${fixed(p.po2Setpoint, 2)}`,
  )
  add(
    'gas',
    availability.hasGasO2 || availability.hasGasHe,
    isGasHovered.value ? 'font-bold' : '',
    (p) =>
      p.gasO2 !== undefined && p.gasHe !== undefined
        ? `Gas: ${p.gasO2.toFixed(0)}/${p.gasHe.toFixed(0)}`
        : 'Gas: -',
  )
  return rows
})

const selectedProfile = computed(() => props.selectedProfiles?.[0] ?? 0)
const currentProfile = computed(() => {
  // First try to find the selected profile
  const selected = props.data?.profiles.find((p) => p.profileIdx === selectedProfile.value)
  if (selected) return selected
  // If selected profile has no data, use the first available profile with data
  return props.data?.profiles[0]
})
const selectedProfilesData = computed(
  () =>
    props.data?.profiles.filter((p) => props.selectedProfiles?.includes(p.profileIdx) ?? true) ??
    [],
)
</script>
