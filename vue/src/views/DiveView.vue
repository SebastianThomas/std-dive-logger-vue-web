<template>
  <div
    class="dive-view-shell flex justify-center items-start pt-20 px-6 md:mx-10"
    :style="{ minHeight: 'calc(100vh - 80px)' }"
  >
    <DiveGraphContainer
      v-if="graphOpen && dive?.profiles"
      :profiles="dive.profiles"
      :dive-id="diveId"
      fullscreen
      @close="graphOpen = false"
      @profiles-aligned="handleProfilesAligned"
    />

    <div v-else-if="!loading && dive" class="space-y-6 md:space-y-8">
      <!-- Header -->
      <div
        class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6 flex flex-col"
      >
        <div class="flex justify-between items-center mb-2">
          <h1 class="text-2xl font-bold">#{{ dive.number }} : {{ dive.customIdentifier }}</h1>
          <div class="flex gap-2">
            <RouterLink v-if="isMine" :to="{ name: 'DiveEdit', params: { diveId: dive.id } }">
              <button class="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                Edit Dive
              </button>
            </RouterLink>
            <button
              v-if="isMine"
              @click="showShareModal = true"
              class="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700"
            >
              Share
            </button>
            <button
              v-if="isMine"
              @click="showDeleteModal = true"
              class="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
            <button
              v-else
              @click="showLinkModal = true"
              class="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
            >
              Link Dive
            </button>
          </div>
        </div>
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          {{ dive.site.name }} ·
          {{ summary?.start ? new Date(summary.start).toLocaleString() : 'No start date' }}
        </p>
      </div>

      <!-- Delete Modal -->
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-[90%] max-w-md">
          <h2 class="text-lg font-semibold mb-4 text-gray-800">Confirm Delete</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete dive #{{ dive.number }}? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="showDeleteModal = false"
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              @click="handleDelete"
              class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Link Modal -->
      <div
        v-if="showLinkModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div
          class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-[90%] max-w-lg max-h-[80vh] overflow-auto"
        >
          <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Link a Dive</h2>
          <DiveSearchAndLink
            :current-dive-id="diveId"
            :current-dive-site-name="dive.site.name"
            :current-dive-start-date="summary?.start"
            @dive-linked="onDiveLinked"
          />
          <div class="flex justify-end mt-4">
            <button
              @click="showLinkModal = false"
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- Share Popover -->
      <SharePopover
        :open="showShareModal"
        :dive-id="dive.id"
        :dive-user-id="dive.user.id"
        @close="showShareModal = false"
      />

      <!-- Main Content -->
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Map -->
        <div class="w-full md:w-1/5 h-50 rounded-lg overflow-hidden shadow-sm border">
          <DiveSiteMap
            :sites="[
              {
                site: {
                  id: dive.site.id!,
                  ...dive.site,
                },
                diveInfo: [{ ...dive }],
              },
            ]"
            :center="[dive.site.latitude, dive.site.longitude]"
            :zoom="13"
          />
        </div>

        <!-- Dive Info -->
        <div class="w-full md:w-4/5 flex flex-col gap-6">
          <!-- Summary Cards -->
          <InfoCardRow v-if="summary">
            <InfoCard title="Max Depth" :value="`${summary.maxDepth?.toFixed(1)} m`" />
            <InfoCard title="Avg Depth" :value="`${summary.averageDepth?.toFixed(1)} m`" />
            <InfoCard title="Bottom Time" :value="formatDiveTime(summary.bottomTime)" />
          </InfoCardRow>

          <!-- Details Grid -->
          <InfoCardRow>
            <InfoCard title="Gases">
              <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li v-for="gas in allGases" :key="`${gas.o2}/${gas.he}/${gas.n2}`">
                  <GasDisplay :gas="gas" :show-details="showGasDetails" />
                </li>
                <li v-if="allGases.size === 0" class="text-gray-400 dark:text-gray-500">
                  No gas data
                </li>
              </ul>
            </InfoCard>
            <InfoCard title="Dive Computers">
              <p
                class="text-xs text-gray-600 dark:text-gray-400"
                v-for="computer in uniqueComputers"
                :key="computer.id"
              >
                {{ computer.customIdentifier }} ({{ computer.manufacturer.name }})
              </p>
            </InfoCard>
            <InfoCard title="Buddies">
              <p
                v-if="!dive.namedBuddies.length && !dive.buddiesDives?.length"
                class="text-xs text-gray-400 dark:text-gray-500"
              >
                No buddies recorded
              </p>
              <ul v-else class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li v-for="name in dive.namedBuddies" :key="`named-${name}`">{{ name }}</li>
              </ul>
            </InfoCard>
          </InfoCardRow>

          <!-- Advanced Dive Information Row -->
          <InfoCardRow v-if="firstProfileSummary || lastProfileSummary">
            <!-- CNS Information -->
            <InfoCard
              v-if="
                firstProfileSummary?.startCNS !== undefined ||
                lastProfileSummary?.endCNS !== undefined
              "
              title="CNS (%)"
            >
              <div
                v-if="firstProfileSummary?.startCNS !== undefined"
                class="flex items-center gap-2"
              >
                <span>Start:</span>
                <span class="font-semibold">{{ firstProfileSummary.startCNS.toFixed(0) }}</span>
              </div>
              <div v-if="lastProfileSummary?.endCNS !== undefined" class="flex items-center gap-2">
                <span>End:</span>
                <span class="font-semibold">{{ lastProfileSummary.endCNS.toFixed(0) }}</span>
              </div>
            </InfoCard>

            <!-- OTU Information -->
            <InfoCard
              v-if="lastProfileSummary?.o2Toxicity !== undefined"
              title="OTUs"
              :value="`${lastProfileSummary?.o2Toxicity?.toFixed(0)}`"
            />

            <!-- N2 Loading Information -->
            <InfoCard
              v-if="
                firstProfileSummary?.startN2 !== undefined ||
                lastProfileSummary?.endN2 !== undefined
              "
              title="N2 Loading"
            >
              <div
                v-if="firstProfileSummary?.startN2 !== undefined"
                class="flex items-center gap-2"
              >
                <span>Start:</span>
                <span class="font-semibold">{{ firstProfileSummary.startN2.toFixed(0) }}</span>
              </div>
              <div v-if="lastProfileSummary?.endN2 !== undefined" class="flex items-center gap-2">
                <span>End:</span>
                <span class="font-semibold">{{ lastProfileSummary.endN2.toFixed(0) }}</span>
              </div>
            </InfoCard>
          </InfoCardRow>
        </div>
      </div>

      <!-- Dive Profile Graph -->
      <div class="w-full flex justify-center mt-6">
        <div class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md w-full flex flex-col">
          <div class="flex justify-between items-center p-4">
            <h2 class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }">
              Dive Profile
            </h2>
            <button @click="graphOpen = true" class="text-sm text-blue-600 hover:underline">
              Expand
            </button>
          </div>
          <DiveGraphContainer
            v-if="dive.profiles"
            :profiles="dive.profiles"
            :dive-id="diveId"
            @profiles-aligned="handleProfilesAligned"
          />
        </div>
      </div>

      <!-- Notes Panel -->
      <div v-if="dive.notes" class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
        <h2 class="text-lg font-semibold mb-3">Notes</h2>
        <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ dive.notes }}</p>
      </div>

      <!-- Visibility Panel -->
      <div v-if="dive.visibility && dive.visibility.feeling" class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
        <h2 class="text-lg font-semibold mb-4">Visibility</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard title="Feeling">
            <span class="capitalize">{{ dive.visibility.feeling?.toLowerCase() }}</span>
          </InfoCard>
          <InfoCard v-if="dive.visibility.meters !== undefined && dive.visibility.meters !== null" title="Distance">
            {{ dive.visibility.meters }} m
          </InfoCard>
          <InfoCard v-if="dive.visibility.description" title="Description">
            {{ dive.visibility.description }}
          </InfoCard>
        </div>
      </div>

      <!-- Gas Consumption Panel -->
      <div v-if="dive.gasConsumption && dive.gasConsumption.sacBar !== undefined && dive.gasConsumption.sacBar !== null" class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
        <h2 class="text-lg font-semibold mb-4">Gas Consumption</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard v-if="dive.gasConsumption.sacBar !== undefined && dive.gasConsumption.sacBar !== null" title="SAC (bar/min)">
            {{ dive.gasConsumption.sacBar.toFixed(2) }}
          </InfoCard>
          <InfoCard v-if="dive.gasConsumption.rmvLiters !== undefined && dive.gasConsumption.rmvLiters !== null" title="RMV (l/min)">
            {{ dive.gasConsumption.rmvLiters.toFixed(2) }}
          </InfoCard>
          <InfoCard v-if="dive.gasConsumption.totalLiters !== undefined && dive.gasConsumption.totalLiters !== null" title="Total Gas">
            {{ dive.gasConsumption.totalLiters.toFixed(1) }} l
          </InfoCard>
        </div>
      </div>

      <!-- Configuration Panel -->
      <div v-if="dive.configuration && dive.configuration.base" class="dive-card bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
        <h2 class="text-lg font-semibold mb-4">Configuration</h2>
        <div class="space-y-4">
          <!-- Suit Info -->
          <div v-if="dive.configuration.suit && dive.configuration.suit.type">
            <h3 class="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Suit</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard v-if="dive.configuration.suit.type" title="Type">
                <span class="capitalize">{{ dive.configuration.suit.type?.toLowerCase().replace(/_/g, ' ') }}</span>
              </InfoCard>
              <InfoCard v-if="dive.configuration.suit.thickness !== undefined && dive.configuration.suit.thickness !== null" title="Thickness">
                {{ dive.configuration.suit.thickness }} mm
              </InfoCard>
              <InfoCard v-if="dive.configuration.suit.notes" title="Notes" class="md:col-span-2">
                {{ dive.configuration.suit.notes }}
              </InfoCard>
            </div>
          </div>

          <!-- Base Configuration -->
          <div v-if="dive.configuration.base">
            <h3 class="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Base Configuration</h3>
            <InfoCard title="Setup">
              <span class="capitalize">{{ dive.configuration.base?.toLowerCase().replace(/_/g, ' ') }}</span>
            </InfoCard>
          </div>

          <!-- Weight Info -->
          <div v-if="dive.configuration.weight !== undefined && dive.configuration.weight !== null">
            <h3 class="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Weight</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard title="Weight (kg)">
                {{ dive.configuration.weight }}
              </InfoCard>
              <InfoCard v-if="dive.configuration.weightFeeling" title="Feeling">
                <span class="capitalize">{{ dive.configuration.weightFeeling?.toLowerCase() }}</span>
              </InfoCard>
            </div>
          </div>

          <!-- Cylinders -->
          <div v-if="dive.configuration.cylinders?.length">
            <h3 class="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Cylinders</h3>
            <div class="space-y-3">
              <div
                v-for="(cylinder, idx) in dive.configuration.cylinders"
                :key="idx"
                class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
              >
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span class="text-gray-600 dark:text-gray-400">Size</span>
                    <p class="font-semibold">
                      {{ cylinder.size.value }} {{ cylinder.size.unit === 'LITER' ? 'l' : 'cf' }}
                    </p>
                  </div>
                  <div v-if="cylinder.startBar !== undefined && cylinder.startBar !== null">
                    <span class="text-gray-600 dark:text-gray-400">Start Pressure</span>
                    <p class="font-semibold">{{ cylinder.startBar }} bar</p>
                  </div>
                  <div v-if="cylinder.endBar !== undefined && cylinder.endBar !== null">
                    <span class="text-gray-600 dark:text-gray-400">End Pressure</span>
                    <p class="font-semibold">{{ cylinder.endBar }} bar</p>
                  </div>
                  <div v-if="cylinder.notes">
                    <span class="text-gray-600 dark:text-gray-400">Notes</span>
                    <p class="font-semibold">{{ cylinder.notes }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="text-center py-20">Loading...</div>
    <div v-else-if="error" class="text-center py-20 text-red-500">Error: {{ error }}</div>
    <div v-else class="text-center py-20">No dive found</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useApi'
import { formatISoDurationToTime } from '@/lib/utils/timeUtils'
import DiveSiteMap from '@/components/DiveSiteMap.vue'
import DiveSearchAndLink from '@/components/DiveSearchAndLink.vue'
import DiveGraphContainer from '@/components/dive/view/DiveGraphContainer.vue'
import GasDisplay from '@/components/dive/view/GasDisplay.vue'
import InfoCard from '@/components/InfoCard.vue'
import InfoCardRow from '@/components/InfoCardRow.vue'
import SharePopover from '@/components/share/SharePopover.vue'
import type { Dive, DiveComputer, Gas } from '@/lib/types/dive'
import type { User } from '@/lib/types/user'

const router = useRouter()
const route = useRoute()
const { getWithToken, deleteWithToken } = useApi()

const diveId = computed(() => Number(route.params.diveId))
const dive = ref<Dive | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const graphOpen = ref(false)
const showDeleteModal = ref(false)
const showLinkModal = ref(false)
const showShareModal = ref(false)
const myUserId = ref<number | null>(null)

const summary = computed(() => dive.value?.summary)
const isMine = computed(() => dive.value?.user.id === myUserId.value)

const firstProfileSummary = computed(() => dive.value?.profiles[0]?.summary)
const lastProfileSummary = computed(() => {
  const profiles = dive.value?.profiles
  if (!profiles) {
    return undefined
  }
  const length = profiles.length
  return profiles[length - 1]?.summary
})

const uniqueComputers = computed(() => {
  const profiles = dive.value?.profiles ?? []
  const computerMap = new Map<number | string, DiveComputer>()
  for (const profile of profiles) {
    const computer = profile.diveComputer
    if (!computer) continue
    const key = computer.id ?? computer.serialNumber
    if (!computerMap.has(key)) {
      computerMap.set(key, computer)
    }
  }
  return new Set(computerMap.values())
})

// Extract all unique gas mixes from measurements
const allGases = computed(() => {
  const profiles = dive.value?.profiles
  if (!profiles) {
    return new Set<Gas>()
  }
  const gases = profiles
    .flatMap((p) => p.measurements)
    .map((m) => m.measurement.gas)
    .filter(Boolean)
    .map((g) => g!)
  if (!gases || gases.length === 0) {
    return new Set<Gas>()
  }
  // Deduplicate by composition, not by object reference (to handle Vue proxies)
  const seen = new Map<string, Gas>()
  gases.forEach((gas) => {
    const key = `${gas.o2}-${gas.n2}-${gas.he}-${gas.description || ''}`
    if (!seen.has(key)) {
      seen.set(key, gas)
    }
  })
  return new Set(seen.values())
})

const showGasDetails = computed(() => allGases.value.size <= 3)

const fetchDive = async () => {
  try {
    loading.value = true
    const res = await getWithToken<Dive>(`/v1/dives/${diveId.value}`)
    dive.value = res.data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch dive'
  } finally {
    loading.value = false
  }
}

const fetchUserId = async () => {
  try {
    const res = await getWithToken<User>('/v1/users/')
    myUserId.value = res.data.id
  } catch (err) {
    console.error('Failed to fetch user ID', err)
  }
}

const handleDelete = async () => {
  if (!dive.value) return
  try {
    await deleteWithToken(`/v1/dives/${diveId.value}`)
    toast.success('Dive deleted successfully')
    router.push({ name: 'Home' })
  } catch (err) {
    console.error('Delete failed', err)
    toast.error('Failed to delete dive')
  }
}

const onDiveLinked = () => {
  showLinkModal.value = false
}

const handleProfilesAligned = (updatedDive: Dive) => {
  // Replace the current dive with the updated one from the alignment response
  dive.value = updatedDive
  toast.success('Profiles aligned successfully')
}

const formatDiveTime = (duration?: string): string => {
  return formatISoDurationToTime(duration)
}

onMounted(() => {
  fetchDive()
  fetchUserId()
})

watch(() => diveId.value, fetchDive)
</script>

<style scoped>
.dive-card {
  background-color: var(--card-bg);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

[data-theme='dark'] .dive-card {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}
</style>
