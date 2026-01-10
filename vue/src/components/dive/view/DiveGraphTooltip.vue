<template>
  <div
    v-if="data"
    class="absolute bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 shadow rounded px-2 py-1 pointer-events-none max-w-xs"
    :style="{ left: left + 'px', top: top + 'px' }"
  >
    <div class="font-semibold mb-1">
      Time: {{ data.profiles[0]?.timeDisplay }}
      <span v-if="data.profiles.length > 1 && !showAllProfiles" class="text-xs opacity-70 ml-1">
        ({{ data.profiles.length }} profiles)
      </span>
    </div>

    <!-- Toggle for multiple profiles -->
    <div
      v-if="data.profiles.length > 1"
      class="mb-1 pb-1 border-b border-gray-300 dark:border-gray-600"
    >
      <button
        @click="showAllProfiles = !showAllProfiles"
        class="text-xs px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        {{ showAllProfiles ? 'Show Active' : 'Show All' }}
      </button>
    </div>

    <!-- Show either active profile or all profiles -->
    <template v-if="showAllProfiles">
      <div
        v-for="(profile, pIdx) in data.profiles"
        :key="pIdx"
        class="mb-2 pb-2"
        :class="{
          'border-b border-gray-300 dark:border-gray-600': pIdx < data.profiles.length - 1,
        }"
      >
        <div class="font-semibold text-xs opacity-80">Profile {{ profile.profileNum }}</div>
        <div>Depth: {{ profile.depth.toFixed(1) }} m</div>
        <div v-if="profile.temp !== undefined">Temp: {{ profile.temp.toFixed(1) }} °C</div>
        <div v-if="profile.ndl">NDL: {{ profile.ndl }}</div>
        <div v-if="profile.otu !== undefined">OTUs: {{ profile.otu.toFixed(0) }}</div>
        <div v-if="profile.cns !== undefined">CNS: {{ profile.cns.toFixed(0) }}%</div>
        <div v-if="profile.gf !== undefined">GF99: {{ profile.gf.toFixed(0) }}%</div>
        <div v-if="profile.rmv !== undefined">RMV: {{ profile.rmv.toFixed(0) }} L/min</div>
        <div v-if="profile.po2Measured !== undefined">
          PO₂ (meas): {{ profile.po2Measured.toFixed(2) }} bar
        </div>
        <div v-if="profile.po2Calculated !== undefined">
          PO₂ (calc): {{ profile.po2Calculated.toFixed(2) }} bar
        </div>
        <div v-if="profile.po2Setpoint !== undefined">
          PO₂ (setpoint): {{ profile.po2Setpoint.toFixed(2) }} bar
        </div>
        <div
          v-if="profile.gasO2 !== undefined && profile.gasHe !== undefined"
          class="group relative"
        >
          <div>Gas: {{ profile.gasO2.toFixed(0) }}/{{ profile.gasHe.toFixed(0) }}</div>
          <div
            class="absolute left-full ml-2 top-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          >
            O₂: {{ profile.gasO2.toFixed(0) }}%, N₂: {{ profile.gasN2?.toFixed(0) }}%, He:
            {{ profile.gasHe.toFixed(0) }}%
          </div>
        </div>
        <div
          v-if="profile.segmentType"
          class="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600"
        >
          Segment: {{ profile.segmentType }}
        </div>
      </div>
    </template>
    <template v-else>
      <!-- Show only the first (active) profile -->
      <div v-if="data.profiles[0]">
        <div>Depth: {{ data.profiles[0].depth.toFixed(1) }} m</div>
        <div v-if="data.profiles[0].temp !== undefined">
          Temp: {{ data.profiles[0].temp.toFixed(1) }} °C
        </div>
        <div v-if="data.profiles[0].ndl">NDL: {{ data.profiles[0].ndl }}</div>
        <div v-if="data.profiles[0].otu !== undefined">
          OTUs: {{ data.profiles[0].otu.toFixed(0) }}
        </div>
        <div v-if="data.profiles[0].cns !== undefined">
          CNS: {{ data.profiles[0].cns.toFixed(0) }}%
        </div>
        <div v-if="data.profiles[0].gf !== undefined">
          GF99: {{ data.profiles[0].gf.toFixed(0) }}%
        </div>
        <div v-if="data.profiles[0].rmv !== undefined">
          RMV: {{ data.profiles[0].rmv.toFixed(0) }} L/min
        </div>
        <div v-if="data.profiles[0].po2Measured !== undefined">
          PO₂ (meas): {{ data.profiles[0].po2Measured.toFixed(2) }} bar
        </div>
        <div v-if="data.profiles[0].po2Calculated !== undefined">
          PO₂ (calc): {{ data.profiles[0].po2Calculated.toFixed(2) }} bar
        </div>
        <div v-if="data.profiles[0].po2Setpoint !== undefined">
          PO₂ (setpoint): {{ data.profiles[0].po2Setpoint.toFixed(2) }} bar
        </div>
        <div
          v-if="data.profiles[0].gasO2 !== undefined && data.profiles[0].gasHe !== undefined"
          class="group relative"
        >
          <div>
            Gas: {{ data.profiles[0].gasO2.toFixed(0) }}/{{ data.profiles[0].gasHe.toFixed(0) }}
          </div>
          <div
            class="absolute left-full ml-2 top-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          >
            O₂: {{ data.profiles[0].gasO2.toFixed(0) }}%, N₂:
            {{ data.profiles[0].gasN2?.toFixed(0) }}%, He: {{ data.profiles[0].gasHe.toFixed(0) }}%
          </div>
        </div>
        <div
          v-if="data.profiles[0].segmentType"
          class="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600"
        >
          Segment: {{ data.profiles[0].segmentType }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

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
  po2Measured?: number
  po2Calculated?: number
  po2Setpoint?: number
  rmv?: number
  gasO2?: number
  gasN2?: number
  gasHe?: number
  segmentType?: string
}

export type TooltipData = {
  time: number
  profiles: TooltipProfileData[]
}

interface Props {
  data: TooltipData | null
  left: number
  top: number
}

defineProps<Props>()

const showAllProfiles = ref(false)
</script>
