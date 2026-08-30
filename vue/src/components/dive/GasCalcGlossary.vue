<template>
  <InfoPopover label="Terms">
    <dl class="space-y-1.5 text-[11px] leading-snug">
      <div v-for="row in rows" :key="row.term" class="flex gap-1.5">
        <dt class="shrink-0 font-semibold">
          {{ row.term }}
          <span v-if="row.unit" class="font-normal text-gray-400">[{{ row.unit }}]</span>
        </dt>
        <dd class="text-gray-600 dark:text-gray-300">{{ row.def }}</dd>
      </div>
    </dl>
  </InfoPopover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InfoPopover from '@/components/ui/InfoPopover.vue'

const props = defineProps<{
  /** Include the rebreather-only terms (open-circuit portion, bailout RMV). */
  ccr?: boolean
}>()

const base = [
  { term: 'Σ', unit: '', def: 'sum over every contributing cylinder' },
  { term: 'L', unit: 'litres', def: "gas a cylinder gave up: Δ bar × the cylinder's water volume" },
  { term: 'ATA', unit: '', def: 'ambient pressure — 1 at the surface, +1 per 10 m of depth' },
  { term: 'PM', unit: 'min·ATA', def: 'pressure-minutes: Σ (minutes × ATA) over the breathed time — the divisor for RMV' },
  { term: 'RMV', unit: 'l/min', def: 'breathing rate as a surface volume: Σ L ÷ PM' },
]
const ccrRows = [
  { term: 'Open-circuit portion', unit: 'mm:ss', def: 'time bailed out to open circuit, off the loop' },
  { term: 'Bailout RMV', unit: 'l/min', def: 'RMV measured over the open-circuit portion only' },
]

const rows = computed(() => (props.ccr ? [...base, ...ccrRows] : base))
</script>
