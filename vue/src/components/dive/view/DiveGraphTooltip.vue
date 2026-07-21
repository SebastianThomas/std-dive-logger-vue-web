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

    <!-- Show selected profile data or all profiles -->
    <div
      v-if="selectedProfilesData.length > 1"
      class="grid gap-3"
      :style="{ gridTemplateColumns: `repeat(${Math.min(selectedProfilesData.length, 3)}, 1fr)` }"
    >
      <div
        v-for="(profile, idx) in selectedProfilesData"
        :key="idx"
        :class="[idx > 0 ? 'border-l pl-2 border-gray-300 dark:border-gray-600' : '']"
      >
        <div class="font-semibold text-xs mb-1">Profile {{ profile.profileNum }}</div>
        <div class="profile-data">
          <div :class="rowClass('depth')">
            Depth: {{ profile.depth != null ? profile.depth.toFixed(1) : '-' }} m
          </div>
          <div v-if="data.metricAvailability.hasTemp" :class="rowClass('temp')">
            Temp: {{ profile.temp !== undefined ? profile.temp.toFixed(1) : '-' }} °C
          </div>
          <div v-if="data.metricAvailability.hasNdl" :class="rowClass('ndl')">
            NDL: {{ profile.ndl !== undefined ? profile.ndl : '-' }}
          </div>
          <div v-if="data.metricAvailability.hasDeco && formatDeco(profile)" class="text-red-500">
            Deco: {{ formatDeco(profile) }}
          </div>
          <div v-if="data.metricAvailability.hasOtu" :class="rowClass('otu')">
            OTU: {{ profile.otu !== undefined ? profile.otu.toFixed(0) : '-' }}
          </div>
          <div v-if="data.metricAvailability.hasCns" :class="rowClass('cns')">
            CNS: {{ profile.cns !== undefined ? profile.cns.toFixed(0) : '-' }}%
          </div>
          <div v-if="data.metricAvailability.hasGf" :class="rowClass('gf')">
            GF: {{ profile.gf !== undefined ? profile.gf.toFixed(0) : '-' }}%
          </div>
          <div v-if="data.metricAvailability.hasRmv" :class="rowClass('rmv')">
            RMV: {{ profile.rmv ? profile.rmv.toFixed(0) : '-' }} L/m
          </div>
          <div v-if="data.metricAvailability.hasPo2Measured" :class="rowClass('po2Measured')">
            PO2(m): {{ profile.po2Measured ? profile.po2Measured.toFixed(2) : '-' }}
          </div>
          <div v-if="data.metricAvailability.hasPo2Calculated" :class="rowClass('po2Calculated')">
            PO2(c): {{ profile.po2Calculated ? profile.po2Calculated.toFixed(2) : '-' }}
          </div>
          <div v-if="data.metricAvailability.hasPo2Setpoint" :class="rowClass('po2Setpoint')">
            PO2(s): {{ profile.po2Setpoint ? profile.po2Setpoint.toFixed(2) : '-' }}
          </div>
          <div
            v-if="data.metricAvailability.hasGasO2 || data.metricAvailability.hasGasHe"
            :class="isGasHovered ? 'font-bold' : ''"
          >
            <div v-if="profile.gasO2 !== undefined && profile.gasHe !== undefined">
              Gas: {{ profile.gasO2.toFixed(0) }}/{{ profile.gasHe.toFixed(0) }}
            </div>
            <div v-else>Gas: -</div>
          </div>
        </div>
      </div>
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
      <div
        v-if="data.metricAvailability.hasDeco && formatDeco(currentProfile)"
        class="text-red-500"
      >
        Deco stop: {{ formatDeco(currentProfile) }}
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
        RMV: {{ currentProfile.rmv ? currentProfile.rmv.toFixed(0) : '-' }} L/min
      </div>
      <div v-if="data.metricAvailability.hasPo2Measured" :class="rowClass('po2Measured')">
        PO2 (measured):
        {{ currentProfile.po2Measured ? currentProfile.po2Measured.toFixed(2) : '-' }} bar
      </div>
      <div v-if="data.metricAvailability.hasPo2Calculated" :class="rowClass('po2Calculated')">
        PO2 (calculated):
        {{ currentProfile.po2Calculated ? currentProfile.po2Calculated.toFixed(2) : '-' }} bar
      </div>
      <div v-if="data.metricAvailability.hasPo2Setpoint" :class="rowClass('po2Setpoint')">
        PO2 (setpoint):
        {{ currentProfile.po2Setpoint ? currentProfile.po2Setpoint.toFixed(2) : '-' }} bar
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
const formatDeco = (profile: TooltipProfileData): string | null => {
  if (profile.decoDepth === undefined || profile.decoDepth <= 0) return null
  const minutes = Math.round((profile.decoSeconds ?? 0) / 60)
  return `${profile.decoDepth.toFixed(0)} m / ${minutes} min`
}

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
