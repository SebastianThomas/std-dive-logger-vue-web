<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
    <!-- Text search -->
    <div>
      <h3 class="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">Search</h3>
      <input
        v-model="queryInput"
        type="text"
        placeholder="Name or identifier..."
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-900 dark:text-white text-sm"
      />
    </div>

    <!-- Tag filter -->
    <div v-if="availableTags.length">
      <h3 class="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">Tags</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in availableTags"
          :key="tag.id"
          type="button"
          :class="[
            'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
            selectedTagIds.has(tag.id)
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500 hover:border-purple-400 hover:text-purple-700 dark:hover:text-purple-300',
          ]"
          @click="toggleTag(tag.id)"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>

    <!-- Granularity — kept inline/prominent since it's the primary, frequently-changed control -->
    <div>
      <h3 class="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">Granularity</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="g in TIMELINE_GRANULARITIES"
          :key="g.value"
          type="button"
          :class="[
            'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
            granularity === g.value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500 hover:border-blue-400',
          ]"
          @click="$emit('update:granularity', g.value)"
        >
          {{ g.label }}
        </button>
      </div>
    </div>

    <!-- Site / Suit / Base configuration — tucked behind a popover, rarely changed once set -->
    <div class="flex items-center gap-3">
      <FilterDropdown label="More Filters" :active="hasMoreFilters">
        <div class="space-y-3 w-full">
          <div>
            <label class="block text-sm font-semibold mb-1 text-gray-600 dark:text-gray-300"
              >Dive Site</label
            >
            <select
              v-model="diveSiteInput"
              class="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600 text-sm"
            >
              <option :value="null">All sites</option>
              <option v-for="site in availableSites" :key="site.id" :value="site.id">
                {{ site.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold mb-1 text-gray-600 dark:text-gray-300"
              >Suit</label
            >
            <select
              v-model="suitInput"
              class="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600 text-sm"
            >
              <option :value="null">All suits</option>
              <option v-for="suit in availableSuits" :key="suit.id" :value="suit.id">
                {{ formatSuitLabel(suit) }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold mb-1 text-gray-600 dark:text-gray-300"
              >CCR Unit</label
            >
            <select
              v-model="ccrUnitInput"
              class="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600 text-sm"
            >
              <option :value="null">All CCR units</option>
              <option v-for="unit in availableCcrUnits" :key="unit.id" :value="unit.id">
                {{ formatCcrUnitLabel(unit) }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold mb-1 text-gray-600 dark:text-gray-300"
              >Base Setup</label
            >
            <select
              v-model="baseConfigurationInput"
              class="w-full p-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-600 text-sm"
            >
              <option :value="null">All setups</option>
              <option v-for="(label, key) in BASE_CONFIGURATION_LABELS" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
        </div>
      </FilterDropdown>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
        @click="clearFilters"
      >
        Clear all filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import debounce from '@/lib/utils/debounce'
import FilterDropdown from '@/components/ui/FilterDropdown.vue'
import { TIMELINE_GRANULARITIES, type TimelineGranularity } from '@/lib/types/statsTimeline'
import type { StatsTimelineFilters } from '@/lib/types/statsTimeline'
import type { TagDefinition, DiveSite, Suit, CcrUnit } from '@/lib/types/dive'
import { BASE_CONFIGURATION_LABELS, SUIT_TYPE_LABELS, type BaseConfiguration } from '@/lib/types/dive'
import type { UserDiveStatsBySite } from '@/lib/types/stats'
import type { PagedResult } from '@/lib/types/dive'

interface Props {
  granularity: TimelineGranularity
  modelValue: StatsTimelineFilters
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:granularity': [value: TimelineGranularity]
  'update:modelValue': [value: StatsTimelineFilters]
}>()

const { getWithToken } = useApi()

const availableTags = ref<TagDefinition[]>([])
const availableSites = ref<DiveSite[]>([])
const availableSuits = ref<Suit[]>([])
const availableCcrUnits = ref<CcrUnit[]>([])

const queryInput = ref(props.modelValue.query)
const selectedTagIds = ref<Set<number>>(new Set(props.modelValue.tagIds))
const diveSiteInput = ref<number | null>(props.modelValue.diveSiteId)
const suitInput = ref<number | null>(props.modelValue.suitId)
const ccrUnitInput = ref<number | null>(props.modelValue.ccrUnitId)
const baseConfigurationInput = ref<BaseConfiguration | null>(props.modelValue.baseConfiguration)

const hasMoreFilters = computed(
  () =>
    diveSiteInput.value !== null ||
    suitInput.value !== null ||
    ccrUnitInput.value !== null ||
    baseConfigurationInput.value !== null,
)

const hasActiveFilters = computed(
  () => queryInput.value.trim().length > 0 || selectedTagIds.value.size > 0 || hasMoreFilters.value,
)

const toggleTag = (id: number) => {
  const next = new Set(selectedTagIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedTagIds.value = next
}

const clearFilters = () => {
  queryInput.value = ''
  selectedTagIds.value = new Set()
  diveSiteInput.value = null
  suitInput.value = null
  ccrUnitInput.value = null
  baseConfigurationInput.value = null
}

const formatSuitLabel = (suit: Suit): string => {
  const parts = [SUIT_TYPE_LABELS[suit.type]]
  if (suit.thickness) {
    parts.push(`${suit.thickness}mm`)
  }
  return parts.join(' - ')
}

const formatCcrUnitLabel = (unit: CcrUnit): string => unit.name

const emitFilters = debounce(() => {
  emit('update:modelValue', {
    query: queryInput.value.trim(),
    tagIds: [...selectedTagIds.value],
    diveSiteId: diveSiteInput.value,
    suitId: suitInput.value,
    ccrUnitId: ccrUnitInput.value,
    baseConfiguration: baseConfigurationInput.value,
  })
}, 300)

watch(
  [queryInput, selectedTagIds, diveSiteInput, suitInput, ccrUnitInput, baseConfigurationInput],
  emitFilters,
  { deep: true },
)

const loadFilterOptions = async () => {
  try {
    const [tagsRes, sitesRes, suitsRes, ccrUnitsRes] = await Promise.all([
      getWithToken<TagDefinition[]>('/v1/tags'),
      getWithToken<UserDiveStatsBySite[]>('/v1/stats/dive-site'),
      getWithToken<PagedResult<Suit>>('/v1/dives/configuration/suit?page=0&size=100'),
      getWithToken<PagedResult<CcrUnit>>('/v1/dives/configuration/ccrUnit?page=0&size=100'),
    ])
    availableTags.value = tagsRes.data ?? []
    availableSites.value = (sitesRes.data ?? []).map((entry) => entry.key)
    availableSuits.value = suitsRes.data.result ?? []
    availableCcrUnits.value = ccrUnitsRes.data.result ?? []
  } catch (err) {
    console.error('Failed to load stats filter options', err)
  }
}

onMounted(loadFilterOptions)
</script>
