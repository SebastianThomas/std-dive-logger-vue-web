<template>
  <InfoPopover label="What do these mean?">
    <p class="mb-2 font-medium text-gray-800 dark:text-gray-100">Reading the gas calculation</p>
    <dl class="space-y-2 text-xs leading-snug">
      <div>
        <dt class="font-semibold">Δ bar</dt>
        <dd class="text-gray-600 dark:text-gray-300">
          Start pressure minus end pressure — how far the cylinder dropped.
        </dd>
      </div>
      <div>
        <dt class="font-semibold">Litres (L, Lᵢ)</dt>
        <dd class="text-gray-600 dark:text-gray-300">
          Gas used as a surface volume: Δ bar × the cylinder's water volume. A 12 L cylinder down
          50 bar gave up ≈ 600 L.
        </dd>
      </div>
      <div>
        <dt class="font-semibold">Σ <span class="font-normal">(sigma)</span></dt>
        <dd class="text-gray-600 dark:text-gray-300">
          “Sum of”. Σ Lᵢ means add up the litres from every contributing cylinder.
        </dd>
      </div>
      <div>
        <dt class="font-semibold">ATA / ambient pressure</dt>
        <dd class="text-gray-600 dark:text-gray-300">
          Atmospheres absolute — 1 at the surface, +1 for every 10 m of depth (1 + depth ÷ 10). You
          breathe gas at ambient pressure, so a breath at 30 m (4 ATA) uses 4× the surface volume.
        </dd>
      </div>
      <div>
        <dt class="font-semibold">PM — pressure-minutes</dt>
        <dd class="text-gray-600 dark:text-gray-300">
          The denominator for RMV. Every slice of the dive counts as its length in minutes × its
          average ambient pressure, added up over the time the gas was actually being breathed. One
          minute at 30 m contributes 4 pressure-minutes; one minute at the surface, 1.
        </dd>
      </div>
      <div>
        <dt class="font-semibold">RMV</dt>
        <dd class="text-gray-600 dark:text-gray-300">
          Respiratory Minute Volume — your breathing rate expressed as a surface volume, in l/min.
          RMV = Σ litres ÷ pressure-minutes. Unlike SAC (bar/min) it doesn't depend on cylinder
          size, so it's comparable between dives.
        </dd>
      </div>
      <div v-if="ccr">
        <dt class="font-semibold">Open-circuit portion</dt>
        <dd class="text-gray-600 dark:text-gray-300">
          On a rebreather dive, the stretches spent breathing an open-circuit cylinder (bailout)
          instead of the loop — taken from the computer's OC/CC mode.
        </dd>
      </div>
      <div v-if="ccr">
        <dt class="font-semibold">Bailout RMV</dt>
        <dd class="text-gray-600 dark:text-gray-300">
          RMV of the bailout gas over the open-circuit portion only — time spent on the loop doesn't
          dilute it.
        </dd>
      </div>
      <div v-if="ccr">
        <dt class="font-semibold">O₂ / Diluent injected</dt>
        <dd class="text-gray-600 dark:text-gray-300">
          Litres fed into the loop to hold setpoint and volume. That isn't breathing, so there's no
          per-minute rate.
        </dd>
      </div>
    </dl>
  </InfoPopover>
</template>

<script setup lang="ts">
import InfoPopover from '@/components/ui/InfoPopover.vue'

defineProps<{
  /** Show the rebreather-only terms (open-circuit portion, bailout RMV, injected gas). */
  ccr?: boolean
}>()
</script>
