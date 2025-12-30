<template>
  <div
    class="dive-view-shell bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed flex justify-center items-start pt-20 px-6 md:px-10"
    :style="{ minHeight: 'calc(100vh - 80px)' }"
  >
    <DiveGraphModal
      v-if="graphOpen && firstProfile"
      :profile="firstProfile"
      :dive-id="diveId"
      :show-temp="showTemp"
      :show-segments="showSegments"
      :show-grid="showGrid"
      :show-ndl="showNdl"
      :show-otu="showOtu"
      :show-cns="showCns"
      :show-gf="showGf"
      :show-rmv="showRmv"
      :show-gas-o2="showGasO2"
      :show-gas-n2="showGasN2"
      :show-gas-he="showGasHe"
      @close="graphOpen = false"
      @update:show-temp="showTemp = $event"
      @update:show-segments="showSegments = $event"
      @update:show-grid="showGrid = $event"
      @update:show-ndl="showNdl = $event"
      @update:show-otu="showOtu = $event"
      @update:show-cns="showCns = $event"
      @update:show-gf="showGf = $event"
      @update:show-rmv="showRmv = $event"
      @update:show-gas-o2="showGasO2 = $event"
      @update:show-gas-n2="showGasN2 = $event"
      @update:show-gas-he="showGasHe = $event"
    />

    <div v-else-if="!loading && dive" class="space-y-6 md:space-y-8">
      <!-- Header -->
      <div class="dive-card bg-white rounded-xl shadow-md p-4 md:p-6 flex flex-col">
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
        <p class="text-gray-500 text-sm">
          {{ dive.site.name }} ·
          {{
            firstProfile?.start ? new Date(firstProfile.start).toLocaleString() : 'No start date'
          }}
        </p>
      </div>

      <!-- Delete Modal -->
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div class="dive-card bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
          <h2 class="text-lg font-semibold mb-4 text-gray-800">Confirm Delete</h2>
          <p class="text-gray-600 mb-6">
            Are you sure you want to delete dive #{{ dive.number }}? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="showDeleteModal = false"
              class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
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
          class="dive-card bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-lg max-h-[80vh] overflow-auto"
        >
          <h2 class="text-lg font-semibold mb-4 text-gray-800">Link a Dive</h2>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Search my dives..."
            class="w-full p-2 mb-4 border rounded"
            @input="handleSearch"
          />
          <ul class="space-y-2">
            <li
              v-for="d in myDives"
              :key="d.id"
              class="flex justify-between items-center bg-gray-50 p-2 rounded hover:bg-gray-100"
            >
              <div>
                <p class="text-sm font-medium">{{ d.customIdentifier }}</p>
                <p class="text-xs text-gray-500">
                  #{{ d.number }} · {{ dive.site.name }} ·
                  {{
                    firstProfile?.start
                      ? new Date(firstProfile.start).toLocaleString()
                      : 'No start date'
                  }}
                </p>
              </div>
              <button
                @click="handleLinkDive(d.id)"
                class="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
              >
                Link
              </button>
            </li>
            <li v-if="myDives.length === 0" class="text-sm text-gray-400">No dives found</li>
          </ul>
          <div class="flex justify-end mt-4">
            <button
              @click="showLinkModal = false"
              class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>

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
                diveIds: [dive.id],
              },
            ]"
            :center="[dive.site.latitude, dive.site.longitude]"
            :zoom="13"
          />
        </div>

        <!-- Dive Info -->
        <div class="w-full md:w-4/5 flex flex-col gap-6">
          <!-- Summary Cards -->
          <InfoCardRow v-if="firstProfile && summary">
            <InfoCard title="Max Depth" :value="`${summary.maxDepth?.toFixed(1)} m`" />
            <InfoCard title="Avg Depth" :value="`${summary.averageDepth?.toFixed(1)} m`" />
            <InfoCard title="Bottom Time" :value="formatDiveTime(summary.bottomTime)" />
          </InfoCardRow>

          <!-- Details Grid -->
          <InfoCardRow>
            <InfoCard title="Gases">
              <ul class="text-xs text-gray-600 space-y-1">
                <li v-for="gas in allGases" :key="`${gas.o2}/${gas.he}/${gas.n2}`">
                  <GasDisplay :gas="gas" :show-details="showGasDetails" />
                </li>
                <li v-if="allGases.size === 0" class="text-gray-400">No gas data</li>
              </ul>
            </InfoCard>
            <InfoCard title="Dive Computer">
              <p class="text-xs text-gray-600">
                {{ firstProfile?.diveComputer.manufacturer.name }} —
                {{ firstProfile?.diveComputer.customIdentifier }}
              </p>
            </InfoCard>
            <InfoCard title="Buddies">
              <p
                v-if="!dive.namedBuddies.length && !dive.buddiesDives?.length"
                class="text-xs text-gray-400"
              >
                No buddies recorded
              </p>
              <ul v-else class="text-xs text-gray-600 space-y-1">
                <li v-for="name in dive.namedBuddies" :key="`named-${name}`">{{ name }}</li>
              </ul>
            </InfoCard>
          </InfoCardRow>

          <!-- Advanced Dive Information Row -->
          <InfoCardRow v-if="firstProfile && summary">
            <!-- CNS Information -->
            <InfoCard
              v-if="summary.startCNS !== undefined || summary.endCNS !== undefined"
              title="CNS (%)"
            >
              <div v-if="summary.startCNS !== undefined" class="flex items-center gap-2">
                <span>Start:</span>
                <span class="font-semibold">{{ summary.startCNS?.toFixed(0) }}</span>
              </div>
              <div v-if="summary.endCNS !== undefined" class="flex items-center gap-2">
                <span>End:</span>
                <span class="font-semibold">{{ summary.endCNS?.toFixed(0) }}</span>
              </div>
            </InfoCard>

            <!-- OTU Information -->
            <InfoCard
              v-if="summary.o2Toxicity !== undefined"
              title="OTU"
              :value="`${summary.o2Toxicity?.toFixed(0)}`"
            />

            <!-- N2 Loading Information -->
            <InfoCard
              v-if="summary.startN2 !== undefined || summary.endN2 !== undefined"
              title="N2 Loading"
            >
              <div v-if="summary.startN2 !== undefined" class="flex items-center gap-2">
                <span>Start:</span>
                <span class="font-semibold">{{ summary.startN2?.toFixed(0) }}</span>
              </div>
              <div v-if="summary.endN2 !== undefined" class="flex items-center gap-2">
                <span>End:</span>
                <span class="font-semibold">{{ summary.endN2?.toFixed(0) }}</span>
              </div>
            </InfoCard>
          </InfoCardRow>
        </div>
      </div>

      <!-- Dive Profile Graph -->
      <div class="w-full flex justify-center mt-6">
        <div class="dive-card bg-white rounded-xl shadow-md w-full max-w-150 flex flex-col">
          <div class="flex justify-between items-center p-4">
            <h2 class="font-semibold text-sm" :style="{ color: 'var(--foreground)' }">
              Dive Profile
            </h2>
            <button @click="graphOpen = true" class="text-sm text-blue-600 hover:underline">
              Expand
            </button>
          </div>
          <ViewDiveProfile v-if="firstProfile" :profile="firstProfile" :dive-id="diveId" />
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
import debounce from '@/lib/utils/debounce'
import { formatISoDurationToTime } from '@/lib/utils/timeUtils'
import DiveSiteMap from '@/components/DiveSiteMap.vue'
import ViewDiveProfile from '@/components/dive/view/ViewDiveProfile.vue'
import DiveGraphModal from '@/components/dive/view/DiveGraphModal.vue'
import GasDisplay from '@/components/dive/view/GasDisplay.vue'
import InfoCard from '@/components/InfoCard.vue'
import InfoCardRow from '@/components/InfoCardRow.vue'
import { useDiveGraphStore } from '@/stores/diveGraph'
import { storeToRefs } from 'pinia'
import type { Dive, DiveWithoutProfiles, Gas, PagedResult } from '@/lib/types/dive'
import type { User } from '@/lib/types/share'

const router = useRouter()
const route = useRoute()
const { getWithToken, deleteWithToken, postWithToken } = useApi()

const diveId = computed(() => Number(route.params.diveId))
const dive = ref<Dive | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const graphOpen = ref(false)
const showDeleteModal = ref(false)
const showLinkModal = ref(false)
const myUserId = ref<number | null>(null)
const myDives = ref<DiveWithoutProfiles[]>([])
const searchTerm = ref('')

const graphStore = useDiveGraphStore()
const {
  showTemp,
  showSegments,
  showGrid,
  showNdl,
  showOtu,
  showCns,
  showGf,
  showRmv,
  showGasO2,
  showGasN2,
  showGasHe,
} = storeToRefs(graphStore)

const firstProfile = computed(() => dive.value?.profiles?.[0])
const summary = computed(() => firstProfile.value?.summary)
const isMine = computed(() => dive.value?.user.id === myUserId.value)

// Extract all unique gas mixes from measurements
const allGases = computed(() => {
  if (!firstProfile.value?.measurements) {
    return new Set<Gas>()
  }
  return new Set(
    firstProfile.value.measurements
      .map((m) => m.measurement.gas)
      .filter(Boolean)
      .map((m) => m!),
  )
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

const fetchMyDives = async () => {
  try {
    const url = searchTerm.value.trim()
      ? `/v1/dives/search?page=0&query=${encodeURIComponent(searchTerm.value)}`
      : '/v1/dives?page=0&sortCol=NUMBER&sortDirection=ASCENDING'
    const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(url)
    myDives.value = res.data.result
  } catch (err) {
    console.error('Failed to fetch my dives', err)
  }
}

const handleSearch = debounce(() => {
  fetchMyDives()
}, 300)

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

const handleLinkDive = async (buddyDiveId: number) => {
  if (!dive.value) return
  try {
    await postWithToken(`/v1/dives/${diveId.value}/link?buddyDiveId=${buddyDiveId}`, {})
    toast.success('Dive linked successfully')
    showLinkModal.value = false
  } catch (err) {
    console.error('Link failed', err)
    toast.error('Failed to link dive')
  }
}

const formatDiveTime = (duration?: string): string => {
  return formatISoDurationToTime(duration)
}

onMounted(() => {
  fetchDive()
  fetchUserId()
  fetchMyDives()
})

watch(() => diveId.value, fetchDive)
</script>

<style scoped>
.dive-view-shell {
  background-color: var(--surface-bg);
}

.dive-card {
  background-color: var(--card-bg);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

[data-theme='dark'] .dive-card {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}
</style>
