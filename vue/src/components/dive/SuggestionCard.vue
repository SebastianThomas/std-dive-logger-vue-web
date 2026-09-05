<template>
  <div class="flex items-start justify-between gap-3">
    <router-link
      :to="{ name: 'DiveSiteDetail', params: { siteId: String(suggestion.site.id) } }"
      class="font-semibold text-lg hover:text-blue-600"
    >
      {{ suggestion.site.name }}
    </router-link>
    <span class="suggestion-score-badge shrink-0" :class="scoreClass">
      {{ suggestion.score.toFixed(1) }}
    </span>
  </div>
  <p class="text-xs text-gray-400 mt-0.5">
    {{ suggestion.totalDives }} {{ suggestion.totalDives === 1 ? 'dive' : 'dives' }} logged
    <template v-if="suggestion.distanceKm != null">
      · ~{{ suggestion.distanceKm.toFixed(0) }}km away</template
    >
  </p>
  <ul class="mt-2 space-y-1">
    <li v-for="(reason, idx) in suggestion.reasons" :key="idx" class="text-sm flex gap-1.5">
      <i class="fas fa-circle-check text-emerald-500 text-[0.6rem] mt-1.5 shrink-0"></i>
      <span>{{ reason }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DiveSiteSuggestion } from '@/lib/types/dive'

const props = defineProps<{ suggestion: DiveSiteSuggestion }>()

const scoreClass = computed(() => {
  if (props.suggestion.score >= 6) return 'suggestion-score-high'
  if (props.suggestion.score >= 2) return 'suggestion-score-mid'
  return 'suggestion-score-low'
})
</script>

<style scoped>
.suggestion-score-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.suggestion-score-high {
  background-color: #d1fae5;
  color: #065f46;
}

.suggestion-score-mid {
  background-color: #fef3c7;
  color: #92400e;
}

.suggestion-score-low {
  background-color: #f3f4f6;
  color: #4b5563;
}

[data-theme='dark'] .suggestion-score-high {
  background-color: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
}

[data-theme='dark'] .suggestion-score-mid {
  background-color: rgba(217, 119, 6, 0.18);
  color: #fcd34d;
}

[data-theme='dark'] .suggestion-score-low {
  background-color: rgba(75, 85, 99, 0.35);
  color: #d1d5db;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .suggestion-score-high {
    background-color: rgba(16, 185, 129, 0.18);
    color: #6ee7b7;
  }

  :root:not([data-theme]) .suggestion-score-mid {
    background-color: rgba(217, 119, 6, 0.18);
    color: #fcd34d;
  }

  :root:not([data-theme]) .suggestion-score-low {
    background-color: rgba(75, 85, 99, 0.35);
    color: #d1d5db;
  }
}
</style>
