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
      Time: {{ currentProfile?.timeDisplay ?? data.profiles[0]?.timeDisplay }}
      <span v-if="data.profiles.length > 1" class="text-xs opacity-70 ml-1">
        ({{ selectedProfile + 1 }}/{{ data.profiles.length }})
      </span>
    </div>

    <!-- Show selected profile data or all profiles -->
    <div
      v-if="props.selectedProfiles && props.selectedProfiles.length > 1"
      class="grid gap-3"
      :style="{ gridTemplateColumns: `repeat(${Math.min(data.profiles.length, 3)}, 1fr)` }"
    >
      <div
        v-for="(profile, idx) in data.profiles"
        :key="idx"
        :class="[idx > 0 ? 'border-l pl-2 border-gray-300 dark:border-gray-600' : '']"
      >
        <div class="font-semibold text-xs mb-1">Profile {{ profile.profileNum }}</div>
        <div class="profile-data">
          <div>Depth: {{ profile.depth != null ? profile.depth.toFixed(1) : '-' }} m</div>
          <div v-if="data.metricAvailability.hasTemp">
            Temp: {{ profile.temp !== undefined ? profile.temp.toFixed(1) : '-' }} °C
          </div>
          <div v-if="data.metricAvailability.hasNdl">
            NDL: {{ profile.ndl !== undefined ? profile.ndl : '-' }}
          </div>
          <div v-if="data.metricAvailability.hasOtu">
            OTU: {{ profile.otu !== undefined ? profile.otu.toFixed(0) : '-' }}
          </div>
          <div v-if="data.metricAvailability.hasCns">
            CNS: {{ profile.cns !== undefined ? profile.cns.toFixed(0) : '-' }}%
          </div>
          <div v-if="data.metricAvailability.hasGf">
            GF: {{ profile.gf !== undefined ? profile.gf.toFixed(0) : '-' }}%
          </div>
          <div v-if="data.metricAvailability.hasRmv">
            RMV: {{ profile.rmv ? profile.rmv.toFixed(0) : '-' }} L/m
          </div>
          <div v-if="data.metricAvailability.hasPo2Measured">
            PO2(m): {{ profile.po2Measured ? profile.po2Measured.toFixed(2) : '-' }}
          </div>
          <div v-if="data.metricAvailability.hasPo2Calculated">
            PO2(c): {{ profile.po2Calculated ? profile.po2Calculated.toFixed(2) : '-' }}
          </div>
          <div v-if="data.metricAvailability.hasPo2Setpoint">
            PO2(s): {{ profile.po2Setpoint ? profile.po2Setpoint.toFixed(2) : '-' }}
          </div>
          <div v-if="data.metricAvailability.hasGasO2 || data.metricAvailability.hasGasHe">
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
      <div>Depth: {{ currentProfile.depth != null ? currentProfile.depth.toFixed(1) : '-' }} m</div>
      <div v-if="data.metricAvailability.hasTemp">
        Temperature:
        {{ currentProfile.temp !== undefined ? currentProfile.temp.toFixed(1) : '-' }} °C
      </div>
      <div v-if="data.metricAvailability.hasNdl">
        NDL: {{ currentProfile.ndl !== undefined ? currentProfile.ndl : '-' }}
      </div>
      <div v-if="data.metricAvailability.hasOtu">
        OTUs: {{ currentProfile.otu !== undefined ? currentProfile.otu.toFixed(0) : '-' }}
      </div>
      <div v-if="data.metricAvailability.hasCns">
        CNS: {{ currentProfile.cns !== undefined ? currentProfile.cns.toFixed(0) : '-' }}%
      </div>
      <div v-if="data.metricAvailability.hasGf">
        GF99: {{ currentProfile.gf !== undefined ? currentProfile.gf.toFixed(0) : '-' }}%
      </div>
      <div v-if="data.metricAvailability.hasRmv">
        RMV: {{ currentProfile.rmv ? currentProfile.rmv.toFixed(0) : '-' }} L/min
      </div>
      <div v-if="data.metricAvailability.hasPo2Measured">
        PO2 (measured):
        {{ currentProfile.po2Measured ? currentProfile.po2Measured.toFixed(2) : '-' }} bar
      </div>
      <div v-if="data.metricAvailability.hasPo2Calculated">
        PO2 (calculated):
        {{ currentProfile.po2Calculated ? currentProfile.po2Calculated.toFixed(2) : '-' }} bar
      </div>
      <div v-if="data.metricAvailability.hasPo2Setpoint">
        PO2 (setpoint):
        {{ currentProfile.po2Setpoint ? currentProfile.po2Setpoint.toFixed(2) : '-' }} bar
      </div>
      <div v-if="data.metricAvailability.hasGasO2 || data.metricAvailability.hasGasHe">
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

export type TooltipProfileData = {
  profileIdx: number
  profileNum: number
  timeDisplay: string
  depth: number
  temp?: number
  ndl?: string
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
}

const props = defineProps<Props>()
const selectedProfile = computed(() => props.selectedProfiles?.[0] ?? 0)
const currentProfile = computed(() => props.data?.profiles[selectedProfile.value])
</script>
