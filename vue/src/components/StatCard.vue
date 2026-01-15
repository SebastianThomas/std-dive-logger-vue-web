<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" v-if="stats">
    <StatItem label="Dives" :value="stats.diveCount.toString()" icon="water" />
    <StatItem label="Max Dive Number" :value="stats.maxDiveNr.toString()" icon="hashtag" />
    <StatItem
      label="Longest Dive"
      :value="formatDuration(stats.longestDive)"
      icon="hourglass-end"
    />
    <StatItem label="Max Depth" :value="`${stats.maxDepth.toFixed(1)} m`" icon="arrow-down" />
    <StatItem label="Total Time" :value="formatDuration(stats.totalTime)" icon="clock" />
    <StatItem
      label="Dive Buddies"
      :value="stats.nrOfBuddies.toString()"
      icon="people-group"
      v-if="stats.nrOfBuddies"
    />
    <StatItem
      label="Dive Sites"
      :value="stats.nrOfSites.toString()"
      icon="map-pin"
      v-if="stats.nrOfSites"
    />
    <StatItem
      label="Max Temperature"
      :value="`${stats.maxTemp.value}° ${formatUnit(stats.maxTemp.unit)}`"
      icon="thermometer-half"
      v-if="stats.maxTemp"
    />
    <StatItem
      label="Min Temperature"
      :value="`${stats.minTemp.value}° ${formatUnit(stats.minTemp.unit)}`"
      icon="snowflake"
      v-if="stats.minTemp"
    />
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" v-else>
    Stats could not be found.
  </div>
</template>

<script setup lang="ts">
import { formatISoDurationToTime } from '@/lib/utils/timeUtils'
import StatItem from './StatItem.vue'
import type { UserDiveStats } from '@/lib/types/stats'

interface Props {
  stats: UserDiveStats
  title?: string
}

defineProps<Props>()

const formatDuration = (duration: string): string => {
  return formatISoDurationToTime(duration)
}

const formatUnit = (unit: string): string => {
  return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase()
}
</script>
