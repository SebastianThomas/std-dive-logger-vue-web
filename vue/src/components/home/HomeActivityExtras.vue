<template>
  <div v-if="chips.length" class="mt-2 flex flex-wrap gap-1.5">
    <span
      v-for="chip in chips"
      :key="chip.text"
      class="hae-chip"
      :class="`hae-chip--${chip.tone}`"
    >
      <i v-if="chip.icon" :class="chip.icon" aria-hidden="true"></i>
      {{ chip.text }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DiverActivityStats } from '@/lib/types/home'

const props = defineProps<{ stats: DiverActivityStats }>()

type Tone = 'neutral' | 'green' | 'blue' | 'amber'
interface Chip {
  text: string
  tone: Tone
  icon?: string
}

const monthName = (m: number) =>
  new Date(2000, m - 1, 1).toLocaleDateString('en-US', { month: 'long' })

const chips = computed<Chip[]>(() => {
  const s = props.stats
  const out: Chip[] = []

  if (s.currentMonthStreak >= 2) {
    out.push({ text: `${s.currentMonthStreak}-month streak`, tone: 'green', icon: 'fa-solid fa-fire' })
  } else if (s.longestMonthStreak >= 3) {
    out.push({ text: `Best run: ${s.longestMonthStreak} months`, tone: 'neutral' })
  }

  if (s.busiestMonth != null && s.busiestMonthShare >= 0.18) {
    out.push({
      text: `Mostly dives in ${monthName(s.busiestMonth)}`,
      tone: 'blue',
      icon: 'fa-regular fa-calendar',
    })
  }

  if (s.depthTrend === 'DEEPER' && s.recentAvgMaxDepth != null) {
    out.push({
      text: `Going deeper (~${s.recentAvgMaxDepth.toFixed(0)} m avg)`,
      tone: 'blue',
      icon: 'fa-solid fa-arrow-down',
    })
  } else if (s.depthTrend === 'SHALLOWER') {
    out.push({ text: 'Shallower lately', tone: 'neutral', icon: 'fa-solid fa-arrow-up' })
  }

  if (s.newSitesThisYear >= 1) {
    out.push({
      text: `${s.newSitesThisYear} new site${s.newSitesThisYear === 1 ? '' : 's'} this year`,
      tone: 'green',
      icon: 'fa-solid fa-map-pin',
    })
  }

  if (s.projectedDivesThisYear != null && s.projectedDivesThisYear >= 1) {
    out.push({ text: `On track for ~${s.projectedDivesThisYear} this year`, tone: 'neutral' })
  }

  if (s.nextMilestone != null && s.divesToNextMilestone != null) {
    out.push({ text: `${s.divesToNextMilestone} to dive #${s.nextMilestone} 🎉`, tone: 'amber' })
  }

  return out
})
</script>

<style>
/* Themed by [data-theme] rather than the `dark:` variant, which tracks prefers-color-scheme
   here, not the app's manual toggle (see src/styles/global.css). */
.hae-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 500;
}
.hae-chip--neutral {
  background: #f3f4f6;
  color: #374151;
}
.hae-chip--green {
  background: #dcfce7;
  color: #166534;
}
.hae-chip--blue {
  background: #e0f2fe;
  color: #075985;
}
.hae-chip--amber {
  background: #fef3c7;
  color: #92400e;
}
[data-theme='dark'] .hae-chip--neutral {
  background: #374151;
  color: #e5e7eb;
}
[data-theme='dark'] .hae-chip--green {
  background: rgba(20, 83, 45, 0.45);
  color: #bbf7d0;
}
[data-theme='dark'] .hae-chip--blue {
  background: rgba(12, 74, 110, 0.45);
  color: #bae6fd;
}
[data-theme='dark'] .hae-chip--amber {
  background: rgba(120, 53, 15, 0.5);
  color: #fde68a;
}
</style>
